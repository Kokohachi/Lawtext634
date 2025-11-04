import React, { useCallback, useEffect } from "react";
import styled from "styled-components";
import type { LawtextAppPageStateStruct } from "./LawtextAppPageState";
import { LawView } from "./LawView";
import type { ResolvedType } from "lawtext/dist/src/util";
import { saveListJson } from "@appsrc/lawdata/saveListJson";
import { ensureFetch, storedLoader } from "@appsrc/lawdata/loaders";
import { openFile } from "@appsrc/actions/openFile";
import { ErrorCatcher } from "./LawView/ErrorCatcher";
import useSearchInput from "./useSearchInput";


const ViewerMessagesDiv = styled.div`
    position: fixed;
    top: 1rem;
    right: 1rem;
    bottom: 0;
    @media (max-width: 767.98px) {
        top: 0.1rem;
        right: 0.1rem;
    }
    z-index: 2000;
`;

const ViewerMessages: React.FC<{messages: Record<string, string>}> = props => {
    return (
        <ViewerMessagesDiv>
            {Object.entries(props.messages).map(([key, message]) => (
                <div key={key}>
                    <span className="badge bg-secondary" style={{ display: "inline-flex", alignItems: "start" }}>
                        <span className="spinner-border" style={{ width: "1em", height: "1em" }} role="status"/>
                        <span style={{ display: "inline-block", textAlign: "right", marginLeft: "0.25em" }}>
                            {message.split("\n").map((line, i) => <div key={i}>{line}</div>)}
                        </span>
                    </span>
                </div>
            ))}
        </ViewerMessagesDiv>
    );
};


const ViewerWelcomeDiv = styled.div`
    min-height: 100vh;
    padding: 3em 0;

    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
`;

const ViewerWelcome: React.FC<LawtextAppPageStateStruct> = props => {
    const { navigate } = props;

    const {
        editingKey,
        searchInputRef,
        searchInput,
        searchDropdown,
    } = useSearchInput({});

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        navigate(`/${editingKey.replace("/", "")}`);
    };

    const [fetchAbility, setFetchAbility] = React.useState<ResolvedType<ReturnType<typeof ensureFetch>> | null>(null);

    useEffect(() => {
        const input = searchInputRef.current;
        if (input) {
            input.focus();
        }
        let unmounted = false;
        (async () => {
            const ffa = await ensureFetch();
            if (unmounted) return;
            setFetchAbility(ffa);
        })();
        return () => {
            unmounted = true;
        };
    }, [searchInputRef]);

    const downloadSampleLawtextOnClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        navigate("/(sample)");
    };

    return (
        <ViewerWelcomeDiv>
            <div className="container-fluid" style={{ marginBottom: "2em" }}>
                <p style={{ fontSize: "3em", textAlign: "center" }}>
                    Lawtext634へようこそ！
                </p>
                <p style={{ fontSize: "1.2em", textAlign: "center", color: "rgb(100, 100, 100)" }}>
                    武蔵高等学校中学校校友会 規約管理システム
                </p>
            </div>

            <div className="container-fluid" style={{ marginBottom: "2em" }}>

                <div className="row justify-content-center search-law-block">
                    <div className="col-md-6" style={{ maxWidth: "500px" }}>
                        <form onSubmit={handleSearchSubmit}>
                            <div className="input-group">
                                {searchInput}
                                <button className="btn btn-primary search-law-button" type="submit" >
                                    検索
                                </button>
                            </div>
                            {searchDropdown}
                        </form>
                    </div>
                </div>
            </div>

            <div className="container-fluid" style={{ alignSelf: "center", maxWidth: "20em", margin: "0.5em" }}>
                <hr />
            </div>

            <div className="container-fruid" style={{ alignSelf: "center", maxWidth: "500px" }}>

                <div>
                    <div style={{ textAlign: "center" }}>
                        <button
                            onClick={openFile}
                            className="lawtext-open-file-button btn btn-outline-secondary"
                        >
                            規約XML または Lawtext を開く
                        </button>
                    </div>
                    <div className="text-muted" style={{ marginTop: "1em" }}>
                        <ul style={{ marginBottom: 0 }}>
                            <li>規約・細則・規程・規則をLawtext形式で作成・編集できます。</li>
                            <li><a className="link-secondary" href="#" onClick={downloadSampleLawtextOnClick}>サンプルをダウンロード</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="container-fluid" style={{ alignSelf: "center", maxWidth: "20em", margin: "0.5em" }}>
                <hr />
            </div>

            <div className="container-fruid" style={{ alignSelf: "center", maxWidth: "100%" }}>

                {fetchAbility?.canFetch && (
                    <div style={{ margin: "1em 1em 0 1em" }}>
                        <DataDirInfoToggle />
                    </div>
                )}
            </div>

            <div className="container-fluid" style={{ alignSelf: "center", maxWidth: "20em", margin: "0.5em" }}>
                <hr />
            </div>

            <div className="text-muted" style={{ alignSelf: "center", maxWidth: "500px" }}>
                <div className="container-fluid">
                    <div style={{ textAlign: "center" }}>
                        <a href="https://github.com/Kokohachi/Lawtext634" target="_blank" rel="noreferrer">
                            GitHub
                        </a>
                        ・
                        <a href="https://yamachig.github.io/Lawtext/" target="_blank" rel="noreferrer">
                            Lawtext Docs
                        </a>
                    </div>
                    <div className="d-md-none" style={{ textAlign: "center" }}>
                        Powered by Lawtext &copy; 2017-{new Date().getFullYear()} yamachi
                    </div>
                </div>
            </div>
        </ViewerWelcomeDiv>
    );
};

