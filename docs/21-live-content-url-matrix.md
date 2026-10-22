# Content Routes and Source Matrix

Updated: 2026-10-22. This is the route/source map for owner-authorized integrated alpha `c9c1e6fdefcf1f950ce5612158f6909e3525519c`, reconciled with locally checked Lane 1 repair candidate `3a129bcc5769a9441cedcdb0615b28bd8788f5a9`. Paths are app-relative examples or route families, not fresh deployed URL checks. Local screen/PDF evidence is accepted within scope; the original E2E gate remains red with twelve unchanged Lane 2 failures. See [the completion matrix](17-current-state-and-completion-matrix.md) for exact evidence and owner limits.

The historical base URL is `https://hrezaii95.github.io/german-learning-exam/`. Helpers also support a root deployment. Earlier versions of this file recorded August 2026 HTTP sweeps and September vocabulary inventories; those dated counts and “LIVE 200” labels do not certify the current candidate. The integration merge is recorded separately from HTTP/export/deployment evidence; no fresh deployed URL sweep is asserted here.

## Canonical app routes

| Surface | Route | Content / source of truth | Status limit |
|---|---|---|---|
| Cheat-sheet directory | `/cheat-sheets` | `sheetDestinations` in `lib/study/sheet-navigation.ts`; vocabulary, subjects and workshops | Integrated L1-5 baseline; pinned local suite/export and sampled QA recorded in docs/17 |
| All vocabulary | `/cheat-sheets/vocabulary` | `loadSubjectVocabulary()` and canonical word families; illustrated/plural layouts | Integrated L1-5/6 baseline with L1-2 compatibility; pinned local evidence recorded in docs/17 |
| Vocabulary by subject | `/cheat-sheets/subjects/:subject` | Registered `subjectSheets`, same shared entries/dropdowns and catalogue | Integrated baseline; subject IDs listed below; sampled local evidence does not visually certify every subject |
| Full word card | `/vocabulary/:entityId` | `loadWordCards()`, source/alias membership, exact forms/prompts, Learn/Recall | Existing routes retained; ADR-020a shared line art/audio, sampled local review accepted |
| Book | `/book` | Generated interactive book, linked source audio and answer/lookup material | Current original-page A4/Letter sample accepted; source and publication rules still apply |
| Lessons | `/lessons`, `/lessons/01` through `/lessons/12` | Existing course lesson/study data and published activities | Two-digit links for 10–12; presence is not German-review approval |
| Verbs / grammar / phrases | `/verbs`, `/grammar`, `/phrases` and their published detail paths | Existing typed projections and course pattern material | Specialist experiences retained |
| Listening | `/listening` | Published listening groups, exact approved workbook track metadata/transcripts | Shared scrubbing transport retained |
| Review | `/saved` | `ReviewHome`: saved items/notes/self-rated recall and guided exercise missions | Integrated L1-7 baseline; separate stores retained; pinned local suite evidence recorded in docs/17 |
| Guided session | `/review/session/today` | Existing guided exercise/session implementation | Retained; not a renamed saved-item store |
| Search / settings / credits | `/search`, `/settings`, `/references` | Existing search projections, local preferences and attribution | Retained; no account/sync certification |
| Practice | `/practice` and `/practice/:gameId` | Existing practice implementation | G3 retirement remains pending; its Lane 2 dependency code is now integrated |
| Play | `/play`, `/play/run` | Lane 2 route/Run player and v1 scope-link helpers | Integrated dependency; Lane 1’s scoped handoffs and practice retirement still need implementation/verification |
| Audio review | `/review-audio` | Reviewer tool and asset-bound verdict export | QA surface; selective Pages exclusion remains externally blocked |

Registered subject IDs are `introductions`, `people`, `countries`, `numbers`, `home`, `objects`, `colours-materials`, `office`, `seasons`, `past`, `travel`, `food`, `time`, `hobbies`, `grammar`, `verbs`, `conversation`, `questions`, `classroom`, `descriptions`, `everyday`. The page's “by subject” grouping and a tag filter are distinct from a separate duplicate word catalogue.

