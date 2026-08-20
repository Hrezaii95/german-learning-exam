import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Route facts read from the generated projection — the same file the pages are
 * built from and the same file `smoke-pages.mjs` verifies against.
 *
 * Activity URLs are hex-encoded typed ids ("/lessons/01/activity/id-6163…").
 * Hand-writing them in specs would be unreadable and would rot silently; reading
 * the projection means a content change moves the specs with it, and a route
 * that disappears fails loudly here instead of 404-ing mid-journey.
 */

const here = dirname(fileURLToPath(import.meta.url));
const generatedDir = join(here, "..", "..", "..", "apps", "web", "generated");

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(generatedDir, name), "utf8")) as T;
}

export interface ProjectedActivity {
  id: string;
  canonicalPath: string;
  lessonId: string;
  lessonRouteSegment: string;
  stageId: string;
  mode: string;
  renderer: string;
  promptPlainText: string;
}

export interface ProjectedLesson {
  id: string;
  number: number;
  routeSegment: string;
  canonicalPath: string;
  activityCount: number;
  stages: Array<{
    id: string;
    kind: string;
    titleEn: string;
    activityIds: string[];
    required: boolean;
  }>;
}

interface Projection {
  activities: ProjectedActivity[];
  lessons: ProjectedLesson[];
  activityCount: number;
  lessonCount: number;
  zeroState: {
    continueActivityId: string;
    continueLessonId: string;
    continueLessonTitleDe: string;
    continuePath: string;
  };
}

interface DetailsProjection {
  representatives: Array<{ id: string; canonicalPath: string; kind?: string }>;
}

export const projection = loadJson<Projection>("learner-projection.json");
export const details = loadJson<DetailsProjection>("learner-details.json");

export const lessons = projection.lessons;
export const activities = projection.activities;

/** The activity the zero-state dashboard sends a brand-new learner to. */
export const firstActivity = (() => {
  const found = activities.find((a) => a.id === projection.zeroState.continueActivityId);
  if (!found) throw new Error("zero-state continue activity missing from projection");
  return found;
})();

export function activityById(id: string): ProjectedActivity {
  const found = activities.find((a) => a.id === id);
  if (!found) throw new Error(`activity ${id} missing from projection`);
  return found;
}

export function lessonBySegment(segment: string): ProjectedLesson {
  const found = lessons.find((l) => l.routeSegment === segment);
  if (!found) throw new Error(`lesson ${segment} missing from projection`);
  return found;
}

/** The checkpoint activity that closes a lesson (stage kind "check"). */
export function checkpointActivity(lessonSegment: string): ProjectedActivity {
  const lesson = lessonBySegment(lessonSegment);
  const stage = lesson.stages.find((s) => s.kind === "check");
  const activityId = stage?.activityIds[0];
  if (!activityId) throw new Error(`lesson ${lessonSegment} has no checkpoint activity`);
  return activityById(activityId);
}

export function detailPath(entityId: string): string {
  const found = details.representatives.find((r) => r.id === entityId);
  if (!found) throw new Error(`detail representative ${entityId} missing`);
  return found.canonicalPath;
}

/** Activities that mount the workbook audio panel (lib/audio/workbook-audio.ts). */
export const WORKBOOK_AUDIO_ACTIVITY_IDS = [
  "activity:lesson-01-alphabet-listen-spell",
  "activity:lesson-01-workbook-listening",
  "activity:lesson-02-workbook-listening",
  "activity:lesson-02-numbers-0-100",
  "activity:lesson-02-core-professions",
] as const;

/** The seven practice game ids, in the order the selector lists them. */
export const PRACTICE_GAME_IDS = [
  "flashcards",
  "picture-word-match",
  "article-choice",
  "audio-match",
  "word-order",
  "verb-builder",
  "morphology-puzzle",
] as const;

export type PracticeGameId = (typeof PRACTICE_GAME_IDS)[number];
