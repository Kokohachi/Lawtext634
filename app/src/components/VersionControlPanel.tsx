import React, { useState, useEffect } from "react";
import styled from "styled-components";
import type { RegulationVersions, Version } from "../lawdata/versions";
import { VersionHistoryViewer } from "./VersionHistoryViewer";
import { DiffViewer } from "./DiffViewer";

const VersionControlContainer = styled.div`
    margin: 20px 0;
    background-color: #ffffff;
    border: 1px solid #d1d5da;
    border-radius: 6px;
`;

const TabContainer = styled.div`
    display: flex;
    border-bottom: 1px solid #d1d5da;
    background-color: #f6f8fa;
    border-radius: 6px 6px 0 0;
`;

const Tab = styled.button<{ $active: boolean }>`
    padding: 12px 24px;
    border: none;
    background-color: ${props => props.$active ? '#ffffff' : 'transparent'};
    color: ${props => props.$active ? '#24292f' : '#57606a'};
    font-weight: ${props => props.$active ? '600' : '400'};
    cursor: pointer;
    border-bottom: ${props => props.$active ? '2px solid #0969da' : '2px solid transparent'};
    transition: all 0.2s;
    
    &:hover {
        background-color: ${props => props.$active ? '#ffffff' : '#e6e6e6'};
    }
`;

const TabContent = styled.div`
    padding: 20px;
`;

const VersionSelector = styled.div`
    margin-bottom: 16px;
    padding: 12px;
    background-color: #f6f8fa;
    border: 1px solid #d1d5da;
    border-radius: 6px;
`;

const VersionSelectorLabel = styled.div`
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 14px;
`;

const VersionSelect = styled.select`
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5da;
    border-radius: 6px;
    font-size: 14px;
    background-color: #ffffff;
    cursor: pointer;
    
    &:focus {
        outline: none;
        border-color: #0969da;
        box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
    }
`;

interface VersionControlPanelProps {
    regulation: RegulationVersions;
    currentVersionId?: string;
    navigate: (path: string) => void;
}

export const VersionControlPanel: React.FC<VersionControlPanelProps> = ({
    regulation,
    currentVersionId,
    navigate,
}) => {
    const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
    const [compareOldVersion, setCompareOldVersion] = useState<Version | null>(null);
    const [compareNewVersion, setCompareNewVersion] = useState<Version | null>(null);
    const [oldText, setOldText] = useState<string>("");
    const [newText, setNewText] = useState<string>("");

    const currentVersion = regulation.versions.find(v => v.status === 'current') || regulation.versions[0];

    useEffect(() => {
        if (currentVersionId) {
            const version = regulation.versions.find(v => v.id === currentVersionId);
            if (version) {
                setSelectedVersion(version);
            }
        } else {
            setSelectedVersion(currentVersion);
        }
    }, [currentVersionId, regulation, currentVersion]);

    const loadVersionText = async (version: Version): Promise<string> => {
        try {
            const path = `./data/lawdata/${version.filename}`;
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${path}`);
            }
            const text = await response.text();
            return text;
        } catch (err) {
            console.error(`Failed to load version ${version.id}:`, err);
            throw new Error(`バージョン ${version.title} の読み込みに失敗しました`);
        }
    };

    const handleCompareVersions = async (oldVersion: Version, newVersion: Version) => {
        try {
            const [oldContent, newContent] = await Promise.all([
                loadVersionText(oldVersion),
                loadVersionText(newVersion),
            ]);
            setOldText(oldContent);
            setNewText(newContent);
            setCompareOldVersion(oldVersion);
            setCompareNewVersion(newVersion);
            // Stay on history tab to show the comparison
        } catch (err) {
            console.error('Failed to load versions for comparison:', err);
            alert(err instanceof Error ? err.message : 'バージョンの読み込みに失敗しました');
        }
    };

    const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const versionId = e.target.value;
        const version = regulation.versions.find(v => v.id === versionId);
        if (version) {
            setSelectedVersion(version);
            // Navigate to the selected version's file
            // Use the title (filename without .law.txt extension) as the navigation path
            const lawId = version.filename.replace(".law.txt", "");
            navigate(`/${encodeURIComponent(lawId)}`);
        }
    };

    return (
        <VersionControlContainer>
            <TabContainer>
                <Tab
                    $active={activeTab === 'current'}
                    onClick={() => setActiveTab('current')}
                >
                    現行版
                </Tab>
                <Tab
                    $active={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                >
                    改正履歴・比較
                </Tab>
            </TabContainer>
            <TabContent>
                {activeTab === 'current' && (
                    <div>
                        <VersionSelector>
                            <VersionSelectorLabel>表示するバージョン:</VersionSelectorLabel>
                            <VersionSelect
                                value={selectedVersion?.id || ''}
                                onChange={handleVersionChange}
                            >
                                {regulation.versions.map(version => (
                                    <option key={version.id} value={version.id}>
                                        {version.title} ({version.status === 'current' ? '現行' : version.date})
                                    </option>
                                ))}
                            </VersionSelect>
                        </VersionSelector>
                        {selectedVersion && (
                            <div>
                                <h3>{selectedVersion.title}</h3>
                                <p>制定日: {selectedVersion.date}</p>
                                <p>状態: {selectedVersion.status === 'current' ? '現行' : selectedVersion.status === 'superseded' ? '改正済' : '廃止'}</p>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'history' && (
                    <>
                        <VersionHistoryViewer
                            regulation={regulation}
                            onVersionSelect={setSelectedVersion}
                            onCompareVersions={handleCompareVersions}
                        />
                        {compareOldVersion && compareNewVersion && oldText && newText && (
                            <div style={{ marginTop: '20px', borderTop: '2px solid #d1d5da', paddingTop: '20px' }}>
                                <h3 style={{ marginBottom: '16px' }}>差分表示</h3>
                                <DiffViewer
                                    oldText={oldText}
                                    newText={newText}
                                    oldTitle={compareOldVersion.title}
                                    newTitle={compareNewVersion.title}
                                />
                                <button
                                    onClick={() => {
                                        setCompareOldVersion(null);
                                        setCompareNewVersion(null);
                                        setOldText("");
                                        setNewText("");
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: '#57606a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        marginTop: '12px',
                                    }}
                                >
                                    比較を終了
                                </button>
                            </div>
                        )}
                    </>
                )}
            </TabContent>
        </VersionControlContainer>
    );
};
