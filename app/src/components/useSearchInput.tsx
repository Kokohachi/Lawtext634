import React from "react";
import styled from "styled-components";
import { storedLoader } from "@appsrc/lawdata/loaders";
import { fullTextSearchIndex, SearchResult } from "@appsrc/lawdata/fullTextSearch";

const DropdownContainer = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ced4da;
    border-top: none;
    border-bottom-left-radius: 0.25rem;
    border-bottom-right-radius: 0.25rem;
    max-height: 400px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const DropdownItem = styled.div<{ $isSelected: boolean }>`
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    background-color: ${props => props.$isSelected ? '#e9ecef' : 'transparent'};
    
    &:hover {
        background-color: #f8f9fa;
    }

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const FullTextDropdownItem = styled.div<{ $isSelected: boolean }>`
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    background-color: ${props => props.$isSelected ? '#e9ecef' : 'transparent'};
    
    &:hover {
        background-color: #f8f9fa;
    }
`;

const MatchContext = styled.div`
    font-size: 0.85em;
    color: #6c757d;
    margin-top: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const SearchModeToggle = styled.div`
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
`;

const ModeButton = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid #ced4da;
    background-color: ${props => props.$active ? '#007bff' : 'transparent'};
    color: ${props => props.$active ? 'white' : '#495057'};
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.2s;

    &:hover {
        background-color: ${props => props.$active ? '#0056b3' : '#e9ecef'};
    }
