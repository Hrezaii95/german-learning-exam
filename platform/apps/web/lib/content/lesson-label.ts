/**
 * The single learner-visible lesson label formatter.
 *
 * Lesson identity is zero-padded everywhere the machine reads it — typed IDs
 * (`lesson:01`), route segments (`/lessons/01`), filter values (`lesson=01`).
 * That padding is an addressing detail: to a learner "Lesson 01" reads as a
 * different lesson from "Lesson 1". Every learner-facing surface therefore
 * renders the unpadded form through this module, and nothing here touches the
 * underlying ids or routes.
 */

/**
 * Unpadded lesson number as learner-visible text.
 * Accepts a lesson number, a route segment (`01`), or a lesson id
 * (`lesson:01`, `lesson-01`). Non-numeric input is passed through unchanged so
 * an unexpected id degrades to its own text instead of `Lesson NaN`.
 */
export function lessonNumberText(lessonRef: string | number): string {
  if (typeof lessonRef === "number") return String(lessonRef);
  const separator = Math.max(
    lessonRef.lastIndexOf(":"),
    lessonRef.lastIndexOf("-"),
  );
  const segment = separator === -1 ? lessonRef : lessonRef.slice(separator + 1);
  if (!/^\d+$/.test(segment)) return segment;
  return String(Number.parseInt(segment, 10));
}

/** Learner-visible lesson label, always unpadded (`Lesson 1`, never `Lesson 01`). */
export function lessonLabel(lessonRef: string | number): string {
  return `Lesson ${lessonNumberText(lessonRef)}`;
}
