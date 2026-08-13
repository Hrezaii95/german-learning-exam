# P4C — Local learner state, mixed review missions, tags/notes, and derived rewards

## Objective

Turn the current session-only P4A/P4B web slice into a validated local-first learner experience. Persist learner events, review cards, tags, notes, resume pointers, settings, and recording metadata through the existing strict `@german-learning/learning` persistence APIs. Add a real `/review` setup, a static-compatible `/review/session/today` flow, honest dashboard metrics, functional detail controls, and export/import recovery. XP, streaks, and badges are derived views only and must never be stored as authority.

This packet closes register item P4-04. It does not approve TTS, publish the teacher deck, invent lesson content, or make the 23 generic activity shells interactive.

## Hard boundaries

- Do not weaken, bypass, cast around, or duplicate the validators in `packages/learning`.
- Browser state must use `createKeyValueLearnerStateAdapter`, `parseLearnerStateEnvelope`, `hydrateLearnerState`, `exportLearnerStateJson`, and `importLearnerStateJson` with mandatory validation context.
- Keep content bundle identity exact: `{ schemaVersion: "1.0.0", bundleId: "alpha-lessons-01-02" }`.
- No review/draft/blocked/private/source/assertion material may enter a client bundle, route, storage value, export, error, or test fixture.
- Raw recording blobs stay memory-only and are excluded from JSON. `pronunciationAccuracy` remains `null`.
- No XP, streak, badge, score, mastery snapshot, or reward field may appear inside `LearnerStateEnvelope`, events, review cards, candidates, or exported JSON.
- No network account, login, analytics, leaderboard, cloud sync, public audio, or fake pronunciation assessment.
- Preserve GitHub Pages static export. Dynamic review routes are limited to the generated `today` session; unknown session IDs fail closed/404.
- Do not touch `resources/original/**`, `archive/**`, `samples/**`, `media/**`, secrets, plans/register/baton, git history, or deployment settings. Do not commit or push.

## 1. Client-safe publication and review registry

Create one frozen registry under `apps/web/lib/learner-state/**` and executable tests.

### Published resolver

Build `PublishedContentResolver` only from checked-in learner-safe generated projections plus the exact review-template allowlist below:

- every learner-projected Lesson → `Lesson`;
- every learner-projected activity → `LearningActivity`;
- learner-published hub entities usable as learning concepts (Lexeme, Verb, GrammarConcept, PhrasePattern, QAPair, Dialogue) → `Concept`;
- exact template IDs below → `Template`;
- lesson/stage/activity ownership from `learner-projection.json` only.

Unknown, review-only teacher collection, wrong-kind, missing stage, wrong lesson, synthetic game IDs, and arbitrary prefixes must return false/null. Never infer a kind from an ID prefix. Assert exact no-missing/no-extra registry sets at runtime and in tests.

### Exact review templates

Use stable app-published template records with explicit concept, modality, game, lesson, and real published activity ownership:

1. `template:architekt-flashcard-recall` → `lex:architekt`, recall, `flashcards`, `lesson:02`, `activity:lesson-02-core-professions`
2. `template:architekt-picture-recognition` → `lex:architekt`, recognition, `picture-word-match`, same activity
3. `template:architekt-article-recognition` → `lex:architekt`, recognition, `article-choice`, same activity
4. `template:architekt-person-form` → `lex:architekt`, form, `morphology-puzzle`, `lesson:02`, `activity:lesson-02-person-form-morphology`
5. `template:sein-present-form` → `verb:sein`, form, `verb-builder`, `lesson:02`, `activity:lesson-02-sein-arbeiten-contrast`
6. `template:profession-qa-word-order` → `qa:profession-casual-main`, form, `word-order`, `lesson:02`, `activity:lesson-02-profession-qa-builder`
7. `template:profession-qa-production` → `qa:profession-casual-main`, production, inline `qa-production`, `lesson:02`, `activity:lesson-02-profession-qa-builder`

Do not create listening cards while audio is unapproved. Do not label a form card as production. The production review renderer must reuse `IndependentConstructionLevel` and its exact three published answer realizations; no alternate German is accepted.

### Persistent event remapping