const ListJsonDownloader: React.FC = () => {
    const [state, replaceState] = React.useState({
        processing: false,
        progress: 0,
        message: "",
        blob: null as Blob | null,
        blobURL: "" as string | null,
    });

    useEffect(() => {
        replaceState(prev => ({
            ...prev,
            processing: true,
            progress: 0,
            message: "準備しています",
            blob: null,
        }));
        (async () => {
            const blob = await saveListJson((progress, message) => replaceState(prev => ({ ...prev, progress, message })));
            replaceState(prev => ({
                ...prev,
                processing: false,
                progress: 1,
                message: "完了しました",
                blob,
                blobURL: blob && URL.createObjectURL(blob),
            }));
        })();
        return () => {
            if (state.blobURL !== null) {
                URL.revokeObjectURL(state.blobURL);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (<>
        {state.processing ? (<>
            <div className="progress">
                <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow={state.progress} aria-valuemin={0} aria-valuemax={1} style={{ width: `${state.progress * 100}%` }}></div>
            </div>
            <div style={{ whiteSpace: "nowrap", overflowX: "hidden", textOverflow: "ellipsis" }}>{state.message}</div>
        </>) : (<>
            {state.blobURL !== null && (<>
                <a download="list.json" href={state.blobURL} className="btn btn-sm btn-primary">list.json をダウンロード</a>
            </>)}
        </>)}
    </>);
};

const DataDirInfoToggle: React.FC = () => {
    const [state, replaceState] = React.useState({
        open: false,
        csvChecking: false,
        csvCheckPressed: false,
        csvExists: false,
        jsonChecking: false,
        jsonCheckPressed: false,
        jsonExists: false,
        downloadingJson: false,
    });

    const setState = useCallback((partialState: Partial<typeof state>) => {
        return replaceState((prevState: typeof state) => ({ ...prevState, ...partialState }));
    }, [replaceState]);

    const checkCsv = useCallback(() => {
        setState({ csvChecking: true });
        return (async () => {
            const csvExists = await storedLoader.listCSVExists();
            setState({ csvExists, csvChecking: false });
            return csvExists;
        })();
    }, [setState]);

    const checkCsvButtonClick = useCallback(() => {
        checkCsv();
        setState({ csvCheckPressed: true });
    }, [checkCsv, setState]);

    const saveListJsonButtonClick = useCallback(() => {
        (async () => {
            const csvExists = await checkCsv();
            setState({ downloadingJson: csvExists, csvCheckPressed: true });
        })();
    }, [checkCsv, setState]);

    const checkJson = useCallback(() => {
        setState({ jsonChecking: true });
        (async () => {
            const jsonExists = await storedLoader.listJsonExists();
            setState({ jsonExists, jsonChecking: false });
        })();
    }, [setState]);

    const checkJsonButtonClick = useCallback(() => {
        checkJson();
        setState({ jsonCheckPressed: true });
    }, [checkJson, setState]);

    useEffect(() => {
        checkCsv();
        checkJson();
    }, [checkCsv, checkJson]);

    return (
        state.open ? (
            <div className="card">
                <div className="card-body">

                    <h5 className="card-title">オフライン用データの保存方法</h5>

                    {state.csvExists && state.jsonExists && !state.csvCheckPressed && !state.jsonCheckPressed && (<>
                        <p className="alert alert-success">
                            オフライン用データが既に保存されていることを確認しました。下記の手順を繰り返すことでデータを更新することができます。
                        </p>
                    </>)}

                    <p className="card-text">
                        下記の手順でオフライン用データを保存することで、規約を検索・表示できるようになります。
                    </p>

                    <ul>
                        <li>Lawtext634のフォルダ内、index.htmlと同じ階層に data という名前のフォルダを作成してください。</li>

                        <li>
                            規約類のLawtextファイルまたはXMLファイルを data フォルダ内の lawdata フォルダ内に保存してください。下記のようなフォルダ構成になります。
                            <pre style={{ marginLeft: "1em" }}>{`
data
 └─ lawdata
     ├─ 規約_20240101.law.txt
     ├─ 細則_20240101.law.txt
     ├─ 規程_20240101.law.txt
     ├─ 規則_20240101.law.txt
     └─ all_law_list.csv (オプション)
`}</pre>
                        </li>

                        {state.csvExists ? (<>
                            {state.downloadingJson ? (<>
                                <li>
                                    <ErrorCatcher>
                                        <ListJsonDownloader />
                                    </ErrorCatcher>
                                </li>
                            </>) : (<>
                                <li>
                                    {state.csvCheckPressed && <><span className="text-success">保存されたファイルを確認できました。</span>次に、</>}法令XMLの一覧を生成します。 <button className={`btn btn-sm ${state.jsonExists ? "btn-outline-secondary" : "btn-primary"}`} onClick={saveListJsonButtonClick}>このボタン</button> を押して list.json をダウンロードしてください。少し時間がかかります。
                                </li>
                            </>)}
                            <li>
                                list.jsonをダウンロードしたら、data フォルダ内に保存してください。下記のようなフォルダ構成になります。
                                <pre style={{ marginLeft: "1em" }}>{`
data
 ├─ lawdata
 └─ list.json (ダウンロードしたもの)
`}</pre>
                            </li>
                        </>) : state.csvChecking ? (<>
                            <li>
                                <span className="text-info">保存されたファイルを確認しています。</span>
                            </li>
                        </>) : state.csvCheckPressed ? (<>
                            <li>
                                <span className="text-danger">保存された法令データが見つかりませんでした。</span>上記の手順を完了したにもかかわらず次の手順が表示されない場合は、保存場所に誤りがある可能性があるのでご確認ください。手順を完了したら、再度 <button className="btn btn-sm btn-primary" onClick={checkCsvButtonClick}>このボタン</button> を押して次の手順を表示してください。
                            </li>
                        </>) : (<>
                            <li>
                                上記の手順を完了したら、 <button className="btn btn-sm btn-primary" onClick={checkCsvButtonClick}>このボタン</button> を押して次の手順を表示してください。
                            </li>
                        </>)}

                        {state.jsonExists ? (<>
                            {state.jsonCheckPressed ? (<>
                                <li>
                                    <span className="text-success">保存された list.json を確認できました。オフライン用データの保存が完了しました。</span>今後、上記の手順を繰り返すことでデータを更新することができます。
                                </li>
                            </>) : (<></>)}
                        </>) : state.jsonChecking ? (<>
                            <li>
                                <span className="text-info">保存されたファイルを確認しています。</span>
                            </li>
                        </>) : state.jsonCheckPressed ? (<>
                            <li>
                                <span className="text-danger">保存された list.json が見つかりませんでした。</span>上記の手順を完了したにもかかわらず次の手順が表示されない場合は、保存場所に誤りがある可能性があるのでご確認ください。手順を完了したら、再度 <button className="btn btn-sm btn-primary" onClick={checkJsonButtonClick}>このボタン</button> を押してください。
                            </li>
                        </>) : state.csvExists ? (<>
                            <li>
                                上記の手順を完了したら、 <button className="btn btn-sm btn-primary" onClick={checkJsonButtonClick}>このボタン</button> を押してください。
                            </li>
                        </>) : (<>
                        </>)}

                    </ul>
                </div>
            </div>
        ) : (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setState({ open: true })}>
                オフライン用データの保存方法
            </button>
        )
    );
};

const ViewerDiv = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
`;

export const Viewer: React.FC<LawtextAppPageStateStruct> = props => {
    const { origState } = props;
    return (
        <ViewerDiv>
            {Object.keys(origState.viewerMessages).length > 0 &&
                <ViewerMessages messages={origState.viewerMessages} />
            }
            {!origState.loadingLaw && !origState.law &&
                <ViewerWelcome {...props} />
            }
            {origState.law &&
                <LawView {...props} />
            }
        </ViewerDiv>
    );
};
