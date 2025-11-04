import type { LawInfo } from "lawtext/dist/src/data/lawinfo";
import levenshtein from "js-levenshtein";
import { storedLoader } from "./loaders";

export const searchLawID = async (lawSearchKey: string): Promise<string | {error: string, message: string} | null> => {

    const lawid = await getLawIDStored(lawSearchKey);

    return lawid;
};

const getLawIDStored = async (lawSearchKey: string): Promise<string | null> => {
    try {
        // console.log(`getLawIDStored("${lawSearchKey}")`);

        const { lawInfos } = await storedLoader.loadLawInfosStruct();

        let partMatchMode = false;
        const bestMatch = { score: Infinity, info: null as LawInfo | null };
        for (const info of lawInfos) {
            if (info.LawTitle.includes(lawSearchKey)) {
                if (!partMatchMode) {
                    partMatchMode = true;
                    bestMatch.score = Infinity;
                    bestMatch.info = null;
                }
            } else {
                if (partMatchMode) continue;
            }
            // eslint-disable-next-line no-irregular-whitespace
            const score = levenshtein(info.LawTitle.replace(/　抄$/, ""), lawSearchKey);
            if (score < bestMatch.score) {
                bestMatch.score = score;
                bestMatch.info = info;
            }
        }

        return bestMatch.info && bestMatch.info.LawID;
    } catch {
        return null;
    }
};


