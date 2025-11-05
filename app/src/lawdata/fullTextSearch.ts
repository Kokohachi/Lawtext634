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
            
            // Find all articles with their text positions
            const findArticlesWithPositions = (el: any, currentPos: number = 0): Array<{ article: any; startPos: number; endPos: number }> => {
                if (!el || !el.children) return [];
                
                const articles: Array<{ article: any; startPos: number; endPos: number }> = [];
                let pos = currentPos;
                
                for (const child of el.children) {
                    if (typeof child === "string") {
                        pos += child.length;
                    } else {
                        const childText = typeof child.text === "function" ? child.text() : "";
                        const childStart = pos;
                        const childEnd = pos + childText.length;
                        
                        if (std.isArticle(child)) {
                            articles.push({ article: child, startPos: childStart, endPos: childEnd });
                        }
                        
                        // Recursively search in children
                        articles.push(...findArticlesWithPositions(child, pos));
                        pos = childEnd;
                    }
                }
                return articles;
            };

            const articlesWithPos = findArticlesWithPositions(law);
            
            // Find the article that contains the match
            let targetArticle: any = null;
            for (const { article, startPos, endPos } of articlesWithPos) {
                if (matchIndex >= startPos && matchIndex < endPos) {
                    targetArticle = article;
                    break;
                }
            }
            
            // If no article found by position, use the heuristic fallback
            if (!targetArticle && articlesWithPos.length > 0) {
                const textPerArticle = fullText.length / Math.max(articlesWithPos.length, 1);
                const estimatedArticleIndex = Math.floor(matchIndex / textPerArticle);
                targetArticle = articlesWithPos[Math.min(estimatedArticleIndex, articlesWithPos.length - 1)].article;
            }
            
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
                
                // Try to find more specific location (paragraph, item, etc.)
                const container = containers.get(targetArticle);
                let path = container ? makePath(container) : undefined;
                
                // Try to find the specific paragraph or item within the article
                const findSpecificElement = (el: any, targetIndex: number): any => {
                    if (!el || !el.children) return null;
                    
                    let pos = 0;
                    for (const child of el.children) {
                        if (typeof child === "string") {
                            pos += child.length;
                        } else {
                            const childText = typeof child.text === "function" ? child.text() : "";
                            const childStart = pos;
                            const childEnd = pos + childText.length;
                            
                            if (targetIndex >= childStart && targetIndex < childEnd) {
                                // Check if this is a paragraph, item, or subitem
                                if (std.isParagraph(child) || (child.tag && (child.tag === "Item" || child.tag === "Subitem1" || child.tag === "Subitem2"))) {
                                    const childContainer = containers.get(child);
                                    if (childContainer) {
                                        return childContainer;
                                    }
                                }
                                // Recursively search deeper
                                return findSpecificElement(child, targetIndex - childStart);
                            }
                            pos = childEnd;
                        }
                    }
                    return null;
                };
                
                // Calculate relative match position within the article
                const articleText = typeof targetArticle.text === "function" ? targetArticle.text() : "";
                const articleStartInFull = fullText.indexOf(articleText);
                if (articleStartInFull >= 0 && matchIndex >= articleStartInFull) {
                    const relativeMatch = matchIndex - articleStartInFull;
                    const specificContainer = findSpecificElement(targetArticle, relativeMatch);
                    if (specificContainer) {
                        path = makePath(specificContainer);
                    }
                }
                
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
