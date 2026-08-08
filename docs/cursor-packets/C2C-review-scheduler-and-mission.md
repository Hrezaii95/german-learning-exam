# Cursor Packet C2C — Review Scheduler and Deterministic Mission Generator

Status: P2-04 implementation; G2 remains open
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Owner: C-LEARN

## Read first

- `docs/03-learning-journey-and-mastery.md` daily mission/unlocking
- `docs/10-review-and-gamification.md`
- `docs/12-technical-architecture.md` ReviewScheduler boundary
- `docs/18-requirement-traceability.md` REV-001/002/004
- approved `platform/packages/learning/src/mastery/**`

## Write only

- `platform/packages/learning/src/review/**`
- `platform/packages/learning/src/index.ts`
- `platform/tests/learning/review.test.ts`
- minimal package/test config and `platform/README.md` integration

Do not implement persistence/export, UI, XP/streaks, content changes, install FSRS, or commit.

## Scheduler contract

1. Export the exact adapter boundary:
   `ReviewScheduler.preview(card, now): RatingOptions` and `ReviewScheduler.review(card, rating, now): ReviewResult`.
   No UI or caller imports an algorithm implementation directly.
2. Define immutable, versioned, runtime-validated `ReviewCardState`: card/concept/template IDs, measured mastery dimension, due, stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state (`new|learning|review|relearning`), lastReview and scheduler version. Reject invalid dates, future/unknown versions, NaN/negative/inconsistent counters, duplicate/HTML-shaped IDs and now-before-lastReview.
3. Implement a documented deterministic Alpha scheduler adapter (not falsely named personalized FSRS). It is FSRS-compatible in state/interface shape and can later be replaced. Use injected `now`; no wall clock/randomness. Clamp difficulty/stability, make Again increase lapses and enter relearning, and guarantee interval ordering `Again <= Hard <= Good <= Easy` for every valid state. `preview` must equal four independent `review` projections and mutate nothing.
4. Objective incorrect always maps to `Again` regardless of confidence/self-rating. Flashcard reveal uses explicit Again/Hard/Good/Easy. Recording self-rating is not pronunciation accuracy and must not silently schedule as objective correctness.

## Mission contract

5. Define validated, immutable review candidates containing published/unlocked eligibility, card state, concept, mastery dimension, modality (`recognition|recall|listening|form|production`), source priority, lesson, tags, recent failure/difficult flag, stage-blocking flag, older-maintenance flag and new-card flag. Blocked/review/draft/locked candidates are never selected for learner missions.
6. Deterministically select in order: overdue; recent failed/difficult; lesson-required stage blockers; balanced listening/production; older interleaved maintenance; new cards within daily limit. Stable ties use due time, priority, concept/card ID. Never duplicate a card.
7. Target mix for the default mission: 35% due recall, 20% listening, 15% form, 15% difficult/tagged, 10% phrase/Q&A production, 5% older mixed. Ratios are targets only: do not invent modalities/cards when unavailable; backfill deterministically from eligible candidates and report actual category counts.
8. Support filters `onlyDifficult`, `teacherAssignment`, and one `lessonId`; daily card limit and new-card limit; fail closed on unknown filters/IDs/invalid limits. Review includes unlocked content only.
9. Produce a structured reason summary (`due`, `difficult`, `listening`, `production`, `stageBlocking`, `older`, `new`) plus deterministic human-readable text derived from counts. Do not claim a category absent from selected cards.
10. Mission shortening returns a deterministic prefix/rebalanced subset without mutating scheduler/card/mastery state; resuming from card IDs is stable.
11. Scheduler math is independent of tags, XP, streaks and badges. Tags/difficult/error evidence influence mission selection only. No single mastery percentage.

## Required tests

- `ENGINE-SCHEDULER-01`: deterministic clock, interval ordering, Again/Hard/Good/Easy, wrong-objective→Again, preview equivalence, immutability, invalid-state/date/version/clock probes.
- `ENGINE-MISSION-MIX-01`: due-first ordering, all five skill modalities where available, target/backfill behavior, filters, locked/unpublished exclusion, no duplicates, stable ties, reason accuracy, shortening/resume, no state mutation.
- Tests using real approved mastery snapshots for weak/lapsed dimensions.
- At least 30 focused review tests; preserve all 168 existing tests.
- Run typecheck, tests, publication validation and check.

Return exact files, algorithm constants/formulas, test counts, and gate results.
