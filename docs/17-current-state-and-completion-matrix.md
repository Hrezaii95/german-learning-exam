# Current State and Completion Matrix

Updated: 2026-10-22. Baseline: owner-authorized integration `c9c1e6fdefcf1f950ce5612158f6909e3525519c`, merged through PR #20. Responsive/print repair evidence remains pinned to `3a129bcc5769a9441cedcdb0615b28bd8788f5a9` / tree `2241388cc9feffe9960b718df1b810a387c116b7`; the completed G1 local run is pinned separately to `dcc06db04e1be6cd4d0c211b2cf3ef0661453ef8` / tree `f92d0f9ce584bad603bbc4eaca1e10d281f3c58a`. The latest validated full E2E suite, at the G1 pin, executed 190 cases: 178 passed and twelve unchanged Lane 2 cases failed. Original E2E exit 1 and overall blocked exit 3 remain explicit; successful classification is not a gate pass. G3 is a prepared source candidate following owned G1 acceptance; its fresh gates are unexecuted. Merge and local QA do not certify deployment, game/account acceptance, qualified German review or generated-audio quality.

The 2026-08 sample-era matrix and its counts are historical evidence. `platform/` is now the application under review; the old sample path is not the production acceptance baseline. Product requirements remain in [docs/02](02-product-requirements.md), with [traceability](18-requirement-traceability.md), [acceptance rules](13-quality-and-acceptance.md) and [owner actions](OWNER-ACTIONS.md).

## Status vocabulary

| Status | Meaning |
|---|---|
| Integrated baseline | Present in the PR #20 alpha tree; this alone does not establish current-target or deployed acceptance |
| Prepared | A candidate exists with stated evidence; any required current-target or owner acceptance remains explicit |
| In progress | Work is underway; planned behavior must not be described as completed |
| Blocked | A named external-owner dependency prevents completion |
| Owner review | Candidate material exists but a human publication/review decision remains open |
| Deployed | Requires a specific deployed commit/build and fresh URL/behavior evidence; no new deployment is asserted here |

Documentation records a contract and evidence limits. It cannot substitute for implementation, source review, listening review or rendered verification.

## Lane 1 implementation matrix

| Item | Integration / candidate state | Implemented behavior / direct evidence | Remaining acceptance |
|---|---|---|---|
| L1-1 foundation | Integrated baseline | Contract tokens in `app/globals.css`; one `lib/content/nav.ts` source; role/placement filtering; account-slot integration boundary | Preserve Lane 2/3 additions during integration; account behavior belongs to Lane 3 |
| L1-2 live defects | Integrated app portion; external blockers remain | Lesson 4 duplicates resolve through canonical families with aliases/headwords/forms/prompts/concepts retained; old row/collection hashes and bidirectional saved toggles covered; lessons 10–12 use two-digit links | Canonical USA schema plural and selective review-audio Pages exclusion need their owners |
| L1-3 article palette | Integrated baseline | One contract tone palette; `articleTone()` maps presentation values; legacy gender CSS variables alias the shared tones; decorative selections use action/ink | Preserve source schema values; check final rendered contrast and any cross-lane consumers |
| L1-4 reference wrapping/focus | Integrated; pinned local review recorded | German natural wrapping/hyphenation and shared focus-ring token; state/semantic outlines retained; plural geometry and sampled viewport checks recorded below | Preserve these contracts during later integration; sampled checks do not certify every route or assistive technology |
| L1-5 frame and route migration | Integrated; pinned local suite/export evidence recorded | `CheatSheetFrame`, named/searchable chooser, common `sheetDestinations`, directory, canonical Countries/All vocabulary routes and query/hash-preserving static compatibility routes | Deployed route/Back-context behavior needs its own dated evidence |
| L1-6 entry consolidation | Integrated; pinned local suite evidence recorded | `VocabularyEntry`, `WordDropdown`, shared plural highlighting/source qualifiers; topic vocabulary handoffs replace duplicate live lists while unique practice/builders remain; alias/filter/reset cases remain covered | Original E2E gate is still red for the separate Lane 2 cases below; no deployed acceptance implied |
| L1-7 hub/review consolidation | Integrated; pinned local suite evidence recorded | Old vocabulary/library/concept/profession indexes redirect; source-aware People handoff; `/saved` combines saved recall and guided missions with separate stores; combined local lesson/source overlays, chooser/Back validation and reset | Retain guided session routes and old profession return context during future integration; no deployed acceptance implied |
| L1-8 visual system | Integrated line art and responsive repair; pinned local review accepted | Pure illustration registries/shared renderer, ADR-020a line-art card heroes, one actual-color palette, reference button/chip/type tokens, Studio paper/borders, shared single-line audio and reused workbook transport | Current sampled line-art review is distinct from historical raster proof; German/audio owner review and deployed acceptance remain separate |
| L1-9 print/CSS/icons | Integrated print/mobile repair; pinned local PDF/screen review accepted | Live-DOM print with scope/selection context and visible attribution; 15 summary functions/ten print-only component/style files removed; six Learning stylesheets consolidated into five app sheets plus shared hobby/time styles, eight reference breakpoints, shared Icon and unused legacy lists/chooser removed. Repairs use content-sized mobile targets/measured padding, a proportionally bounded whole book page and practice-panel break avoidance | Acceptance covers the tested states and pages below; no fixed page-count, production-root browser or deployed-release promise |
| L1-10 specification docs | Evidence-reconciled documentation draft | Owned IA/design/state/route documents distinguish integrated code, accepted local repair/G1 evidence, prepared G3 code and explicit owner/release limits | Documentation publication does not clear the original E2E gate or certify deployment |

