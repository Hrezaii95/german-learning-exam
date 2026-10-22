# Lane 2 status

Updated by Lane 2 only. Lane worktree: `lane2/l2-5-allskills`. Base: `codex/live-alpha` with PR #1 documentation merged locally. Never merge to the live branch.

| PR | Title | State (planned / in progress / draft PR / merged / blocked) | Link | Notes |
|---|---|---|---|---|
| L2-1 | Pack content foundation and A1 migration | draft PR | [PR #4](https://github.com/Hrezaii95/german-learning-exam/pull/4) | Code implemented; after Lane 1 merge, A1 pack remains blocked by 11 source groups. |
| L2-2 | Corners and Four Corners templates | draft PR | [PR #16](https://github.com/Hrezaii95/german-learning-exam/pull/16) | Implemented; production pack and release/browser gates remain open. |
| L2-3 | Daily Run, event-derived progress and Today | draft PR | [PR #24](https://github.com/Hrezaii95/german-learning-exam/pull/24) | Implemented, including habit and dashboard embedding fixes; final release gates pending. |
| L2-4 | Grammar and listening | draft PR | [PR #26](https://github.com/Hrezaii95/german-learning-exam/pull/26) | Six mechanics wired into Daily Run; 50 focused tests pass; final release gates pending. |
| L2-5 | Speaking, reading and writing | draft PR | [PR #27](https://github.com/Hrezaii95/german-learning-exam/pull/27) | All ten mechanics integrated; self-check practice separated from mastery; 111 focused tests pass. |
| L2-6 | Engagement, maps, story and exam | in progress | — | Pure helpers and fixed routes implemented; integration underway. |
| L2-7 | Book companion | in progress | — | Scope/position/printing implemented; Lane 1 book-surface hooks remain an integration need. |
| L2-8 | CSV authoring and preview | in progress | — | CSV tooling implemented; preview integration underway. |
| L2-8b | Data-only A2 everyday pack | draft PR | [PR #17](https://github.com/Hrezaii95/german-learning-exam/pull/17) | Exactly ten content files, no code; all content pending review. |
| L2-9 | Student Class A tools | in progress | — | Receipts, challenges, assignment card and personal import implemented; integration underway. |

## L2-1 implementation plan

**Goal:** add the data-driven pack foundation without changing existing learner pages.
**Architecture:** new language-agnostic pack model alongside the legacy publication model; pure runtime validation; filesystem loading and migration in server/CLI modules; browser-safe overlay registry. No new dependencies.
**Spec:** `docs/games/wortwerk-build-spec.md` §1.1–1.4, Phase 1; `docs/lanes/CONTRACTS.md`.

- [x] Widen `CefrLevel`; add pack/item, language and difficulty types and JSON Schemas under owned content types/validation directories. Keep legacy article/gender exports compatible.
- [x] Add fixture-driven tests for malformed payloads, cross-references, duplicate headwords, all item types, higher CEFR and a second language.
- [x] Add deterministic auto-discovery, pack validation CLI, capability index and browser-safe idempotent overlay registration in `packages/wortwerk` / `lib/wortwerk`.
- [x] Add German language and difficulty data plus the exact vocabulary migration script, preserving ids, forms, sources and honest book references. Stop on duplicate headwords; no invented page refs or German review approval.
- [x] Append validation/migration script entries and the pack check to `platform/package.json` only; add no dependencies.
- [x] Run required gates sequentially and obtain independent review; exact outcomes below.
- [ ] Create the A1 pack after Lane 1 reconciles source collisions, then rerun the pack/release gates.
- [x] Publish L2-1 draft into `codex/live-alpha` and record its link.

## Coordination and lane acquisition

2026-10-22: Lane 2 acquired for L2-1 under the owner's explicit assignment and ADR-019. No shared baton/register edits: the owner restricts this lane to its own files. This file records the lane baton. Current ownership: content types/validation, pack/language/difficulty data and fixtures, Wortwerk code/tests, the authorized package scripts.

The owner's latest per-slice draft PR instruction overrides the docs' single visibility PR rule. Code will remain on Lane 2-owned branches. No changes to contracts, canonical source rows, shell/nav/tokens, auth, API, sync transport, workflow or deployment files.

## Review focus

- Legacy publication validation must retain its Alpha scope firewall despite the wider reusable CEFR type.
- Invalid/untrusted overlay JSON must fail without partial registration or prototype-key hazards.
- Headword duplicates must be diagnosed before any migration writes; Unicode canonically equivalent spellings count as duplicates.
- Missing source pages and media remain absent, never guessed; pending content stays disabled by default.
- Capability thresholds reflect available data rather than level/language identifiers, with stable deterministic output.

## Gates

Final verification on 2026-10-22, one command at a time. No routes or learner UI added in L2-1.

| Gate | Result | Evidence / limit |
|---|---|---|
| `npm run check` | BLOCKED at final pack check | All three typechecks, lint, publication validation, 110 test files / 1,252 tests and the 100-file / 897-test web rerun passed. The appended pack check correctly fails because the production pack has not been written. |
| `npm run packs:validate` | BLOCKED | No production manifest; migration refuses 19 duplicate headword groups. An empty production inventory is deliberately an error. |
| `npm run test:e2e` | BLOCKED by environment | Initial attempt required an export. After the export existed, `--max-failures=1` stopped at browser launch: Chromium headless-shell executable absent. Browser installation was attempted and returned invalid/truncated archives. No browser assertions ran. |
| `npm run build:web` | PASS | Production build completed, 1,618 static pages generated. |
| `npm run smoke:web-routes` | PASS | 50 checks. |
| `npm run gates:pages` | COMPOSITE BLOCKED on transient export metadata | Final Pages build, export smoke (128-route manifest) and learner-language audit passed. Offline audit caught `.rsync-tmp` paths during output synchronization. Re-running the existing offline finalizer after the export settled, then `npm run audit:offline`, passed (162 entries, 32 navigation routes). The subsequent word-card export audit passed (722 routes, 989/989 forms with audio). This does not relabel the failed composite invocation as a pass. |
| `node tools/audit-attribution.mjs` | PASS | Zero failures. |
| `npm run audit:prod` | PASS | Zero vulnerabilities. |
| Focused Wortwerk tests | PASS | 27 tests in two files; included in the full suite. |

The browser failure affected `tests/e2e/00-serving.spec.ts` (Pages base path, asset resolution, honest 404) and `tests/e2e/01-first-visit.spec.ts` (first lesson journey); the remaining 125 tests did not run after the first unavailable-browser error. They remain unverified.

This host denies the Unix IPC socket created by the existing `tsx` CLI. Existing TS scripts were launched with Node's `--import tsx` through a temporary npm shell/spawn adapter. Build scripts and assertions ran unchanged; no launcher workaround was committed. Gate-generated research reports and temporary route/proxy changes were cleaned from the source tree before staging.

Independent review found and verified fixes for incorrect import depth, expression article stripping, inherited schema-property bypass, unresolved choice answers, uppercase transliteration hints and country-case grading. The higher-level/second-language fixture also covers structured prompt gender tokens; old publication types and their Alpha firewall stay compatible.

No screenshots apply to this data-only slice. No PR merge, deploy, new TTS, language-review promotion, auth or sync-transport change was made.

## Owner / external dependencies

- Lane 1 owns Phase 0 canonical duplicate fixes and USA correction; migration will report any blockers.
- Qualified German review remains open. New pack content is pending and off by default.
- Shared baton/register integration belongs to Claude; the current lane record is this file.


## Source dependency and next action

The original L2-1 checkpoint recorded 1,338 source rows and 19 duplicate groups. After the authorized Lane 1 merge, `platform/content/packs/a1-migration-status.json` records 1,330 rows, 11 duplicate groups and zero missing-lesson errors. The script checks all rows before any output and reports the exact source IDs. The groups include both known duplicate families and intentional-looking homographs/case distinctions; Lane 2 does not silently merge or choose meanings for them.

After Lane 1 resolves the canonical source families, run `npm run packs:migrate-a1 -- --write`, then `npm run packs:validate`. The resulting pack remains pending German review and off by default. Owner instruction (2026-10-22): continue L2-2, L2-3 and later phases against fixture packs without waiting for the production pack. Integration must retain the draft state while source, browser or composite release gates remain blocked.

Lane 2 checkpoint saved for L2-1. The shared orchestrator baton/register and `codex/live-alpha` were not written. Resume from this file and the draft PR, preserving the owner's one-PR-per-slice rule.

## Needs Lane 1

After merging `origin/lane1/l1-2-live-defects` (`5a557fc`), migration sees 1330 rows and 11 unresolved groups. The pack is not written; fixture development continues.

| Headword | Source IDs |
|---|---|
| Auszubildende | `W370-0`, `W370-1` |
| er | `W006-0`, `A18-0` |
| es | `W043-0`, `A19-0` |
| essen | `l9-essen-0`, `l9-essen-noun-0` |
| ihr | `W077-0`, `W418-0` |
| Ketchup | `l9-ketchup-0`, `l9-ketchup-1` |
| Morgen | `W047-0`, `l6-morgen-0` |
| orange | `l5-orange-0`, `l9-orange-0` |
| sie | `W007-0`, `W008-0` |
| Türkisch | `W217-0`, `W534-0` |
| Verwandte | `W198-0`, `W198-1` |

## Continuation plan

L2-2: seeded Corners templates and separate no-giveaway projections, accessible controls and fixture-wide tests. L2-3: event-derived learning, Daily Run, contract links/sync stores, TodayPanel and fixed /play routes. Plans posted before coding: PR #4 comment 6344285730. One draft per slice; no PR merging. Remaining source groups and browser/export gate problems do not block independent implementation.

## L2-2 verification and implementation

Seeded Corners templates cover meaning, reverse meaning, gender, plural form/pattern, word-to-picture and source-audio-to-picture where supported, with recognition/reduced-cue/recall variants. Distractors prefer the same map cell, unit and tags, exclude accepted variants, and use opaque IDs assigned after shuffling. Question/feedback projections are separate. Corners supports pointer drop, tap, arrow keys and typed recall; feedback manages focus and source-only audio has explicit gesture, failure and cleanup handling. Fixtures use eight explicitly selected existing source rows with their actual media; this is test data, not an A1 migration or content review.

Focused engine/UI tests: 23 passing, including 1,000-seed position distribution and question DOM checks. Independent review covered answer metadata, audio lifecycle, source links and variant distractors; fixes applied. Full `npm run check`: all typechecks, lint, publication validation, full suite and web rerun pass; final `packs:validate` remains blocked by the absent production manifest. Required release/browser gates remain open; this slice stays draft. The all-phase continuation plan is posted at PR #4 comment 6344476189.

## L2-3 integration verification

Implemented local UUIDv7 events and LWW docs, contract sync exports, validated evidence adapters and combined backup bridge; progress is rebuilt from raw answers/sessions. Daily Run includes adaptive preview, alternate-format comeback, finite optional finisher, real-answer persistence, meaningful-session streak and separate full-Run goal. Fixed routes, explicit pending-pack opt-in, contract links, standalone panels, live overlay updates and profile-only class extras are included.

`npm run check` passed all typechecks/lint, publication validation, 121 files / 1,367 tests and web rerun 107 files / 977 tests, then failed at the expected empty production pack inventory. Final root scope/provider cases: 15 tests pass. The skip/abandon habit fix adds 25 focused passing tests: five genuine Run/Quick answers keep the streak, full completion is required for the goal and diminishing-Run counter. Production build passed (1,621 static pages); route smoke passed 50 checks. Browser runtime is now available (Chromium 152); export/browser verification will run on the integrated stack. No claim that every release gate has passed.

The data-only A2 draft independently passes schema/resource validation and 318 generated/graded tasks; it does not resolve or replace the remaining A1 source issues. Later slices continue autonomously on owned files.

### Lane 1 integration points

- Call the exported book-position advance proposal/prompt from book and lesson completion surfaces. Lane 2 does not edit those pages.
- Mount the combined Wortwerk backup bridge from the existing Settings backup flow. The owned bridge accepts legacy backups; the legacy Settings page is untouched.
- Add the Play navigation entry when the CONTRACTS prerequisite for Lane 1 navigation integration is satisfied; the fixed routes and link contract work independently.
- Normal build regenerates the Lane 1-owned study dictionary from the updated source. Lane 2 restores that generated file before staging its own slice.

## L2-4 integration verification

Sort, Build, Order, Gap and Listen now render alongside Corners in Daily Run. Grammar/listening templates generate only from authored fields, include supported reduced-cue/recall variants and refuse coincidental answer clues. The shared fixture validates structured prompt tokens; the foundation token test preserves authored choice data. Focused pack, grammar engine/UI and Run lifecycle tests: 4 files / 50 tests pass. Type/lint and release gates are recorded after their actual completion; draft publication does not imply readiness.

L2-4 full check: all three typechecks, lint, publication validation, 124 files / 1,400 tests and web rerun 109 files / 995 tests pass. The final pack check and standalone pack validation stop at the absent production manifest. Browser/export release gates will be rerun on the integrated stack with the data-only A2 pack.

## L2-5 integration verification

Speaking, reading, writing and matching use the same generated-task renderer. The actual DOM no-giveaway matrix covers every template across all ten mechanics and a second language. Self-check attempts remain separate from objective recall, strength, secured milestones and Gold; objective typed writing remains eligible for objective evidence. Tap-to-Learn appends raw deck events, with an explicit no-write preview callback. Self speaking/writing cycles retain their specified XP. Normal local edits preserve future-version synced documents unchanged. Focused final phase batch: 111 passing tests; root/scoped web TypeScript, source lint and hook pass. Browser coverage now includes both Daily Run and Quick review by tap, keyboard and drag at 390/1280 px; execution is pending the fresh integrated export.
