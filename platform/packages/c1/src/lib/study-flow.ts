import { translate, localize } from './i18n.js';
import { lessons } from './course.js';
import {
  words,
  bi,
  latestAttempts,
  type Lesson,
  type Word,
  type Exercise,
} from './learning.js';
import { studySources } from './study-sources.js';
import bookIndex from './data/book-index.json' with { type: 'json' };
import sourceCourseIndex from './data/source-course-index.json' with { type: 'json' };
import { cheatSheets, sheetRevision } from './cheat-sheets.js';
import type { StudyState } from './study-state.js';
import type {
  ItemContext,
  ReviewItem,
  StudyScope,
  SessionItem,
} from './flow-state.js';

export function lessonMatches(scope: StudyScope, l: Lesson): boolean {
  if (scope.mode === 'skill') return l.skill === scope.skill;
  if (scope.mode === 'lesson') return l.id === scope.lessonId;
  if (scope.mode === 'assignment') return scope.assignment.includes(l.id);
  // Lesson bookPage landmarks are printed pages, not verified PDF-page bindings.
  return scope.mode !== 'pages';
}
export function contextMatches(scope: StudyScope, item: ItemContext): boolean {
  if (scope.mode === 'all') return true;
  if (scope.mode === 'skill' && item.skills?.includes(scope.skill)) return true;
  if (scope.mode === 'pages')
    return !!item.page && item.page >= scope.from && item.page <= scope.to;
  if (item.lessonId)
    return lessons.some(
      (l) => l.id === item.lessonId && lessonMatches(scope, l),
    );
  if (item.sectionId)
    return lessons.some(
      (l) => l.sectionId === item.sectionId && lessonMatches(scope, l),
    );
  return scope.mode === 'skill' && item.skill === scope.skill;
}
export function wordMatches(scope: StudyScope, word: Word): boolean {
  if (scope.mode === 'all') return true;
  if (studySources.some((s) => s.section_id === word.tag))
    return contextMatches(scope, { sectionId: word.tag });
  // These are app-authored vocabulary-to-practice suggestions, never publisher links.
  if (scope.mode === 'skill')
    return (
      ['Konnektoren', 'Studium'].includes(word.tag) ||
      (word.tag === 'Argumentation' &&
        ['schreiben', 'sprechen'].includes(scope.skill))
    );
  return false;
}
export function wordItem(w: Word, state: StudyState): ReviewItem {
  const section = studySources.find((s) => s.section_id === w.tag);
  return {
    id: 'word:' + w.id,
    kind: 'word',
    title: bi(w.de, w.de),
    answer: bi(w.example, w.en + '\n' + w.example),
    href: section
      ? '/studio?section=' + encodeURIComponent(section.section_id)
      : '/vocabulary',
    origin: section ? 'personal-source-word' : 'app-vocabulary',
    savedAt: 0,
    sectionId: section?.section_id,
    revision: section?.studyRevision,
    schedule: state.reviews[w.id],
  };
}
export function reviewItems(state: StudyState): ReviewItem[] {
  const wordIds = new Set(state.savedWords);
  const existing = new Set(state.flow.saved.map((i) => i.id));
  return [
    ...state.flow.saved,
    ...[...words, ...state.customWords]
      .filter((w) => wordIds.has(w.id) && !existing.has('word:' + w.id))
      .map((w) => wordItem(w, state)),
  ];
}
/** Personal vocabulary is user writing, including words captured in Source studio. */
export function reviewText(
  item: ReviewItem,
  field: 'title' | 'answer',
  lang: import('./i18n').Locale,
) {
  if (
    item.id.startsWith('word:') &&
    !words.some((word) => item.id === 'word:' + word.id)
  ) {
    return item[field][lang === 'de' ? 'de' : 'en'];
  }
  return localize(item[field], lang);
}
export function reviewMatches(
  scope: StudyScope,
  item: ReviewItem,
  state: StudyState,
) {
  if (item.id.startsWith('word:')) {
    const word = [...words, ...state.customWords].find(
      (w) => 'word:' + w.id === item.id,
    );
    if (word) return wordMatches(scope, word);
  }
  return contextMatches(scope, item);
}
export function exerciseItem(l: Lesson, e: Exercise): ReviewItem {
  return {
    id: 'exercise:' + e.id,
    kind: 'question',
    title: e.prompt,
    answer: bi(
      (e.model ? e.model + '\n' : '') + e.explanation.de,
      (e.model ? e.model + '\n' : '') + e.explanation.en,
    ),
    href:
      '/practice?lesson=' +
      encodeURIComponent(l.id) +
      '&exercise=' +
      encodeURIComponent(e.id),
    origin: l.origin,
    lessonId: l.id,
    skill: l.skill,
    revision: l.revision,
    savedAt: 0,
  };
}
export function currentRevision(item: ReviewItem): string | undefined {
  // A lesson association filters this aid; it does not own the aid's revision.
  if (item.origin === 'wortweg-cheat-sheet') return sheetRevision;
  if (item.origin === 'publisher-source-r44')
    return sourceCourseIndex.groups.find(
      (g) => 'source-activity:' + g.id === item.id,
    )?.revision;
  if (item.lessonId)
    return lessons.find((l) => l.id === item.lessonId)?.revision;
  if (item.sectionId)
    return studySources.find((s) => s.section_id === item.sectionId)
      ?.studyRevision;
  if (item.page) return bookIndex.units[item.page - 1]?.revision;
  return item.revision;
}
export function buildDaily(
  state: StudyState,
  now: number,
  limit = 6,
): SessionItem[] {
  const scope = state.flow.scope;
  const eligible = lessons.filter((l) => lessonMatches(scope, l));
  const queue: SessionItem[] = [];
  const add = (item: SessionItem) => {
    if (!queue.some((i) => i.id === item.id)) queue.push(item);
  };
  const latest = eligible
    .flatMap((l) =>
      Object.values(latestAttempts(state.attempts, l))
        .filter((a) => a.correct === false)
        .sort((a, b) => b.at - a.at)
        .map((a) => ({ l, a })),
    )
    .sort((a, b) => b.a.at - a.a.at);
  const mistakes = latest.map(
    ({ l, a }): SessionItem => ({
      id: 'exercise:' + a.exerciseId,
      kind: 'exercise',
      ref: a.exerciseId,
      lessonId: l.id,
      revision: l.revision,
      reason: 'mistake',
    }),
  );
  const saved = reviewItems(state)
    .filter(
      (i) =>
        reviewMatches(scope, i, state) &&
        (!i.schedule || i.schedule.due <= now),
    )
    .sort((a, b) => (a.schedule?.due ?? 0) - (b.schedule?.due ?? 0));
  const due = [...words, ...state.customWords]
    .filter((w) => wordMatches(scope, w) && state.reviews[w.id]?.due <= now)
    .sort((a, b) => state.reviews[a.id].due - state.reviews[b.id].due);
  for (const w of due.slice(0, 1))
    add({ id: 'word:' + w.id, kind: 'word', ref: w.id, reason: 'due' });
  for (const i of saved.slice(0, 1))
    add({
      id: i.id,
      kind: i.id.startsWith('word:') ? 'word' : 'saved',
      ref: i.id.startsWith('word:') ? i.id.slice(5) : i.id,
      revision: i.revision,
      reason: i.schedule ? 'due' : 'new',
    });
  for (const i of mistakes.slice(0, 1)) add(i);
  const unfinished = eligible.flatMap((l) =>
    l.exercises
      .filter((e) => {
        const a = latestAttempts(state.attempts, l)[e.id];
        return (
          (state.drafts[e.id]?.text ||
            state.drafts[e.id]?.outline ||
            state.positions[l.id] === l.exercises.indexOf(e)) &&
          !a?.selfReviewed &&
          a?.correct !== true
        );
      })
      .map((e) => ({
        id: 'exercise:' + e.id,
        kind: 'exercise' as const,
        ref: e.id,
        lessonId: l.id,
        revision: l.revision,
        reason: 'unfinished' as const,
      })),
  );
  if (unfinished[0]) add(unfinished[0]);
  for (const [id, work] of Object.entries(state.bookWork)) {
    const page = bookIndex.units.find((p) => p.id === id);
    if (
      page &&
      !work.reviewed &&
      Object.keys(work.answers).length &&
      contextMatches(scope, { page: page.pageIndex + 1 })
    ) {
      add({
        id: 'book:' + id,
        kind: 'book',
        ref: String(page.pageIndex + 1),
        revision: page.revision,
        reason: 'unfinished',
      });
      break;
    }
  }
  for (const [id, work] of Object.entries(state.sourceWork))
    if (
      !work.reviewed &&
      (work.summary || work.notes) &&
      contextMatches(scope, { sectionId: id })
    ) {
      add({
        id: 'source:' + id,
        kind: 'source',
        ref: id,
        revision: studySources.find((s) => s.section_id === id)?.studyRevision,
        reason: 'unfinished',
      });
      break;
    }
  const skill = eligible
    .flatMap((l) => l.exercises.map((e) => ({ l, e })))
    .find(({ l, e }) => {
      const a = latestAttempts(state.attempts, l)[e.id];
      return (
        !queue.some((i) => i.ref === e.id) &&
        a?.correct !== true &&
        !a?.selfReviewed
      );
    });
  // Reserve a position for active practice, even when many reviews are due.
  const selected = queue.slice(0, Math.max(0, limit - (skill ? 1 : 0)));
  if (skill)
    selected.push({
      id: 'exercise:' + skill.e.id,
      kind: 'exercise',
      ref: skill.e.id,
      lessonId: skill.l.id,
      revision: skill.l.revision,
      reason: 'skill',
    });
  if (scope.mode === 'pages' && selected.length === 0)
    selected.push({
      id: 'book:page:' + scope.from,
      kind: 'book',
      ref: String(scope.from),
      revision: bookIndex.units[scope.from - 1]?.revision,
      reason: 'skill',
    });
  for (const w of due)
    if (
      selected.length < limit &&
      !selected.some((i) => i.id === 'word:' + w.id)
    )
      selected.push({
        id: 'word:' + w.id,
        kind: 'word',
        ref: w.id,
        reason: 'due',
      });
  for (const w of [...words, ...state.customWords].filter(
    (w) => wordMatches(scope, w) && !state.reviews[w.id],
  ))
    if (
      selected.length < limit &&
      !selected.some((i) => i.id === 'word:' + w.id)
    )
      selected.push({
        id: 'word:' + w.id,
        kind: 'word',
        ref: w.id,
        reason: 'new',
      });
  return selected;
}
export function scopeTitle(scope: StudyScope, lang: import('./i18n').Locale) {
  if (scope.mode === 'skill')
    return localize(
      {
        lesen: bi('Lesen', 'Reading'),
        hoeren: bi('Hören', 'Listening'),
        schreiben: bi('Schreiben', 'Writing'),
        sprechen: bi('Sprechen', 'Speaking'),
      }[scope.skill],
      lang,
    );
  if (scope.mode === 'lesson')
    return (
      localize(lessons.find((l) => l.id === scope.lessonId)?.title, lang) ||
      translate('Lektion auswählen', 'Choose a lesson', lang)
    );
  if (scope.mode === 'assignment')
    return `${translate('Auftrag', 'Assignment', lang)} · ${scope.assignment.length}`;
  if (scope.mode === 'pages')
    return `${translate('PDF-Seiten', 'PDF pages', lang)} ${scope.from}–${scope.to}`;
  return translate('Alle Materialien', 'All materials', lang);
}
export { cheatSheets };
