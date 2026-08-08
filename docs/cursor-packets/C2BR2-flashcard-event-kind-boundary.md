# Cursor Packet C2BR2 — Flashcard Event-Kind Boundary

Status: surgical final remediation before P2-03
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: mastery event parser/types/tests and README only.

Reserve `taskFamily:"flashcard"` exclusively for `selfRatedAttempt`. Reject `objectiveAttempt + flashcard` with stable `DIMENSION_EVENT_MISMATCH` or a more precise stable event-kind error. Objectively graded recall must use `typedRecall`; it may earn strong evidence/checkpoints under the existing rules. This prevents a client from laundering a self-rated flashcard into graded strong evidence.

Add tests proving:

- objective flashcard is rejected;
- self-rated flashcard remains accepted but never strong/checkpoint/mastered even under a large multi-day flood;
- objective typedRecall remains the valid graded recall path;
- after mastery, an incorrect and a partial recognition event each revoke readiness/status under a policy that requires recognition, mirroring the existing recall-lapse tests.

Preserve all 157 tests, all C2B/C2BR1 behavior, typecheck, publication validation and check. Do not edit later phases or commit.
