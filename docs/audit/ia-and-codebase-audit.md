# IA and codebase audit: German Learning OS web app

- **Audited:** 2026-10-22, against branch `claude/german-webapp-audit-game-i0plj0`, which tracks `origin/codex/live-alpha`. The working tree was clean at HEAD `b80be61b`.
- **Scope:** `platform/apps/web` (routes, components, lib, CSS), its generated data, and the live GitHub Pages export at https://hrezaii95.github.io/german-learning-exam/.
- **Method:** this audit is read-only. It used static reading, a script that builds the import graph, scripts that cross-check the data, `git log` and `git show`, and `curl` against the live site. No build, typecheck or test was run. Anything not checked directly is marked **(unverified)**.
- **Owner preference used as the target:** the all-vocabulary illustrated sheet (`/cheat-sheets/plurals` → `SubjectInfographic allNouns`) and the 21 subject sheets with gender and plural-pattern grouping (`/cheat-sheets/subjects/[subject]`).

All paths below are relative to `platform/apps/web/` unless they start with `platform/`, `docs/` or `research/`.

---

## 0. Executive summary

- **There are 47 `page.tsx` files.** Dynamic routes expand them to about 900+ exported pages: 722 vocabulary card URLs, 48 profession rows, 23 activities, 21 subject sheets, 36 legacy details and 7 games.
- **The app has four build stages, and their surfaces still sit side by side:**
  1. **Stage 1, 8–20 Aug.** A canonical-content alpha for Lessons 1–2: hubs, `/hubs`, `/concepts`, typed detail pages, 7 practice games, the conversation ladder, guided review and `/review-audio`.
  2. **Stage 2, 3 Sep.** A word-card catalogue replaced the vocabulary hub and detail pages.
  3. **Stage 3, 10–21 Sep.** The book, 15 topic "cheat sheets", Lessons 3–12 and the `/saved` "My review" area.
  4. **Stage 4, 15 Oct.** The preferred subject sheets and the all-vocabulary sheet.
- **Navigation hides the preferred format.** Neither preferred sheet appears in any primary navigation. You reach them only through a small link line inside the topic sheets (`components/study/CheatSheetNav.tsx:24`), and that line labels the all-vocabulary sheet "Gender × plural patterns". The URL `/cheat-sheets`, labelled "Cheat sheets" in every nav, is not an index. It shows sheet 01, the Country sheet.
- **Recommendation for the 47 routes:** **Keep 36**, **Merge 6**, **Redirect 2**, **Delete 3** (table in §6).

**Top findings**

1. **The navigation has three separate definitions that disagree.**
   - The desktop rail lists 15 items (`components/shell/AppShell.tsx:19-38`).
   - The tablet top bar shows only Dashboard, Listening and Search (`AppShell.tsx:70-72`).
   - The mobile tabs and menu are a separate list (`components/shell/MobileNavigation.tsx:18-38,53-58`). This list adds `/concepts` and `/hubs`, which the desktop rail does not have.
   - No nav links to `/cheat-sheets/subjects` or `/cheat-sheets/plurals`.
2. **Five overlapping vocabulary surfaces.** `/vocabulary` (hub grid), `/cheat-sheets/plurals` (all vocabulary), `/cheat-sheets/subjects/*`, the per-topic word lists inside the 15 topic sheets, and `/collections/professions` all list the same word cards. The labels collide too: "All vocabulary" means `/vocabulary` on the professions page (`app/collections/professions/[sourceRow]/page.tsx:42`) but `/cheat-sheets/plurals` everywhere else.
3. **Duplicate entries on the preferred sheet, caused by an incomplete merge.** `lib/content/word-cards.ts:35` appends the Lesson 4 cards without merging them into existing families, while Lessons 3 and 5–12 are merged.
   - The live `/cheat-sheets/plurals/` shows these words twice, with different translations: `das Bild`, `die Million`, `das Glück`, `nur`, `mal`, `neu`, `finden`, `kennen`.
   - `ein/eine` and `kein/keine` are also doubled (`W178`/`W075` vs `l5-ein-eine`/`l5-kein-keine`).
4. **Broken links on the live site.** `/lessons/` links to `/lessons/010/`, `/lessons/011/` and `/lessons/012/`, which return 404. The cause is `components/study/LessonFour.tsx:456`: `` `/lessons/0${c.number}` ``.
5. **Stage-1 surfaces are half-built and now redundant.**
   - All 7 `/practice/[gameId]` games drill one item each: `lex:architekt`, `verb:sein` or one Q&A (`lib/games/game-prompts.ts:23-77,97-190`).
   - `/concepts` uses the same lede as `/grammar` and has the h1 "Grammar connections" (`components/hubs/HubViews.tsx:1030`).
   - `/hubs` hard-codes Stage-3 copy: "Home & furniture … your next cheat sheet" (`app/hubs/page.tsx:20-21`).
   - `/review` covers Lessons 1–2 only, while `/saved` covers every lesson.
   - The internal QA tool `/review-audio` is publicly served (HTTP 200).

Other notable problems:

- **Weight.** Each subject page ships the whole catalogue (`allItems={loadSubjectVocabulary()}`, `app/cheat-sheets/subjects/[subject]/page.tsx:24`). Live HTML is about 1.6 MB per subject page, and 3.2 MB for `/cheat-sheets/plurals/` (1,338 entries server-rendered).
- **Nine vocabulary data sources.** They overlap and are merged at runtime by string matching (§4.1).
- **Dead modules.** 7 component and lib modules are unreachable (§2.3).
- **Stale specs.** `docs/04`, `docs/17` and `docs/21` predate every cheat sheet and contain the word "cheat" zero times.

---

## 1. Route inventory (all 47 `page.tsx`)

**Legend for "Nav":**
- **R** = desktop rail (`AppShell.tsx:19-38`)
- **T** = tablet top bar (`AppShell.tsx:70-72`)
- **M** = mobile bottom tab (`MobileNavigation.tsx:18-23`)
- **MM** = mobile "Menu" dialog (`MobileNavigation.tsx:24-38`)

"Last change" is the last commit touching the `page.tsx` file; the main rendering component is noted where it changed later.

