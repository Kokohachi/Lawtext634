import { FetchStoredLoader } from "lawtext/dist/src/data/loaders/FetchStoredLoader";

const _dataPath = "./data";
export const storedLoader = new FetchStoredLoader(_dataPath);

export const ensureFetch = async (): Promise<{isFile: boolean, canFetch: boolean}> => {
    const isFile = location.protocol === "file:";
    try {
        const res = await fetch("./index.html", { method: "HEAD" });
        return { isFile, canFetch: res.ok };
    } catch (e) {
        return { isFile, canFetch: false };
    }
};
