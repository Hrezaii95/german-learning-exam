export type BookObject = {
  id: string;
  kind: string;
  text: string;
  label: string;
  rows: unknown[];
};
export type BookPage = {
  unitId: string;
  jobId: string;
  pageIndex: number;
  sourceId: string;
  sourceSha256: string;
  sourcePath: string;
  revision: string;
  originalRevision: string;
  captureStatus: string;
  status: string;
  image: string;
  printedLabels: string[];
  objects: BookObject[];
  rawUrl: string;
  criticalUrl?: string;
  labels?: string[];
  strokes?: { id: string; style: string; target: { object_id: string }; context: { object_id: string }; spans: { object_id: string; start: number; end: number; stroke_style: string }[] }[];
};
type WordBank = {
  object_id: string;
  items: {
    row: number;
    column: number;
    stem: string;
    visible_blank_slots: number;
  }[];
};
export type BookData = {
  updateManifest: string;
  baseManifest: string;
  pages: BookPage[];
  fields: null | {
    unit_id: string;
    candidate_sha256: string;
    noun_bank: WordBank;
    verb_bank: WordBank;
    adjective_bank: WordBank;
    exercise3: {
      object_id: string;
      items: {
        item: number;
        options: {
          label: string;
          text_source: string;
          text_joined: string;
          start: number;
          end: number;
        }[];
      }[];
    };
    exercise4: {
      object_id: string;
      targets: { item: number; text: string; start: number; end: number }[];
    };
  };
};