The integrated L1-6/L1-7 reset corrections remove both `lessonFilter` and `sourceFilter`, rather than retain them through a spread of default fields. Neither URL restore may silently mutate the global scope. The pinned local evidence below covers the reconciled current target; the original E2E gate remains red.

## Evidence and candidate boundaries

The release lead completed one pinned local ordered run on `3a129bcc5769a9441cedcdb0615b28bd8788f5a9` / tree `2241388cc9feffe9960b718df1b810a387c116b7`. The original E2E gate is red; a classifier identifying known owner failures does not turn that gate green.

| Current-target evidence | Recorded result | Limit |
|---|---|---|
| Types, lint, publication and unit checks | Passed; root 151 files / 1,662 tests, web 128 files / 1,192 tests; E2E types passed | These checks do not establish rendered or deployed behavior |
| Original E2E suite | 182 executed once: 170 passed, 12 failed; zero skips, flaky cases, retries or global errors; original exit 1 | Original gate remains failed; overall ordered result is blocked, exit 3 |
| Builds and original route gates | Production and Pages builds, original production/dev/Pages smokes and original word-card audit all exited 0 | Local builds/routes, not a deployed URL or production-root browser acceptance |
| Other audits and owned supplements | Language, offline and attribution audits plus owned canonical-route/Pages/word-card checks exited 0; restored-source proof passed | Supplements remain separate from the original gates |
| Actual screen/mobile review | All 28 Pages screen captures and 15 additional mobile viewport captures were viewed and accepted within scope | Selected routes/states/widths; contextual lesson scene is live, mapped responsive RichLessonVisual picture remains unrouted/component-only |
| Plural reflow | 36 actual DOM/geometry cases, zero findings; no prototype CSS injection | These are geometry cases, not 36 screenshots or arbitrary-content proof |
| Bounded mobile scroll clearance | 27 targets passed hit trials with retained navigation; actual Save/rate toggles passed, zero probe/cleanup errors | Resolves the tested element/full-page capture occlusions; not every route/control or native pointer behavior |
| Actual print review | Ten A4/Letter PDFs, all 27 rendered pages viewed: Directory 4/4, People 3/4, All plurals 1/1, Book 1/1, Past 4/4 | Prepared current states only; no fixed page-count promise for other content |