P4A/P4B currently emit synthetic `activity:practice-*` and `activity:conversation-*` IDs. Keep low-level component tests intact, but before persistence rebuild and re-parse each event with:

- the registry’s real published activity ID;
- the selected card ID when the event comes from a review session;
- `sourceActivityMode: "mission"` only for review-session events; keep honest normal practice/conversation modes otherwise.

All mappings are exact and exhaustive. Unknown game/template/level fails closed. The persistent event must pass `parseLearnerEvent` and then envelope validation.

## 2. Derived rewards engine (`packages/learning/src/rewards/**`)

Add a pure, exported, tested module. It accepts validated immutable events plus `{ now, timezone }` and returns a deeply immutable derived view.

### XP policy

- exposure and unlinked audio: 0 XP;
- objective incorrect: 2; partial: 5; correct: 10;
- self-rated flashcard: 3;
- linked audio uses the same outcome values (currently no public candidate);
- recording cycle: 8 only when record + playback + self-check are all complete; otherwise 0.

Anti-farming: after deterministic timestamp/eventId ordering and eventId dedupe, award at most three events per local calendar day for the same `conceptId + kind + taskFamily-or-recording` signature. Never change mastery or scheduler behavior to award XP.

### Streak and badges

- A meaningful day contains at least one event that earns XP under the policy.
- Current streak continues through today or yesterday in the configured IANA timezone; calculate calendar dates in that timezone, not by slicing timestamps.
- Return current and longest streak, total XP, meaningful event/day counts, and daily XP rows.
- Derived badges: first meaningful attempt; three mastery dimensions practised; same concept on two distinct local dates; completed spoken recording cycle; seven-day streak. Show earned date/evidence count and locked state. No listening badge may claim progress while audio is unavailable.
- Invalid timezone, malformed event, duplicate/conflicting event ID, impossible date, and mutation attempts fail closed or remain immutable as appropriate.

Tests must cover timezone boundaries, DST-safe dates, reversed inputs, duplicates, anti-farm caps, incomplete recording, no-XP exposure, badges, immutability, and proof that serialized learner state contains no reward fields.

## 3. Browser learner-state provider/store

Create a narrowly scoped client provider rendered inside the root layout around `{children}`. Follow installed Next 16 guidance: provider is a Client Component; keep server/static page components outside the client bundle where possible.

Required state: `loading | ready | error`, validated envelope, hydrated mastery map, due cards, derived rewards, and a non-sensitive status message.

Required atomic actions:

- append one event (dedupe by eventId; reject conflicting duplicate);
- add all eligible review cards for a concept using `createNewReviewCard` and stable card IDs;
- update a card through the Alpha scheduler after a mission event using the existing grade→rating functions;
- toggle each of the five built-in tags;
- save/delete one bounded note per content ID with UUID and timestamp;
- set/clear resume pointer;
- add safe recording metadata only;
- update validated settings;
- export, import-with-confirmation, reset-with-confirmation.

Mutation sequence: derive from the latest committed state, build a detached candidate, validate, adapter `replace`, then publish to React state. Serialize writes through a queue so rapid events/tags cannot lose updates. Failed validation/storage leaves the prior state intact and reports only error code/field-safe copy. No raw values or secrets in errors.

Initialization:

- access `window.localStorage` only after mount;
- load and migrate through the adapter; create and save an empty state only when no value exists;
- invalid/corrupt saved data produces a recovery state and is never silently overwritten;
- listen to cross-tab `storage` changes and revalidate before replacing UI state;
- SSR and first hydration markup must be deterministic.

## 4. Review candidates, mission, and session

Build candidates only from stored cards joined to the exact registry. Labels, lesson, source priority and publication come from learner-safe projections. Tags come from state. Difficult uses the existing mastery bridge plus Difficult/Confusing tags. Teacher assignment means the learner-applied Teacher tag; it must not publish the review-only teacher deck. Stage-blocking stays false until a real stage-unlock policy exists. Older maintenance uses explicit deterministic card age.

Use `generateDailyMission`; do not reproduce its selection logic. Defaults: daily limit 10, new-card limit 4. UI may choose 5/10/15 and filters `onlyDifficult`, `teacherAssignment`, and Lesson 1/2. Show exact reason text/counts and an honest note when listening/production are absent because no eligible template exists.

