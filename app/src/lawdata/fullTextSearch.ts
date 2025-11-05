import { storedLoader } from "./loaders";
import { BaseLawInfo } from "lawtext/dist/src/data/lawinfo";
import { toLawData, Timing } from "lawtext/dist/src/data/lawdata";
import makePath from "lawtext/dist/src/path/v1/make";
import * as std from "lawtext/dist/src/law/std";

export interface SearchResult {
    LawID: string;
    LawTitle: string;
    matches: Array<{
        text: string;
        context: string;
    }>;
}

export interface SearchResultWithArticle {
    LawID: string;
    LawTitle: string;
    matches: Array<{
        text: string;
        context: string;
        articleTitle?: string;
        articlePath?: string;
    }>;
}

interface CachedLawText {
    LawID: string;
    LawTitle: string;
    fullText: string;
}

interface CachedLawData {
    LawID: string;
    LawTitle: string;
    fullText: string;
    lawData: any; // Parsed law structure
}

class FullTextSearchIndex {
    private cache: CachedLawText[] | null = null;
    private detailedCache: CachedLawData[] | null = null;
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

    private async loadLawData(lawInfo: BaseLawInfo): Promise<{ fullText: string; lawData: any }> {
        try {
            const lawXML = await storedLoader.loadLawXMLStructByInfo(lawInfo);
            const timing = new Timing();
            const lawDataResult = await toLawData({
                source: "file_xml",
                xml: lawXML.xml,
                lawXMLStruct: lawXML,
            }, () => {}, timing);
            
            if (!lawDataResult.ok || !lawDataResult.lawData) {
                const fullText = await this.loadLawtextFile(lawInfo);
                return { fullText, lawData: null };
            }
            
            // Extract full text from parsed structure
            const fullText = await this.loadLawtextFile(lawInfo);
            
            return {
                fullText,
                lawData: lawDataResult.lawData
            };
        } catch (error) {
            console.error(`Failed to load law data ${lawInfo.LawID}:`, error);
            const fullText = await this.loadLawtextFile(lawInfo);
            return { fullText, lawData: null };
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

    private async ensureDetailedCacheLoaded(): Promise<void> {
        if (this.detailedCache !== null) {
            return;
        }

        try {
            const { lawInfos } = await storedLoader.loadLawInfosStruct();
            
            const cachePromises = lawInfos.map(async (info) => {
                const { fullText, lawData } = await this.loadLawData(info);
                return {
                    LawID: info.LawID,
                    LawTitle: info.LawTitle,
                    fullText,
                    lawData,
                };
            });

            this.detailedCache = await Promise.all(cachePromises);
            console.log(`Loaded ${this.detailedCache.length} laws with detailed data for full-text search`);
        } catch (error) {
            console.error("Failed to load detailed full-text search index:", error);
            this.detailedCache = [];
        }
    }

    private getMatchContext(text: string, matchIndex: number, contextLength: number = 40): string {
        const start = Math.max(0, matchIndex - contextLength);
        const end = Math.min(text.length, matchIndex + contextLength);
        
        let context = text.substring(start, end);
        if (start > 0) context = "..." + context;
        if (end < text.length) context = context + "...";
        
        return context;
    }

    private findArticleForMatch(lawData: any, matchIndex: number, fullText: string): { articleTitle?: string; articlePath?: string } {
        if (!lawData || !lawData.el || !lawData.analysis) {
            return {};
        }

        try {
            const law = lawData.el as std.Law;
            const containers = lawData.analysis.containersByEL as Map<any, any>;
            
            // Find all articles
            const findArticles = (el: any): any[] => {
                if (!el || !el.children) return [];
                
                const articles: any[] = [];
                for (const child of el.children) {
                    if (typeof child !== "string") {
                        if (std.isArticle(child)) {
                            articles.push(child);
                        }
                        articles.push(...findArticles(child));
                    }
                }
                return articles;
            };

            const articles = findArticles(law);
            
            // Simple heuristic: estimate position in text by dividing text into sections
            const textPerArticle = fullText.length / Math.max(articles.length, 1);
            const estimatedArticleIndex = Math.floor(matchIndex / textPerArticle);
            const targetArticle = articles[Math.min(estimatedArticleIndex, articles.length - 1)];
            
            if (targetArticle) {
                const articleTitle = targetArticle.children.find((c: any) => c.tag === "ArticleTitle");
                const articleCaption = targetArticle.children.find((c: any) => c.tag === "ArticleCaption");
                
                let title = "";
                if (articleTitle && typeof articleTitle.text === "function") {
                    title = articleTitle.text();
                }
                if (articleCaption && typeof articleCaption.text === "function") {
                    const caption = articleCaption.text();
                    title += (caption[0] === "（" ? "" : "　") + caption;
                }
                
                const container = containers.get(targetArticle);
                const path = container ? makePath(container) : undefined;
                
                return {
                    articleTitle: title || undefined,
                    articlePath: path
                };
            }
        } catch (error) {
            console.error("Error finding article for match:", error);
        }

        return {};
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

    async searchWithArticles(query: string, maxResults: number = 50): Promise<SearchResultWithArticle[]> {
        if (query.trim().length === 0) {
            return [];
        }

        await this.ensureDetailedCacheLoaded();
        if (!this.detailedCache) {
            return [];
        }

        const searchLower = query.toLowerCase();
        const results: SearchResultWithArticle[] = [];

        for (const law of this.detailedCache) {
            if (!law.fullText) continue;
            
            const textLower = law.fullText.toLowerCase();
            const matches: Array<{ text: string; context: string; articleTitle?: string; articlePath?: string }> = [];
            
            let index = textLower.indexOf(searchLower);
            while (index !== -1 && matches.length < 5) {
                const matchText = law.fullText.substring(index, index + query.length);
                const context = this.getMatchContext(law.fullText, index);
                const articleInfo = this.findArticleForMatch(law.lawData, index, law.fullText);
                
                matches.push({ 
                    text: matchText, 
                    context,
                    ...articleInfo
                });
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
