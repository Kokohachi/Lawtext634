import { storedLoader } from "./loaders";
import { BaseLawInfo } from "lawtext/dist/src/data/lawinfo";

export interface SearchResult {
    LawID: string;
    LawTitle: string;
    matches: Array<{
        text: string;
        context: string;
    }>;
}

interface CachedLawText {
    LawID: string;
    LawTitle: string;
    fullText: string;
}

class FullTextSearchIndex {
    private cache: CachedLawText[] | null = null;
    private isLoading = false;
    private loadPromise: Promise<void> | null = null;

    private async loadLawtextFile(lawInfo: BaseLawInfo): Promise<string> {
        try {
            // Try to load the .law.txt file directly
            // Use URL construction for browser environment
            const pathParts = [
                storedLoader.lawdataPath,
                lawInfo.Path || "",
                lawInfo.XmlName.replace(/\.xml$/i, ".law.txt")
            ].filter(part => part.length > 0);
            
            const lawtextPath = pathParts.join("/");
            
            const response = await fetch(lawtextPath);
            if (!response.ok) {
                console.warn(`Failed to fetch ${lawtextPath}: ${response.statusText}`);
                return "";
            }
            
            const text = await response.text();
            return text;
        } catch (error) {
            console.error(`Failed to load law ${lawInfo.LawID}:`, error);
            return "";
        }
    }

    async ensureLoaded(): Promise<void> {
        if (this.cache !== null) {
            return;
        }

        if (this.isLoading && this.loadPromise) {
            return this.loadPromise;
        }

        this.isLoading = true;
        this.loadPromise = (async () => {
            try {
                const { lawInfos } = await storedLoader.loadLawInfosStruct();
                
                // Load all law texts
                const cachePromises = lawInfos.map(async (info) => {
                    const fullText = await this.loadLawtextFile(info);
                    return {
                        LawID: info.LawID,
                        LawTitle: info.LawTitle,
                        fullText,
                    };
                });

                this.cache = await Promise.all(cachePromises);
                console.log(`Loaded ${this.cache.length} laws for full-text search`);
            } catch (error) {
                console.error("Failed to load full-text search index:", error);
                this.cache = [];
            } finally {
                this.isLoading = false;
            }
        })();

        return this.loadPromise;
    }

    private getMatchContext(text: string, matchIndex: number, contextLength: number = 40): string {
        const start = Math.max(0, matchIndex - contextLength);
        const end = Math.min(text.length, matchIndex + contextLength);
        
        let context = text.substring(start, end);
        if (start > 0) context = "..." + context;
        if (end < text.length) context = context + "...";
        
        return context;
    }

    search(query: string, maxResults: number = 10): SearchResult[] {
        if (!this.cache || query.trim().length === 0) {
            return [];
        }

        const searchLower = query.toLowerCase();
        const results: SearchResult[] = [];

        for (const law of this.cache) {
            if (!law.fullText) continue;
            
            const textLower = law.fullText.toLowerCase();
            const matches: Array<{ text: string; context: string }> = [];
            
            let index = textLower.indexOf(searchLower);
            while (index !== -1 && matches.length < 3) {
                const matchText = law.fullText.substring(index, index + query.length);
                const context = this.getMatchContext(law.fullText, index);
                matches.push({ text: matchText, context });
                index = textLower.indexOf(searchLower, index + 1);
            }

            if (matches.length > 0) {
                results.push({
                    LawID: law.LawID,
                    LawTitle: law.LawTitle,
                    matches,
                });
            }

            if (results.length >= maxResults) {
                break;
            }
        }

        return results;
    }
}

export const fullTextSearchIndex = new FullTextSearchIndex();