## Topic workshops and vocabulary handoffs

Every topic workshop uses `CheatSheetFrame`. A matching subject link opens the vocabulary source; distinctive grammar, diagrams, builders and practice remain in the workshop. Lesson handoffs use `lesson`, while `lessons` is the grouping switch.

| Workshop | Route | Vocabulary handoff / teaching retained |
|---|---|---|
| Countries & languages | `/cheat-sheets/countries` | Countries, flags, articles, origin/destination and language practice |
| Home & furniture | `/cheat-sheets/home` | `/cheat-sheets/subjects/home?lesson=1,2,3,4`; home/pronoun/article patterns and practice |
| People, family & work | `/cheat-sheets/people` | People vocabulary and family/person-form relationships |
| Verbs & sentences | `/cheat-sheets/verbs` | Conjugation and sentence builders; relevant vocabulary remains reachable |
| Numbers & prices | `/cheat-sheets/numbers` | Number/price building, exact number words and practice |
| Conversation & spelling | `/cheat-sheets/conversation` | Communicative frames, spelling and practice |
| Questions & answers | `/cheat-sheets/questions` | Question construction, answer patterns and practice |
| Objects, colours & articles | `/cheat-sheets/objects` | `/cheat-sheets/subjects/objects?lesson=5`; object description, selected color/shape and article patterns |
| Office, plurals & accusative | `/cheat-sheets/office` | `/cheat-sheets/subjects/office?lesson=6`; office/accusative teaching and builders |
| Hobbies, abilities & frequency | `/cheat-sheets/hobbies` | `/cheat-sheets/subjects/hobbies?lesson=7`; ability/frequency and practice |
| Time, weekdays & plans | `/cheat-sheets/time` | `/cheat-sheets/subjects/time?lesson=8`; clock/weekday/planning practice |
| Food, preferences & ordering | `/cheat-sheets/food` | `/cheat-sheets/subjects/food?lesson=9`; ordering/preference models and practice |
| Travel & separable verbs | `/cheat-sheets/travel` | `/cheat-sheets/subjects/travel?lesson=10`; travel/separable-verb builders and practice |
| Yesterday, Perfekt & opening hours | `/cheat-sheets/past` | `/cheat-sheets/subjects/past?lesson=11`; past/participles and opening-hours teaching |
| Seasons, journeys & haben or sein | `/cheat-sheets/journeys` | `/cheat-sheets/subjects/seasons?lesson=12`; seasons/journeys/auxiliary patterns and practice |

The Home handoff widens its lesson selection when an exact old target belongs to later material. Other exact-word handoffs likewise use the word's actual subject/lessons when needed. Old workshop row hashes remain anchors with a learner-facing exact-word link; they do not automatically leave the workshop.

## Compatibility route map

| Existing URL | Destination / resolution |
|---|---|
| `/cheat-sheets/plurals?...#...` | `/cheat-sheets/vocabulary?...#...` |
| `/cheat-sheets/subjects?...#...` | `/cheat-sheets?...#...` |
| `/cheat-sheets?...#country-CH` or another recognized country/section hash | `/cheat-sheets/countries?...#...`; ordinary directory hashes stay on the directory |
| `/vocabulary?...#...` | `/cheat-sheets/vocabulary?...#...` |
| `/hubs?...#...` | `/cheat-sheets?...#...` |
| `/concepts?...#...` | `/grammar?...#...` |
| `/collections/professions?...#...` | `/cheat-sheets/subjects/people?...#...`, adding `source=teacher-extra` only when absent |
| `/review?...#...` | `/saved?...#...` |
| Registered `/vocabulary/l4-*`, old word-family/job aliases and subject row hashes | Resolve to the canonical family/row while retaining alias-aware saved-item compatibility |
| `/collections/professions/:row` | Existing registered family/detail compatibility remains; the index redirect does not erase saved detail links |

