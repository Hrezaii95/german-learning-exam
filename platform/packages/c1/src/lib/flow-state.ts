import type { Bilingual, Skill, CardReview } from './learning.js';

export type StudyScope = {
  mode: 'all' | 'skill' | 'lesson' | 'pages' | 'assignment';
  skill: Skill;
  lessonId: string;
  from: number;
  to: number;
  assignment: string[];
};
export type ItemContext = {
  skill?: Skill;
  skills?: Skill[];
  lessonId?: string;
  sectionId?: string;
  page?: number;
  sourceId?: string;
  revision?: string;
};
export type ReviewItem = ItemContext & {
  id: string;
  kind: 'word' | 'phrase' | 'question' | 'excerpt';
  title: Bilingual;
  answer: Bilingual;
  href: string;
  origin: string;
  savedAt: number;
  schedule?: CardReview;
};
export type SessionItem = {
  id: string;
  kind: 'word' | 'saved' | 'exercise' | 'book' | 'source';
  ref: string;
  lessonId?: string;
  revision?: string;
  reason: 'due' | 'mistake' | 'unfinished' | 'skill' | 'new';
  done?: number;
  skipped?: boolean;
};
export type DailySession = {
  id: string;
  startedAt: number;
  scope: StudyScope;
  items: SessionItem[];
};
export type FlowState = {
  scope: StudyScope;
  saved: ReviewItem[];
  session: DailySession | null;
  sheetAnswers: Record<string, number>;
};
export const defaultScope = (): StudyScope => ({
  mode: 'all',
  skill: 'lesen',
  lessonId: '',
  from: 1,
  to: 110,
  assignment: [],
});
export const freshFlow = (): FlowState => ({
  scope: defaultScope(),
  saved: [],
  session: null,
  sheetAnswers: {},
});
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;
const bilingual = (v: unknown): v is Bilingual =>
  object(v) &&
  str(v.de) &&
  str(v.en) &&
  v.de.length <= 50000 &&
  v.en.length <= 50000;
export function safeStudyLink(v: unknown): v is string {
  return (
    str(v) &&
    /^\/(?:course|practice|book|studio|vocabulary|cheat-sheets|review)(?:[?#][^\s\\]*)?$/.test(
      v,
    )
  );
}
export function parseScope(v: unknown): StudyScope {
  const out = defaultScope();
  if (!object(v)) return out;
  if (
    ['all', 'skill', 'lesson', 'pages', 'assignment'].includes(String(v.mode))
  )
    out.mode = v.mode as StudyScope['mode'];
  if (['lesen', 'hoeren', 'schreiben', 'sprechen'].includes(String(v.skill)))
    out.skill = v.skill as Skill;
  if (str(v.lessonId)) out.lessonId = v.lessonId.slice(0, 200);
  if (finite(v.from)) out.from = Math.max(1, Math.min(110, Math.floor(v.from)));
  if (finite(v.to))
    out.to = Math.max(out.from, Math.min(110, Math.floor(v.to)));
  if (Array.isArray(v.assignment))
    out.assignment = [...new Set(v.assignment.filter(str))].slice(0, 40);
  return out;
}
export function parseFlow(v: unknown): FlowState {
  const out = freshFlow();
  if (!object(v)) return out;
  out.scope = parseScope(v.scope);
  if (Array.isArray(v.saved)) {
    const ids = new Set<string>();
    for (const r of v.saved.slice(0, 3000)) {
      if (
        !object(r) ||
        !str(r.id) ||
        ids.has(r.id) ||
        !['word', 'phrase', 'question', 'excerpt'].includes(String(r.kind)) ||
        !bilingual(r.title) ||
        !bilingual(r.answer) ||
        !safeStudyLink(r.href) ||
        !finite(r.savedAt)
      )
        continue;
      ids.add(r.id);
      const item: ReviewItem = {
        id: r.id.slice(0, 500),
        kind: r.kind as ReviewItem['kind'],
        title: r.title,
        answer: r.answer,
        href: r.href,
        origin: str(r.origin) ? r.origin.slice(0, 300) : '',
        savedAt: r.savedAt,
      };
      if (Array.isArray(r.skills))
        item.skills = r.skills.filter((v): v is Skill =>
          ['lesen', 'hoeren', 'schreiben', 'sprechen'].includes(String(v)),
        );
      for (const k of [
        'lessonId',
        'sectionId',
        'sourceId',
        'revision',
      ] as const)
        if (str(r[k])) item[k] = r[k].slice(0, 500);
      if (
        ['lesen', 'hoeren', 'schreiben', 'sprechen'].includes(String(r.skill))
      )
        item.skill = r.skill as Skill;
      if (finite(r.page) && r.page >= 1 && r.page <= 110)
        item.page = Math.floor(r.page);
      if (
        object(r.schedule) &&
        finite(r.schedule.due) &&
        finite(r.schedule.interval) &&
        finite(r.schedule.reviews)
      )
        item.schedule = {
          due: r.schedule.due,
          interval: r.schedule.interval,
          reviews: r.schedule.reviews,
        };
      out.saved.push(item);
    }
  }
  if (
    object(v.session) &&
    str(v.session.id) &&
    finite(v.session.startedAt) &&
    Array.isArray(v.session.items)
  ) {
    const items: SessionItem[] = [];
    for (const x of v.session.items.slice(0, 20)) {
      if (
        !object(x) ||
        !str(x.id) ||
        !str(x.ref) ||
        !['word', 'saved', 'exercise', 'book', 'source'].includes(
          String(x.kind),
        ) ||
        !['due', 'mistake', 'unfinished', 'skill', 'new'].includes(
          String(x.reason),
        )
      )
        continue;
      items.push({
        id: x.id,
        ref: x.ref,
        kind: x.kind as SessionItem['kind'],
        reason: x.reason as SessionItem['reason'],
        lessonId: str(x.lessonId) ? x.lessonId : undefined,
        revision: str(x.revision) ? x.revision : undefined,
        done: finite(x.done) ? x.done : undefined,
        skipped: x.skipped === true,
      });
    }
    out.session = {
      id: v.session.id,
      startedAt: v.session.startedAt,
      scope: parseScope(v.session.scope),
      items,
    };
  }
  if (object(v.sheetAnswers))
    out.sheetAnswers = Object.fromEntries(
      Object.entries(v.sheetAnswers)
        .filter(([k, n]) => /^[a-z0-9-]+$/.test(k) && finite(n) && n < 4)
        .slice(0, 100)
        .map(([k, n]) => [k, Number(n)]),
    );
  return out;
}
