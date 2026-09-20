import data from "../../generated/audio/listening-transcripts.json";
import speech from "../../generated/audio/transcript-speech.json";
import type { ListeningTranscript } from "../study/types";

const book = data.tracks as Record<string, ListeningTranscript>;
const workbook = data.workbook as Record<string, ListeningTranscript>;
const recordingSpeech=speech as {tracks:Record<string,(string|null)[]>;workbook:Record<string,(string|null)[]>};
function withPronunciation(transcript:ListeningTranscript|undefined,clips:(string|null)[]|undefined):ListeningTranscript|undefined{
  return transcript?{...transcript,lines:transcript.lines.map((line,index)=>({...line,audio:clips?.[index]??null}))}:undefined;
}
export const bookTranscript = (id: string) => withPronunciation(book[id],recordingSpeech.tracks[id]);
export const workbookTranscript = (id: string) => withPronunciation(workbook[id],recordingSpeech.workbook[id]);
