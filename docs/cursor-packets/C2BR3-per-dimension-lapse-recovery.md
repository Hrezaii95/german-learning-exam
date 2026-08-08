# Cursor Packet C2BR3 — Per-Dimension Lapse Recovery

Status: final blocking P1 remediation before P2-03
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: mastery reducer/types/tests/README only.

The current reducer clears global stability after a required-dimension lapse, but unrelated later dimensions can rebuild global checkpoints and reuse cumulative pre-lapse strength in the failed dimension. Fix recovery per required dimension.

## Contract

1. Track the latest incorrect/partial lapse position for each mastery dimension using the reducer’s deterministic `(timestamp,eventId)` ordering.
2. Preserve cumulative audit counts, but separately derive strong successful evidence since that dimension’s latest lapse.
3. A lapsed policy-required dimension is unrecovered until it earns at least the policy’s required strong-evidence threshold in that same dimension after the lapse. Until every lapsed required dimension is recovered, `stability.readyForMastery` is false and status cannot be `strong` or `mastered`, regardless of checkpoints from other dimensions.
4. Global delayed-checkpoint spacing must still be re-earned after the latest required-dimension lapse; unrelated evidence cannot bypass the per-dimension recovery requirement.
5. Expose immutable, inspectable per-dimension recovery evidence (for example latest lapse timestamp/event ID, strong-since-lapse count, recovered boolean) without adding a seventh mastery dimension or a single percentage. Equal-timestamp ordering must be deterministic.
6. Add exact regressions:
   - default-policy mastered → production incorrect → recall-only spaced successes remains not-ready and below Strong;
   - then sufficient strong production evidence after the lapse restores that dimension; readiness/mastery returns only when global spacing also qualifies;
   - partial lapse behaves identically;
   - a lapse in a non-required dimension does not invalidate a custom policy;
   - equal-timestamp lapse/success order is deterministic by event ID;
   - replay/out-of-order input derives identical recovery state.

Preserve all 161 tests, C2B/C2BR1/C2BR2 behavior, typecheck, publication validation and check. Do not implement later phases or commit.
