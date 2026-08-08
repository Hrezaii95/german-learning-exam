# German Learning OS — Platform

Content schema and validation foundation (C0 / C0R1–C0R3) plus C1/C1A/C1B/C1R1/C1R2 publication loader, count gates, bijections, rights firewall, and fail-closed authority projection. C2A adds immutable typed indexes and German-aware search over a validated `ContentBundle`. C2B adds the event-sourced six-dimensional mastery engine; C2C adds the Alpha review scheduler adapter and deterministic mission generator; C2D adds versioned learner-state persistence and export/import (`@german-learning/learning`). P3A adds the first web shell under `apps/web` with a fail-closed learner-safe content projection and Lessons 1–2 routes.

## Commands

From `platform/`:

```bash
npm install
npm run typecheck
npm test
npm run check
npm run test:web
npm run build:web
npm run audit:prod
npm run smoke:web-routes
npm run validate:fixture
npm run validate:publication
npm run encode:publication
npm run validate -- <path-to-bundle.json>
```

- `typecheck` — TypeScript strict check for content/learning packages, web projection libs, and tests
- `typecheck:web` — TypeScript check for the full `@german-learning/web` workspace (`app/**`, `components/**`, etc.)
- `test` — content + learning + web contract fixtures (vitest), including C0/C1/C2A, C2B mastery, C2C review/mission, C2D persistence, and P3A web gates
- `test:web` — P3A projection, route ownership, leakage, shell-contract, and P3AR2 canonical-route tests only
- `build:web` — generate the learner projection from `content/published/`, then build `@german-learning/web`
- `check` — typecheck, `typecheck:web`, full tests, `validate:publication`, then `test:web` (web app/components cannot be silently omitted)
- `audit:prod` — **release/security gate**: `npm audit --omit=dev --audit-level=high` (zero high/critical). Ordinary offline type/test execution must not depend on registry availability; run this before release.
- `smoke:web-routes` — production HTTP smoke after `build:web` (canonical 200, raw-colon 308→canonical, wrong-lesson/unknown/review-only/future hubs 404, no dashboard fallback)
- `validate:fixture` — validate the minimal valid Lesson 1 fixture bundle
- `validate:publication` — load `content/published/` (five required fragments), merge, run ContentBundle validators, count gates, bijections, and fail-closed authority projection comparison
- `encode:publication` — deterministically regenerate published fragments and the pinned authority projection from source authorities
- `validate -- <path>` — validate any JSON content bundle by path

## P3A web shell (`apps/web`)

Next 16 App Router shell structurally compatible with the Sites foundation (`.openai/hosting.json`, `app/`, optional `worker/`). Node engine floor is `>=20.9.0`. Course data comes only from a build-time learner projection of the validated publication bundle — never from `samples/**`. Routes: `/`, `/lessons`, `/lessons/01`, `/lessons/02`, and `/lessons/{01|02}/activity/{encodedActivityId}` where the activity segment is the complete encoded ID (`activity%3A…`). Pure route resolution accepts only absolute slash-normalized paths (relative paths, `//`, and trailing slashes are **rejected** by the pure resolver; the Next 16 `proxy.ts` issues one 308 to strip a single trailing slash, combining with canonical activity encoding when needed). Safe noncanonical aliases (raw colon / lowercase hex) that decode once to a learner-published activity owned by the path lesson get one permanent redirect to `ownership.canonicalPath`; wrong-lesson, unknown, review-only, malformed, and extra-segment routes remain real 404s with no dashboard fallback. Activity `generateStaticParams` uses encoded segments (Windows-safe); request-time decoding is fail-closed in the page. Hubs and progress/XP/streak are not implemented; hub nav is disabled as “Next phase.”

The publication bundle validates **24** activity records. The learner projection currently publishes **23** of them: `activity:lesson-02-teacher-professions-deck` remains `review` per C1R1 / the single web learner-publication policy, is omitted from the client artifact, and its route returns not-found until deliberate publication approval. Empty non-overview stages (including the teacher-review stage shell) are not projected to learners.

## C1 publication loader

Required fragment filenames under `content/published/`:

1. `lesson-01.json`
2. `lesson-02.json`
3. `teacher-professions.json`
4. `activities.json`
5. `listening-assets.json`

The loader requires matching `schemaVersion`, merges disjoint ContentBundle arrays, rejects duplicate entity IDs across fragments before normal validation, and returns one aggregate bundle. Fragment `meta` may carry a typed publication metadata envelope (`teacherSourceRows`, `workbookMappings`) used by count gates without widening or weakening ContentBundle validation. Duplicate / incomplete metadata records are rejected (no silent deduplication).

