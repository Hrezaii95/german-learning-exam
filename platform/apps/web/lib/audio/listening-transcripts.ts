import data from "../../generated/audio/listening-transcripts.json";
import type { ListeningTranscript } from "../study/types";

const book = data.tracks as Record<string, ListeningTranscript>;
const workbook = data.workbook as Record<string, ListeningTranscript>;
export const bookTranscript = (id: string) => book[id];
export const workbookTranscript = (id: string) => workbook[id];
