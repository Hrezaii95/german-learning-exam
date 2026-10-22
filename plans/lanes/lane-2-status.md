# Lane 2 status

Updated by Lane 2 only. Lane worktree: `lane2/l2-1-packs`. Base: `codex/live-alpha` with PR #1 documentation merged locally. Never merge to the live branch.

| PR | Title | State (planned / in progress / draft PR / merged / blocked) | Link | Notes |
|---|---|---|---|---|
| L2-1 | Pack content foundation and A1 migration | draft PR | [PR #4](https://github.com/Hrezaii95/german-learning-exam/pull/4) | Code implemented; A1 pack creation blocked by 19 source headword collisions. |
| L2-2 | Corners and Four Corners templates | planned | — | Separate draft PR per owner's instruction. |
| L2-3 | Daily Run, event-derived progress and Today | planned | — | Separate draft PR per owner's instruction. |

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

`platform/content/packs/a1-migration-status.json` records the current 1,338 source rows, 19 duplicate headword groups and zero missing-lesson errors. The script checks all rows before any output and reports the exact source IDs. The groups include both known duplicate families and intentional-looking homographs/case distinctions; Lane 2 does not silently merge or choose meanings for them.

After Lane 1 resolves the canonical source families, run `npm run packs:migrate-a1 -- --write`, then `npm run packs:validate`. The resulting pack remains pending German review and off by default. L2-2 and later slices remain planned behind this explicit Phase 0 dependency. Integration must retain the draft state while source, browser or composite release gates remain blocked.

Lane 2 checkpoint saved for L2-1. The shared orchestrator baton/register and `codex/live-alpha` were not written. Resume from this file and the draft PR, preserving the owner's one-PR-per-slice rule.
