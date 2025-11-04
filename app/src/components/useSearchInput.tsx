import React from "react";

export const useSearchInput = (options: {searchInputStyle?: React.CSSProperties}) => {

    const searchInputRef = React.useRef<HTMLInputElement>(null);

    const [editingKey, setEditingKey] = React.useState("");

    const [searchFocused, setSearchFocused] = React.useState<"on" | "leaving" | "off">("off");

    const lawSearchKeyOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingKey(e.target.value);
    };

    const searchInput = (
        <input
            name="lawSearchKey"
            ref={searchInputRef}
            onChange={lawSearchKeyOnChange}
            onFocus={() => {
                setSearchFocused("on");
            }}
            onBlur={() => {
                if (searchFocused !== "leaving") {
                    setSearchFocused("off");
                }
            }}
            className="form-control search-law-textbox"
            style={{
                ...options.searchInputStyle,
            }}
            placeholder="規約類名で検索" aria-label="規約類名で検索"
            value={editingKey}
        />);

    const searchDropdown = <></>;

    return {
        editingKey,
        searchInputRef,
        searchInput,
        searchDropdown,
    };
};

export default useSearchInput;