`loadAndValidatePublication({ publishedDir })` requires the sibling `content/authority/workbook-audio-map.projection.json` by default. Explicit `fragmentPaths` validation also requires an `authorityPath` (or preloaded `authority`) unless the deliberate fixture/test-only `allowMissingAuthorityForTests` opt-out is set. Missing or invalid authority yields stable `PUBLICATION_AUTHORITY` (production CLI never opts out).

Count gates enforce: lessons `lesson:01` and `lesson:02`; 24 unique activities split 12/12 counted by `lessonId` with ID-prefix ownership agreement; teacher metadata↔`sourceRow` assertion bijection (48 rows, Lexeme subjects); workbook metadata↔ListeningAsset↔publisher MediaAsset bijection (15); pinned authority projection under `content/authority/`; zero public source MP3s; recursive scan rejecting forbidden MP3 path/URL strings nested in source assertion values or fragment metadata; portable relative paths only (Windows drive, UNC, and POSIX absolute paths rejected; URIs classified explicitly); no slash lemmas.

Publisher audio may use only exact `rights-gated:` scheme references; any relative/absolute/http/file path whose path component ends `.mp3` (query/fragment stripped) fails the public-source gate for all media origins. Published fragments must not embed private/full MP3 path strings; bare basename metadata is allowed.

Isolated fixtures live under `tests/content/fixtures/publication-package/` (synthetic; not real course content).

Validation issues cite stable codes plus object/field/(optional) assertionId or gapId locations. Assertion value bodies are never echoed.

## C2A / C2AR1 / C2AR2 / C2AR3 / C2AR4 / C2AR5 typed indexes and search

`buildContentIndexes(bundle)` builds mutation-resistant indexes from a validated `ContentBundle`:

- by ID / kind
- lesson membership (keys/values omit hidden/blocked Lesson identity)
- relationship adjacency (audience-projected; optional edge `lessonId` retained only for audience-visible Lessons)
- source priority and publication status
- media and example links
- collection membership (static first, then deterministic dynamic `type`/`lessonId`/`tags` after lesson propagation) and activity indexes
- source-derived entity tags (`rel:<type>` from the audience-projected graph only, plus grammar `commonErrorTags`)
- learner `reviewableConceptIds` (published only); author reviewables only via `openAuthorIndexes(...).authorReviewableConceptIds`
- search documents (lessonIds projected against audience-visible Lessons)

The public `ContentIndexes` facade is published-only: maps, linked ID arrays, relationship adjacency (both endpoints published; edge `lessonId` nulled when the Lesson is not audience-visible), and `LearnerIndexCounts` never expose review/draft/blocked IDs or author-only aggregates. Full author/build state is module-private (`WeakMap`); call `openAuthorIndexes(indexes)` for an explicit typed author/review capability (`AuthorIndexCounts`, author adjacency excluding blocked endpoints, `authorReviewableConceptIds`). Learner-facing helpers (`searchContent`, `filterIndexedEntities`, `entitiesForLesson`, `membersOfCollection`, `getEntityRecord`, `getIndexedEntity`) fail closed to `publication.status === "published"` unless `audience: "review"` is set. Helper entity records match the corresponding projected `byId` shape (nested `lessonIds` / media / example / collection / activity IDs and `rel:*` tags). Relationship-driven filters and tag filters use the audience-appropriate projected graph. `blocked` is never visible. Explicit `audience:"learner"` + `includeReview:true` throws `INDEX_AUDIENCE_CONFLICT`. Unresolved or wrong-kind relationship `lessonId` values are rejected by the index builder.

`searchContent` runs NFC / case-fold / umlaut-ß–aware matching. Canonical spelling reports `exact`; digraph/base aliases (`heissen`, `Gaertner`, `GARTNER`) report `normalized-alias`. Hits never include raw HTML or assertion values. Plain strings used as search fields or display labels are guarded with `INDEX_PLAINTEXT_REJECTED`.

Hub filters support lesson, learned/all-ready (missing `readyIds` → none), priority, kind/category, tags, relationship, named `masteryKey` → `masteryProjections`, and due projections. Unknown candidate IDs, stale membership IDs, contradictory membership/activity ownership, unresolved/wrong-kind dynamic `lessonId`, and unknown dynamic query keys throw stable errors.

```bash
npm test -- tests/content/indexes-search.test.ts
```

## C2B event-sourced mastery engine

`@german-learning/learning` derives six labelled mastery dimensions from append-only learner events. XP/streaks and UI remain out of scope. C2C adds the review scheduler adapter and deterministic mission generator under `src/review/`. C2D persists raw events and replays them on load/import.

