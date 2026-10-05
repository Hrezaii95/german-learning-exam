import {
  lessons as demos,
  type Lesson,
  type AcceptedLessonEnvelope,
  validateLessonEnvelope,
} from './learning.js';
type CatalogContext = {
  status: { production_ready: boolean };
  sources: {
    source_id: string;
    sha256: string;
    units: { unit_id: string }[];
  }[];
};
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;
const bilingual = (v: unknown) => object(v) && text(v.de) && text(v.en);
export function validLesson(value: unknown): value is Lesson {
  if (
    !object(value) ||
    !text(value.id) ||
    !text(value.revision) ||
    !['lesen', 'hoeren', 'schreiben', 'sprechen'].includes(
      String(value.skill),
    ) ||
    !bilingual(value.title) ||
    !bilingual(value.objective) ||
    !bilingual(value.strategy) ||
    !text(value.passage) ||
    !text(value.support) ||
    typeof value.minutes !== 'number' ||
    value.minutes < 1 ||
    value.minutes > 180 ||
    typeof value.bookPage !== 'number' ||
    !object(value.teacher) ||
    !['warmup', 'teach', 'support', 'challenge', 'exit'].every((k) =>
      bilingual((value.teacher as Record<string, unknown>)[k]),
    ) ||
    !Array.isArray(value.exercises) ||
    !value.exercises.length ||
    value.exercises.length > 30
  )
    return false;
  const ids = new Set<string>();
  return value.exercises.every((e) => {
    if (
      !object(e) ||
      !text(e.id) ||
      ids.has(e.id) ||
      !bilingual(e.prompt) ||
      !bilingual(e.hint) ||
      !bilingual(e.explanation)
    )
      return false;
    ids.add(e.id);
    if (e.kind === 'write' || e.kind === 'speak')
      return (
        text(e.model) &&
        Array.isArray(e.checklist) &&
        e.checklist.length > 0 &&
        e.checklist.every(bilingual) &&
        (e.kind !== 'write' ||
          (typeof e.minWords === 'number' && e.minWords > 0))
      );
    if (
      !['choice', 'multi', 'gap', 'order'].includes(String(e.kind)) ||
      !Array.isArray(e.answer) ||
      !e.answer.length ||
      !e.answer.every(text)
    )
      return false;
    if (e.kind === 'gap') return true;
    if (
      !Array.isArray(e.options) ||
      e.options.length < 2 ||
      !e.options.every(text)
    )
      return false;
    const options = e.options;
    if (
      !e.answer.every((a) => /^\d+$/.test(a) && Number(a) < options.length) ||
      new Set(e.answer).size !== e.answer.length
    )
      return false;
    return e.kind === 'choice'
      ? e.answer.length === 1
      : e.kind === 'order'
        ? e.answer.length === options.length
        : true;
  });
}
export function resolveReviewedCourse(
  records: unknown,
  catalog: CatalogContext,
): { lessons: Lesson[]; rejected: string[] } {
  if (!Array.isArray(records))
    return { lessons: [], rejected: ['Package must be an array'] };
  const accepted: Lesson[] = [];
  const rejected: string[] = [];
  const ids = new Set(demos.map((l) => l.id));
  const exerciseIds = new Set(
    demos.flatMap((l) => l.exercises.map((e) => e.id)),
  );
  records.forEach((record, i) => {
    if (
      !object(record) ||
      !object(record.provenance) ||
      !validLesson(record.lesson) ||
      record.lesson.origin !== 'reviewed-source' ||
      !catalog.status.production_ready
    ) {
      rejected.push(`Record ${i}: release or lesson validation failed`);
      return;
    }
    const provenance = record.provenance;
    const source = catalog.sources.find(
      (s) => s.source_id === provenance.sourceId,
    );
    if (
      !source ||
      !validateLessonEnvelope(
        record as unknown as AcceptedLessonEnvelope,
        source,
      ) ||
      ids.has(record.lesson.id) ||
      record.lesson.exercises.some((e) => exerciseIds.has(e.id))
    ) {
      rejected.push(
        `Record ${i}: provenance, acceptance or unique ID validation failed`,
      );
      return;
    }
    ids.add(record.lesson.id);
    record.lesson.exercises.forEach((e) => exerciseIds.add(e.id));
    accepted.push({
      ...record.lesson,
      provenance: provenance as unknown as Lesson['provenance'],
    });
  });
  return { lessons: accepted, rejected };
}
