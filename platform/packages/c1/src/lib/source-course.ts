export type SourceAnchor = { page: number; unitId: string; objectId: string; text: string; kind: string; rows: unknown[] };
export type SourceGroup = {
  id: string; aliases: string[]; collection: string; section: string; task: string;
  phase: string; label: string | number | null; pages: number[]; revision: string;
  anchors: SourceAnchor[]; solutionIds: string[]; itemLinks: Record<string, unknown>[];
  itemReferences: { page: number; objectId: string; recordId: string }[];
  continuation?: { from_record_id: string; to_record_id: string };
};
export type SourceSolution = { id: string; page: number; text: string; cells?: string[] | null; explanation?: string | null; kind: string; parent?: string | null; label?: string | number | null; revision: string };
export type SourceBinding = { id: string; sourceId: string; sourceSha256: string; collection: string; kind: string; number: number; label: string; sectionId: string; media: { url: string; kind: string; sha256: string } };
export type SourceEdge = { id: string; page: number; unitId: string; bindingId: string; objectIds: string[]; markerPlacement: string };
export type ContentsEntry = { id: string; title: string; parentId: string | null; skill: string | null; task: string | number | null; page: number; printed: number; unitId: string };
export type SourceCourse = {
  manifest: string; addonManifest: string; groups: SourceGroup[];
  solutions: Record<string, SourceSolution>; contents: ContentsEntry[];
  bindings: SourceBinding[]; edges: SourceEdge[];
  questions: { page: number; objectId: string; text: string; options: { label?: string; text?: string; object_id?: string }[] }[];
};
export function groupTitle(g: Pick<SourceGroup, 'section' | 'task' | 'phase' | 'label'>) {
  return [g.section, g.task, g.phase, g.label].filter(v => v !== null && v !== '').join(' · ');
}
export function sourceSkill(section: string) {
  return ({ Lesen: 'lesen', Hören: 'hoeren', Schreiben: 'schreiben', Sprechen: 'sprechen' } as Record<string,string>)[section];
}