The twelve original E2E failures are `platform/tests/e2e/wortwerk-run.spec.ts` cases for quick/run × tap/keyboard/drag × 390/1280px. Their shared assertion at line 33 expects “1 day in your streak” after completion; the displayed value is “0 days in your streak”. Test, fixture and relevant runtime blobs match the integrated c9 baseline. Source tracing finds a two-task fresh-gender queue after the consecutive-template cap, while the meaningful-session rule requires at least five graded answers. Lane 2 owns the queue/engagement fix; its PR #31 candidate was not adopted into this Lane 1 source. The original assertion and red result are preserved.

All PDF pages retain readable teaching and attribution. The Book sample contains the complete current original page, scope and credits on one A4 and one Letter sheet; People and Past keep their practice heading, counter, prompt and options together. A4 People may leave its collection introduction before the card’s next-page continuation, and Letter may retain whitespace around an intact section; no clipped or lost teaching content was found. W126’s 360/390px same-line forms can have a flush 0px advance gap against audio targets; actual viewport images and per-character ranges confirm visible letters and zero overlap, not an added spacing margin.

These checks use a locally served Pages export. No production-root browser or live-deployment acceptance is asserted. The earlier element/full-page captures alone did not prove fixed-navigation clearance; the bounded scroll/hit/action evidence supplies that separate proof. The original E2E owner failure, qualified German/listening review and source/publication gates remain open.

The focused runs below are historical Lane 1 preparation evidence. Accepted QA on `8c1c32243a8d9e58ff8056a13d91f8ac2261fabf` and screen QA on `3fa5e895` remain pinned to those snapshots. Their raster-card layout proof is not acceptance of ADR-020a’s current line-art heroes; the new line-art evidence is recorded separately above.

| Area | Historical focused evidence | What it does not establish |
|---|---|---|
| Alias/progress compatibility | Tests cover canonical/old Lesson 4 IDs across inline, dictionary, practice and family cards; old `nur`/`mal` expression links restore the canonical row | Canonical schema approval, all browser migrations or a deployed release |
| Frame/route navigation | Static redirect, directory/frame and route-context tests; browser suites prepared for canonical/old entry points | Fresh production HTTP reachability |
| Shared entries and topic handoffs | Subject grouping/filter/dropdown, navigation, topic/home/recall regressions; reset correction separately checked | Human language review or the final integrated PDF |
| L1-8 audio | Eight focused files / 51 tests passed; final two audio behavior files / 10 tests passed | Independent German listening approval |
| L1-8 illustrations | Four focused files / 25 tests passed, including wrapper/path identity, selected paint/shape, guarded fallback and nav/ID preservation | Every final viewport/rendered composition |
| L1-8 integration | Four focused files / 31 tests; legacy hub/detail/profession run three files / 20 tests; RichLessonVisual compatibility two files / 17 tests; changed CSS parsed and diff checked | These overlapping runs are not an aggregate suite count or full release-gate result |
| L1-9 | Final restack focused navigation, entry/filter, route, illustration and audio checks pass; changed app ESLint has zero warnings, syntax/CSS parsing and diff/guard checks pass, and independent source review found no blockers | This preparation evidence alone is not actual PDF readability or a full release-gate pass; current-target evidence is separated above |

E2E expectations are updated where the intended UI changed, including profession pattern SVGs. A changed test file is not a record that its browser suite ran. The root/release lead owns sequential full checks: `npm run check` → `npm run test:e2e` → `npm run build:web && npm run smoke:web-routes` → `npm run gates:pages` → `node tools/audit-attribution.mjs`. Do not run competing builds or infer a final pass from a prior item build.

Lane 1’s smoke ownership boundary remains unchanged: its shared `smoke-pages.mjs` contributions are route-list additions inside its own block. Integration #20 separately migrated the original production and Pages expectations and the word-card alias audit through orchestrator/release work. Those changes are not permission for Lane 1 to rewrite shared or unowned gate logic.

Earlier isolated Lane 1 snapshots failed the original production smoke’s retired-hub exact-200 checks, the original Pages smoke’s retired-sheet full-content checks, and the word-card audit’s full-card expectations at 48 profession compatibility stubs. Preserve those failures as historical evidence. The integrated alpha source now checks retired-hub redirects, canonical directory/vocabulary content and canonical-card alias stubs; the PR #20 body reports its own local gate results. The fresh pinned production/dev/Pages/word-card original gates now pass; the twelve-case original E2E failure is a separate current owner blocker. Lane 1’s owned canonical-route, Pages and word-card helpers remain supplementary and cannot substitute for those original gates.

