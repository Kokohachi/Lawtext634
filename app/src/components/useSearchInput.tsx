import React from "react";
import styled from "styled-components";
import { storedLoader } from "@appsrc/lawdata/loaders";

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
    max-height: 300px;
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

interface LawSuggestion {
    LawID: string;
    LawTitle: string;
}

export const useSearchInput = (options: {
    searchInputStyle?: React.CSSProperties,
    onSelect?: (lawID: string) => void,
}) => {

    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const [editingKey, setEditingKey] = React.useState("");
    const [searchFocused, setSearchFocused] = React.useState<"on" | "leaving" | "off">("off");
    const [suggestions, setSuggestions] = React.useState<LawSuggestion[]>([]);
    const [selectedIndex, setSelectedIndex] = React.useState(-1);
    const [showDropdown, setShowDropdown] = React.useState(false);

    // Load suggestions based on input
    React.useEffect(() => {
        const loadSuggestions = async () => {
            if (editingKey.trim().length === 0) {
                setSuggestions([]);
                setShowDropdown(false);
                return;
            }

            try {
                const { lawInfos } = await storedLoader.loadLawInfosStruct();
                const filtered = lawInfos
                    .filter(info => 
                        info.LawTitle.includes(editingKey) || 
                        info.LawNum.includes(editingKey)
                    )
                    .slice(0, 10) // Limit to 10 suggestions
                    .map(info => ({
                        LawID: info.LawID,
                        LawTitle: info.LawTitle,
                    }));

                setSuggestions(filtered);
                setShowDropdown(filtered.length > 0 && searchFocused === "on");
                setSelectedIndex(-1);
            } catch (error) {
                console.error("Failed to load suggestions:", error);
                setSuggestions([]);
                setShowDropdown(false);
            }
        };

        loadSuggestions();
    }, [editingKey, searchFocused]);

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
                }, 200);
            }}
            className="form-control search-law-textbox"
            style={{
                ...options.searchInputStyle,
            }}
            placeholder="規約類名で検索" 
            aria-label="規約類名で検索"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={showDropdown}
            value={editingKey}
            autoComplete="off"
        />
    );

    const searchDropdown = showDropdown && suggestions.length > 0 ? (
        <DropdownContainer 
            ref={dropdownRef}
            id="search-suggestions"
            role="listbox"
        >
            {suggestions.map((suggestion, index) => (
                <DropdownItem
                    key={suggestion.LawID}
                    $isSelected={index === selectedIndex}
                    role="option"
                    aria-selected={index === selectedIndex}
                    onMouseDown={(e) => {
                        // Prevent blur event on input
                        e.preventDefault();
                        handleSuggestionClick(suggestion);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                >
                    {suggestion.LawTitle}
                </DropdownItem>
            ))}
        </DropdownContainer>
    ) : null;

    return {
        editingKey,
        searchInputRef,
        searchInput,
        searchDropdown,
    };
};

export default useSearchInput;
