# Lane 1: app consistency and audit fixes

**Goal:** make the whole app look and behave like the preferred cheat sheets, remove obsolete pages safely, fix the live defects, and make the changes the game and platform need from the rest of the app.

**Read first:**
- `docs/lanes/README.md` and `docs/lanes/CONTRACTS.md`;
- `docs/audit/README.md` (the order of work);
- `docs/audit/ux-design-consistency-audit.md` (§1 reference rules, §5 fix list);
- `docs/audit/ia-and-codebase-audit.md` (§5 target IA, §6 decision table, §7 migration steps);
- `CLAUDE.md` (gates, the build-concurrency warning, the pre-commit hook).

## You own
- **App styles:** `platform/apps/web/app/globals.css`, `app/study.css`, `app/cheat-sheets/**`.
- **Every route** that is not `/play/**` (Lane 2) or `/login`, `/account`, `/dashboard`, `/teacher/**`, `/admin/**`, `/api/**` (Lane 3).
- **Components:** `components/{study,shell,hubs,collections,lessons,word-cards,details,media,audio,content,search,activities,review-audio}/**`.
- **Libraries:** `lib/content/**` (including the new `lib/content/nav.ts`), and `lib/study/**` **except** `lib/study/scope.ts` and any new `lib/study/book-position.ts` (Lane 2).
- **Canonical content data** under `platform/content/**` **except** `platform/content/{packs,languages,difficulty}/**` (Lane 2), and `platform/packages/content/src/{indexes,publication,cli}/**`. Lane 2 owns `packages/content/src/types/**` and `validation/**`.
- **Spec docs:** `docs/04`, `docs/06`, `docs/17`, `docs/21`.

## You must not touch
`/play/**`; `components/wortwerk/**`; `lib/wortwerk/**`; `packages/wortwerk/**`; `platform/content/{packs,languages,difficulty}/**`; `packages/learning/**`; `packages/content/src/{types,validation}/**`; `packages/sync/**`; `apps/edge/**`; `.github/workflows/**`; `next.config.*`. Shared append-only files follow CONTRACTS §10.

## PR plan, in this order; each PR is small and shippable
| PR | Content | Source |
|---|---|---|
| **L1-1 foundation (do first, merge early)** | the design tokens of CONTRACTS §1 in `globals.css`; `lib/content/nav.ts` as the single nav source for the rail, tablet bar and mobile tabs (CONTRACTS §2); the `components/account/AccountSlot.tsx` stub rendered in the header and mobile Menu; the existing nav tests updated | audit P0-1 (tokens only), IA §7.3 |
| **L1-2 live defects** | merge the Lesson 4 rows into word families (no duplicate headwords: Bild, Million, Glück, nur, mal, neu, finden, kennen, ein/eine, kein/keine); USA → plural; `/lessons/010–012/` 404 → zero-pad to two digits; a test for no duplicate `de` headwords in `loadSubjectVocabulary()`; exclude `/review-audio` from the Pages export | IA §7.1, §7.8 |
| **L1-3 one article-colour scheme** | point every gender rule at the tokens; one gender vocabulary (`male/female/neuter/plural/plain`); remove schemes C–G | audit P0-2 |
| **L1-4 fix the reference first** | `overflow-wrap:break-word; hyphens:auto` on German words (no mid-word breaks); one focus ring | audit P1-1, P1-8 |
| **L1-5 one cheat-sheet frame** | the reference frame on every sheet; retire the numbered chooser; `/cheat-sheets` becomes a directory; Countries moves to `/cheat-sheets/countries`; static redirect stubs that keep the query **and the hash** (saved items store old hrefs) | audit P0-3, IA §7.6 |
| **L1-6 one vocabulary entry** | a shared `VocabularyEntry` + `WordDropdown`; topic sheets link to their subject sheet instead of keeping their own word lists | audit P0-4, IA §7.5 |
| **L1-7 consolidate hubs** | `/vocabulary`, `/hubs`, `/concepts` and `/collections/professions` → redirect stubs per IA §7.7; fold `/review` into `/saved` | IA §7.7–7.8 |
| **L1-8 visual system** | one illustration system, one button and chip set, one audio button, a type scale, re-skin the Studio pages | audit P1-2…P1-6, P1-4 |
| **L1-9 hygiene** | print from the live page; consolidate per-sheet CSS; breakpoints; icons; delete dead code (`ExtraProfessions*`, `WordCardLibrary`, …); mobile tab label wrap | audit P2 |
| **L1-10 docs** | rewrite `docs/04`, `docs/06`, `docs/17` and `docs/21` to match the shipped IA and design | IA §7.9, audit P2-7 |

## Changes the game and the platform need from your lane
| PR | Change | Depends on |
|---|---|---|
| **L1-G1 play links** | add **"Play this sheet"** to every cheat sheet (it uses the sheet's current filters as the scope) and **"Practise this word"** on word cards and dropdowns, both built with the CONTRACTS §6 format; keep the cheat-sheet filter fields identical to the scope fields (lessons, tags, sources) | Lane 2's `/play/run` route merged (hide the buttons until then) |
| **L1-G2 page refs** | add `bookRef.page` (and the exercise, where known) to every vocabulary row for Lessons 3–12, **taken from the book sources in the repo**, never guessed: pages from `platform/apps/web/generated/interactive-book.json` and `archive/cursor-demo-2026-07-30/content/extracted/_pdf_raw/kursbuch_full.txt`; exercise numbers from `…/_pdf_raw/glossary_full.txt` (organised by lesson and exercise); mark rows you can't locate as `page: null` with a note; owner review before publication | none |
| **L1-G3 retire the old practice games** | `/practice/[gameId]` → redirect stubs to `/play/` | Lane 2 Phase 1 live |
| **L1-G4 nav entries** | none; Lanes 2 and 3 add their own entries after L1-1 merges | n/a |

## Rules
- **Branches and PRs:** branches `lane1/<topic>`. Draft PRs into `codex/live-alpha`, one per row above; **never merge** (the owner merges). Rebase on `origin/codex/live-alpha` before each push.
- **Gates (one at a time, never two builds at once):** `npm run check` → `npm run test:e2e` → `npm run build:web && npm run smoke:web-routes` → `npm run gates:pages` → `node tools/audit-attribution.mjs`. Put the outputs in the PR body.
- **Old URLs keep working** (redirect stubs that preserve query and hash), because saved items in learners' browsers store them.
- **Status:** after each PR, update only `plans/lanes/lane-1-status.md` (done / in progress / blocked, with links).
