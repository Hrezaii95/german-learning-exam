# Cursor Packet C2BR1 — Mastery Semantic and Anti-Bypass Remediation

Status: blocking remediation before P2-03 approval
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: C2B mastery package/tests/config/README only.

## P1 fixes

1. Convert instants to true UTC calendar dates (`new Date(timestamp).toISOString()` semantics) before checkpoint/date-gap logic. Offset spellings of the same UTC date must not count as distinct dates.
2. A later incorrect/partial lapse in any policy-required retrieval dimension must immediately revoke `stability.readyForMastery` and `mastered`/`strong` readiness. Re-earning requires new qualifying strong evidence/checkpoints after the latest lapse; cumulative historical successes remain visible but cannot mask the lapse. Add exact mastered→incorrect→not-ready/not-mastered→new delayed evidence recovery tests.
3. Eliminate the self-rating grader bypass. `selfRatedAttempt` is valid only for `taskFamily:"flashcard"`, represents learner-rated practice, and can never produce strong evidence or delayed checkpoints regardless of rating/latency/hints. It may affect ordinary success/failure practice counts/status below Strong, with `again` always failure. It must not impersonate typed/form/listening/production objective grading.

## P2 correctness

4. Enforce an explicit task-family-to-dimension table at runtime, with exact measured dimensions and no dimension laundering. Use: multipleChoice/pictureRecognition→recognition; typedRecall/flashcard→recall; formManipulation/sentenceOrder→form; listeningTask→listening; productionTask→production. Exposure is recorded only through exposure/audio-exposure events, not appended to objective attempts. Audio linked task measures listening only; recording cycle measures production only. If a future template needs multiple dimensions it must emit separate evidence events, not silently broaden this table.
5. Validate ISO timestamps strictly, including actual Gregorian day/month/leap-year validity, hour/minute/second and timezone-offset ranges. Reject normalized impossible dates such as `2026-02-30T10:00:00Z`; accept valid leap day. Preserve required timezone.
6. Readiness must be based on a qualifying sequence of at least `minDelayedCheckpoints` checkpoints whose successive selected UTC dates meet `minCheckpointIntervalDays`, not merely the first-to-last span. Test day 1/day 2/day 8 with 3 required checkpoints and a 7-day interval fails; a properly spaced sequence passes.
7. Clarify `maxHintsForStrongEvidence` as the maximum hints allowed: current `hintsUsed > max` behavior is correct for default 0. Fix the misleading comment and test 0/1 boundary. Do not change to `>=` and accidentally make zero-hint evidence impossible.
8. A linked audio task must provide finite non-negative `latencyMs` and integer non-negative `hintsUsed`; do not coerce missing values to zero. Missing values fail runtime parsing.
9. Reject unknown mastery-policy keys and any internally inconsistent thresholds (for example strong-evidence requirement below success requirement if that would make semantics contradictory, checkpoint counts/intervals that cannot be interpreted). Stable errors only.
10. Add explicit tests that self-rated or task-family-laundered events cannot achieve Strong/Mastered; strict UTC offset equality; invalid dates; post-lapse recovery; checkpoint spacing; hint boundary; linked-audio required metrics.

Preserve all 139 tests semantically, at least 33 focused mastery tests (add adversarial cases), exact six dimensions/stability separation, immutability, reward separation, configs, C0/C1/C2A gates and publication validation. Run typecheck, tests, publication validation and check. Do not implement scheduler/persistence/UI or commit.