### Routes/UI

- Enable Review in desktop/tablet/mobile navigation.
- `/review`: loading/error/empty/ready states; due/new totals; reason summary; mission size and filters; Start; shorten; link to add cards from the three representative details.
- `/review/session/today`: render selected cards sequentially using the registered P4A game, or `IndependentConstructionLevel` for `qa-production`; persist the normalized event, apply scheduler update, then advance. Show `n/total`, reason, Back/Exit, completion summary. Empty/stale session recovers to `/review`; double submits cannot emit twice.
- Persist only learner evidence/cards. An ephemeral session card-ID list may use `sessionStorage`; validate it as a subset of freshly eligible cards before use.
- Static export must generate `today`; unknown/malformed session routes must not render a session.

## 5. Learner-facing integration

### Dashboard

Replace “not tracked yet” placeholders with a client summary:

- resume-aware Continue (or honest first-activity zero state);
- Today’s mission card with due/new counts and reason;
- total XP, current streak, meaningful attempts, learned/strong/mastered counts without collapsing mastery into one percentage;
- compact earned/locked badges;
- loading, empty, storage-error, and recovery states.

### Details and hubs

- Replace disabled Add to Review on vocabulary/verb/Q&A representatives with functional state-aware control: Add, Added count, no duplicate cards, safe error feedback.
- Provide all five tag toggles and a saved bounded plain-text note. HTML/path-shaped notes must fail through existing validation; do not render HTML.
- On every hub card show learner tags, due count, and mastery status when available. Add local filters for built-in tag, due, and mastery status on top of the existing q/lesson/category filter. Provide a Favorite quick action usable for any learner-published hub record.
- Keep internal IDs out of learner-facing copy.

### Resume and settings

- Visiting a published activity may update the resume pointer only; it does not mark completion or create mastery evidence.
- Add `/settings` and enable Settings navigation. Provide timezone/audio-speed settings, validated JSON export, confirmed import, and confirmed local reset. Export copy must explicitly say raw recording audio is excluded.

## 6. Accessibility, responsive behavior, and honesty

- Four target widths: 360, 768, 1024, 1440; no horizontal overflow.
- 44px controls, visible focus, semantic forms/fieldsets/progress, one useful live region per mutation, no color-only state.
- Do not render mixed English/German under one `lang="de"`; mark German spans only.
- Loading state is not empty state. Storage errors never masquerade as zero progress.
- No “mastered” copy unless reducer status is mastered; no percentage; no “pronunciation score.”
- No client console errors, hydration errors, duplicate React keys, or uncaught localStorage/file errors.

## 7. Tests and gates

Add pure and rendered behavior tests, not source-text grep only:

- exact resolver kind/ownership/template sets and adversarial wrong-kind/review/synthetic IDs;
- persistent remapping for all six enabled games and five conversation levels;
- atomic store load/write/error/rollback/race/cross-tab/dedupe;
- tags, notes, card creation, scheduler update, import/export/reset;
- derived reward policy/timezone/anti-farm/badges;
- mission empty/ready/filters/reasons/shorten/resume and no invented modalities;
- real GameRenderer and ConversationLadder events persist with real published activities;
- review session double-submit/stale session/completion;
- dashboard/detail/hub/settings rendered behavior and keyboard names;
- learner/public artifact recursive leak scan and export no-reward/no-audio-byte proof;
- GitHub Pages route manifest/output/hydration for `/review`, `/review/session/today`, `/settings`.

Run from `platform/`:

1. `npm run typecheck`
2. `npm run typecheck:web`
3. `npm run typecheck:web-tests`
4. focused new tests
5. `npm run check`
6. `npm run build:web`
7. `npm run audit:prod`
8. `npm run smoke:web-routes`
9. `npm run smoke:dev`
10. `npm run build:pages`
11. `npm run smoke:pages`

Write `research/cursor-execution/P4C-worker-report.md` with exact files, registry table, state transitions, reward policy examples, test counts, command outputs, and honest residual gaps. Do not claim approval; ORCH/reviewers decide G4.
