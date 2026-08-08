# Cursor Packet C2CR1 — Scheduler State and Mission Mix Remediation

Status: blocking remediation before P2-04
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: C2C review package/tests/README only.

## P1 fixes

1. Make scheduler lifecycle the authority for newness. Prefer removing redundant `newCard`; otherwise require `newCard === (card.state === "new")` and derive all quota/count behavior from the validated card state. A new card cannot pass `newCardLimit:0` by setting a false flag.
2. Redesign selection so mix quotas are applied before a modality pool can exhaust capacity. Preserve strict priority for genuinely overdue, recent failed/difficult and stage-blocking cards, but reserve/fill balanced listening, form and production targets where eligible cards exist; interleave listening/production deterministically instead of draining listening first. Sparse categories backfill deterministically without inventing cards. The exact balanced probe (6 listening + 6 production + 6 form, target 6) must include all available target modalities, not six listening.

## P2 fixes

3. Enforce card-state invariants: new cards require reps/lapses/stability/elapsedDays/scheduledDays all zero, difficulty zero and lastReview null; non-new due cannot precede lastReview; lifecycle-specific counters/state must be coherent. Reject impossible combinations with stable errors.
4. Enforce candidate `modality === measuredDimension` (exposure is not a review modality) so quotas and reason text cannot mislabel evidence.
5. Difficult selection derives from one canonical predicate: recent failure flag OR `Difficult`/`Confusing` learner tags. Use it consistently in filters, priority pools, category assignment, quotas, reason counts and text. Tags affect mission selection only, never scheduler math.
6. Make category accounting internally consistent: after due recall, difficult priority precedes modality categorization when the selection reason is difficult; `categoryCounts.difficult` and actual difficult-target allocation must match that exclusive selection category, while `reason.difficult` may truthfully count overlapping attributes. Document the distinction and test it.
7. Add a typed helper that derives recent/weak state from an approved mastery snapshot and dimension using latest evidence plus `dimensionRecovery` (unrecovered lapse is weak; recovered historical failures alone are not permanently difficult). Use it in integration tests; do not rely on cumulative `failures > 0`.
8. `generateDailyMission` must validate its top-level input and candidates array and throw stable `ReviewError`, never raw TypeError, for null/undefined/malformed inputs.
9. Add adversarial tests for new-card mismatch/quota 0, balanced pool, sparse backfill, difficult tags across listening/form, accounting/reason distinctions, mastery recovered/unrecovered integration, due-before-lastReview, dirty new state, modality mismatch and malformed candidates.

Preserve all 199 tests semantically, deterministic due/tie ordering, preview/scheduler math, C2B mastery and C0/C1/C2A gates. Run typecheck, tests, publication validation and check. Do not implement persistence/UI/XP or commit.
