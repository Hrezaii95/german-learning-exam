import { lessons } from './course.js';
import { type Attempt, type CardReview, type Word } from './learning.js';
import { freshFlow, parseFlow, type FlowState } from './flow-state.js';
export type Draft = {
  text: string;
  outline: string;
  checks: number[];
  versions: { text: string; at: number }[];
};
export type PlanItem = {
  id: string;
  lessonId: string;
  minutes: number;
  notes: string;
};
export type SourceWork = {
  revision: string;
  notes: string;
  summary: string;
  dictation: string;
  teacherNotes: string;
  reviewed: boolean;
  updatedAt: number;
};
export type BookWork = {
  revision: string;
  answers: Record<string, string>;
  notes: string;
  reviewed: boolean;
  updatedAt?: number;
  reviewedAt?: number;
};
export type StudyState = {
  flow: FlowState;
  version: 2;
  attempts: Attempt[];
  drafts: Record<string, Draft>;
  reviews: Record<string, CardReview>;
  customWords: Word[];
  savedWords: string[];
  activeLesson: string;
  positions: Record<string, number>;
  dailyGoal: number;
  sourceWork: Record<string, SourceWork>;
  bookWork: Record<string, BookWork>;
  plan: { title: string; objective: string; items: PlanItem[] };
};
export function freshStudy(): StudyState {
  return {
    flow: freshFlow(),
    version: 2,
    attempts: [],
    drafts: {},
    reviews: {},
    customWords: [],
    savedWords: [],
    activeLesson: 'reading-campus',
    positions: {},
    dailyGoal: 3,
    sourceWork: {},
    bookWork: {},
    plan: { title: '', objective: '', items: [] },
  };
}
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
// Validate device backups as data. Never trust imported HTML or executable source.
export function parseStudy(value: unknown): StudyState {
  if (!obj(value) || value.version !== 2)
    throw new Error('Unsupported study backup');
  const s = freshStudy();
  s.flow = parseFlow(value.flow);
  if (obj(value.bookWork)) {
    for (const [id, work] of Object.entries(value.bookWork).slice(0, 500)) {
      if (
        ['__proto__', 'constructor', 'prototype'].includes(id) ||
        !obj(work) ||
        !str(work.revision) ||
        !obj(work.answers)
      )
        continue;
      s.bookWork[id] = {
        revision: work.revision,
        notes: str(work.notes) ? work.notes.slice(0, 50000) : '',
        reviewed: work.reviewed === true,
        updatedAt: num(work.updatedAt) ? work.updatedAt : undefined,
        reviewedAt: num(work.reviewedAt) ? work.reviewedAt : undefined,
        answers: Object.fromEntries(
          Object.entries(work.answers)
            .filter(
              ([key, v]) =>
                !['__proto__', 'constructor', 'prototype'].includes(key) &&
                str(v),
            )
            .slice(0, 500)
            .map(([key, v]) => [key, String(v).slice(0, 50000)]),
        ),
      };
    }
  }
  if (obj(value.sourceWork)) {
    for (const [id, work] of Object.entries(value.sourceWork).slice(0, 1000)) {
      if (!obj(work) || !str(work.revision)) continue;
      s.sourceWork[id] = {
        revision: work.revision,
        notes: str(work.notes) ? work.notes.slice(0, 50000) : '',
        summary: str(work.summary) ? work.summary.slice(0, 50000) : '',
        dictation: str(work.dictation) ? work.dictation.slice(0, 50000) : '',
        teacherNotes: str(work.teacherNotes)
          ? work.teacherNotes.slice(0, 50000)
          : '',
        reviewed: work.reviewed === true,
        updatedAt: num(work.updatedAt) ? work.updatedAt : 0,
      };
    }
  }
  if (
    !Array.isArray(value.attempts) ||
    !obj(value.drafts) ||
    !obj(value.reviews) ||
    !obj(value.plan)
  )
    throw new Error('Incomplete study backup');
  s.attempts = value.attempts
    .filter(
      (a): a is Attempt =>
        obj(a) &&
        str(a.exerciseId) &&
        str(a.lessonId) &&
        str(a.revision) &&
        Array.isArray(a.response) &&
        a.response.every(str) &&
        (a.correct === true || a.correct === false || a.correct === null) &&
        num(a.at) &&
        typeof a.selfReviewed === 'boolean',
    )
    .slice(-5000);
  for (const [id, d] of Object.entries(value.drafts))
    if (
      obj(d) &&
      str(d.text) &&
      str(d.outline) &&
      Array.isArray(d.checks) &&
      d.checks.every(num) &&
      Array.isArray(d.versions)
    )
      s.drafts[id] = {
        text: d.text.slice(0, 50000),
        outline: d.outline.slice(0, 10000),
        checks: d.checks,
        versions: d.versions
          .filter(
            (v): v is { text: string; at: number } =>
              obj(v) && str(v.text) && num(v.at),
          )
          .slice(-10),
      };
  for (const [id, r] of Object.entries(value.reviews))
    if (
      obj(r) &&
      num(r.due) &&
      num(r.interval) &&
      num(r.reviews) &&
      r.interval >= 0 &&
      r.reviews >= 0
    )
      s.reviews[id] = { due: r.due, interval: r.interval, reviews: r.reviews };
  s.customWords = Array.isArray(value.customWords)
    ? value.customWords
        .filter(
          (w): w is Word =>
            obj(w) &&
            ['id', 'de', 'en', 'example', 'tag'].every((k) => str(w[k])),
        )
        .slice(0, 1000)
    : [];
  s.savedWords = Array.isArray(value.savedWords)
    ? value.savedWords.filter(str)
    : [];
  s.activeLesson = lessons.some((l) => l.id === value.activeLesson)
    ? String(value.activeLesson)
    : s.activeLesson;
  if (obj(value.positions))
    for (const [id, p] of Object.entries(value.positions))
      if (num(p) && p >= 0 && p < 100) s.positions[id] = Math.floor(p);
  s.dailyGoal = num(value.dailyGoal)
    ? Math.max(1, Math.min(20, Math.round(value.dailyGoal)))
    : 3;
  s.plan = {
    title: str(value.plan.title) ? value.plan.title.slice(0, 200) : '',
    objective: str(value.plan.objective)
      ? value.plan.objective.slice(0, 3000)
      : '',
    items: Array.isArray(value.plan.items)
      ? value.plan.items
          .filter(
            (x): x is PlanItem =>
              obj(x) &&
              str(x.id) &&
              lessons.some((l) => l.id === x.lessonId) &&
              num(x.minutes) &&
              x.minutes >= 1 &&
              x.minutes <= 180 &&
              str(x.notes),
          )
          .slice(0, 40)
      : [],
  };
  return s;
}
export function parseAssignment(encoded: string): string[] {
  const parsed: unknown = JSON.parse(encoded);
  if (
    !Array.isArray(parsed) ||
    parsed.length > 40 ||
    !parsed.every(
      (id) => typeof id === 'string' && lessons.some((l) => l.id === id),
    )
  )
    throw new Error('Invalid assignment');
  return parsed;
}
