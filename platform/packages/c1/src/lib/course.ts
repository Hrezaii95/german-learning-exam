import { lessons as demos } from './learning.js';
import { resolveReviewedCourse } from './reviewed-course.js';
import catalog from './data/catalog.json' with { type: 'json' };
import reviewed from './data/reviewed-lessons.json' with { type: 'json' };
import provisional from './data/provisional-lessons.json' with { type: 'json' };
import type { Lesson } from './learning.js';
export const reviewedCourse = resolveReviewedCourse(reviewed, catalog);
const reviewedIds = new Set(reviewedCourse.lessons.map((l) => l.id));
export const lessons: Lesson[] = [
  ...demos,
  ...(provisional as Lesson[]).filter((l) => !reviewedIds.has(l.id)),
  ...reviewedCourse.lessons,
];
export const activityCount = lessons.reduce(
  (n, l) => n + l.exercises.length,
  0,
);
