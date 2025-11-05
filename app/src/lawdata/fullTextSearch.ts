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
            // Load the .law.txt file
            const lawtextContent = await this.loadLawtextFile(lawInfo);
            
            if (!lawtextContent) {
                console.warn(`No lawtext content for ${lawInfo.LawID}`);
                return { fullText: "", lawData: null };
            }
            
            // Parse the lawtext directly
            const timing = new Timing();
            const lawDataResult = await toLawData({
                source: "file_lawtext",
                lawtext: lawtextContent,
            }, () => {}, timing);
            
            if (!lawDataResult.ok || !lawDataResult.lawData) {
                console.warn(`Failed to parse lawtext for ${lawInfo.LawID}:`, lawDataResult);
                return { fullText: lawtextContent, lawData: null };
            }
            
            // Extract full text from parsed structure using the text() method
            const fullText = typeof lawDataResult.lawData.el.text === "function" 
                ? lawDataResult.lawData.el.text() 
                : lawtextContent;
            
            console.log(`Successfully loaded lawData for ${lawInfo.LawID}, text length: ${fullText.length}`);
            
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
            console.warn("Missing lawData, el, or analysis");
            return {};
        }

        try {
            const law = lawData.el as std.Law;
            const containers = lawData.analysis.containersByEL as Map<any, any>;
            
            console.log(`Finding article for match at index ${matchIndex} in text of length ${fullText.length}`);
            
            // Build a map of text positions to elements
            const buildPositionMap = (el: any, currentPos: number = 0): Array<{ el: any; startPos: number; endPos: number; text: string }> => {
                if (!el || !el.children) return [];
                
                const elements: Array<{ el: any; startPos: number; endPos: number; text: string }> = [];
                let pos = currentPos;
                
                for (const child of el.children) {
                    if (typeof child === "string") {
                        pos += child.length;
                    } else {
                        const childText = typeof child.text === "function" ? child.text() : "";
                        const childStart = pos;
                        const childEnd = pos + childText.length;
                        
                        elements.push({ el: child, startPos: childStart, endPos: childEnd, text: childText });
                        
                        // Recursively search in children
                        elements.push(...buildPositionMap(child, pos));
                        pos = childEnd;
                    }
                }
                return elements;
            };

            const positionMap = buildPositionMap(law);
            console.log(`Built position map with ${positionMap.length} elements`);
            
            // Find the most specific element that contains the match
            // Prefer smaller elements (more specific) over larger ones
            let bestMatch: { el: any; startPos: number; endPos: number; text: string } | null = null;
            let bestMatchSize = Infinity;
            
            for (const item of positionMap) {
                if (matchIndex >= item.startPos && matchIndex < item.endPos) {
                    const size = item.endPos - item.startPos;
                    if (size < bestMatchSize) {
                        bestMatch = item;
                        bestMatchSize = size;
                    }
                }
            }
            
            if (!bestMatch) {
                console.warn(`No element found containing match at index ${matchIndex}`);
                return {};
            }
            
            console.log(`Best match element: tag=${bestMatch.el.tag}, pos=${bestMatch.startPos}-${bestMatch.endPos}`);
            
            // Helper function to extract title from an element
            const extractTitle = (el: any): string => {
                if (!el || !el.children) return "";
                
                let title = "";
                
                // Look for title elements based on the element type
                const titleTags = [
                    "ArticleTitle", "ArticleCaption",
                    "ChapterTitle", "ChapterCaption",
                    "SectionTitle", "SectionCaption", 
                    "SubsectionTitle", "SubsectionCaption",
                    "DivisionTitle", "DivisionCaption",
                    "PartTitle", "PartCaption",
                    "ItemTitle", "ItemSentence",
                    "Subitem1Title", "Subitem1Sentence",
                    "Subitem2Title", "Subitem2Sentence"
                ];
                
                for (const child of el.children) {
                    if (typeof child !== "string" && titleTags.includes(child.tag)) {
                        if (typeof child.text === "function") {
                            const childText = child.text();
                            if (child.tag.includes("Title") || child.tag.includes("Sentence")) {
                                title += childText;
                            } else if (child.tag.includes("Caption")) {
                                // Add caption with proper spacing
                                if (childText.startsWith("（")) {
                                    title += childText;
                                } else {
                                    title += "　" + childText;
                                }
                            }
                        }
                    }
                }
                
                return title.trim();
            };
            
            // Find the most relevant structural element (Article, Chapter, Section, etc.)
            // Priority: Article > Item > Paragraph > Section > Subsection > Chapter
            const findRelevantElement = (el: any): any => {
                const structuralTags = [
                    "Article", "Item", "Subitem1", "Subitem2", "Paragraph",
                    "Section", "Subsection", "Division", "Chapter", "Part"
                ];
                
                if (structuralTags.includes(el.tag)) {
                    return el;
                }
                
                // Search for the closest structural ancestor
                for (const item of positionMap) {
                    if (item.el === el) {
                        // Look for structural elements that contain this element
                        let bestStructural: any = null;
                        let bestStructuralSize = Infinity;
                        
                        for (const candidate of positionMap) {
                            if (structuralTags.includes(candidate.el.tag) && 
                                candidate.startPos <= item.startPos && 
                                candidate.endPos >= item.endPos) {
                                const size = candidate.endPos - candidate.startPos;
                                if (size < bestStructuralSize) {
                                    bestStructural = candidate.el;
                                    bestStructuralSize = size;
                                }
                            }
                        }
                        
                        return bestStructural;
                    }
                }
                return null;
            };
            
            const relevantEl = findRelevantElement(bestMatch.el) || bestMatch.el;
            console.log(`Found relevant element: ${relevantEl.tag}`);
            
            // Extract title from the relevant element
            let title = extractTitle(relevantEl);
            console.log(`Extracted title: ${title}`);
            
            // Use the most specific element's container for the path
            const container = containers.get(bestMatch.el);
            const path = container ? makePath(container) : undefined;
            
            // If we couldn't get a path from the specific element, try the relevant element
            const finalPath = path || (containers.get(relevantEl) ? makePath(containers.get(relevantEl)) : undefined);
            
            console.log(`Final path: ${finalPath}`);
            
            return {
                articleTitle: title || undefined,
                articlePath: finalPath
            };
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
            console.error("Detailed cache is null");
            return [];
        }

        const searchLower = query.toLowerCase();
        const results: SearchResultWithArticle[] = [];

        for (const law of this.detailedCache) {
            if (!law.fullText) {
                console.warn(`Law ${law.LawID} has no fullText`);
                continue;
            }
            
            const textLower = law.fullText.toLowerCase();
            const matches: Array<{ text: string; context: string; articleTitle?: string; articlePath?: string }> = [];
            
            let index = textLower.indexOf(searchLower);
            while (index !== -1 && matches.length < 5) {
                const matchText = law.fullText.substring(index, index + query.length);
                const context = this.getMatchContext(law.fullText, index);
                
                if (!law.lawData) {
                    console.warn(`Law ${law.LawID} has no lawData, cannot detect articles`);
                    matches.push({ 
                        text: matchText, 
                        context,
                        articleTitle: undefined,
                        articlePath: undefined
                    });
                } else {
                    const articleInfo = this.findArticleForMatch(law.lawData, index, law.fullText);
                    console.log(`Article info for ${law.LawID} at index ${index}:`, articleInfo);
                    
                    matches.push({ 
                        text: matchText, 
                        context,
                        ...articleInfo
                    });
                }
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
