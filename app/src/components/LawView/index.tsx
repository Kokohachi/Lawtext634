import React, { useCallback, useMemo, useState, useEffect } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { HTMLLaw } from "lawtext/dist/src/renderer/rules/law";
import type { LawtextAppPageStateStruct, OrigSetLawtextAppPageState } from "../LawtextAppPageState";
import type { LawData } from "@appsrc/lawdata/common";
import type { HTMLOptions, HTMLGetFigData } from "lawtext/dist/src/renderer/common/html";
import htmlCSS from "lawtext/dist/src/renderer/rules/htmlCSS";
import type { LawViewOptions } from "./common";
import { WrapLawComponent } from "./LawWrapper";
import useAfterMountTasks from "./useAfterMountTask";
import ControlGlobalStyle from "./controls/ControlGlobalStyle";
import parsePath from "lawtext/dist/src/path/v1/parse";
import type { PathFragment } from "lawtext/dist/src/path/v1/common";
import locatePath from "lawtext/dist/src/path/v1/locate";
import { scrollToLawAnchor } from "../../actions/scroll";
import { HTMLParagraphItemMenuCSS } from "./controls/WrapHTMLParagraphItem";
import { HTMLToplevelAndArticlesMenuCSS } from "./controls/WrapHTMLToplevelAndArticles";
import { VersionControlPanel } from "../VersionControlPanel";
import { extractBaseName, getRegulationVersions } from "@appsrc/lawdata/versionsLoader";
import type { RegulationVersions } from "@appsrc/lawdata/versions";


const GlobalStyle = createGlobalStyle`

div.paragraph-item-decoration-left-border {
    @media (max-width: 767.98px) {
        margin-left: -0.7em;
    }
}
`;

const LawViewDiv = styled.div`
    padding: 2rem 3rem 10rem 3rem;
    @media (max-width: 767.98px) {
        padding: 4rem 1.5rem 10rem 1.5rem;
    }
`;

export const LawView: React.FC<LawtextAppPageStateStruct> = props => {
    const { origState, origSetState } = props;

    const onError = useCallback((error: Error) => {
        origSetState(prev => ({ ...prev, hasError: true, errors: [...prev.errors, error] }));
    }, [origSetState]);

    const MemoLawDataComponent = React.useMemo(() => React.memo(LawDataComponent), []);

    const [prevPath, setPrevPath] = useState("");
    React.useEffect(() => {
        if (prevPath !== origState.navigatedPath) {
            if (origState.law) {

                let restPath: PathFragment[] | null = null;

                {
                    const m = /^v1:(.+)$/.exec(origState.navigatedPath);
                    if (m) {
                        const parsedPath = parsePath(m[1]);
                        if (parsedPath.ok && parsedPath.value.length > 1 && parsedPath.value[0].type === "LAW") {
                            restPath = parsedPath.value.slice(1);
                        }
                    } else {
                        const m = /^.+?\/(.+)$/.exec(origState.navigatedPath);
                        if (m) {
                            const parsedPath = parsePath(m[1]);
                            if (parsedPath.ok && parsedPath.value.length >= 1) {
                                restPath = parsedPath.value;
                            }
                        }
                    }
                }

                if (restPath){
                    const located = locatePath(origState.law.analysis.rootContainer, restPath, []);
                    if (located.ok) {
                        scrollToLawAnchor(located.value.container.el.id.toString());
                    } else {
                        console.error(located);
                        if (located.partialValue){
                            scrollToLawAnchor(located.partialValue.container.el.id.toString());
                        }
                    }
                }
            }
            setPrevPath(origState.navigatedPath);
        }
    }, [prevPath, origState.navigatedPath, origState.law]);

    const firstPart = props.origState.navigatedPath.split("/")[0];

    return (
        <LawViewDiv>
            <style>
                {htmlCSS}
            </style>
            <GlobalStyle />
            <ControlGlobalStyle/>
            <HTMLParagraphItemMenuCSS/>
            <HTMLToplevelAndArticlesMenuCSS/>
            {origState.hasError && <LawViewError {...props} />}
            {origState.law &&
            // (origState.navigatedPath === props.path) &&
                <MemoLawDataComponent lawData={origState.law} onError={onError} origSetState={origSetState} firstPart={firstPart} />
            }
        </LawViewDiv>
    );
};

const LawViewErrorDiv = styled.div`
`;

const LawViewError: React.FC<LawtextAppPageStateStruct> = props => {
    const { origState } = props;
    return (
        <LawViewErrorDiv className="alert alert-danger">
            レンダリング時に{origState.errors.length}個のエラーが発生しました
        </LawViewErrorDiv>
    );
};

const LawDataComponent: React.FC<{
    lawData: LawData,
    onError: (error: Error) => unknown,
    origSetState: OrigSetLawtextAppPageState,
    firstPart: string,
}> = props => {
    const { lawData, onError, origSetState, firstPart } = props;

    const { addAfterMountTask } = useAfterMountTasks(origSetState);
    
    const [regulationVersions, setRegulationVersions] = useState<RegulationVersions | null>(null);
    const [showVersionControl, setShowVersionControl] = useState(false);

    useEffect(() => {
        // Try to get the law title from the lawData
        const getLawTitle = () => {
            // Find LawBody child
            const lawBody = lawData.el.children.find(c => typeof c !== 'string' && c.tag === "LawBody");
            if (lawBody && typeof lawBody !== 'string') {
                // Find LawTitle within LawBody
                const lawTitle = lawBody.children.find(c => typeof c !== 'string' && c.tag === "LawTitle");
                if (lawTitle && typeof lawTitle !== 'string' && lawTitle.children.length > 0) {
                    // Extract text from children
                    const text = lawTitle.children
                        .filter(c => typeof c === 'string')
                        .join('');
                    return text || null;
                }
            }
            return null;
        };

        const loadVersions = async () => {
            const title = getLawTitle();
            console.log('[VersionControl] Law title:', title);
            if (title) {
                const baseName = extractBaseName(title);
                console.log('[VersionControl] Base name:', baseName);
                const versions = await getRegulationVersions(baseName);
                console.log('[VersionControl] Loaded versions:', versions);
                if (versions && versions.versions.length > 0) {
                    setRegulationVersions(versions);
                    setShowVersionControl(versions.versions.length > 1);
                    console.log('[VersionControl] Show control:', versions.versions.length > 1);
                }
            }
        };

        loadVersions();
    }, [lawData]);

    const getFigData = useCallback((src: string) => {
        return lawData.pictURL.get(src) ?? null;
    }, [lawData]) as HTMLGetFigData;

    const options: LawViewOptions = useMemo(() => ({
        onError,
        lawData,
        addAfterMountTask,
        firstPart,
    }), [onError, lawData, addAfterMountTask, firstPart]);

    const htmlOptions: HTMLOptions = {
        WrapComponent: WrapLawComponent,
        renderControlEL: true,
        getFigData,
        options,
    };

    return (
        <>
            {showVersionControl && regulationVersions && (
                <VersionControlPanel regulation={regulationVersions} />
            )}
            <HTMLLaw
                el={lawData.el}
                indent={0}
                {...{ htmlOptions }}
            />
        </>
    );
};
