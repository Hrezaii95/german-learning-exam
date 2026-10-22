export type PackStoryChapter = {
  id: string; title: string; unitId: string; itemRefs: string[];
  requires?: { unitId: string; securedRatio: number };
};
export type PackStoryResource = { schemaVersion: 1; title: string; chapters: PackStoryChapter[] };
/** Sections, timings, questions and scoring live in the referenced examTask items. */
export type PackExamResource = { schemaVersion: 1; title: string; taskRefs: string[] };
export type PackResourceKind = "story" | "exam";
