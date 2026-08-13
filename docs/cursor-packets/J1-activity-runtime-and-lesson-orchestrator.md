# J1 — Activity runtime and lesson orchestrator

Implementation model: Cursor `grok-4.5`, High, `fast=false`. Work headlessly and non-interactively. Do not commit, push, deploy, change publication status, invent German, generate media, or expose review/private data.

## Objective

Turn the existing 23 source-bounded Lesson 1–2 activity routes from disconnected reference pages into a coherent resumable lesson journey without pretending that unfinished activity-specific interactions are complete.

## Ownership

- `platform/apps/web/components/lessons/**`
- `platform/apps/web/lib/learner-state/**`
- `platform/apps/web/lib/content/routes.ts` and lesson/activity projection helpers only where essential
- `platform/apps/web/app/lessons/**`
- new or updated J1 tests under `platform/tests/web/**`
- minimal shared CSS additions in `platform/apps/web/app/globals.css`

Other agents are working on generic detail pages, media audits, and documentation. Do not touch detail components/routes/projections, media, content publication JSON, hub code, audit docs, generated transcript files, or unrelated dirty files. Preserve concurrent edits. If an owned file changed since you read it, merge rather than revert.

## Required behavior

1. Every published activity page presents a clear lesson journey header with:
   - lesson/stage context;
   - position among the 12 Lesson 1 or 11 learner-published Lesson 2 activities;
   - previous and next published activity actions;
   - return-to-lesson action;
   - honest current status: Not started / In progress / Completed.
2. Persist meaningful progress in the existing validated learner-state system:
   - opening a route may set resume, but never marks complete;
   - explicit `Start activity` or first supported interaction marks in progress;
   - explicit `Complete activity` marks the activity completed and advances resume to the next published activity;
   - completion is idempotent and survives reload/export/import;
   - do not award mastery from route views or completion alone;
   - completion may award only the existing policy-approved completion/reward event if such a valid event kind exists. Do not invent an event or XP path.
3. Lesson overview shows derived progress for all published stages and activities, including completed count/percentage and an honest next action.
4. Checkpoint completion exposes a real handoff to `/review` and the lesson overview. Do not claim Review-stage completion because no Review activity is currently published.
5. Direct Lesson 2 entry displays a non-blocking recommendation to complete Lesson 1 first when local progress shows Lesson 1 incomplete. Never lock Lesson 2.
6. Preserve GitHub Pages base-path-safe links, static export, canonical route behavior, review-only teacher deck exclusion, and all existing rich/reference/activity content.
7. UI must be keyboard-operable, use native controls, maintain 44px targets, communicate state beyond color, and work at desktop/tablet/mobile widths.

## Fail-closed constraints

- Exactly the current 23 learner-published activities; derive counts/order from the validated projection, never hard-code 23/12/11.
- No publication-status weakening and no review/draft/blocked IDs in learner state or rendered output.
- No German content invention.
- No fabricated listening answers, transcripts, plurals, pronunciation approval, AI scoring, mastery, or activity success.
- Existing learner-state schema, import/export limits, typed resolver, and atomic-write behavior remain valid. If persisted activity-progress shape requires a schema version/migration, implement it with strict validation and backwards-safe migration plus adversarial tests.
- Loading/error/corrupt-state recovery must remain explicit; controls may not silently discard stored state.

## Tests and exit gates

Write behavior tests before/with implementation covering at minimum:

- route open does not complete;
- explicit start and complete persist across controller reload;
- double complete is idempotent;
- completion advances resume to the next published activity and final activity returns to lesson/review handoff;
- lesson progress derives correctly, with Lesson 2 denominator excluding the review-only teacher deck;
- wrong lesson, unknown, review-only, draft and blocked IDs fail closed;
- direct Lesson 2 recommendation appears only while Lesson 1 is incomplete;
- previous/next links are canonical/base-path-safe;
- completion does not increase mastery evidence;
- keyboard/SSR semantics for progress controls and status;
- existing learner-state, route, publication and Pages tests remain green.

Run:

```powershell
cd platform
npm run typecheck
npm run typecheck:web
npm run typecheck:web-tests
npm run lint:web
npx vitest run tests/web --reporter=dot
npm run build:pages
npm run smoke:pages
```

Return a concise worker report with changed files, behavior delivered, exact test/build counts, remaining honest gaps, and any pre-existing/concurrent issue. Do not claim independent approval.