## G1 implementation and local outcomes

G1 uses actual A1 pack identities for the 37 sheet destinations, inline rows and full family cards. Effective sheet lesson/tag/source filters and narrowed visible entry sets remain in scope; a full-family action explicitly selects that family independently of unrelated global/Back filters. Unknown-only or empty selections disable the action, partial sheet coverage is reported, and links neither enable pending packs nor broaden an unavailable selection. Prefetch is disabled and the actions are hidden for print.

The completed local run on `dcc06db04e1be6cd4d0c211b2cf3ef0661453ef8` / tree `f92d0f9ce584bad603bbc4eaca1e10d281f3c58a` recorded 33 stages: 32 exited 0 and the original E2E stage exited 1. Overall result is blocked, exit 3. The classifier recognizes exactly the twelve unchanged Lane 2 cases described above; it does not clear or rewrite the original failure.

| G1 evidence | Actual result | Scope / limit |
|---|---|---|
| Check/type/publication stages | Root 152 files / 1,718 tests; dedicated web rerun 129 files / 1,248 tests is a subset of root, not additive; types, lint, publication/packs and E2E typing exited 0 | Local source checks, not deployment or language approval |
| Full native E2E | 190 executed once: 178 passed, 12 failed in 9.2 minutes; zero skips, flakes, retries or global errors; original exit 1 | Original gate remains red; all eight G1 Pages cases are within this full count |
| Extra production-root subset | Eight unchanged G1 cases passed in 23.8 seconds | Deliberately narrow subset of the frozen inventory; not another full suite or an aggregate 198-case count |
| Action image review | All 18 test-written action PNG files at 320/390/1366px, nine root and nine Pages, were viewed and accepted | Captured word/sheet/dropdown states; not every route/state |
| Actual root and Pages transport | Original 1,329-item selection stays disabled. A separate accepted catalogue prefix of 655 IDs produced a 7,997-byte relative href / 7,962-byte scope, HTTP 200, exact IDs/lessons and a real 20-task preview. Compact All covers 1,330 items with a 36-byte scope and HTTP 200; public opt-in persisted | Both environments were local; capacity depends on serialized IDs/filters. Four transport PNG files have one byte-identical visual, reviewed as one unique preview, not four distinct views |
| Production/dev and security audit | Original production smoke 53 checks, owned production supplement 107, original dev smoke 4; production dependency audit found zero vulnerabilities | All exited 0; the future G3 retirement expectation handoff has not occurred |
| Final Pages and route checks | 1,650 generated pages; original manifest 200 routes, leak scan 27,493 out files, HTTP checks on 38 routes; owned supplement 96 real requests | Original and owned gates remain separate |
| Language/offline/cards/attribution | Language 1,649 files / zero findings; offline 212 precache entries and 50 precached navigation routes; original cards 591 / 722 routes / 989 forms with audio; owned 674 full-card pages plus 48 stubs; attribution zero failures | Fifty navigation routes is the offline audit metric; the build’s 51 HTML routes is a different count. These audits do not grant human publication approval |
| Source restoration | All eight temporarily adapted files byte-equal to the pin; no backup files remain | Reported restoration scope, not a claim that every generated post-build file is pristine |

The adapter measures the completed relative `playHref` in UTF-8 and disables links over 8,000 bytes, alongside the unchanged decoder budget. It does not truncate IDs, drop constraints or broaden selections. Compact exact-match All, the Run parser, server limits and pack data are unchanged. The separate 655-ID boundary sample does not replace or narrow the disabled 1,329-item selection.

The earlier failed typing run on `e3fa2701` and HTTP 431 diagnostic on `feae7d70f9c636e11ebc6474021449207a1514e0` remain historical failures. The latter passed its eight root cases and nine reviewed screenshots but failed on a 22,421-byte explicit href before preview. The separate URL regression changed from 48 passes / one expected failure against the old helper to 49/49 passes under a temporary exact-source override; that preparation proof is distinct from the completed built run above.

