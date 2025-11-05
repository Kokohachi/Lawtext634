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
    gap: 1.5rem;
`;

const ResultCard = styled.div`
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    
    &:hover {
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
`;

const LawTitle = styled.h2`
    font-size: 1.3rem;
    margin-bottom: 1rem;
    color: #2c3e50;
`;

const MatchItem = styled.div`
    margin-bottom: 0.8rem;
    padding: 0.8rem;
    background: #f8f9fa;
    border-left: 3px solid #007bff;
    border-radius: 4px;
`;

const ArticleLink = styled.a`
    color: #007bff;
    text-decoration: none;
    font-weight: 500;
    margin-bottom: 0.5rem;
    display: block;
    
    &:hover {
        text-decoration: underline;
    }
`;

const MatchContext = styled.div`
    font-size: 0.95rem;
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

    React.useEffect(() => {
        const performSearch = async () => {
            if (!query) {
                setResults([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            await fullTextSearchIndex.ensureLoaded();
            const searchResults = await fullTextSearchIndex.searchWithArticles(query, 50);
            setResults(searchResults);
            setIsLoading(false);
        };

        performSearch();
    }, [query]);

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

    return (
        <PageContainer>
            <Header>
                <BackButton onClick={() => navigate(-1)}>← 戻る</BackButton>
                <Title>全文検索結果</Title>
                <SearchQuery>検索語: 「{query}」</SearchQuery>
                {!isLoading && (
                    <ResultCount>
                        {results.length > 0 
                            ? `${results.length}件の規約類で見つかりました`
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
                    {results.map((result, resultIndex) => (
                        <ResultCard key={resultIndex}>
                            <LawTitle>{result.LawTitle}</LawTitle>
                            {result.matches.map((match, matchIndex) => (
                                <MatchItem key={matchIndex}>
                                    <ArticleLink 
                                        href={`#/${result.LawID}${match.articlePath ? `/${match.articlePath}` : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigate(`/${result.LawID}${match.articlePath ? `/${match.articlePath}` : ''}`);
                                        }}
                                    >
                                        {match.articleTitle || "該当箇所"}へ
                                    </ArticleLink>
                                    <MatchContext>
                                        {highlightMatch(match.context, query)}
                                    </MatchContext>
                                </MatchItem>
                            ))}
                        </ResultCard>
                    ))}
                </ResultsList>
            )}
        </PageContainer>
    );
};
