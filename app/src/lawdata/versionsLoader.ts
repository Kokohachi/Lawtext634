import type { VersionsMetadata } from "./versions";

let cachedVersionsMetadata: VersionsMetadata | null = null;

/**
 * Load versions metadata from the data directory
 */
export async function loadVersionsMetadata(): Promise<VersionsMetadata> {
    if (cachedVersionsMetadata) {
        return cachedVersionsMetadata;
    }

    try {
        const response = await fetch('./data/versions.json');
        if (!response.ok) {
            throw new Error(`Failed to load versions metadata: ${response.statusText}`);
        }
        const metadata = await response.json();
        cachedVersionsMetadata = metadata;
        return metadata;
    } catch (error) {
        console.error('Error loading versions metadata:', error);
        // Return empty metadata if file doesn't exist
        return {};
    }
}

/**
 * Get versions for a specific regulation by base name
 */
export async function getRegulationVersions(baseName: string): Promise<import("./versions").RegulationVersions | null> {
    const metadata = await loadVersionsMetadata();
    return metadata[baseName] || null;
}

/**
 * Extract base name from law title
 * Removes year and number information from the title
 */
export function extractBaseName(title: string): string {
    // Remove patterns like （令和七年規約）, （令和六年細則第二号）, etc.
    const cleaned = title.replace(/[（(]令和.+?[）)]/g, '').trim();
    return cleaned;
}
