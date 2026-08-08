# Cursor Packet C2B — Event-Sourced Six-Dimensional Mastery Engine

Status: P2-03 implementation; G2 remains open
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Owner: C-LEARN

## Read first

- `docs/03-learning-journey-and-mastery.md`
- `docs/10-review-and-gamification.md`
- `docs/12-technical-architecture.md`
- `docs/18-requirement-traceability.md` (`LRN-001`, `LRN-003`, `LRN-004`, `REV-004`)
- `plans/full-alpha-delivery-master-plan.md` P2/G2
- current content types and index public API

## Write only

- `platform/packages/learning/src/mastery/**`
- `platform/packages/learning/src/index.ts`
- `platform/packages/learning/package.json`
- `platform/tests/learning/mastery.test.ts`
- minimal root `platform/package.json`, `platform/tsconfig.json`, and Vitest config/include changes required to typecheck/run learning tests
- `platform/README.md` mastery section

Do not implement scheduler/mission (`P2-04`), persistence adapters/export (`P2-05`), UI, media, FSRS, XP/streaks, or edit canonical content. Do not commit.

## Contract

1. Define one discriminated, versioned learner-event schema with stable runtime validation and errors. Every event has a valid UUID, ISO timestamp with timezone, session ID, event ID, schema version, concept/object ID; activity/card IDs when applicable; source activity mode; measured skill dimensions; result; latency; hints; audio speed where relevant. Event variants must cover exposure, objective/self-rated attempt, audio interaction, and the complete recording cycle without pretending pronunciation scoring exists.
2. The six mastery dimensions are exactly `exposure`, `recognition`, `recall`, `listening`, `form`, `production`. Stability is separate derived scheduling/history evidence, not a seventh mastery-vector slot. Export this explicitly and test exact keys.
3. Reducers are pure and deterministic. They consume validated events, deduplicate by event ID, use event timestamps (not wall clock), and return immutable snapshots with per-dimension attempts, success/partial/failure counts, latest timestamp, latency/hint summaries, recent evidence, delayed-recall checkpoint evidence and a derived status. Define deterministic ordering for equal timestamps.
4. Status is derived only: `new`, `exploring`, `learning`, `practising`, `strong`, `mastered`. No direct status mutation API. Policy accepts required dimensions by concept/card type and explicit thresholds; reject impossible/unknown dimensions and invalid policies.
5. Anti-luck rules are hard gates:
   - page/card/visual opening can update exposure only;
   - audio play without a task is exposure/listening exposure, not correct listening evidence;
   - multiple-choice/picture recognition cannot update recall/form/production and cannot create `mastered` alone, no matter how many or how fast;
   - one correct retrieval cannot create `strong` or `mastered`;
   - hints reduce evidence strength deterministically;
   - rapid guesses/invalid zero latency do not become strong evidence;
   - mastery requires successful evidence across all policy-required dimensions plus at least two delayed retrieval checkpoints on distinct UTC dates separated by the configured minimum interval;
   - failures/lapses remain in history and reduce/interrupt readiness rather than being overwritten.
6. Objective attempts store normalized-answer outcome supplied by the grader, but the mastery engine never accepts client-supplied arbitrary mastery points/status. Wrong objective answers are failures regardless of confidence/self-rating.
7. Recording contributes production practice only if `listen`, `record`, `playback`, and `selfCheck` all completed. Store self-rating, but expose `pronunciationAccuracy:null` and never derive an accuracy score.
8. Keep reward/XP reduction separate from mastery. Mastery APIs must not accept or emit XP/streak/badge fields. Add an explicit type/boundary test.
9. Provide selectors for one concept and a deterministic aggregate over concepts without collapsing the six labelled dimensions into a misleading single mastery percentage.
10. Fail closed on malformed discriminants, dates, UUIDs, negative/NaN latency, invalid audio speeds, duplicate/conflicting IDs, dimension-event mismatch, missing variant fields, future schema versions and assertion/HTML-shaped free strings where any are accepted.

## Required evidence

- `ENGINE-MASTERY-01`: representative exposure, recognition, recall, listening, form and production events derive labelled independent dimensions and reproduce identically from the same event history.
- `ENGINE-MASTERY-ANTI-LUCK-01`: page views, repeated audio, 100 correct MCQs, and one lucky recall cannot produce Strong/Mastered; a valid multi-day, multi-dimensional history can.
- Recording-cycle complete/incomplete tests and explicit null pronunciation accuracy.
- Out-of-order input, equal timestamps, duplicate identical event IDs, conflicting duplicate IDs, lapse after success, hints, invalid runtime inputs, immutability, and reward-separation tests.
- At least 25 focused learning/mastery tests; preserve all 106 existing tests.
- Run `npm run typecheck`, `npm test`, `npm run validate:publication`, `npm run check` from `platform`.

Return exact file list, event variants, policy thresholds, test counts and command results.
