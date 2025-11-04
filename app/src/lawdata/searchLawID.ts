import type { LawInfo } from "lawtext/dist/src/data/lawinfo";
import { storedLoader } from "./loaders";

export const searchLawID = async (lawSearchKey: string): Promise<string | {error: string, message: string} | null> => {

    const lawid = await getLawIDStored(lawSearchKey);

    return lawid;
};

const getLawIDStored = async (lawSearchKey: string): Promise<string | null> => {
    try {
        const { lawInfos } = await storedLoader.loadLawInfosStruct();

        // Simple exact match or contains search
        for (const info of lawInfos) {
            if (info.LawTitle === lawSearchKey || info.LawNum === lawSearchKey || info.LawID === lawSearchKey) {
                return info.LawID;
            }
        }
        
        // If no exact match, try partial match
        for (const info of lawInfos) {
            if (info.LawTitle.includes(lawSearchKey)) {
                return info.LawID;
            }
        }

        return null;
    } catch {
        return null;
    }
};