| # | URL | File | Purpose | Data source | Nav / inbound links | Last change (page) | Newer page doing the same job? |
|---|---|---|---|---|---|---|---|
| 1 | `/` | `app/page.tsx` | Dashboard ("Your learning studio") | `learner-projection.json` + client learner state (`LearnerDashboard.tsx`) | R, T, MM | 1f195cde 2026-08-15 (component e3606c9e 09-21) | – (does not link to any cheat sheet) |
| 2 | `/lessons` | `app/lessons/page.tsx` | Lesson list. L1–2 from the projection, plus `NewChapterCards` for L3–12 | `learner-projection.json` + `lesson-four.ts courseChapters` | R, M, MM; `CourseStudy` "← All lessons" | af0bcd43 09-10 | – (two lists on one page; L10–12 links broken) |
| 3 | `/lessons/[lessonSegment]` | `app/lessons/[lessonSegment]/page.tsx` | Lesson page with **three renderers**: 01–02 activity overview, 04 bespoke `LessonFour`, 03/05–12 `CourseStudy` | projection / `lesson-four.ts` / `generated/lesson-*-study.json` | lessons list, dashboard, dictionary `#phrases` | 6b46dac1 09-17 | – (unify renderers) |
| 4 | `/lessons/[seg]/activity/[activityId]` | `app/lessons/[lessonSegment]/activity/[activityId]/page.tsx` | 23 interactive L1–2 activities | `learner-projection.json` | lesson 01/02 overview | 1f195cde 08-15 | – |
| 5 | `/book` | `app/book/page.tsx` | Interactive Momente book, Lessons 1–12, with audio | `interactive-book.json`, `study-speech.json` | R, M, MM, dashboard, many | 9d3d501b 09-21 | – |
| 6 | `/listening` | `app/listening/page.tsx` → `HubRoutePage` short-circuit (`components/hubs/HubRoutePage.tsx:20`) | Book audio by lesson (`CourseListening`) | `interactive-book.json` audio | R, T, MM, References, `LessonLearningPath` | 1f195cde 08-15 | partly `/book` (same audio) |
| 7 | `/cheat-sheets` | `app/cheat-sheets/page.tsx` | **Country sheet (sheet 01)**, not an index | `lib/study/countries.ts` + word cards + `country-speech.json` | R, M, MM, `/hubs`, subject directory "← Learning cheat sheets" | e2d30849 09-10 | Subject sheet `countries` |
| 8 | `/cheat-sheets/plurals` | `app/cheat-sheets/plurals/page.tsx` | **All-vocabulary illustrated sheet (preferred)** | `loadSubjectVocabulary()` = word cards + dictionary extras | only `CheatSheetNav.tsx:24` ("Gender × plural patterns"), subject switcher, directory | ab8c5b3a 10-15 | **preferred** |
| 9 | `/cheat-sheets/subjects` | `app/cheat-sheets/subjects/page.tsx` | Directory of the 21 subject sheets | `loadSubjectSheets()` | `CheatSheetNav.tsx:24`, subject back link | 2941f115 10-15 | **preferred** |
| 10 | `/cheat-sheets/subjects/[subject]` (21) | `app/cheat-sheets/subjects/[subject]/page.tsx` | **Subject sheet (preferred)** | same + full catalogue as `allItems` | directory, switcher, `StudyScope.tsx:56` | ab8c5b3a 10-15 | **preferred** |
| 11 | `/cheat-sheets/home` | `app/cheat-sheets/home/page.tsx` | Home & furniture sheet (word list + pronouns + describe) | **hand-authored** `lib/study/home.ts` (30 words) | CheatSheetNav, `/hubs`, subject `home` related link | 301d2e49 09-10 | vocab part → `subjects/home` |
| 12 | `/cheat-sheets/people` | `.../people/page.tsx` → `lib/study/sheet-page.tsx` | Family tree + people workshop | word cards via `sheet-cards.ts` | CheatSheetNav, subject `people` | d2595143 09-10 | vocab part → `subjects/people` |
| 13 | `/cheat-sheets/verbs` | `.../verbs/page.tsx` | Conjugation and sentence-position workshop | **hand-authored** `sheet-topics.ts:37-59 verbModels` | CheatSheetNav, subject `verbs`/`grammar` | d2595143 09-10 | vocab part → `subjects/verbs` |
| 14 | `/cheat-sheets/numbers` | `.../numbers/page.tsx` | Number builder | word cards | CheatSheetNav | d2595143 09-10 | vocab → `subjects/numbers` |
| 15 | `/cheat-sheets/conversation` | `.../conversation/page.tsx` | Conversation and spelling workshop | word cards + `conversation-learning.ts` | CheatSheetNav | d2595143 09-10 | – |
| 16 | `/cheat-sheets/questions` | `.../questions/page.tsx` | W-question map and sentence builder | `lib/study/questions.ts` | CheatSheetNav | 90cb7735 09-17 | – |
| 17 | `/cheat-sheets/objects` | `.../objects/page.tsx` | ein/kein article workshop + **`ObjectVocabularyOverview`** + PDF | L5 cards, `object-sheet.ts`, `object-vocabulary.ts` | CheatSheetNav | 1959f1b7 09-20 (component dee41c02 10-15) | vocab overview → `subjects/objects` |
| 18 | `/cheat-sheets/office` | `.../office/page.tsx` | Accusative switchboard, phone call | L6 cards, `office-sheet.ts` | CheatSheetNav | 1959f1b7 09-20 | vocab → `subjects/office` |
| 19 | `/cheat-sheets/hobbies` | `.../hobbies/page.tsx` | können/ability builder | L7 cards, `hobbies-sheet.ts` | CheatSheetNav | 4b6b4752 09-21 | vocab → `subjects/hobbies` |
| 20 | `/cheat-sheets/time` | `.../time/page.tsx` | Clock and plans | L8 cards, `time-sheet.ts` | CheatSheetNav | 4b6b4752 09-21 | vocab → `subjects/time` |
| 21 | `/cheat-sheets/food` | `.../food/page.tsx` | Food and ordering | L9 cards, `food-sheet.ts` | CheatSheetNav | 808a8586 09-21 | vocab → `subjects/food` |
| 22 | `/cheat-sheets/travel` | `.../travel/page.tsx` | Separable verbs, announcements | L10 cards, `travel-sheet.ts` | CheatSheetNav | 7daa6a13 09-21 | vocab → `subjects/travel` |
| 23 | `/cheat-sheets/past` | `.../past/page.tsx` | Perfekt builder, opening hours | L11 cards, `past-sheet.ts` | CheatSheetNav | 752a8184 09-21 | vocab → `subjects/past` |
| 24 | `/cheat-sheets/journeys` | `.../journeys/page.tsx` | haben/sein, seasons | L12 cards, `journey-sheet.ts` | CheatSheetNav | 752a8184 09-21 | vocab → `subjects/seasons` |
| 25 | `/vocabulary` | `app/vocabulary/page.tsx` → `HubRoutePage` | Word-card hub, 12 cards per page | `learner-hubs.json` re-skinned with word cards (`withWordCardHub`) | R, MM, professions page "All vocabulary", subject `everyday` related link | ce7e1951 09-03 | **`/cheat-sheets/plurals`** |
| 26 | `/vocabulary/[entityId]` (722) | `app/vocabulary/[entityId]/page.tsx` | Word-family card detail (canonical card page) | `word-cards.json` (+ merged study words) | every sheet entry `item.href`, search, dictionary | ce7e1951 09-03 | – (keep; the sheets link here) |
| 27 | `/collections/professions` | `app/collections/professions/page.tsx` | 48 teacher-extra professions | `learner-extra-professions.json` + word cards | only `HubViews.tsx:1042` on `/vocabulary` | 9c053079 09-20 | `subjects/people` |
| 28 | `/collections/professions/[sourceRow]` (48) | `.../[sourceRow]/page.tsx` | Same `WordFamilyCard` as `/vocabulary/wNNN` (each row is an alias of a card) | `wordCardForPath(row.detailPath)` | professions list | a68d3e89 09-20 | **duplicate of `/vocabulary/wNNN`** |
| 29 | `/verbs` | `app/verbs/page.tsx` → `HubRoutePage` | 10 L1–2 verb details + L3–12 verb pattern cards | `learner-hubs.json` + `studyUnits` | R, MM | 1f195cde 08-15 (HubViews 9d3d501b 09-21) | `subjects/verbs` + `/cheat-sheets/verbs` |
| 30 | `/verbs/[entityId]` (10) | `app/verbs/[entityId]/page.tsx` | Legacy L1–2 verb detail | `learner-details.json` | `/verbs`, search | 1f195cde 08-15 | word card (same verbs exist as cards) |
| 31 | `/grammar` | `app/grammar/page.tsx` | 11 L1–2 grammar details + L3–12 grammar pattern cards | `learner-hubs.json` + `studyUnits` | R, MM | 1f195cde 08-15 | – |
| 32 | `/grammar/[entityId]` (11) | `app/grammar/[entityId]/page.tsx` | Legacy grammar detail | `learner-details.json` | `/grammar`, search | 1f195cde 08-15 | – |
| 33 | `/phrases` | `app/phrases/page.tsx` | 71 L1–2 hub items + L3–12 phrase cards | `learner-hubs.json` + `studyUnits` | R, MM | 1f195cde 08-15 | partly `subjects/conversation`, `/cheat-sheets/conversation` |
| 34 | `/phrases/[entityId]` (15) | `app/phrases/[entityId]/page.tsx` | Legacy Q&A detail | `learner-details.json` | `/phrases`, search | 1f195cde 08-15 | – |
| 35 | `/concepts` | `app/concepts/page.tsx` | "Grammar connections": concept topics + `GrammarConnections` | `learner-hubs.json` (concepts has 0 items) + `studyUnits` | **MM only** + `/grammar` link (`HubViews.tsx:1050`) | 1f195cde 08-15 | **`/grammar`** |
| 36 | `/hubs` | `app/hubs/page.tsx` | "Hubs" / "Study library" directory of 6 hubs + 2 hard-coded sheet links | `learner-hubs.json` | **MM only** ("Study library"), dashboard (`LearnerDashboard.tsx:481,494`) | 301d2e49 09-10 | **`/cheat-sheets` landing** |
| 37 | `/search` | `app/search/page.tsx` | Global search | `learner-search.json` with Lexeme docs replaced by word cards | R, T, MM | 200e3fbb 09-03 | – |
| 38 | `/practice` | `app/practice/page.tsx` | `CoursePractice` (all lessons) + conversation link + "Focused games · Lessons 1–2" | client dictionary + game catalogue | R, MM, dashboard, `/saved`, `/review` | 1f195cde 08-15 (GameSelector ee0d7c82 09-20) | – |
| 39 | `/practice/[gameId]` (7) | `app/practice/[gameId]/page.tsx` | Seven games, **one prompt each** | `lib/games/game-prompts.ts` (hard-coded concept ids) | GameSelector, `ActivityAndBrowser.tsx:403`, detail `PractiseLink` | 1f195cde 08-15 | `/practice` `CoursePractice` |
| 40 | `/conversation` | `app/conversation/page.tsx` | Selector for one five-level ladder | `lib/conversation/*` | GameSelector, `ConversationLink` on details | 1f195cde 08-15 | – |
| 41 | `/conversation/[entityId]` (1) | `app/conversation/[entityId]/page.tsx` | Ladder for the casual profession Q&A | same | `/conversation` | 1f195cde 08-15 | – |
| 42 | `/review` | `app/review/page.tsx` | "Guided review · Lessons 1–2" / "Today's mission" | `packages/learning` + learner state | R "Guided review", MM, dashboard, `/saved` | af0bcd43 09-10 | **`/saved`** (all lessons) |
| 43 | `/review/session/today` | `app/review/session/today/page.tsx` | Runs the guided mission | same | `/review` Start button (`ReviewViews.tsx:112`) | 1f195cde 08-15 | – |
| 44 | `/saved` | `app/saved/page.tsx` | "My review": saved words, lines, recall | `lib/study/storage.ts` (localStorage `german-learning-os:study-book:v1`) | R, M, MM, dashboard | af0bcd43 09-10 | – (newer review) |
| 45 | `/settings` | `app/settings/page.tsx` | Preferences, backup | learner state | R, MM, dashboard | 1f195cde 08-15 | – |
| 46 | `/references` | `app/references/page.tsx` | Sources and credits (ADR-016) | `lib/content/references.ts` | R, MM, footer on every page | 1f195cde 08-15 | – |
| 47 | `/review-audio` | `app/review-audio/page.tsx` | Internal TTS listening QA tool, outside the shell | `pronunciation-review.server.ts` | **none** ("reached by typing its address", lines 21-26) | 65e7e1f1 08-20 | – (not a learner page) |

