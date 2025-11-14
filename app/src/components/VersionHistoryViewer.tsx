import React, { useState } from "react";
import styled from "styled-components";
import type { RegulationVersions, Version } from "../lawdata/versions";
import { getVersionsSortedByDate } from "../lawdata/versions";

const VersionHistoryContainer = styled.div`
    background-color: #ffffff;
    border: 1px solid #d1d5da;
    border-radius: 6px;
    overflow: hidden;
`;

const VersionHistoryHeader = styled.div`
    padding: 16px;
    background-color: #f6f8fa;
    border-bottom: 1px solid #d1d5da;
    font-weight: 600;
    font-size: 16px;
`;

const VersionList = styled.div`
    max-height: 400px;
    overflow-y: auto;
`;

const VersionItem = styled.div<{ $isSelected: boolean; $isCurrent: boolean }>`
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    background-color: ${props => props.$isSelected ? '#e6f2ff' : '#ffffff'};
    border-left: ${props => props.$isCurrent ? '4px solid #0969da' : '4px solid transparent'};
    
    &:hover {
        background-color: ${props => props.$isSelected ? '#d0e8ff' : '#f6f8fa'};
    }
    
    &:last-child {
        border-bottom: none;
    }
`;

const VersionTitle = styled.div`
    font-weight: 600;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const VersionBadge = styled.span<{ $status: string }>`
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    background-color: ${props => {
        switch (props.$status) {
            case 'current': return '#ddf4ff';
            case 'superseded': return '#fff8c5';
            case 'abolished': return '#ffebe9';
            default: return '#f6f8fa';
        }
    }};
    color: ${props => {
        switch (props.$status) {
            case 'current': return '#0969da';
            case 'superseded': return '#9a6700';
            case 'abolished': return '#cf222e';
            default: return '#57606a';
        }
    }};
`;

const VersionDate = styled.div`
    font-size: 13px;
    color: #57606a;
    margin-bottom: 4px;
`;

const VersionAmendments = styled.div`
    font-size: 13px;
    color: #57606a;
    margin-top: 8px;
`;

const AmendmentItem = styled.div`
    padding: 4px 0;
    font-size: 12px;
`;

const CompareButton = styled.button`
    margin: 16px;
    padding: 8px 16px;
    background-color: #0969da;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    
    &:hover {
        background-color: #0860ca;
    }
    
    &:disabled {
        background-color: #94a3b8;
        cursor: not-allowed;
    }
`;

const CompareSelection = styled.div`
    padding: 12px 16px;
    background-color: #f6f8fa;
    border-top: 1px solid #d1d5da;
    font-size: 13px;
    color: #57606a;
`;

interface VersionHistoryViewerProps {
    regulation: RegulationVersions;
    onVersionSelect?: (version: Version) => void;
    onCompareVersions?: (oldVersion: Version, newVersion: Version) => void;
}

export const VersionHistoryViewer: React.FC<VersionHistoryViewerProps> = ({
    regulation,
    onVersionSelect,
    onCompareVersions,
}) => {
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
    const [compareBaseVersion, setCompareBaseVersion] = useState<Version | null>(null);

    const sortedVersions = getVersionsSortedByDate(regulation);

    const handleVersionClick = (version: Version) => {
        if (compareBaseVersion) {
            // Second selection for comparison
            if (compareBaseVersion.id !== version.id) {
                const [older, newer] = compareBaseVersion.date < version.date 
                    ? [compareBaseVersion, version]
                    : [version, compareBaseVersion];
                onCompareVersions?.(older, newer);
                setCompareBaseVersion(null);
            } else {
                setCompareBaseVersion(null);
            }
        } else {
            setSelectedVersion(version);
            onVersionSelect?.(version);
        }
    };

    const startCompare = () => {
        if (selectedVersion) {
            setCompareBaseVersion(selectedVersion);
        }
    };

    const getStatusLabel = (status: string): string => {
        switch (status) {
            case 'current': return '現行';
            case 'superseded': return '改正済';
            case 'abolished': return '廃止';
            default: return status;
        }
    };

    return (
        <VersionHistoryContainer>
            <VersionHistoryHeader>
                改正履歴 ({regulation.baseName})
            </VersionHistoryHeader>
            <VersionList>
                {sortedVersions.map((version) => (
                    <VersionItem
                        key={version.id}
                        $isSelected={selectedVersion?.id === version.id || compareBaseVersion?.id === version.id}
                        $isCurrent={version.status === 'current'}
                        onClick={() => handleVersionClick(version)}
                    >
                        <VersionTitle>
                            {version.title}
                            <VersionBadge $status={version.status}>
                                {getStatusLabel(version.status)}
                            </VersionBadge>
                        </VersionTitle>
                        <VersionDate>
                            制定日: {version.date}
                        </VersionDate>
                        {version.amendments.length > 0 && (
                            <VersionAmendments>
                                <strong>改正内容:</strong>
                                {version.amendments.map((amendment, index) => (
                                    <AmendmentItem key={index}>
                                        • {amendment.type}: {amendment.description}
                                    </AmendmentItem>
                                ))}
                            </VersionAmendments>
                        )}
                        {version.amendedBy.length > 0 && (
                            <VersionAmendments>
                                <strong>改正元:</strong>
                                {version.amendedBy.map((amendingRegulation, index) => (
                                    <AmendmentItem key={index}>
                                        • {amendingRegulation}
                                    </AmendmentItem>
                                ))}
                            </VersionAmendments>
                        )}
                    </VersionItem>
                ))}
            </VersionList>
            {selectedVersion && !compareBaseVersion && (
                <CompareButton
                    onClick={startCompare}
                    disabled={sortedVersions.length < 2}
                >
                    他のバージョンと比較
                </CompareButton>
            )}
            {compareBaseVersion && (
                <CompareSelection>
                    比較モード: {compareBaseVersion.title} を選択中。比較するバージョンをクリックしてください。
                </CompareSelection>
            )}
        </VersionHistoryContainer>
    );
};
