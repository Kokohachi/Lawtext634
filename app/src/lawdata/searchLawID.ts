import type { LawInfo } from "lawtext/dist/src/data/lawinfo";
import { storedLoader } from "./loaders";

export const searchLawID = async (lawSearchKey: string): Promise<string | {error: string, message: string} | null> => {

    const lawid = await getLawIDStored(lawSearchKey);

    return lawid;
};

const getLawIDStored = async (lawSearchKey: string): Promise<string | null> => {
    try {
        const { lawInfos } = await storedLoader.loadLawInfosStruct();

        // Single loop: check exact match first, track first partial match
        let firstPartialMatch: string | null = null;
        for (const info of lawInfos) {
            // Exact match - return immediately
            if (info.LawTitle === lawSearchKey || info.LawNum === lawSearchKey || info.LawID === lawSearchKey) {
                return info.LawID;
            }
            // Partial match - track first occurrence
            if (!firstPartialMatch && info.LawTitle.includes(lawSearchKey)) {
                firstPartialMatch = info.LawID;
            }
        }

        return firstPartialMatch;
    } catch {
        return null;
    }
};