**Not routes, but relevant:**
- `app/not-found.tsx`.
- `proxy.ts`: a Next 16 proxy that issues canonical redirects. It runs only under `next start`; `scripts/build-pages.ts:5` parks it for the Pages export, so **the live site has no server redirects**.

---

## 2. Overlap, obsolescence and dead code

### 2.1 Clusters of duplicated jobs

| Job | Surfaces that do it | Evidence | Verdict |
|---|---|---|---|
| Browse all vocabulary | `/vocabulary` hub; `/cheat-sheets/plurals`; `SheetWordIndex` inside 8 topic sheets (Journey, Hobbies, Office, Time, Travel, Object, Food, Past); `ObjectVocabularyOverview` in `/cheat-sheets/objects`; home word list in `/cheat-sheets/home`; `/collections/professions` | All read the same word cards. `SheetWordIndex` filters `loadWordCards()` by lesson, which is the same set the subject sheet shows with a lesson filter | Make `/cheat-sheets/plurals` the only "all vocabulary" page; topic sheets link to their subject sheet instead of listing words |
| Vocabulary by topic | 21 subject sheets vs 15 topic sheets | `subject-sheets.ts:31-53` maps every subject to a topic sheet as `relatedHref` | Subject sheet = vocabulary; topic sheet = interactive grammar workshop. Split the roles cleanly |
| Word detail | `/vocabulary/[id]`, `/collections/professions/[row]`, legacy `/vocabulary/id-…` aliases | The professions detail renders `wordCardForPath(row.detailPath)`. All 48 cards carry `/collections/professions/NN` as an alias (e.g. `w122` aliases include `/collections/professions/05`) | One canonical card URL |
| Directory of study areas | `/hubs` ("Hubs" / "Study library"), `/cheat-sheets/subjects`, the mobile menu | `app/hubs/page.tsx:20-21` hard-codes two sheet links from 10 Sep | Replace with one `/cheat-sheets` landing |
| Grammar patterns | `/grammar`, `/concepts`, lesson Grammar tab, `/cheat-sheets/verbs#sentence-position`, subject `grammar` | `/concepts` live h1 is "Grammar connections" and its lede matches `/grammar` word for word ("Find grammar patterns from your lessons…"); `HubViews.tsx:1029-1051` | Fold `/concepts` into `/grammar` |
| Verbs | `/verbs` hub (10 legacy details + pattern cards), `/cheat-sheets/verbs` (`verbModels`, 21 verbs, `sheet-topics.ts:37-59`), subject `verbs`, lesson Verbs tab | Conjugations agree across sources (§4.2), but there are four places to look | Merge the `/verbs` hub into subject `verbs` + the verbs workshop |
| Review | `/review` (Lessons 1–2, `packages/learning` scheduler) vs `/saved` "My review" (all lessons, `lib/study/storage.ts`) | `ReviewViews.tsx:76-78` copy explains the split to the learner | One review destination |
| Practice | `CoursePractice` (all lessons, current) vs 7 single-concept games | `game-prompts.ts`: every `conceptId` is `lex:architekt`, `verb:sein` or `qa:profession-casual-main` | Delete the games or rebuild them on word cards |
| Listening | `/listening` (book audio by lesson) vs `/book` audio | `HubRoutePage.tsx:20`. The old hub listening branch (`HubViews.tsx:995-1070`, `ListeningGroupCard`) can no longer be reached because `HubRoutePage` returns before it | Keep `/listening`; delete the dead hub branch |