**Dimensions (exact keys):** `exposure`, `recognition`, `recall`, `listening`, `form`, `production`.  
**Stability** is separate delayed-checkpoint evidence (`stability.kind === "stability"`), not a seventh vector slot.

**Event variants:** `exposure`, `objectiveAttempt`, `selfRatedAttempt`, `audioInteraction`, `recordingCycle` — schema version `1.0.0`, UUID ids, ISO timestamps with timezone (strict Gregorian + offset).

**Task-family → dimension (exact, no laundering):**

| Family | Dimension |
|---|---|
| `multipleChoice` / `pictureRecognition` | recognition |
| `typedRecall` | recall (objective / graded) |
| `flashcard` | recall (`selfRatedAttempt` only) |
| `formManipulation` / `sentenceOrder` | form |
| `listeningTask` | listening |
| `productionTask` | production |

Exposure is recorded only via `exposure` or audio-without-task events. Linked audio measures listening only; recording cycle measures production only. `taskFamily:"flashcard"` is reserved exclusively for `selfRatedAttempt` — `objectiveAttempt + flashcard` is rejected (`DIMENSION_EVENT_MISMATCH`). Self-rated flashcards never produce strong evidence or delayed checkpoints; objectively graded recall must use `typedRecall`.

**Default policy thresholds:**

| Field | Default |
|---|---|
| `requiredDimensions` | recognition, recall, listening, form, production |
| `minSuccessesPerDimension` | 2 |
| `minStrongEvidencePerDimension` | 2 |
| `minDimensionsMetForStrong` | 3 |
| `minRetrievalSuccessesForStrong` | 2 |
| `minDelayedCheckpoints` | 2 |
| `minCheckpointIntervalDays` | 1 |
| `minValidLatencyMs` | 250 |
| `maxHintsForStrongEvidence` | 0 (max hints *allowed*; `hintsUsed > max` blocks strong) |

Anti-luck gates: page/card/visual → exposure only; audio without task → exposure/listening exposure only; MCQ/picture recognition cannot update recall/form/production or create Mastered alone; one correct retrieval cannot create Strong/Mastered; hints and sub-threshold latency block strong evidence; Mastered requires all required dimensions plus spaced delayed checkpoints on successive UTC dates (`toISOString` calendar dates) meeting `minCheckpointIntervalDays`; a later incorrect/partial on any **required** dimension clears global checkpoints and marks that dimension unrecovered until it earns `minStrongEvidencePerDimension` strong successes *in that same dimension after the lapse* (`dimensionRecovery`). Unrelated dimensions cannot rebuild readiness by recycling pre-lapse cumulative strength. Non-required dimension lapses do not invalidate a custom policy.

Recording contributes production only when listen→record→playback→selfCheck all complete; `pronunciationAccuracy` is always `null`. Mastery APIs reject and never emit XP/streak/badge fields.

```bash
npm test -- tests/learning/mastery.test.ts
```

## C2C review scheduler and deterministic mission generator

`ReviewScheduler` is the only allowed adapter boundary:

```ts
preview(card, now): RatingOptions
review(card, rating, now): ReviewResult
```

Alpha ships `createAlphaReviewScheduler()` — an **Alpha Deterministic Scheduler** with FSRS-compatible card state shape (`due`, `stability`, `difficulty`, `elapsedDays`, `scheduledDays`, `reps`, `lapses`, `state`, `lastReview`) so a pinned `ts-fsrs` implementation can replace it later. It is **not** personalized FSRS. Constants live in `review/constants.ts`:

| Constant | Value / role |
|---|---|
| `REVIEW_SCHEDULER_ID` | `alpha-deterministic` |
| `REVIEW_SCHEDULER_VERSION` | `1.0.0` (unknown/future rejected) |
| `ALPHA_DESIRED_RETENTION` | `0.90` global default |
| Difficulty clamp | `[1, 10]` (0 allowed only on brand-new cards) |
| Stability clamp | `[0.1, 36500]` days |
| Learning intervals | Again 1m · Hard 5m · Good 10m |
| Review interval factors | Hard `0.8×S` · Good `1.0×S` · Easy `1.3×S` (Again → relearning) |
| Stability multipliers | Again `0.2` · Hard `0.95` · Good `1.2` · Easy `1.5` |

Injected `now` only — no wall clock or randomness. Interval ordering `Again ≤ Hard ≤ Good ≤ Easy` is enforced. Objective `incorrect` always maps to `Again`. Recording self-rating requires an explicit rating and never schedules as silent objective correctness.

New-card invariants require reps/lapses/stability/elapsedDays/scheduledDays/difficulty all zero and `lastReview` null; non-new `due` cannot precede `lastReview`. Mission newness uses `card.state === "new"` (no redundant `newCard` flag). Candidates require `modality === measuredDimension` (exposure is not a review modality).

