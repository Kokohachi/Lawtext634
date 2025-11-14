import React, { useMemo } from "react";
import styled from "styled-components";
import * as Diff from "diff";

const DiffViewerContainer = styled.div`
    font-family: 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.5;
    background-color: #ffffff;
    border: 1px solid #d1d5da;
    border-radius: 6px;
    overflow: auto;
    max-height: 80vh;
`;

const DiffViewerModeSelector = styled.div`
    padding: 12px 16px;
    background-color: #f6f8fa;
    border-bottom: 1px solid #d1d5da;
    display: flex;
    gap: 8px;
`;

const ModeButton = styled.button<{ $active: boolean }>`
    padding: 6px 12px;
    border: 1px solid #d1d5da;
    border-radius: 6px;
    background-color: ${props => props.$active ? '#0969da' : '#ffffff'};
    color: ${props => props.$active ? '#ffffff' : '#24292f'};
    cursor: pointer;
    font-size: 14px;

    &:hover {
        background-color: ${props => props.$active ? '#0860ca' : '#f3f4f6'};
    }
`;

const SplitViewContainer = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid #d1d5da;
`;

const SplitViewSide = styled.div<{ $side: 'left' | 'right' }>`
    border-right: ${props => props.$side === 'left' ? '1px solid #d1d5da' : 'none'};
`;

const SplitViewHeader = styled.div`
    padding: 8px 16px;
    background-color: #f6f8fa;
    font-weight: 600;
    border-bottom: 1px solid #d1d5da;
`;

const UnifiedViewContainer = styled.div`
    padding: 0;
`;

const DiffLine = styled.div<{ $type: 'added' | 'removed' | 'context' | 'header' }>`
    display: flex;
    background-color: ${props => {
        switch (props.$type) {
            case 'added': return '#ccffd8';
            case 'removed': return '#ffd7d5';
            case 'header': return '#f6f8fa';
            default: return '#ffffff';
        }
    }};
    border-bottom: 1px solid ${props => props.$type === 'header' ? '#d1d5da' : 'transparent'};
    
    &:hover {
        background-color: ${props => {
            switch (props.$type) {
                case 'added': return '#b3f0c2';
                case 'removed': return '#ffc1bf';
                case 'header': return '#f6f8fa';
                default: return '#f6f8fa';
            }
        }};
    }
`;

const LineNumber = styled.span`
    display: inline-block;
    width: 50px;
    padding: 0 8px;
    text-align: right;
    color: #57606a;
    user-select: none;
    flex-shrink: 0;
`;

const LineContent = styled.span<{ $type: 'added' | 'removed' | 'context' | 'header' }>`
    padding: 0 8px;
    flex: 1;
    white-space: pre-wrap;
    word-break: break-all;
    
    ${props => props.$type === 'header' && `
        font-weight: 600;
        color: #57606a;
    `}
`;

const LinePrefix = styled.span<{ $type: 'added' | 'removed' | 'context' }>`
    display: inline-block;
    width: 20px;
    text-align: center;
    color: ${props => {
        switch (props.$type) {
            case 'added': return '#1a7f37';
            case 'removed': return '#cf222e';
            default: return 'transparent';
        }
    }};
    font-weight: bold;
    user-select: none;