### 2.2 Earlier-stage leftovers that are still live

- **`/hubs`.** The desktop rail does not link it. Its copy is stale: "Home & furniture … your next cheat sheet →" (`app/hubs/page.tsx:21`).
- **`/vocabulary` hub copy.** It still reads "Words from your course, including the Lesson 2 job vocabulary." (`lib/content/hub-project.ts:46`, snapshotted in `generated/learner-hubs.json:14`).
- **Lesson 1–2 framing in shared surfaces:**
  - `/review` header "Guided review · Lessons 1–2" (`ReviewViews.tsx:77`).
  - `/practice` "Focused games · Lessons 1–2" (`GameSelector.tsx:72`).
  - Mobile menu "Checked exercises from Lessons 1–2" (`MobileNavigation.tsx:35`).
- **`/review-audio`.** A tool "not part of the course" that is deployed publicly (live 200).
- **Three lesson renderers** in one route (`app/lessons/[lessonSegment]/page.tsx:46-50`), plus hard-coded per-lesson titles (`:30-39`).
- **`worker/index.ts`.** A Cloudflare worker stub that returns 501 "Deploy not enabled". Nothing references it (grep of the platform package and tsconfig files).
- **Public PDF `public/cheat-sheets/everyday-objects.pdf`.** Only `ObjectVocabularyOverview` links it. It is a pre-subject-sheet artefact (dee41c02), and the subject sheets now have Print / save as PDF (`SubjectInfographic.tsx:130`).

### 2.3 Unused modules

Method: an import graph rooted at every `page.tsx`, `layout.tsx`, `not-found.tsx`, `proxy.ts`, `next.config.ts` and `worker/`. It resolves `@/` and relative imports, including CSS.

| File | Status | Notes |
|---|---|---|
| `components/word-cards/WordCardLibrary.tsx` | **Unreachable** | The vocabulary browser from 200e3fbb/ce7e1951, superseded by the hub and sheets. Not referenced by tests |
| `components/collections/ExtraProfessionsHub.tsx` | **Unreachable** | Replaced by `app/collections/professions/ProfessionCollectionClient.tsx` |
| `components/collections/ExtraProfessionDetail.tsx` | **Unreachable** | Same |
| `components/collections/extra-professions.module.css` | **Unreachable** | Only the two files above import it. **This is the only unused CSS file** |
| `app/collections/professions/ProfessionRowClient.tsx` | **Unreachable** | Back link "← All optional professions" |
| `lib/content/detail-page.tsx` | **Unreachable** | A re-export barrel ("optional"), from 84abdbbb 08-13 |
| `worker/index.ts` | Graph root but unreferenced by any config | Stub |
| `lib/content/{project,detail-project,hub-project,search-project,enrichment-access}.ts` | Used only by `scripts/project-content.ts` and tests | Keep: this is the build pipeline |

**Dead exports in live files.** These come from a symbol grep, so treat them as indicative:
- `LessonThreeBridge` (`components/study/LessonFour.tsx:473`)
- `RapidContentSections` (`components/content/rapid-learning-sections.tsx:148`), used only by tests
- `objectVocabularyDrawings` (`ObjectIllustration.tsx`)
- `getLessonBySegment`, `getOwnership` and `getDetailRepresentative` (`lib/content/access.ts`)
- `isHubNavKey` (`lib/content/nav.ts:36`), used only inside the file

**CSS.** All other 30 CSS files are imported. Conventions are inconsistent:
- Global files: `app/globals.css` and `app/study.css`.
- Route CSS under `app/cheat-sheets/**`.
- Component CSS under `components/study/*.css`.
- CSS modules for word cards and professions.

Two layering smells:
- `lib/study/sheet-page.tsx:7` (a lib file) imports `app/cheat-sheets/collection.css`.
- `app/cheat-sheets/office/page.tsx:6` imports the objects sheet's CSS.

Six sheet CSS files are a single line (`food.css`, `hobbies.css`, `office.css`, `past.css`, `time.css`, `travel.css`). Their contents were not reviewed for emptiness **(unverified)**. Nav visibility is set in `globals.css:1546-1568` and then overridden in `study.css:1786-1904`: the tablet ends up showing both the 3-item top bar and the mobile bottom bar.

---

## 3. Navigation and naming

### 3.1 Labels, URLs, titles and h1s (live, server-rendered HTML)