`sheet-routes.ts`, `hub-redirects.ts`, static redirect components and `NavigationContext` own these rules. With JavaScript enabled, existing query bytes and fragment are retained by automatic static/client handoffs. The no-JavaScript fallback uses the canonical target/defaults without the original query or fragment. Old profession pattern/alternatives/limit fields can remain bounded return context without implying that the destination has matching controls. URL aliases and canonical save IDs are separate concepts; both directions of saved toggling must work.

## Filter and entry state

| State | Source / persistence contract |
|---|---|
| Catalogue search and group | `SheetBrowse`: `q`, `category` |
| Legacy/Back context | `SheetBrowse.saved` and `page` round-trip compatibility fields; they do not filter or paginate the canonical catalogue |
| Layout and grouping | `view`, `gender`, `subjects`, `lessons`, validated `order` |
| Sort | `sort`: german, meaning, lesson, source, original; `direction`: asc or desc |
| Subject filter | Validated `tags`; explicit empty tags means all |
| Topic lesson filter | `lesson` → `lessonFilter`; integer lesson IDs 1–12 |
| Source filter | `source` → `sourceFilter`; `course`, `teacher-extra`, `study-extra` |
| Back context | Safe return path, query/hash/row, grouping/sort/tags, `sheetLessonFilter` and `sheetSource` |
| Saved item | Stable canonical identity plus registered old aliases; existing saved records remain actionable |

Opening a URL restores local lesson/source scope without rewriting global study selection. Reset clears both local filters. Source membership can include course and teacher extras on the same canonical family; source-aware lesson grouping uses the matching membership. Filters and grouping reuse `VocabularyEntry` / `WordDropdown`, with the same audio, save and full-card behavior.

## Source and media map

| Material | Repository source / renderer | Publication limit |
|---|---|---|
| Canonical vocabulary families | Generated `word-cards.json`, `lib/content/word-cards.ts`, lesson/source additions | IDs, source membership and supplied forms preserved; review status is independent of rendering |
| Subject vocabulary | `lib/study/subject-sheets.ts`, `lib/study/subject-sheets.server.ts`, shared entry/dropdown components | No duplicate normalized German headword from merged Lesson 4 rows |
| Teacher professions | Existing 48-row teacher source and family aliases; People sheet with `source=teacher-extra` | Candidate German-review/source labels remain visible |
| Vocabulary art | `SubjectVocabularyVisual`; pure Food/Hobby/Home/Object path registries plus semantic/refined registries | ADR-020a line-art detail/card heroes and reference surfaces; raster assets remain unused by cards. `currentColor`, subject-symbol and source-glyph fallbacks stay compatible |
| Actual colors and flags | `colour-swatches.ts`, object paint/shape props and country flag assets | Semantic teaching colors retained; no alternate decorative article palette |
| Synthesized pronunciation | Exact published preview metadata/assets; `LineAudio` reused by MeaningPlate/PronunciationControl | Technical availability and independent listening approval are different; exact-source previews retain retry/gating |
| Device speech | Existing LineAudio fallback for appropriate line callers | Device-generated fallback is labeled; it does not create a published reviewed recording |
| Workbook recordings | `public/audio/source-workbook-approved-v1/`, exact public track metadata, `WorkbookAudioTracks` | The published transport subset is `1_01`–`1_15`; scrubbing, speed, retry and transcript disclosure retained |
| Contextual lesson/activity art | Existing illustration/infographic manifests and `RichLessonVisual` | Teaching scenes retained; optional shared vocabulary visual preserves captions/labels |
| Print | Live-page `StudyPrint.css` with whole-book-page/practice pagination repair | Ten actual A4/Letter PDFs / 27 pages visually reviewed at the pinned state. Book image is proportional and at most 200mm high, with scope/caption/credits; practice uses break avoidance with an oversized-content fallback. Other states have no fixed page-count promise |