`;

interface DiffViewerProps {
    oldText: string;
    newText: string;
    oldTitle?: string;
    newTitle?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
    oldText,
    newText,
    oldTitle = "旧版",
    newTitle = "新版",
}) => {
    const [viewMode, setViewMode] = React.useState<'split' | 'unified'>('split');

    const diffResult = useMemo(() => {
        return Diff.diffLines(oldText, newText);
    }, [oldText, newText]);

    const renderUnifiedView = () => {
        let oldLineNum = 1;
        let newLineNum = 1;

        return (
            <UnifiedViewContainer>
                {diffResult.map((part, index) => {
                    const lines = part.value.split('\n');
                    // Remove last empty line if exists
                    if (lines[lines.length - 1] === '') {
                        lines.pop();
                    }

                    return lines.map((line, lineIndex) => {
                        const type = part.added ? 'added' : part.removed ? 'removed' : 'context';
                        const oldNum = !part.added ? oldLineNum++ : null;
                        const newNum = !part.removed ? newLineNum++ : null;

                        return (
                            <DiffLine key={`${index}-${lineIndex}`} $type={type}>
                                <LineNumber>{oldNum !== null ? oldNum : ''}</LineNumber>
                                <LineNumber>{newNum !== null ? newNum : ''}</LineNumber>
                                <LinePrefix $type={type}>
                                    {type === 'added' ? '+' : type === 'removed' ? '-' : ' '}
                                </LinePrefix>
                                <LineContent $type={type}>{line || ' '}</LineContent>
                            </DiffLine>
                        );
                    });
                })}
            </UnifiedViewContainer>
        );
    };

    const renderSplitView = () => {
        // For split view with highlighting, we need to process diffs differently
        let oldLineIndex = 0;
        let newLineIndex = 0;
        const leftSideElements: React.JSX.Element[] = [];
        const rightSideElements: React.JSX.Element[] = [];

        diffResult.forEach((part, partIndex) => {
            const lines = part.value.split('\n');
            if (lines[lines.length - 1] === '') {
                lines.pop();
            }

            if (part.removed) {
                lines.forEach((line, lineIndex) => {
                    leftSideElements.push(
                        <DiffLine key={`left-${partIndex}-${lineIndex}`} $type="removed">
                            <LineNumber>{oldLineIndex + 1}</LineNumber>
                            <LinePrefix $type="removed">-</LinePrefix>
                            <LineContent $type="removed">{line || ' '}</LineContent>
                        </DiffLine>
                    );
                    oldLineIndex++;
                });
            } else if (part.added) {
                lines.forEach((line, lineIndex) => {
                    rightSideElements.push(
                        <DiffLine key={`right-${partIndex}-${lineIndex}`} $type="added">
                            <LineNumber>{newLineIndex + 1}</LineNumber>
                            <LinePrefix $type="added">+</LinePrefix>
                            <LineContent $type="added">{line || ' '}</LineContent>
                        </DiffLine>
                    );
                    newLineIndex++;
                });
            } else {
                lines.forEach((line, lineIndex) => {
                    leftSideElements.push(
                        <DiffLine key={`left-${partIndex}-${lineIndex}`} $type="context">
                            <LineNumber>{oldLineIndex + 1}</LineNumber>
                            <LineContent $type="context">{line || ' '}</LineContent>
                        </DiffLine>
                    );
                    rightSideElements.push(
                        <DiffLine key={`right-${partIndex}-${lineIndex}`} $type="context">
                            <LineNumber>{newLineIndex + 1}</LineNumber>
                            <LineContent $type="context">{line || ' '}</LineContent>
                        </DiffLine>
                    );
                    oldLineIndex++;
                    newLineIndex++;
                });
            }
        });

        return (
            <SplitViewContainer>
                <SplitViewSide $side="left">
                    <SplitViewHeader>{oldTitle}</SplitViewHeader>
                    {leftSideElements}
                </SplitViewSide>
                <SplitViewSide $side="right">
                    <SplitViewHeader>{newTitle}</SplitViewHeader>
                    {rightSideElements}
                </SplitViewSide>
            </SplitViewContainer>
        );
    };

    return (
        <DiffViewerContainer>
            <DiffViewerModeSelector>
                <ModeButton
                    $active={viewMode === 'split'}
                    onClick={() => setViewMode('split')}
                >
                    分割表示
                </ModeButton>
                <ModeButton
                    $active={viewMode === 'unified'}
                    onClick={() => setViewMode('unified')}
                >
                    統合表示
                </ModeButton>
            </DiffViewerModeSelector>
            {viewMode === 'split' ? renderSplitView() : renderUnifiedView()}
        </DiffViewerContainer>
    );
};