| URL | Rail label | Mobile label | `<title>` | h1 |
|---|---|---|---|---|
| `/cheat-sheets` | Cheat sheets | Cheat sheets | Country cheat sheet | "Countries, without the guesswork." |
| `/cheat-sheets/plurals` | – | – | All vocabulary · Illustrated cheat sheet | All vocabulary |
| (link text to it) | | | `CheatSheetNav.tsx:24` "Gender × plural patterns →"; `SubjectInfographic.tsx:37` "All vocabulary · illustrated patterns"; `:159` "All vocabulary · illustrated cheat sheet →" | |
| `/cheat-sheets/subjects` | – | – | Subject infographics | "A picture of every subject." |
| `/cheat-sheets/people` | – | – | **"Put a face to the word."** (slogan as title, `sheet-topics.ts:22`) | same |
| `/cheat-sheets/verbs` | – | – | **"Give every sentence a backbone."** | same |
| `/cheat-sheets/food` | – | – | "Food, preferences & ordering · Cheat sheet" | slogan |
| `/cheat-sheets/home` | – | – | "Home & furniture cheat sheet" (a third title pattern) | slogan |
| `/cheat-sheets/objects` | – | – | "Objects, colours & articles" (no suffix) | slogan |
| `/saved` | My review | My review | My review | (client-rendered) |
| `/review` | **Guided review** | Guided review | **Today's mission** | (client-rendered) |
| `/hubs` | – | **Study library** | **Hubs** | Hubs |
| `/concepts` | – | **Concepts** ("Connect words and ideas") | Concepts | **Grammar connections** |
| `/collections/professions` | – (highlights "Vocabulary") | – | Optional professions | "Berufe · Professions" |
| `/vocabulary` | Vocabulary | Vocabulary | Vocabulary | Vocabulary |

**Topic vs subject naming drift for the same topic:**

| Topic sheet | Subject sheet |
|---|---|
| "People, family & work" | "People, family & jobs" |
| "Numbers & prices" | "Numbers, prices & time" |
| "Verbs & sentences" | "Verbs & conjugation" |
| "Conversation & spelling" | "Useful conversations" |
| "Objects, colours & articles" | "Everyday objects" + "Colours, shapes & materials" |

Topic labels: `sheet-topics.ts:1-17`. Subject labels: `lib/study/scope.ts:6-28`.

**URL naming:**
- `/cheat-sheets/plurals` holds *all vocabulary*.
- `/saved` is labelled "My review", while `/review` is something else.
- `/hubs` is labelled "Study library".
- `/collections/…` is the only "collections" route.

The sheet chooser counts "CHEAT SHEET 01 / 15" (`CheatSheetNav.tsx:16`) and ignores the 22 Stage-4 sheets.

### 3.2 Primary navigation definitions

- **Desktop rail** (`AppShell.tsx:19-38`), 15 items: Dashboard, Lessons, Interactive book, Cheat sheets, My review, Vocabulary, Verbs, Grammar, Phrases & Q&A, Listening, Search, Practice, Guided review, References, Settings. It has **no Concepts and no Hubs**, yet `lib/content/nav.ts:14-15` declares both keys, so on desktop no rail item highlights on `/concepts` or `/hubs`.
- **Tablet top bar:** `PRIMARY_NAV.filter(["dashboard","listening","search"])` (`AppShell.tsx:70-72`), shown alongside the mobile bottom bar below 1100px (`study.css:1897`).
- **Mobile:** 4 tabs (Book, Lessons, Cheat sheets, My review) plus a Menu with 13 more destinations, including Concepts and Study library (`MobileNavigation.tsx:18-58`). The order and labels differ from the rail: "Book" vs "Interactive book".
- **The IA spec is stale.** `docs/04-information-architecture-and-ux.md:13,17` says desktop is `Dashboard · Lessons · Vocabulary · Verbs · Grammar · Phrases & Q&A · Listening · Review` and mobile is `Home · Lessons · Hubs · Review · Profile`. Neither matches. The spec was last changed 2026-08-08.

### 3.3 Back links and breadcrumbs

- **There is no breadcrumb component anywhere** (grep for "breadcrumb": no hits).
- **Back-link wording varies:**
  - "← All lessons" (`CourseStudy.tsx:31`)
  - "← All subjects" (`SubjectInfographic.tsx:34`)
  - "← Learning cheat sheets", which lands on the *Country sheet* (`SubjectInfographic.tsx:157`)
  - "← Professions" (`ProfessionCollectionClient.tsx:114`)
  - "← All optional professions" (dead file)
  - The generic `BackLink` "← Back" (`components/nav/BackLink.tsx:7`)
- **Topic cheat sheets have no back link,** only the sheet chooser.
- **Word cards opened from the professions page** offer a second link, "All vocabulary", which goes to `/vocabulary`, not to the all-vocabulary sheet (`app/collections/professions/[sourceRow]/page.tsx:42`).
- **Shell highlighting is inconsistent.** `/collections/professions` sets `current="vocabulary"` and `/conversation` sets `current="practice"`, but `/cheat-sheets/subjects/*` highlight "Cheat sheets" while their vocabulary job belongs to "Vocabulary".

### 3.4 Broken internal links (live check)

I fetched 34 representative live pages (all nav targets, 9 sheets, lessons 01/03/04/12, a card and a profession). From them I extracted every internal `href` that is not an asset, deduplicated by path: **247 URLs**.

- **244 returned 200. 3 returned 404:** `/german-learning-exam/lessons/010/`, `/lessons/011/` and `/lessons/012/`, all from `/lessons/`.
  - **Cause:** `components/study/LessonFour.tsx:456`, `` href={`/lessons/0${c.number}`} ``. It should use `String(c.number).padStart(2,"0")`, as the badge on the next line already does.
- **Static check.** Every literal internal `href` in `app/`, `components/` and `lib/` resolves to an existing route.
- **Anchors.** I verified these against the live HTML:
  - The `relatedHref` anchors `#sentence-position`, `#materials` and `#home-describe`.
  - 40 `#country-XX` anchors and 34 `#home-*` anchors.
  - `#conversation-flow` and `#conversation-spelling` exist only in `ConversationWorkshop.tsx`, which renders on the client **(unverified live)**.
- **Not covered.** Links rendered only on the client (after hydration or filtering) were not crawled.
- **Expected 404s (fine):** `/progress`, `/listening/x` and `/concepts/x`. The spec in `docs/04:40` lists `/progress`, but it was never built.

---

## 4. Content consistency

### 4.1 Vocabulary data sources (nine, overlapping)

