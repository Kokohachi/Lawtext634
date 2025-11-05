import React from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fullTextSearchIndex, SearchResultWithArticle } from "../lawdata/fullTextSearch";

const PageContainer = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
`;

const Header = styled.div`
    margin-bottom: 2rem;
`;

const Title = styled.h1`
    font-size: 2rem;
    margin-bottom: 1rem;
    color: #333;
`;

const SearchQuery = styled.div`
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 0.5rem;
`;

const ResultCount = styled.div`
    font-size: 1rem;
    color: #999;
`;

const ResultsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2rem;
`;

const LawSection = styled.div`
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0;
    background: white;
`;

const LawTitleBar = styled.div`
    font-size: 1.2rem;
    font-weight: bold;
    padding: 1rem 1.5rem;
    color: #333;
    background: #f8f9fa;
    border-bottom: 1px solid #ddd;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    
    &:hover {
        background: #e9ecef;
    }
`;

const MatchCount = styled.span`
    font-size: 0.9rem;
    font-weight: normal;
    color: #666;
`;

const ExpandIcon = styled.span<{ $isExpanded: boolean }>`
    font-size: 0.8rem;
    transition: transform 0.2s ease;
    transform: ${props => props.$isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};
`;

const MatchesContainer = styled.div<{ $isExpanded: boolean }>`
    max-height: ${props => props.$isExpanded ? 'none' : '0'};
    overflow: hidden;
    transition: max-height 0.3s ease;
`;

const MatchItem = styled.div`
    padding: 1rem 1.5rem;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
        border-bottom: none;
    }
    
    &:hover {
        background: #f8f9fa;
    }
`;

const ArticleInfo = styled.div`
    font-size: 0.95rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #333;
`;

const MatchContext = styled.div`
    font-size: 0.9rem;
    color: #555;
    line-height: 1.6;
    
    mark {
        background-color: #ffeb3b;
        padding: 0.2em 0;
        font-weight: 500;
    }
`;

const BackButton = styled.button`
    padding: 0.5rem 1rem;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    margin-bottom: 1rem;
    
    &:hover {
        background: #5a6268;
    }
`;

const NoResults = styled.div`
    text-align: center;
    padding: 3rem;
    color: #999;
    font-size: 1.2rem;
`;

export const SearchResultsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const query = searchParams.get("q") || "";
    
    const [results, setResults] = React.useState<SearchResultWithArticle[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [expandedLaws, setExpandedLaws] = React.useState<Set<number>>(new Set());

    React.useEffect(() => {
        const performSearch = async () => {
            if (!query) {
                setResults([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            await fullTextSearchIndex.ensureLoaded();
            const searchResults = await fullTextSearchIndex.searchWithArticles(query);
            setResults(searchResults);
            // Expand all laws by default
            setExpandedLaws(new Set(searchResults.map((_, i) => i)));
            setIsLoading(false);
        };

        performSearch();
    }, [query]);

    const toggleLawExpansion = (index: number) => {
        setExpandedLaws(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const highlightMatch = (context: string, query: string): React.ReactNode => {
        const lowerContext = context.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let index = lowerContext.indexOf(lowerQuery);

        while (index !== -1) {
            // Add text before match
            if (index > lastIndex) {
                parts.push(context.substring(lastIndex, index));
            }
            // Add highlighted match
            parts.push(
                <mark key={index}>
                    {context.substring(index, index + query.length)}
                </mark>
            );
            lastIndex = index + query.length;
            index = lowerContext.indexOf(lowerQuery, lastIndex);
        }
        
        // Add remaining text
        if (lastIndex < context.length) {
            parts.push(context.substring(lastIndex));
        }

        return <>{parts}</>;
    };

    const handleMatchClick = (lawID: string, articlePath?: string) => {
        const url = articlePath ? `/${lawID}/${articlePath}` : `/${lawID}`;
        navigate(url);
    };

    const getTotalMatches = () => {
        return results.reduce((sum, result) => sum + result.matches.length, 0);
    };

    return (
        <PageContainer>
            <Header>
                <BackButton onClick={() => navigate(-1)}>← 戻る</BackButton>
                <Title>全文検索結果</Title>
                <SearchQuery>検索語: 「{query}」</SearchQuery>
                {!isLoading && (
                    <ResultCount>
                        {results.length > 0 
                            ? `${results.length}件の規約類で${getTotalMatches()}個の一致が見つかりました`
                            : "結果が見つかりませんでした"
                        }
                    </ResultCount>
                )}
            </Header>

            {isLoading ? (
                <NoResults>検索中...</NoResults>
            ) : results.length === 0 ? (
                <NoResults>「{query}」に一致する結果が見つかりませんでした</NoResults>
            ) : (
                <ResultsList>
                    {results.map((result, resultIndex) => {
                        const isExpanded = expandedLaws.has(resultIndex);
                        return (
                            <LawSection key={resultIndex}>
                                <LawTitleBar onClick={() => toggleLawExpansion(resultIndex)}>
                                    <div>
                                        <ExpandIcon $isExpanded={isExpanded}>▶</ExpandIcon>{" "}
                                        {result.LawTitle}
                                    </div>
                                    <MatchCount>{result.matches.length}件</MatchCount>
                                </LawTitleBar>
                                <MatchesContainer $isExpanded={isExpanded}>
                                    {result.matches.map((match, matchIndex) => (
                                        <MatchItem 
                                            key={matchIndex}
                                            onClick={() => handleMatchClick(result.LawID, match.articlePath)}
                                        >
                                            <ArticleInfo>
                                                {match.articleTitle || "（該当箇所）"}
                                            </ArticleInfo>
                                            <MatchContext>
                                                {highlightMatch(match.context, query)}
                                            </MatchContext>
                                        </MatchItem>
                                    ))}
                                </MatchesContainer>
                            </LawSection>
                        );
                    })}
                </ResultsList>
            )}
        </PageContainer>
    );
};
