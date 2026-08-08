# Cursor Packet C2AR2 — Opaque Learner Boundary and Dynamic Query Correctness

Status: second blocking remediation before P2-02
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: C2A index/search paths, focused tests, and platform README only.

## P1 release blockers

1. Eliminate the raw-export learner bypass. A caller using the normal public barrel must not be able to retrieve review/draft/blocked records or raw search documents/memberships without an explicit typed author/review capability. `getEntityRecord` and `getIndexedEntity` must default to learner/published-only. Do not rely only on JSDoc `@internal`. Split author/build indexes from the learner-facing API or hide full internal state behind a module-private boundary (for example a `WeakMap`) while exposing immutable, learner-safe projections. Tests must prove normal public exports cannot retrieve `lex:elektriker`, the teacher deck/collection, review listening assets, or synthetic blocked records without explicit review scope; explicit review may expose review/draft but never blocked.
2. Fix conflicting scope resolution. Explicit `audience:"learner"` must never be widened by legacy `includeReview:true`; either explicit audience wins or contradictory options throw a stable error. Add the exact `Elektriker` regression test.
3. Fix dynamic lesson-query semantics. Validate that `query.lessonId` resolves to an entity of kind `Lesson`; unresolved IDs and wrong-kind IDs throw stable errors. Materialize dynamic collections only after final lesson membership/collection-derived lesson propagation, so `{type:"Lexeme",lessonId:"lesson:02"}` exactly matches finalized Lesson 2 lexemes. Add count/equality tests plus `lesson:99` and `lex:ingenieur` negative tests.

## P2 hardening

4. Apply the malformed/HTML/assertion-shaped string guard to every plain string that becomes a search field or display label, not only StructuredText. Reject bad lemma, intent, title, gloss, exerciseRef and analogous paths with stable `INDEX_PLAINTEXT_REJECTED`. Add adversarial tests.
5. Dynamic query objects must contain only supported keys (`type`, `lessonId`, `tags`). Reject runtime extra/unknown keys with a stable error even when a supported key is also present. Add `{type:"Verb",priority:1}` regression.
6. Membership filtering must not silently discard unknown/stale IDs. Reject them with a stable integrity error. Add lesson and collection regression tests.

Preserve all 93 tests, real publication counts, deterministic ordering, immutable facades, C0/C1 gates, and all C2AR1 fixes. Run typecheck, tests, publication validation, and check. Do not edit outside ownership or commit.