`generateDailyMission` selects unlocked **published** candidates only. Strict priority: overdue (with reserved listening/form/production mix capacity) → recent failed/difficult (flag **or** `Difficult`/`Confusing` tags) → stage blockers → interleaved listening/production/form → older maintenance → new cards within `newCardLimit`. Default mix targets: 35% due recall · 20% listening · 15% form · 15% difficult · 10% production · 5% older (targets only; missing modalities are not invented; sparse categories backfill deterministically).

**Category vs reason:** `categoryCounts` uses one exclusive selection category per card (after due-recall, difficult precedes modality). `reason.*` may count overlapping attributes (a difficult listening card increments both). Use `deriveMasteryDimensionReviewState(snapshot, dimension)` for weak/unrecovered flags — do not use cumulative `failures > 0`. Filters: `onlyDifficult`, `teacherAssignment`, one `lessonId`. Shorten/resume do not mutate scheduler/card/mastery state. Tags influence selection only — never scheduler math. No single mastery percentage.

```bash
npm test -- tests/learning/review.test.ts
```

## C2D / C2DR1 / C2DR2 / C2DR3 versioned persistence and export/import

`LearnerStateEnvelope` schema version `1.0.0` stores settings, resume, built-in tags (`Favorite|Difficult|Confusing|Exam|Teacher`), personal notes, raw learner events, review-card states, and recording metadata (`pronunciationAccuracy: null` only). Derived mastery is never authority — load/import replays events through `reduceAllConceptMastery` and validates cards via approved review parsers.

| Pin | Value |
|---|---|
| `LEARNER_STATE_SCHEMA_VERSION` | `1.0.0` |
| `masteryReducerVersion` | `MASTERY_REDUCER_VERSION` (`1.0.0`) |
| `reviewSchedulerVersion` | `REVIEW_SCHEDULER_VERSION` (`1.0.0`) |
| `learnerEventSchemaVersion` | `LEARNER_EVENT_SCHEMA_VERSION` (`1.0.0`) |
| Content bundle identity | exact `schemaVersion` + `bundleId` (injected; spoof rejected) |

**Limits:** JSON ≤ 5 000 000 UTF-8 bytes (measured automatically before parse / after object preflight — not caller-supplied); events ≤ 50 000; review cards ≤ 20 000; tags ≤ 10 000; notes ≤ 5 000; recordings ≤ 5 000; note text ≤ 4 000 chars; general strings ≤ 512. Absolute paths (Windows drive, UNC, POSIX `/…`, `file://`) and secret/blob field names are rejected without echoing values.

**String firewall:** after schema parsing, every persisted string in learner events and each validated `ReviewCardState` (`cardId`, `conceptId`, `templateId`, `due`, `lastReview`, scheduler id/version, and any future nested string) is scanned for length/path/secret violations before the envelope is accepted. Legitimate content IDs and ISO timestamps remain valid.

**Published-content resolver:** adapters/export/import/hydration require a typed `PublishedContentResolver` (`isPublished`, `entityKind`, `lessonOwnsStage`, `stageOwnsActivity`) plus exact `expectedContentBundle`. Boolean-only resolvers fail. Resume requires a published `Lesson`, published `LearningActivity`, a stage owned by that lesson, and the activity owned by that stage — no id-prefix inference.

**Adapters:** `LearnerStateStorageAdapter` (`load` / `replace` / `clear`) with **full replace** semantics (no silent merge). Both `createInMemoryLearnerStateAdapter({ publishedIds, expectedContentBundle })` and `createKeyValueLearnerStateAdapter({ store, publishedIds, expectedContentBundle })` require validation context at construction. `load` always migrates/parses/validates stored JSON; `replace` fully validates before any write (invalid replace leaves prior state unchanged). No `window` access; copy/freeze on read/write.

**Export/import:** `exportLearnerStateJson` deep-clones caller state, validates the detached clone with the same mandatory context, then emits deterministic canonical JSON (sorted keys/entity arrays, injected `exportedAt`, `includesRawAudioBytes: false`). It never freezes or mutates caller-owned objects. `importLearnerStateJson` is transactional: migrate → validate → replay → one validated `replace`; failures leave adapter state unchanged. Learner-facing import uses the default identity migration registry only. Public hydration always validates (no `alreadyValidated` escape hatch). Event `cardId` cross-refs require the card to exist, share `conceptId`, and have `measuredDimension` present in the event’s `measuredDimensions`. Hydration `masteryByConcept` is a mutation-resistant map facade (no callable `set`/`delete`/`clear`; iteration exposes frozen snapshots).

```bash
npm test -- tests/learning/persistence.test.ts
```