All earlier L1-9 gate, screen, geometry and PDF totals remain pinned to `3a129bcc5769a9441cedcdb0615b28bd8788f5a9`; they are not fresh G1 PDF/visual totals. G3 was unimplemented at the G1 checkpoint. Its source candidate is recorded separately below, following owned G1 acceptance. No G3 runtime failure or pass, live deployment or qualified German/audio/book-reference approval is inferred from the G1 evidence.

## G3 prepared implementation — current gates unexecuted

The [final G3 plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6351090493) is implemented in a source candidate on the accepted G1 application tree. It changes five owned app paths and four related test files. This section records source behavior and prepared regression coverage; no G3 tests, semantic typecheck, build, browser or app runtime has been executed yet.

| Prepared change | Source behavior | Acceptance still required |
|---|---|---|
| Public Practice hub | Owned `PracticeHub` retains CoursePractice recall/article checking and lesson-quiz links, normalized Back context, qualified five-level Conversation and a plain Play entry; the old focused-game selector is no longer mounted publicly | Rendered hub and retained controls, actual return links and scope qualification at root and Pages |
| Seven legacy detail URLs | Existing `StaticHubRedirect` sends `flashcards`, `picture-word-match`, `article-choice`, `audio-match`, `word-order`, `verb-builder` and `morphology-puzzle` to `/play/`; seven static params, the export controller’s `dynamicParams = true` literal and strict route checks remain | Query/hash compatibility, canonical destination HTTP 200 and honest unknown/extra/malformed 404s in both builds |
| Owned callers | Lesson activities offer course Practice with the existing lesson/search context and a separate Play link; three detail actions offer the hub with their exact bounded detail context | Public navigation behavior; protected `PractiseLink`, selector, engines and review implementation remain unchanged |
| Independent histories and graded earning | No store reset, migration or history merge. Prepared E2E creates real course graded events/review cards and one real Play answer, then compares the retained event/card data through all seven redirects and reloads. Settings uses the real graded core-professions activity for timezone evidence | Execute the actual UI regressions; recall reveal and a single Play answer are not asserted as completed sessions, streaks or fabricated earning |

Conversation uses the existing lesson-2, `people` or `conversation`, course-source predicate and the same normalized `nav` on `/conversation`. Play entries do not translate legacy return context into a guessed scope. Static handoffs retain query values/hash; Pages raw query bytes are checked separately from production Next’s semantic ordered duplicate/empty values after canonicalization. The no-JavaScript fallback retains the canonical target, not the original query or hash.

All current-target G3 checks remain pending, including native inventory collection, focused checks, full sequential gates and root/Pages hub, redirect, history and rendering evidence. The unchanged original dev smoke is anticipated to fail its obsolete flashcards-link expectation. No such G3 failure has been observed yet; its original result must be retained and any expectation migration handed to the release owner, without substituting an owned helper or claiming later checks ran. The pinned G1 result above remains overall exit 3 because of the twelve original Lane 2 E2E failures.

## Cross-lane and source dependencies

