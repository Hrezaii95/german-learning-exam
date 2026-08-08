# Cursor Packet C0R2 — P2 Hardening Before Promotion

Status: authorized final hardening of C0  
Implementation model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`  
Write ownership: same `platform/` paths as C0/C0R1 only.

Read C0, C0R1, the platform package and the Composer re-review record. Preserve every passing contract.

## Required fixes

1. Reject raw HTML in every learner-facing plain string not already covered, including Verb meaning `glossEn`, MediaAsset `spokenText`, and all string payloads inside every `AnswerSpec` variant.
2. Add adversarial HTML fixtures/tests for ListeningAsset transcript text and LearningActivity prompt/answer payloads, not only Dialogue.
3. Add a positive fixture proving a verified picture-dictionary or priority-4 published field passes only with a valid `approved-enrichment` exception attached to Lesson 1 or 2.
4. Add an adversarial duplicate `example:*` ID fixture/test, including collision across nested/top-level declarations where applicable.
5. Add a dedicated invalid `scopeException.attachedLessonId: lesson:03` test expecting stable scope error location.
6. Replace generic outer-catch handling for null/non-object elements inside bundle arrays with element-level structured issues and stable locations; validators must not throw.
7. In the enrichment firewall, defensively require the referenced assertion to be `verified`; do not let an unverified enrichment assertion decide publishability even if provenance also rejects it.
8. Add dedicated partial-publication fixtures for conditional `LearningActivity.answerSpec` and `MediaAsset.spokenText` minimum-field policies.
9. Add a contract test for `validateContentBundleOrThrow` that asserts stable codes/locations and no assertion value leakage.

Run `npm run typecheck`, `npm test`, and `npm run validate:fixture`. Target at least 40 passing tests. Do not commit or edit outside ownership. Return exact model params, files, results, count and remaining decisions.
