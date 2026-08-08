# Cursor Packet C2AR5 — Relationship Lesson Metadata Projection

Status: surgical final remediation before P2-02
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: index projection code, focused index tests, and README only.

`projectRelationshipAdjacency` currently filters relationship endpoints but copies optional `IndexedRelationshipEdge.lessonId` unchanged. Sanitize audience-projected edges so a non-null `lessonId` is retained only when that ID resolves to an audience-visible entity of kind `Lesson`; otherwise drop the edge or null the metadata according to the strictest referentially honest behavior. Do not mutate shared full-state edge objects. Apply equally to learner and author projections; neither may expose blocked lesson identity.

Add a synthetic regression with visible relationship endpoints and `lessonId:"lesson:02"`, then block Lesson 2 and prove the ID is absent from learner and author adjacency edge payloads and recursive scans. Also test unresolved/wrong-kind relationship `lessonId` fails earlier validation or is rejected by the index builder rather than silently rewritten.

Preserve all 104 tests, all C2A–C2AR4 behavior, C0/C1 gates and publication validation. Run typecheck, tests, publication validation, and check. Do not edit outside ownership or commit.