| Dependency | State / owner boundary | Completion condition |
|---|---|---|
| USA canonical plural | Blocked on Lane 2 content types/validation; app country/subject presentation already knows plural | Canonical schema accepts the plural semantics and its owner validates the migration |
| `/review-audio` Pages exclusion | Blocked on Lane 3 build/export controller | Selectively exclude its exported files while retaining the normal QA tool; a route-level Not Found result alone is insufficient |
| Shared smoke expectations | Orchestrator updates integrated; original production/dev/Pages/word-card gates passed at the G1 pin; G3 gates are unexecuted | Retain Lane 1’s append-only route-list boundary; anticipated retirement expectation changes require their owner and the actual original result |
| G1 scoped play links | Implemented; pinned local G1 cases and root/Pages transport evidence recorded above | Preserve exact selection, disabled/partial cases and public pending-pack opt-in. Original twelve-case owner E2E failure still blocks the overall release gate; deployment remains separate |
| G3 old practice retirement | Prepared source candidate after owned G1 acceptance; current-target runtime verification pending | Five owned app paths retain CoursePractice/qualified Conversation/Back/Play and replace seven legacy details plus public callers. Four related test files are prepared, not executed; protected code and independent histories stay unchanged. Original dev-smoke expectation handoff is anticipated, not observed |
| G4 account/game navigation | Lane 2/3 feature code is integrated; navigation remains their responsibility | Preserve the actual alpha navigation groups; no Play nav entry exists in this baseline. Additional entries and pages/session/sync require their owners’ implementation and acceptance evidence |
| G2 book references | Draft sidecar/projector integrated; not live-wired or approved for learner publication | Review the literal-source candidates, null reasons and alignment before connecting approved refs to learner rows |

Integration #20 includes the G2 draft sidecar and projector from the Lane 1 branch. Their presence in the alpha tree does not publish the references: the projector remains a pure draft operation, and the sidecar is not imported by the live catalogue or learner UI. Its draft sidecar is `platform/content/study-cards/book-refs.draft.json`, with `book-refs.review.md` beside it and `platform/apps/web/lib/content/vocabulary-book-refs.server.ts` as the prepared projector. It records 1,046 stable per-lesson source-row occurrences: 304 non-null pages and 742 nulls (347 no literal match, 334 multiple-page matches, 57 broad Module 1 matches, four alignment cases). The Lesson 3 inventory has 63 exact lesson labels and 226 broad-range candidates, with 34 selected pages; “exact” here describes the lesson label, not a page assertion. These are occurrence counts, not unique canonical words or first-introduction claims.

The draft uses exactly `generated/interactive-book.json` and the repository's extracted `kursbuch_full.txt` / `glossary_full.txt` under `archive/cursor-demo-2026-07-30/content/extracted/_pdf_raw/`. The glossary is Deutsch–Spanisch, ISBN 978-3-19-001791-1. Original rows, wording, IDs and order remain unchanged. Null pages retain a reason; exercise/page assertions must not be guessed. The focused checks recorded in that separate draft review are preparation evidence, not owner publication approval.

## Human review and publication gates

| Gate | Still required |
|---|---|
| German vocabulary/forms/examples | ADR-020a records the owner-authorized Claude model review; this is not qualified human review. Preserve pending review states, source/gap labels and recorded follow-ups |
| Synthesized pronunciation | Exact text/asset/hash mapping, honest synthesized-preview label and qualified listening verdicts; regenerated bytes invalidate old asset-bound approval |
| Voice/provider decisions | Follow the authorized generation/provider choice and verify current credentials before new generation; old credential snapshots do not establish current availability |
| Publisher media | ADR-016 records full Momente A1.1/A1.2 coursebook, workbook, glossary, transcript and audio rights conditional on visible attribution. The 15 published workbook tracks are the current transport subset, not the permission boundary |
| Book references | Owner review of the G2 draft before learner publication; unresolved pages remain null with notes |
| Deployment | Owner-authorized integration merge completed in PR #20 and the pinned local candidate builds passed. Actual deployment and fresh deployed route/behavior evidence still need their own proof |

The technical UI can expose a candidate safely without certifying its German or audio. `/references` stays reachable, source media and synthesized speech remain distinguishable, and self-rated recall is not an independent mastery claim.

## Completion limits

This app-consistency work does not re-audit or close every LRN/LES/VOC/VER/GRM/PQA/AUD/HUB/REV/DAT/UX product requirement. Multidimensional mastery, scheduler semantics, sync, teacher overlays, account roles, game behavior and offline/export guarantees retain their own implementations and acceptance evidence. Older green tests, media counts and historical HTTP checks must not be relabeled as proof of this candidate.

[Information architecture](04-information-architecture-and-ux.md), [design rules](06-design-and-infographic-system.md) and [route/source matrix](21-live-content-url-matrix.md) describe the candidate contract. Lane status, integration records and release evidence remain the authority for merge/deployment progress.