`;

const BLUR_DELAY_MS = 200;
const DEBOUNCE_DELAY_MS = 300;
const MAX_SUGGESTIONS = 10;

type SearchMode = "title" | "fulltext";

interface LawSuggestion {
    LawID: string;
    LawTitle: string;
    context?: string;
}

export const useSearchInput = (options: {
    searchInputStyle?: React.CSSProperties,
    onSelect?: (lawID: string) => void,
    onSearchSubmit?: (query: string, mode: SearchMode) => void,
}) => {

    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const lawInfosCacheRef = React.useRef<Array<{LawID: string, LawNum: string, LawTitle: string}> | null>(null);

    const [editingKey, setEditingKey] = React.useState("");
    const [searchFocused, setSearchFocused] = React.useState<"on" | "leaving" | "off">("off");
    const [suggestions, setSuggestions] = React.useState<LawSuggestion[]>([]);
    const [selectedIndex, setSelectedIndex] = React.useState(-1);
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [searchMode, setSearchMode] = React.useState<SearchMode>("title");
    const [isLoadingFullText, setIsLoadingFullText] = React.useState(false);

    // Load law data once and cache it
    React.useEffect(() => {
        const loadLawData = async () => {
            if (lawInfosCacheRef.current === null) {
                try {
                    const { lawInfos } = await storedLoader.loadLawInfosStruct();
                    lawInfosCacheRef.current = lawInfos;
                } catch (error) {
                    console.error("Failed to load law data:", error);
                }
            }
        };
        loadLawData();
    }, []);

    // Preload full-text search index when switching to fulltext mode
    React.useEffect(() => {
        if (searchMode === "fulltext" && !isLoadingFullText) {
            setIsLoadingFullText(true);
            fullTextSearchIndex.ensureLoaded().then(() => {
                setIsLoadingFullText(false);
            }).catch(error => {
                console.error("Failed to load full-text search index:", error);
                setIsLoadingFullText(false);
            });
        }
    }, [searchMode, isLoadingFullText]);

    // Load suggestions based on input with debounce
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (editingKey.trim().length === 0) {
                setSuggestions([]);
                setShowDropdown(false);
                return;
            }

            if (searchMode === "title") {
                // Title search mode
                if (lawInfosCacheRef.current === null) {
                    return;
                }

                const searchLower = editingKey.toLowerCase();
                const filtered = lawInfosCacheRef.current
                    .filter(info => 
                        info.LawTitle.toLowerCase().includes(searchLower) || 
                        info.LawNum.toLowerCase().includes(searchLower)
                    )
                    .slice(0, MAX_SUGGESTIONS)
                    .map(info => ({
                        LawID: info.LawID,
                        LawTitle: info.LawTitle,
                    }));

                setSuggestions(filtered);
                setShowDropdown(filtered.length > 0 && searchFocused === "on");
                setSelectedIndex(-1);
            } else {
                // Full-text search mode
                if (isLoadingFullText) {
                    setSuggestions([]);
                    setShowDropdown(false);
                    return;
                }

                const results: SearchResult[] = fullTextSearchIndex.search(editingKey, MAX_SUGGESTIONS);
                const filtered = results.map(result => ({
                    LawID: result.LawID,
                    LawTitle: result.LawTitle,
                    context: result.matches[0]?.context || "",
                }));

                setSuggestions(filtered);
                setShowDropdown(filtered.length > 0 && searchFocused === "on");
                setSelectedIndex(-1);
            }
        }, DEBOUNCE_DELAY_MS);

        return () => clearTimeout(timer);
    }, [editingKey, searchFocused, searchMode, isLoadingFullText]);

    const lawSearchKeyOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingKey(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showDropdown || suggestions.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    const selected = suggestions[selectedIndex];
                    setEditingKey(selected.LawTitle);
                    setShowDropdown(false);
                    if (options.onSelect) {
                        options.onSelect(selected.LawID);
                    }
                }
                break;
            case "Escape":
                setShowDropdown(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const handleSuggestionClick = (suggestion: LawSuggestion) => {
        setEditingKey(suggestion.LawTitle);
        setShowDropdown(false);
        setSelectedIndex(-1);
        if (options.onSelect) {
            options.onSelect(suggestion.LawID);
        }
    };

    // Scroll selected item into view
    React.useEffect(() => {
        if (selectedIndex >= 0 && dropdownRef.current) {
            const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    const modeToggle = (
        <SearchModeToggle>
            <ModeButton
                type="button"
                $active={searchMode === "title"}
                onClick={(e) => {
                    e.preventDefault();
                    setSearchMode("title");
                    setEditingKey("");
                    setSuggestions([]);
                }}
            >
                規約類名
            </ModeButton>
            <ModeButton
                type="button"
                $active={searchMode === "fulltext"}
                onClick={(e) => {
                    e.preventDefault();
                    setSearchMode("fulltext");
                    setEditingKey("");
                    setSuggestions([]);
                }}
            >
                全文検索
            </ModeButton>
        </SearchModeToggle>
    );

    const placeholderText = searchMode === "title" 
        ? "規約類名で検索" 
        : isLoadingFullText 
            ? "検索データを読み込み中..." 
            : "全文検索";

    const searchInput = (
        <input
            name="lawSearchKey"
            ref={searchInputRef}
            onChange={lawSearchKeyOnChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
                setSearchFocused("on");
                if (suggestions.length > 0 && editingKey.trim().length > 0) {
                    setShowDropdown(true);
                }
            }}
            onBlur={() => {
                // Delay to allow click events on dropdown items
                setTimeout(() => {
                    if (searchFocused !== "leaving") {
                        setSearchFocused("off");
                        setShowDropdown(false);
                    }
                }, BLUR_DELAY_MS);
            }}
            className="form-control search-law-textbox"
            style={{
                ...options.searchInputStyle,
            }}
            placeholder={placeholderText}
            aria-label={placeholderText}
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={showDropdown}
            value={editingKey}
            autoComplete="off"
            disabled={isLoadingFullText}
        />
    );

    const searchDropdown = showDropdown && suggestions.length > 0 ? (
        <DropdownContainer 
            ref={dropdownRef}
            id="search-suggestions"
            role="listbox"
        >
            {suggestions.map((suggestion, index) => {
                if (searchMode === "fulltext" && suggestion.context) {
                    return (
                        <FullTextDropdownItem
                            key={suggestion.LawID}
                            $isSelected={index === selectedIndex}
                            role="option"
                            aria-selected={index === selectedIndex}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSuggestionClick(suggestion);
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <div>{suggestion.LawTitle}</div>
                            <MatchContext>{suggestion.context}</MatchContext>
                        </FullTextDropdownItem>
                    );
                } else {
                    return (
                        <DropdownItem
                            key={suggestion.LawID}
                            $isSelected={index === selectedIndex}
                            role="option"
                            aria-selected={index === selectedIndex}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSuggestionClick(suggestion);
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            {suggestion.LawTitle}
                        </DropdownItem>
                    );
                }
            })}
        </DropdownContainer>
    ) : null;

    return {
        editingKey,
        searchInputRef,
        searchInput,
        searchDropdown,
        modeToggle,
        searchMode,
    };
};

export default useSearchInput;
