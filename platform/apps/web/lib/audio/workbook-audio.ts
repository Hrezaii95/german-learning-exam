export type WorkbookAudioTrack = Readonly<{
  id: string;
  filename: string;
  exercise: string;
  purpose: string;
  durationSeconds: number;
}>;

const TRACKS: Readonly<Record<string, WorkbookAudioTrack>> = Object.freeze({
  "1_01": { id: "1_01", filename: "1_01_AB_Momente_A11_1_3.mp3", exercise: "AB 3", purpose: "Names and spelling", durationSeconds: 35.974 },
  "1_02": { id: "1_02", filename: "1_02_AB_Momente_A11_1_3.mp3", exercise: "AB 3", purpose: "Names and spelling", durationSeconds: 30.996 },
  "1_03": { id: "1_03", filename: "1_03_AB_Momente_A11_1_3.mp3", exercise: "AB 3", purpose: "Names and spelling", durationSeconds: 29.98 },
  "1_04": { id: "1_04", filename: "1_04_AB_Momente_A11_1_3.mp3", exercise: "AB 3", purpose: "Names and spelling", durationSeconds: 30.97 },
  "1_05": { id: "1_05", filename: "1_05_AB_Momente_A11_1_9a.mp3", exercise: "AB 9a", purpose: "Sentence melody model", durationSeconds: 24.481 },
  "1_06": { id: "1_06", filename: "1_06_AB_Momente_A11_1_9b.mp3", exercise: "AB 9b", purpose: "Sentence melody comparison", durationSeconds: 23.986 },
  "1_07": { id: "1_07", filename: "1_07_AB_Momente_A11_2_6a.mp3", exercise: "AB 6a", purpose: "Telephone-number discrimination", durationSeconds: 18.017 },
  "1_08": { id: "1_08", filename: "1_08_AB_Momente_A11_2_6a.mp3", exercise: "AB 6a", purpose: "Telephone-number discrimination", durationSeconds: 13.039 },
  "1_09": { id: "1_09", filename: "1_09_AB_Momente_A11_2_6a.mp3", exercise: "AB 6a", purpose: "Telephone-number discrimination", durationSeconds: 15.02 },
  "1_10": { id: "1_10", filename: "1_10_AB_Momente_A11_2_6a.mp3", exercise: "AB 6a", purpose: "Telephone-number discrimination", durationSeconds: 12.909 },
  "1_11": { id: "1_11", filename: "1_11_AB_Momente_A11_2_6b.mp3", exercise: "AB 6b", purpose: "Telephone-number transcription", durationSeconds: 17.001 },
  "1_12": { id: "1_12", filename: "1_12_AB_Momente_A11_2_6b.mp3", exercise: "AB 6b", purpose: "Telephone-number transcription", durationSeconds: 12.44 },
  "1_13": { id: "1_13", filename: "1_13_AB_Momente_A11_2_6b.mp3", exercise: "AB 6b", purpose: "Telephone-number transcription", durationSeconds: 13.508 },
  "1_14": { id: "1_14", filename: "1_14_AB_Momente_A11_2_6b.mp3", exercise: "AB 6b", purpose: "Telephone-number transcription", durationSeconds: 14.264 },
  "1_15": { id: "1_15", filename: "1_15_AB_Momente_A11_2_12.mp3", exercise: "AB 12", purpose: "Profession word stress and repetition", durationSeconds: 37.955 },
});

const ACTIVITY_TRACK_IDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "activity:lesson-01-alphabet-listen-spell": Object.freeze(["1_01", "1_02", "1_03", "1_04"]),
  "activity:lesson-01-workbook-listening": Object.freeze(["1_05", "1_06"]),
  "activity:lesson-02-workbook-listening": Object.freeze(["1_07", "1_08", "1_09", "1_10", "1_11", "1_12", "1_13", "1_14", "1_15"]),
  "activity:lesson-02-numbers-0-100": Object.freeze(["1_07", "1_08", "1_09", "1_10", "1_11", "1_12", "1_13", "1_14"]),
  "activity:lesson-02-core-professions": Object.freeze(["1_15"]),
});

export function workbookAudioForActivity(activityId: string): readonly WorkbookAudioTrack[] {
  return Object.freeze((ACTIVITY_TRACK_IDS[activityId] ?? []).map((id) => TRACKS[id]!));
}

export const APPROVED_WORKBOOK_TRACK_COUNT = Object.keys(TRACKS).length;
