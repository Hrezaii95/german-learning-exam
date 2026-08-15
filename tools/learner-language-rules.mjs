/**
 * The learner-language rule set, in one place.
 *
 * `audit-learner-language.mjs` runs these over the exported HTML — everything
 * a learner can actually see on a page. That misses one surface: the offline
 * notices are rendered from browser state (connection lost, update waiting)
 * and never appear in the export, so `audit-offline-export.mjs` runs the same
 * rules over the copy compiled into the service worker instead.
 *
 * Importing this module has no side effects, which is the point — the audit
 * script itself executes on import and cannot be reused.
 *
 * Each rule states the learner-visible wording that must never ship.
 */
export const LEARNER_LANGUAGE_RULES = [
  { code: "PUBLICATION_JARGON", pattern: /\b(published|publication|unpublished|learner-published)\b/i },
  { code: "VALIDATION_JARGON", pattern: /\bvalidated\b/i },
  { code: "EVIDENCE_INTERNALS", pattern: /\b(typed learner events|evidence internals|emits? typed|mastery is not recorded)\b/i },
  { code: "RAW_OBJECT_ID", pattern: /\b(?:lex|qa|gram|verb|activity|lesson):[a-z0-9-]/i },
  { code: "RAW_GAME_STATE", pattern: /\bgameId\b|\bgame:[a-z-]+\s*:/i },
  { code: "ROADMAP_LANGUAGE", pattern: /\b(next phase|this slice|not available in this slice|coming in a later phase)\b/i },
  { code: "SEARCH_DEBUG_CHIP", pattern: /\bPriority \d+\b|\bMatched \w+ ·/i },
  // Zero-padding is an addressing detail of ids/routes/filter values, never
  // learner wording: "Lesson 01" reads as a different lesson from "Lesson 1".
  // Rendered HTML is the only place this is checkable end to end, because the
  // label can also arrive from content data rather than a component literal.
  { code: "PADDED_LESSON_LABEL", pattern: /\bLesson 0\d/ },
];

/** Every rule the given phrase breaks. Empty means the wording is clean. */
export function learnerLanguageFindings(phrase) {
  return LEARNER_LANGUAGE_RULES.filter((rule) => rule.pattern.test(phrase)).map(
    (rule) => rule.code,
  );
}
