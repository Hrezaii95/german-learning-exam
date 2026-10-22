# Information Architecture and UX

Updated: 2026-10-22. This describes the Lane 1 IA and compatibility contract from owner-authorized integration `c9c1e6fdefcf1f950ce5612158f6909e3525519c` (PR #20), with responsive/print evidence pinned to `3a129bcc5769a9441cedcdb0615b28bd8788f5a9` and G1 local outcomes pinned to `dcc06db04e1be6cd4d0c211b2cf3ef0661453ef8`. G1’s local checks and transport evidence are recorded separately from the original E2E gate, which remains red with twelve unchanged Lane 2 failures; overall exit is 3. G3 follows owned G1 acceptance. FULL7 completed on `8e6a504a` with overall blocked exit 3: the original browser gate has twelve unchanged Lane 2 failures, and the original dev smoke stops at its obsolete flashcards-link expectation. Current root/Pages handoff, target and image evidence is accepted within the limits below. Neither integration nor local QA certifies deployed behavior. See [the completion matrix](17-current-state-and-completion-matrix.md) and [route/source matrix](21-live-content-url-matrix.md) for evidence limits.

## Entry points and navigation

A learner can start with the Book, follow Lessons, browse the reference sheets, or return to saved review. Vocabulary has one catalogue and one shared entry/detail interaction. Topic workshops retain their grammar, diagrams, builders and practice; they link to subject vocabulary rather than maintaining another live word list.

`platform/apps/web/lib/content/nav.ts` is the navigation source. `NAV_ITEMS` describes destination, placement, ordering and optional roles; `navItemsFor()` serves the rail, tablet navigation and mobile Menu. Mobile primary destinations are Book, Lessons, Cheat sheets and Review, plus the Menu trigger. The Menu provides the other destinations and the account slot. A role-filtered destination is shown only for an eligible role. Lane 3 owns account behavior after the foundation slot; this document does not certify sign-in or sync.

| Navigation group | Lane 1 destinations |
|---|---|
| Learn | Dashboard `/`, Book `/book`, Lessons `/lessons`, Cheat sheets `/cheat-sheets`, All vocabulary `/cheat-sheets/vocabulary`, Subjects `/cheat-sheets#subjects`, Listening `/listening` |
| Remember and practise | Review `/saved`, existing Practice `/practice` |
| Find and explore | Verbs `/verbs`, Grammar `/grammar`, Phrases & Q&A `/phrases`, Search `/search` |
| Your app | References `/references`, Settings `/settings` |

The retired vocabulary/library/concept indexes do not compete with these destinations. Lane 2/3 feature code is integrated, but this alpha navigation baseline has no Play entry. Lanes 2 and 3 retain responsibility for their additional play/account navigation entries and acceptance; this document does not add or imply a new entry.

## Canonical route contract

Paths below are app-relative. Next links and base-path helpers support both a root deployment and the GitHub Pages repository prefix; callers must not hard-code that prefix.

| Route | Purpose and behavior |
|---|---|
| `/cheat-sheets` | Searchable directory of all vocabulary, vocabulary by subject and topic workshops |
| `/cheat-sheets/vocabulary` | Complete vocabulary catalogue, illustrated and plural layouts, scope/filter/group/sort controls |
| `/cheat-sheets/subjects/:subject` | Same vocabulary system restricted to a registered subject; a word can belong to more than one subject |
| `/cheat-sheets/countries` | Countries/languages workshop, article patterns, origin/destination examples and practice |
| `/cheat-sheets/{home,people,verbs,numbers,conversation,questions,objects,office,hobbies,time,food,travel,past,journeys}` | Named topic workshops in the shared reference frame |
| `/vocabulary/:entityId` | Complete canonical word-family Learn/Recall card; registered old vocabulary/job paths still resolve to their family |
| `/book` | Book reading, listening, answers and lookup; book position belongs to its separate state contract |
| `/lessons`, `/lessons/01` through `/lessons/12` | Lesson browsing and course material; lessons 10–12 use two-digit paths |
| `/lessons/:lessonId/activity/:activityId` | Existing published activity routes; this is a description of existing static routes, not permission to add arbitrary dynamic routes |
| `/verbs`, `/grammar`, `/phrases`, `/listening` | Retained specialist experiences and their published details/activities |
| `/saved` | My review: personal saved items, notes and self-rated recall together with guided exercise missions |
| `/review/session/today` | Existing Today guided-review session remains available |
| `/practice` | Owned Practice hub retaining CoursePractice, qualified Conversation and a separate Play entry |
| `/conversation` | Existing Conversation selector |
| `/conversation/id-71613a70726f66657373696f6e2d63617375616c2d6d61696e` | Canonical five-level ladder detail; the Practice hub retains its existing source/study-scope qualification and normalized return context |
| `/search`, `/settings`, `/references` | Search, preferences/data controls and source credits |

Unknown IDs must fail safely. A successful route match is not proof of German review, audio approval, mastery or deployment reachability.

## Compatibility routes and saved links

Static redirect pages use parser-time scripts and a client fallback because fragments are available in the browser. With JavaScript enabled, they retain the existing query and fragment and add a default only when absent. They expose a visible destination link; the no-JavaScript fallback uses the canonical target/defaults without the original query or fragment. Base-path helpers prefix only the pathname.

| Old entry point | Canonical destination | Preserved context |
|---|---|---|
| `/cheat-sheets/plurals` | `/cheat-sheets/vocabulary` | Query and hash, including old row anchors |
| `/cheat-sheets/subjects` | `/cheat-sheets` | Query and hash |
| `/cheat-sheets#country-CH` and other recognized old country/section anchors | `/cheat-sheets/countries` with the same suffix | Only recognized country anchors trigger this move; a normal directory visit remains a directory visit |
| `/vocabulary` | `/cheat-sheets/vocabulary` | Existing query and hash |
| `/hubs` | `/cheat-sheets` | Existing query and hash |
| `/concepts` | `/grammar` | Existing query and hash |
| `/collections/professions` | `/cheat-sheets/subjects/people` | Existing query/hash; default `source=teacher-extra` only when absent; bounded old profession-list state retained in Back context |
| `/review` | `/saved` | Existing query and hash; guided sessions and their storage are retained |
| Seven registered `/practice/:gameId` routes | `/play/` | Existing query and hash through the shared static redirect; unknown or malformed game paths remain 404s |

Old family aliases, collection detail paths, subject row hashes and Lesson 4 save identifiers remain compatibility inputs. Canonical families aggregate source membership, forms and prompts; they do not discard the old source IDs. Saving or removing an alias-aware item acts on the canonical family from inline lesson cards, dictionary lookup, course practice and full cards.

Workshop word hashes do not redirect the entire workshop. The old anchor remains usable and presents an actionable link to the exact word on the matching subject sheet, with its lesson selection. The workshop route and section state remain intact. Encoded `NavigationContext` carries the safe return path, query, filters and row/fragment context so Back restores the source view.

## One reference frame and one entry

`CheatSheetFrame` supplies the reference navigation, named searchable chooser, heading, topic mark and Print / save as PDF action. The directory and chooser share `sheetDestinations`; the former numbered chooser is retired.

`VocabularyEntry` supplies the illustrated or plural entry button. It keeps the stable row anchor, accessible word/forms/source label, selected and expanded states, and disclosure relationship. `WordDropdown` supplies the open inline card: meaning, exact supplied singular/plural forms, audio, examples, patterns, save control, source tags and full-card link. Parents own selection and focus restoration. Escape closes the disclosure and restores the entry focus; opening audio or saving is not a page navigation. Compatibility exports remain available to older consumers.

A missing plural is stated as missing; a plural-only entry does not acquire an invented singular. Alternative supplied forms remain available on the full card. Subject illustrations, colors, grouping, search and recall do not manufacture content.

## Scope, filters and return state

The shared study scope supports all lessons, one lesson, selected lessons or through a lesson; subject tags and source categories can narrow it. The available lesson ceiling is read from `scope.ts`, currently 12. Browsing scope is not evidence of unlocking or mastery.

| URL field | Meaning |
|---|---|
| `q`, `category` | Catalogue search and vocabulary group |
| `saved=1`, `page` | Parsed legacy/Back context; these fields do not filter or paginate the canonical catalogue |
| `view=illustrated` or `view=plurals` | Entry layout |
| `gender`, `subjects`, `lessons` (`0` or `1`) | Grouping switches; `lessons` does not select lesson numbers |
| `order` | Validated ordering of `lesson,subject,gender,plural` dimensions |
| `sort` and `direction` | German, meaning, lesson, source or original order; ascending or descending |
| `tags` | Validated subject IDs; an explicit empty list means all tags |
| `lesson` | Validated local lesson selection for topic handoffs; integers 1–12, deduplicated and ordered |
| `source` | Local `course`, `teacher-extra` or `study-extra` source selection |

`SheetBrowse.lessonFilter` and `sourceFilter` overlay the restored sheet scope without rewriting the global study selection merely by opening a URL. `sheetLessonFilter` and `sheetSource` preserve these values in validated Back context. Reset removes both local filters as well as search/group/saved constraints. “All sources” removes the local source override. Source membership remains explicit when a canonical family belongs to both course and extra material.

Filter counts, active state and empty states describe the effective selection. No match provides clear/reset actions. Group order changes presentation, not vocabulary membership; plural patterns do not suppress a word's other forms.

## Scoped play handoffs — G1 candidate

The G1 implementation adds “Play this sheet” to the 37 shared-frame sheet destinations and “Practise this word” to inline rows and full family cards. `lib/study/play-links.ts` resolves real A1 pack items through the existing v1 `playHref()` contract for `/play/run` with pack `de-a1-momente`. It uses actual pack tags, source membership, lesson membership, family IDs and country source paths rather than guessed item IDs.

Sheet actions retain the effective lesson/tag/source scope, including local sheet overlays, and the filtered entry set. Search/category and applicable collection/country saved filters narrow that set before display pagination. The inline subject action targets its exact row under the effective sheet scope. A full-family action is an explicit choice of that family’s A1 rows, independent of unrelated global or legacy Back filters. Explicit IDs retain narrowed/intersected sets; they can be omitted only when the pack predicate produces exactly the same set.

Unknown-only, empty, not-ready or over-budget selections disable the action instead of truncating IDs or dropping filters. Sheet actions report their available entry count and any unavailable selected entries. In addition to the decoder’s existing 2,000-item / 30,000-character scope limits, the adapter caps the completed relative `playHref` at 8,000 UTF-8 bytes and asks the learner to choose fewer words when it is too large. It never drops an item or constraint to fit. The exact-match “All” predicate still represents all 1,330 pack items without a redundant explicit ID list; the Run parser and server limits are unchanged.

Links use `prefetch={false}` and are hidden for print. They do not enable a pack or approve its content: pending A1 material still requires the existing public opt-in in Play. A historical production-root diagnostic on `feae7d70` passed the eight G1 browser cases and its nine screenshots were visually accepted, but its 22,421-byte explicit-selection href returned HTTP 431. A separate focused URL regression failed once with 48 passing cases against the old adapter, then passed 49/49 against the temporary repaired adapter. The completed local run on `dcc06db0` executed 190 cases once: 178 passed and twelve unchanged owner cases failed, so the original E2E gate remains red and overall exit is 3. All other recorded stages exited 0. Both production-root and Pages transport probes keep the original 1,329-item selection disabled; a separate 655-ID catalogue prefix produced a 7,997-byte relative href / 7,962-byte scope, HTTP 200 and a real preview while retaining exact IDs and lessons. Compact All still covers 1,330 items with a 36-byte encoded scope. The eight G1 cases passed inside the Pages full run and in a separate eight-case production-root subset; 18 action PNG files were viewed and accepted. These are local checks, not a live deployment or an aggregate 198-case suite. Recorded L1-9 results stay pinned to their tested source.

## Retained Practice and legacy game handoffs — G3 local evidence

The owned `PracticeHub` replaces the public legacy selector on `/practice`. It keeps CoursePractice’s selected-word recall and article checking, the existing lesson-quiz links, bounded Back context and a separate “Open Play” link. Revealing a word is not a graded completion. Conversation remains available under the existing course-source predicate: lesson 2 and a matching `people` or `conversation` concept. Its link opens the canonical ladder detail `/conversation/id-71613a70726f66657373696f6e2d63617375616c2d6d61696e` with the same normalized return context; `/conversation` remains the selector index. Plain Play links do not convert legacy navigation into a guessed Play scope or enable pending packs.

Exactly seven registered detail IDs become compatibility stubs: `flashcards`, `picture-word-match`, `article-choice`, `audio-match`, `word-order`, `verb-builder` and `morphology-puzzle`. They reuse `StaticHubRedirect` to `/play/`, with a visible destination and no-JavaScript fallback. The script/client handoff preserves query values and hash; Pages retains raw query bytes, while production Next may canonicalize the trailing slash and query encoding without losing ordered duplicate or empty values. Unknown, extra-segment and malformed paths retain strict 404 handling. The fallback without JavaScript has the general query/hash limitation described above.

Owned lesson and detail callers now offer course Practice and Play or the Practice hub, with their existing bounded lesson/search/detail return context. Protected game engines and helpers remain unchanged for internal consumers. Existing course events/review cards and Wortwerk events remain in their separate stores; retirement does not clear, merge, migrate or fabricate either history. The Settings timezone regression uses a real graded course activity rather than a retired game URL. In FULL7, all four Settings cases and all nine retirement cases passed within the full native suite. Seven independent alias cases each create their own real course events/review cards, explicitly enable the fixture pack, record one real Play answer, then compare all three complete event/card arrays after the alias handoff and reload. This replaces the earlier chained-seven workflow; it does not merge histories or establish a completed Play session or streak.

FULL7 passed check stages (root 152 files / 1,728 tests; dedicated web 129 / 1,258 is a subset rerun), E2E typing and both builds. All 190 native browser cases executed once: 178 passed and twelve unchanged Lane 2 cases failed, with zero skips, flaky cases, retries or global errors. The nine retirement, four Settings and eight G1 cases are within that total; separate production-root reruns passed nine retirement and eight G1 cases without adding unique-suite counts. Actual root/Pages probes each passed seven alias HTTP responses, seven destination requests, fourteen browser handoffs, four unknown-route checks and all 21 targets at three widths; the native select meets 44px. All 94 capture files / 37 distinct visuals were accepted within their recorded states. Bootstrap and builds used two Next workers through external `CIRCLE_NODE_TOTAL=3`, without repository configuration changes. The completed FULL7 runner is blocked, exit 3: original E2E exits 1 at twelve unchanged Lane 2 streak assertions, and original dev smoke exits 1 at its retired flashcards-link assertion. Both raw failures remain red; successful classifiers do not clear either original gate. Later original dev groups did not execute. The [final G3 plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6351090493) and narrow repairs retain protected code and histories. G1 transport remains pinned to `dcc06db0`; the current comparison of 59 listed paths with runtime false is not new transport or complete source closure.

## Responsive, keyboard and print behavior

German text uses `lang="de"`, natural wrapping and automatic hyphenation. Reflow must preserve the word, article, plural and meaning at 320px and 360px mobile widths and 200% zoom. Focus uses the shared ring token; state outlines and semantic article borders remain distinct. Choosers and disclosures support keyboard activation and Escape, with meaningful names and restored focus. Active filters expose `aria-pressed`, and controls retain adequate pointer targets.

L1-9 prints from the live rendered page: current filters, selected vocabulary, on-page diagrams and recall state determine the teaching output. Duplicate print summaries are removed; there is no fixed page-count promise. Print hides shell, chooser and jump navigation, transient word dropdowns, audio/save controls and other interactive chrome. Directory content tiles and a rendered original book page remain printable; book contents, page controls and audio players are hidden. A read-only study-scope summary and effective vocabulary selection are printed, and the source credit remains a visible footer. The pinned current-target A4/Letter PDFs were generated and visually reviewed. The selected original book page prints proportionally within a 200mm height limit, with its caption, read-only scope and credits in normal flow. This is bounded local evidence for the tested states, not a fixed page-count promise for other content.

## External dependencies and publication limits

- Lane 2’s `/play/run` and scope helpers are integrated. G1 covers the 37 sheet destinations and word actions with the 8,000-byte relative-href guard and the bounded local evidence above. The original owner E2E failure still blocks the overall release gate. Unavailable item selections stay disabled, and pending content still requires Play’s explicit pack opt-in.
- Lane 2 Phase 1 code is integrated and owned G1 acceptance is complete. G3’s completed local run remains overall blocked, exit 3, at the twelve original Lane 2 E2E failures and the original dev-smoke retirement assertion. Other required independent gates and bounded root/Pages rendered checks pass. The owner handoff for original dev expectations remains open. No merge, deployment or human-content approval is inferred.
- Canonical USA plural typing needs the content schema owner. Correct app presentation does not close that schema dependency.
- Selective `/review-audio` exclusion from the Pages export needs the build owner; returning Not Found alone does not remove exported files.
- German forms, synthesized pronunciation and candidate book references retain their owner review/publication gates. See [current limits](17-current-state-and-completion-matrix.md).
