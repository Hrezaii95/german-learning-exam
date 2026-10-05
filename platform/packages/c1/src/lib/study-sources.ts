import data from './data/study-sources.json' with { type: 'json' };
import overrides from './data/source-overrides.json' with { type: 'json' };
import catalog from './data/catalog.json' with { type: 'json' };

export type StudySource = (typeof data.sections)[number];
export type SourceOverride = {
  sectionId: string;
  revision: string;
  text: string;
  status: 'provisional' | 'reviewed';
  note: string;
  sourceRecord?: Partial<StudySource>;
  updateManifest?: string;
  reviewEvidence?: string;
  media?: StudySource['media'];
};
// Stable section IDs preserve work when text changes. The saved revision lets
// the interface identify responses written against an earlier text.
export const studySources = data.sections.map((section) => {
  const edit = (overrides as unknown as SourceOverride[]).find(
    (o) => o.sectionId === section.section_id,
  );
  return {
    ...section,
    media: edit?.media ?? section.media,
    originalAnchors: {
      pdf_pages: section.pdf_pages,
      lineStart: section.pdf_global_line_start,
      lineEnd: section.pdf_global_line_end,
    },
    pdf_pages: edit?.sourceRecord?.pdf_pages ?? section.pdf_pages,
    pdf_global_line_start:
      edit?.sourceRecord?.pdf_global_line_start ??
      section.pdf_global_line_start,
    pdf_global_line_end:
      edit?.sourceRecord?.pdf_global_line_end ?? section.pdf_global_line_end,
    heading_text: edit?.sourceRecord?.heading_text ?? section.heading_text,
    sourceUnits:
      catalog.sources
        .find((source) => source.source_id === section.transcript_source_id)
        ?.units.filter((unit) =>
          (edit?.sourceRecord?.pdf_pages ?? section.pdf_pages).includes(
            unit.physical_index + 1,
          ),
        ) ?? [],
    studyText: edit?.text ?? section.text,
    studyRevision: edit?.revision ?? section.revision,
    editorialStatus: edit?.status ?? 'provisional',
    editorialNote: edit?.note ?? '',
    updateManifest: edit?.updateManifest ?? '',
    reviewEvidence: edit?.reviewEvidence ?? '',
  };
});
export const studyManifest = data.manifest;
export type StudySection = (typeof studySources)[number];