| # | Source | Feeds | Notes |
|---|---|---|---|
| 1 | `research/lesson-03-study-pack/vocabulary.json` + `platform/content/study-cards/*` → `generated/word-cards.json` (`scripts/project-word-cards.ts`) | 591 card families, L1–3, Module 1, numbers, alphabet, 48 teacher jobs | Canonical card catalogue |
| 2 | `tools/build-lesson-*.py` → `generated/lesson-{three,five…twelve}-study.json` | merged into cards at runtime (`lib/content/word-cards.ts:36-54`) by **exact singular text** | Merge appends plurals/meanings (`mergeMeaning`) |
| 3 | `lib/study/lesson-four.ts` (hard-coded L4 rows) | `lessonFourCards()` **appended without merge** (`word-cards.ts:35`) | Causes the duplicates in §4.3 |
| 4 | `lib/study/home.ts` (30 words) | `HomeCheatSheet`; dictionary extras (`lib/study/catalog.ts:239-243`) | Deduped by exact `de` string |
| 5 | `lib/study/countries.ts` (40) | `CountryCheatSheet`; overrides card `displayForms` (`catalog.ts:219-231`) | |
| 6 | `platform/packages/content` → `generated/learner-{details,hubs,search,projection}.json` | Legacy L1–2: 83 Lexemes, 10 verbs, 11 grammar, 15 Q&A. Still powers `/verbs/*`, `/grammar/*`, `/phrases/*`, games, guided review, conversation | Vocabulary Lexemes are hidden in search and hubs but remain in the data |
| 7 | `generated/learner-extra-professions.json` (48 rows) | `/collections/professions`; also folded into cards | |
| 8 | `lib/study/sheet-topics.ts:37-59 verbModels` + per-sheet model files (`food-sheet.ts`, `office-sheet.ts`, `time-sheet.ts`, `travel-sheet.ts`, `past-sheet.ts`, `journey-sheet.ts`, `hobbies-sheet.ts`, `object-sheet.ts`, `questions.ts`, `people-family.ts` …) | Topic workshops and generated example sentences | |
| 9 | `generated/study-dictionary.json` (5,161 entries, a committed snapshot of `loadDictionary()`) | Client dictionary, `CoursePractice`, saved/recall | Derived data committed to the repo; drift risk |

### 4.2 Cross-source checks

Scripts compared 937 noun records across sources 1–7 by lemma (article stripped), and verb conjugations across the `verbModels` list, the lesson study JSON files, `lesson-four.ts` and the legacy details.

**Gender**
- **Real conflict: `USA`.** It is plural in `word-cards.json` and `countries.ts`, but `"article":"die","gender":"feminine"` in `generated/learner-details.json` (`lex:usa`). Its old URL `/vocabulary/id-6c65783a757361` now resolves to the word card, so the wrong value is latent. It can still reach review and registry consumers of the legacy details **(unverified in the UI)**.
- `Möbel` is consistent: plural in `home.ts`, and `"plural only"` → plural tone in `lesson-four.ts:113-120` and `lib/study/word-cards.ts:10-17`.

**Plural**
- No conflicting plural spellings were found between sources.
- **Caveat:** the runtime merge appends any extra plural it finds (`word-cards.ts:41`), so a future conflict would surface as two plurals, not as an error.

**Translations**
- 137 lemmas carry differing English meanings across sources. Most are cosmetic, and three patterns recur:
  - **Casing and style on profession cards.** Title-case teacher rows such as "Electrician (male)" and "Bus Driver (male)" sit next to lower-case course rows such as "doctor (male)". Both live in `word-cards.json`.
  - **Legacy details differ from cards.** `Familienname`: "last name" vs "surname / family name"; `Partner`: "partner (m./f.)" vs "partner".
  - **Lesson study JSONs differ from each other.** `Stunde`: "hour / lesson" vs "hour"; `Freund`: "friend (male)" vs "friend (male) / boyfriend"; `Glück`: "happiness / luck" vs "luck".

**Verbs**
- All shared verbs have identical conjugations across the four sources.
- Meanings drift: `gehen` is "to go" / "to go / walk" / "to go on foot" / "to go / be going"; `schauen` is "to look" vs "to watch"; `finden` is "to find / have an opinion" vs "to think / find".

### 4.3 Duplicates on the preferred sheet (live evidence)

The live `/cheat-sheets/plurals/` HTML (3.19 MB, 1,338 `data-subject-entry` buttons) contains these pairs:

| Headword | Entries | Translations |
|---|---|---|
| das Bild | `W464-0`, `l4-bild-0` | picture / picture |
| die Million | `W343-0`, `l4-million-0` | million / million |
| das Glück | `W542-0`, `l4-glueck-0` | happiness / luck **vs** luck |
| nur, neu, kennen | `W351`/`W415`/`W537` + `l4-*` | identical |
| mal | `W358`, `l4-mal` | just / once **vs** just (softens a request) |
| finden | `W438`, `l4-finden` | to find / have an opinion **vs** to think / have an opinion |
| ein / eine | `W178-0`, `W178-1`, `l5-ein-eine-0` | the L5 row uses the combined string "ein / eine", so the exact-text merge misses it |
| kein / keine | `W075-0`, `W075-1`, `l5-kein-keine-0` | same cause |

**Root causes:**
- `word-cards.ts:35` never merges Lesson 4 rows.
- The merge key for L3 and L5–12 is the exact `singular.text`, so combined forms slip through.
- The search-key duplicates in the dictionary snapshot (`W198` and `W370` listed twice, `l9-ketchup` twice) come from one card having two rows (der/die) and are harmless.

### 4.4 Weight

| Page | Live HTML |
|---|---|
| `/cheat-sheets/plurals/` | 3.19 MB |
| `/vocabulary/` | 2.87 MB |
| `/book/` | 2.77 MB |
| every `/cheat-sheets/subjects/*` | 1.6–1.7 MB |
| topic sheets | about 1.5 MB |

The subject pages are heavy because every one receives the full catalogue as `allItems` (`subjects/[subject]/page.tsx:24`), so the RSC payload repeats about 1.4 MB 21 times. A shared client-fetched JSON file, or server-side filtering, would cut this. This is a performance note, not an IA one.

---

## 5. Target information architecture

**Principle:** one place per job. Vocabulary lives in the illustrated catalogue (the all-vocabulary sheet plus 21 subject sheets). Grammar practice lives in the topic workshops and lessons. Detail lives on the word card. Review lives in one place.

```
Dashboard  /
Learn
  Lessons            /lessons, /lessons/NN, /lessons/01|02/activity/*
  Book               /book
  Listening          /listening              (book audio by lesson)
Vocabulary  (preferred format)
  All vocabulary     /cheat-sheets/vocabulary     ← renamed from /cheat-sheets/plurals
  Subjects           /cheat-sheets/subjects/[subject]  (21)
  Word card          /vocabulary/[id]             (canonical detail, link target)
Cheat sheets (landing) /cheat-sheets             ← directory: All vocabulary + 21 subjects + 15 workshops
  Workshops          /cheat-sheets/countries (moved from /cheat-sheets), home, people, verbs,
                     numbers, conversation, questions, objects, office, hobbies, time, food,
                     travel, past, journeys       (vocabulary lists removed → link to subject sheet)
Grammar & phrases
  Grammar            /grammar (+ former /concepts), /grammar/[id]
  Phrases & Q&A      /phrases, /phrases/[id]
  Verbs details      /verbs/[id] (legacy, frozen)
Practise & review
  Practice           /practice (CoursePractice), /conversation/*
  Review             /saved (single review home; guided session runs at /review/session/today)
Utility: Search /search · Settings /settings · References /references
```