The 15 workbook tracks cover names/spelling (`1_01`–`1_04`), sentence melody (`1_05`–`1_06`), telephone-number discrimination (`1_07`–`1_10`), telephone-number transcription (`1_11`–`1_14`) and profession stress/repetition (`1_15`). These are structured recordings, not single-line button replacements. ADR-016 records the owner’s full Momente A1.1/A1.2 coursebook, workbook, glossary, transcript and audio grant, conditional on visible attribution. These 15 tracks describe current publication scope; later-media exclusions are scope decisions. German and generated-audio quality review gates remain separate. Preview-file inventories must be derived from the current manifest; the older 83/110/354 counts in historical documents are not a new audit.

## Draft book references — G2, not learner publication

The G2 sidecar and pure projector are included in integration #20’s alpha tree. They remain draft owner-review material, not live catalogue/learner publication.

| Item | Prepared evidence |
|---|---|
| Sidecar | `platform/content/study-cards/book-refs.draft.json` and sibling `book-refs.review.md` |
| Projector | `platform/apps/web/lib/content/vocabulary-book-refs.server.ts` |
| Sources | `platform/apps/web/generated/interactive-book.json`; `archive/cursor-demo-2026-07-30/content/extracted/_pdf_raw/kursbuch_full.txt` and `glossary_full.txt` |
| Source edition | Deutsch–Spanisch glossary, ISBN 978-3-19-001791-1 |
| Coverage | 1,046 source-row occurrences: 304 non-null pages, 742 nulls with reasons; no unique-word or first-introduction claim |
| Review | Draft only, not live-wired; owner review before publication; unresolved pages/exercises must not be guessed |

The book-ref draft does not rewrite source words, IDs or order. See [the completion matrix](17-current-state-and-completion-matrix.md) for ambiguity counts and acceptance limits.

## Release and unresolved dependencies

The pinned current-target engineering run passed all gates except the original E2E suite: 170 of 182 cases passed and twelve unchanged Lane 2 cases failed, leaving the overall result blocked (exit 3). Local Pages QA accepted 28 screen captures, 15 additional mobile viewport captures and all 27 pages of ten PDFs; 36 plural DOM/geometry cases and a bounded 27-target scroll/hit/action probe had zero findings/errors. The contextual lesson scene was exercised live, while the mapped responsive RichLessonVisual picture branch remains unrouted/component-only. Historical raster QA stays pinned to its tested snapshots and does not certify current line-art cards. These are local Pages checks, not production-root browser or live-deployment acceptance. No “LIVE 200” status should be added without a dated check of the specific deployed build; HTTP reachability alone cannot certify interaction or German/audio quality.

The earlier original-smoke and word-card audit failures belong to the historical isolated Lane 1 checkpoints. Integration #20 changed the original retired-route/card-alias expectations; its PR records separate local gate evidence. Fresh pinned original production/dev/Pages/word-card gates all passed; the current original E2E owner failure remains red separately. Lane 1’s owned canonical compatibility helpers stay supplementary and do not replace those gates. See [the completion matrix](17-current-state-and-completion-matrix.md).

Canonical USA plural typing and selective `/review-audio` Pages export exclusion remain external-owner blockers. Lane 2’s `/play/run`, scope helpers and Phase 1 code are integrated; G1 actions across all 37 sheet destinations and word actions remain pending Lane 1 implementation/verification. G3 remains pending after G1 acceptance: its amended plan proposes an owned PracticeHub and seven known route stubs, while existing routes remain implemented; the future original dev-smoke expectation handoff stays with its owner. Account/session/sync acceptance belongs to Lane 3. ADR-020a’s model German review does not close qualified German, synthesized-audio listening or book-reference publication review. This matrix does not close those gates.
