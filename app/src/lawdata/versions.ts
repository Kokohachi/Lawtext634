/**
 * Types and utilities for regulation version history and amendments
 */

export interface Amendment {
    type: "全部改正" | "一部改正";
    description: string;
    previousVersion?: string;
    articles?: string[];
}

export interface Version {
    id: string;
    year: string;
    number: string;
    title: string;
    filename: string;
    date: string;
    status: "current" | "superseded" | "abolished";
    amendedBy: string[];
    amendments: Amendment[];
}

export interface RegulationVersions {
    baseName: string;
    versions: Version[];
}

export type VersionsMetadata = Record<string, RegulationVersions>;

/**
 * Get the current version of a regulation
 */
export function getCurrentVersion(regulation: RegulationVersions): Version | null {
    const current = regulation.versions.find(v => v.status === "current");
    return current || null;
}

/**
 * Get all versions sorted by date (newest first)
 */
export function getVersionsSortedByDate(regulation: RegulationVersions): Version[] {
    return [...regulation.versions].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}

/**
 * Get version by ID
 */
export function getVersionById(regulation: RegulationVersions, versionId: string): Version | null {
    return regulation.versions.find(v => v.id === versionId) || null;
}

/**
 * Check if a regulation has multiple versions
 */
export function hasMultipleVersions(regulation: RegulationVersions): boolean {
    return regulation.versions.length > 1;
}
