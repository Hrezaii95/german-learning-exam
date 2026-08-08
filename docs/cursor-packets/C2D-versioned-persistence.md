# Cursor Packet C2D — Versioned Export/Import and Persistence Adapter

Status: P2-05 implementation; final G2 artifact
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Owner: C-LEARN

## Read first

- `docs/12-technical-architecture.md` persistence/security/state sections
- `docs/03-learning-journey-and-mastery.md`
- `docs/10-review-and-gamification.md`
- `docs/18-requirement-traceability.md` LRN-003, HUB-003, REV-002
- approved mastery and review package APIs

## Write only

- `platform/packages/learning/src/persistence/**`
- `platform/packages/learning/src/index.ts`
- `platform/tests/learning/persistence.test.ts`
- minimal package/test config and `platform/README.md`

Do not implement UI, network sync, IndexedDB internals tied to a framework, cloud accounts, analytics, XP/streak logic, or edit content. Do not commit.

## Contract

1. Define a strict current `LearnerStateEnvelope` version containing settings, lesson/activity resume state, typed built-in tags, personal notes, raw validated learner events, review-card states, optional local recording metadata (no pronunciation score), content-bundle identity and export metadata. Do not persist derived mastery snapshots as authority; replay raw events after load/import.
2. Export deterministic canonical JSON: stable object key/order and sorted entity arrays, injected export timestamp, no secrets, blobs, absolute paths, HTML, functions, undefined, NaN/Infinity, XP/status/mastery injection or source assertion values. Same logical state + same timestamp must be byte-identical.
3. Import fail-closed with explicit limits (JSON bytes, array counts, note/string lengths), strict discriminants/versions/dates, unknown fields, duplicate IDs, prototype-pollution keys, invalid tags, malformed events/card states, unsupported future schema/reducer/scheduler/content versions and cross-reference mismatches. Validate content IDs through an injected published-ID resolver/set; review/draft/blocked/unknown IDs cannot enter learner state.
4. Provide an explicit migration registry/interface. Current version identity is supported. Unknown/unsupported versions fail; do not invent silently lossy historical migrations. A future migration must be pure, version-to-version, bounded and revalidated before storage.
5. Provide async `LearnerStateStorageAdapter` (`load`, `replace`, `clear`) plus a production-usable adapter over an injected browser-like key-value store (`getItem`, `setItem`, `removeItem`) and an immutable in-memory adapter for tests. No direct `window` access in the package. Copy/freeze on read/write so callers cannot mutate stored state.
6. Import is transactional: parse/validate/replay completely before one `replace`; any failure leaves existing adapter state unchanged. Export reads one consistent snapshot. Choose replace semantics explicitly; never silently merge duplicate event/card/note/tag state.
7. On load/import, replay events deterministically through approved mastery APIs and validate scheduler cards. Return a hydration result with canonical state plus derived mastery by concept and due-card selectors. Reload and export→import must reproduce mastery, lapse recovery, due dates, tags, notes and resume position exactly.
8. Tags are exactly `Favorite|Difficult|Confusing|Exam|Teacher`; notes are separate, plain text, size-limited, keyed to published content. Resume state points only to known Lesson/LearningActivity IDs and stores stage/position without marking skipped work complete.
9. Recording metadata remains local/private, gesture-produced and explicitly unscored (`pronunciationAccuracy:null`). JSON export excludes raw audio bytes by default and says so in metadata.
10. Errors use stable codes/fields and do not echo note/event answer content or secrets.

## Required tests

- Persistence adapter immutability, atomic replace/clear/load and injected key-value failures.
- Canonical byte equality and stable ordering.
- Export/import/reload equivalence for multi-concept events including a lapsed/recovered dimension, review cards, tags, notes and resume.
- Transaction rollback for every malformed class; unknown/future version, oversize, duplicates, unknown/unpublished IDs, prototype keys, HTML, malformed event/card, bad cross-refs.
- Derived state absent as authority; tampered derived fields rejected.
- Raw recording bytes excluded and null pronunciation accuracy preserved.
- At least 30 focused persistence tests; preserve all 208 existing tests.
- Run typecheck, tests, publication validation and check.

Return exact schema/version, limits, adapter semantics, files, test counts and gate results.