**One navigation config.** Move `PRIMARY_NAV`, the mobile `tabs` and `more` lists, and the groups into `lib/content/nav.ts` as a single typed list with `placement` flags. The rail, the tablet bar and the mobile bar then render from the same source:

- **Desktop rail:** Dashboard · Lessons · Book · Vocabulary (→ All vocabulary) · Cheat sheets · Grammar · Phrases · Listening · Practice · Review · Search · Settings · References.
- **Mobile tabs:** Lessons · Book · Vocabulary · Review · Menu.

Labels should be identical everywhere. Sheet `<title>`s should follow one pattern, `<Topic> · Cheat sheet` and `<Subject> · Vocabulary`, with slogans moved into the h1 only.

---

## 6. Decision table: every route

| # | Route | Decision | Reason |
|---|---|---|---|
| 1 | `/` | **Keep** | Entry point. Add an "All vocabulary / Subjects" card; drop the `/hubs` buttons (`LearnerDashboard.tsx:481,494`) |
| 2 | `/lessons` | **Keep** | Fix the L10–12 links (`LessonFour.tsx:456`); show one unified list |
| 3 | `/lessons/[lessonSegment]` | **Keep** | Core course. Later unify the three renderers and move the titles into data |
| 4 | `/lessons/[seg]/activity/[id]` | **Keep** | The only interactive L1–2 activities; tests and smoke checks depend on them |
| 5 | `/book` | **Keep** | Unique |
| 6 | `/listening` | **Keep** | Lesson-filtered audio entry point; review a merge into `/book` later |
| 7 | `/cheat-sheets` | **Merge** | Becomes the cheat-sheet **landing** (subject directory + workshop list). Move the Country sheet to `/cheat-sheets/countries` |
| 8 | `/cheat-sheets/plurals` | **Keep** (rename to `/cheat-sheets/vocabulary`, stub at the old URL) | Preferred format. The URL "plurals" misdescribes "All vocabulary" |
| 9 | `/cheat-sheets/subjects` | **Merge into** `/cheat-sheets` landing (stub redirect) | Its job (subject directory) becomes the landing |
| 10 | `/cheat-sheets/subjects/[subject]` | **Keep** | Preferred format |
| 11 | `/cheat-sheets/home` | **Keep** (trim) | Pronoun and describing workshop is unique. Replace its own word list (`home.ts`) with a link to `subjects/home`; keep `home.ts` only for illustrations and cues |
| 12 | `/cheat-sheets/people` | **Keep** | Family-tree workshop is unique |
| 13 | `/cheat-sheets/verbs` | **Keep** | Conjugation and word-order workshop is unique (also absorbs the `/verbs` hub's role) |
| 14 | `/cheat-sheets/numbers` | **Keep** | Number builder is unique |
| 15 | `/cheat-sheets/conversation` | **Keep** | Unique |
| 16 | `/cheat-sheets/questions` | **Keep** | Unique |
| 17 | `/cheat-sheets/objects` | **Keep** (trim) | Remove `ObjectVocabularyOverview` and the static PDF (now `subjects/objects` + print) |
| 18 | `/cheat-sheets/office` | **Keep** (trim) | Replace `SheetWordIndex` with a link to `subjects/office` |
| 19 | `/cheat-sheets/hobbies` | **Keep** (trim) | Same |
| 20 | `/cheat-sheets/time` | **Keep** (trim) | Same |
| 21 | `/cheat-sheets/food` | **Keep** (trim) | Same |
| 22 | `/cheat-sheets/travel` | **Keep** (trim) | Same |
| 23 | `/cheat-sheets/past` | **Keep** (trim) | Same |
| 24 | `/cheat-sheets/journeys` | **Keep** (trim) | Same → `subjects/seasons` |
| 25 | `/vocabulary` | **Redirect** → `/cheat-sheets/vocabulary` | Same catalogue in the older 12-per-page grid; the stale copy proves its stage |
| 26 | `/vocabulary/[entityId]` | **Keep** | Canonical word card. Every sheet entry, search result and saved item links here |
| 27 | `/collections/professions` | **Merge into** `subjects/people` (a "Teacher extra" source filter already exists in `SubjectSheetFilters`) | Same 48 cards; reachable only from the `/vocabulary` hub |
| 28 | `/collections/professions/[sourceRow]` | **Redirect** → the card's `/vocabulary/wNNN` | Renders the identical `WordFamilyCard`; already an alias in `word-cards.json` |
| 29 | `/verbs` | **Merge into** `subjects/verbs` + `/cheat-sheets/verbs` | Four verb surfaces; the hub adds only L1–2 legacy details and pattern cards that the lesson Verbs tab already shows |
| 30 | `/verbs/[entityId]` | **Keep** (frozen) | Guided review, conversation and practice use the legacy details. Redirect to word cards only once those move off `learner-details.json` |
| 31 | `/grammar` | **Keep** | The only cross-lesson grammar library |
| 32 | `/grammar/[entityId]` | **Keep** | No newer equivalent |
| 33 | `/phrases` | **Keep** | Cross-lesson phrase library; no full equivalent |
| 34 | `/phrases/[entityId]` | **Keep** | No newer equivalent; conversation links depend on it |
| 35 | `/concepts` | **Merge into** `/grammar` | Same lede, h1 "Grammar connections", `concepts` hub has 0 items; mobile-menu only |
| 36 | `/hubs` | **Delete** (leave a stub to `/cheat-sheets`) | Duplicates the landing and nav; stale hard-coded links; not in the desktop rail |
| 37 | `/search` | **Keep** | Unique |
| 38 | `/practice` | **Keep** | `CoursePractice` is current |
| 39 | `/practice/[gameId]` | **Delete** (after review migration) | Seven demos that each drill one hard-coded item; the review registry references the game ids (`lib/learner-state/registry.ts`), so remove them together |
| 40 | `/conversation` | **Keep** | Working ladder; later move under `/practice` |
| 41 | `/conversation/[entityId]` | **Keep** | Same |
| 42 | `/review` | **Merge into** `/saved` | Two "review" homes; `/review` covers L1–2 only. Keep the mission builder as a section of `/saved` |
| 43 | `/review/session/today` | **Keep** | The session runner stays until `packages/learning` review is retired |
| 44 | `/saved` | **Keep** (label "Review") | Newer, covers every lesson. Optionally rename the URL to `/review` *after* step 42, with a stub |
| 45 | `/settings` | **Keep** | Unique |
| 46 | `/references` | **Keep** | Required by ADR-016 |
| 47 | `/review-audio` | **Delete from the public export** | Internal QA tool, live and public. Move it behind a dev-only build flag or into `tools/` |

**Totals:**
- **Keep 36:** rows 1–6, 8, 10–24, 26, 30–34, 37, 38, 40, 41, 43–46.
- **Merge 6:** rows 7, 9, 27, 29, 35, 42.
- **Redirect 2:** rows 25, 28.
- **Delete 3:** rows 36, 39, 47.

**Redirects on GitHub Pages.** There are no server redirects on Pages, and `proxy.ts` is parked during the export. "Redirect" and "stub" therefore mean a statically exported page that does three things:
1. Emits `<meta http-equiv="refresh" content="0;url=…">` and `<link rel="canonical">`.
2. Runs a client `location.replace` that **preserves the query and hash**.
3. Has a "Moved to …" link as a fallback.

Whether Next's `redirect()` produces an equivalent stub under `output: "export"` in this setup is **(unverified)**. Confirm it with `smoke:pages`.

---

## 7. Migration steps (safe order)

Each step can ship on its own. Steps 1–3 change no URL.

1. **Fix live defects. No IA change.**
   - `LessonFour.tsx:456`: use `padStart(2,"0")`.
   - Merge Lesson 4 rows into existing families as Lessons 3 and 5–12 already are (`word-cards.ts:35` → run them through the same loop as `:36-54`).
   - Merge `l5-ein-eine` and `l5-kein-keine` into `W178` and `W075` (match on any row text or on split forms).
   - Correct `lex:usa` to plural in the `packages/content` source, then regenerate.
   - Regenerate `generated/study-dictionary.json`.
   - Add a test asserting there are no duplicate `de` headwords in `loadSubjectVocabulary()`.
2. **Label and title consistency.**
   - Give the four `SheetPage` sheets real `<title>`s; `sheetTitles` is currently a slogan.
   - Use one title pattern for all sheets.
   - Align the topic and subject names (§3.1).
   - Rename the `CheatSheetNav.tsx:24` link to "All vocabulary".
   - Fix "← Learning cheat sheets" (`SubjectInfographic.tsx:157`).
   - Remove the "Lessons 1–2" copy from the shared surfaces.
   - Update the stale hub descriptions (`hub-project.ts:46`), then re-project.
3. **Single navigation source.**
   - Build one list in `lib/content/nav.ts`. Render the rail, the tablet bar and the mobile bar from it.
   - Add All vocabulary and Subjects to it. Drop Concepts and Study library.
   - Reconcile the nav CSS overrides (`globals.css:1546-1568` vs `study.css:1786-1904`).
   - Update the nav unit and e2e tests.
4. **Delete dead code (no routes).**
   - Delete `WordCardLibrary.tsx`, `ExtraProfessionsHub.tsx`, `ExtraProfessionDetail.tsx`, `extra-professions.module.css`, `ProfessionRowClient.tsx`, `lib/content/detail-page.tsx` and `LessonThreeBridge`.
   - Delete the dead listening branch in `HubViews.tsx`.
   - Delete `worker/index.ts` after confirming that no deploy target uses it.
5. **Trim the topic sheets.**
   - Replace `SheetWordIndex`, `ObjectVocabularyOverview` and the home word list with a "Vocabulary for this topic → subject sheet" link that carries the lesson filter.
   - Then delete `ObjectVocabularyOverview.tsx` and `object-vocabulary.ts` (if no longer used), and `public/cheat-sheets/everyday-objects.pdf`.
6. **Restructure the cheat-sheet URLs (stubs first, then moves).**
   1. Create `/cheat-sheets/countries` (move `app/cheat-sheets/page.tsx` content) and `/cheat-sheets/vocabulary` (move `plurals`).
   2. Build the new `/cheat-sheets` landing.
   3. Make the old URLs stubs: `/cheat-sheets/plurals` and `/cheat-sheets/subjects` → new targets.
   4. **The landing must forward the old hash anchors.** `/cheat-sheets#country-XX` → `/cheat-sheets/countries#country-XX`. Users' saved items store these `href`s in localStorage (`lib/study/types.ts:1-14`, `STUDY_KEY` in `lib/study/storage.ts`), and the dictionary also emits them (`catalog.ts:227-230`).
   5. Update all of these together: `sheet-topics.ts:2`, `subject-sheets.ts:34`, `navigation-context.ts:21-28` (`SHEET_PATHS` allowlist), the `SubjectInfographic` links, `scripts/smoke-pages.mjs`, `tests/web/sheet-navigation.test.ts` and related tests, and the offline precache in `scripts/offline-export.ts` **(unverified contents)**.
7. **Consolidate the hubs.**
   - `/vocabulary` → stub to `/cheat-sheets/vocabulary`. Keep `/vocabulary/[id]` and update `WordCardBackLink`'s default.
   - `/collections/professions` → stub to `subjects/people?…` with the teacher filter. `/collections/professions/NN` → stub to the card path; the `wordCardForPath` mapping already exists.
   - `/concepts` → stub to `/grammar`. Move `GrammarConnections` onto `/grammar`.
   - `/hubs` → stub to `/cheat-sheets`.
   - Update `lib/content/routes.ts:97-104` (`HUB_PATH_BY_ID`), the smoke manifest (`smoke-pages.mjs:95-96,435`) and about 6 test files that reference `/hubs`, 5 for `/concepts` and 3 for `/collections/professions`.
8. **Review and practice.**
   - Fold the `/review` mission builder into `/saved`. Keep `/review/session/today`, and make `/review` a stub.
   - Then either rebuild the 7 games on word cards or delete `/practice/[gameId]` together with their `registry.ts` entries and tests.
   - Exclude `/review-audio` from the Pages export.
9. **Update the specs.** Rewrite `docs/04` (nav and route contract), `docs/17` and `docs/21` (route matrix) to match. All three predate the cheat sheets.
10. **Later, optional.**
    - Unify the three lesson renderers.
    - Retire `learner-details.json` vocabulary Lexemes once review, games and conversation read word cards. Then redirect `/verbs/[id]` to cards.
    - Stop shipping the full catalogue to every subject page (§4.4).

---

## 8. Limits of this audit

- **Not run:** no build, typecheck or test. Reachability comes from a regex-based import graph (`import … from`, side-effect imports, dynamic `import()`, CSS `@import`). Re-exports through barrels were resolved, but string-built dynamic imports would be missed.
- **Live crawl:** limited to server-rendered HTML from 34 pages, so client-only links are unchecked. The live build appears current: the Stage-4 pages and titles are present.
- **Content checks:** these compare normalized strings, not German correctness. No judgement is made about which translation is right.
- **Visual consistency** (illustration styles between topic sheets and subject sheets) was not inspected in a browser.
- **Repo-root folders** (`archive/`, `samples/`, `research/` at 44 MB, `media/` at 160 MB, `plans/`, `study-guides/`) are outside the app and were only sized, not audited. `samples/german-learning-ui-samples/` is the Stage-0 sample that `docs/17:15` still calls "the current application".
