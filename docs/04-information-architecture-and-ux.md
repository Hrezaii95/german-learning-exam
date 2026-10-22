# Information Architecture and UX

Updated: 2026-10-22. This describes the prepared Lane 1 candidate, including the L1-5 frame, L1-6 entries, L1-7 consolidation and L1-8 visual system. These are implementation and compatibility contracts, not a claim that the candidate is merged or deployed. L1-9 print, CSS and icon consolidation is prepared; its final PDF/rendered checks are identified separately below. See [the completion matrix](17-current-state-and-completion-matrix.md) and [route/source matrix](21-live-content-url-matrix.md) for evidence limits.

## Entry points and navigation

A learner can start with the Book, follow Lessons, browse the reference sheets, or return to saved review. Vocabulary has one catalogue and one shared entry/detail interaction. Topic workshops retain their grammar, diagrams, builders and practice; they link to subject vocabulary rather than maintaining another live word list.

`platform/apps/web/lib/content/nav.ts` is the navigation source. `NAV_ITEMS` describes destination, placement, ordering and optional roles; `navItemsFor()` serves the rail, tablet navigation and mobile Menu. Mobile primary destinations are Book, Lessons, Cheat sheets and Review, plus the Menu trigger. The Menu provides the other destinations and the account slot. A role-filtered destination is shown only for an eligible role. Lane 3 owns account behavior after the foundation slot; this document does not certify sign-in or sync.

| Navigation group | Lane 1 destinations |
|---|---|
| Learn | Dashboard `/`, Book `/book`, Lessons `/lessons`, Cheat sheets `/cheat-sheets`, All vocabulary `/cheat-sheets/vocabulary`, Subjects `/cheat-sheets#subjects`, Listening `/listening` |
| Remember and practise | Review `/saved`, existing Practice `/practice` |
| Find and explore | Verbs `/verbs`, Grammar `/grammar`, Phrases & Q&A `/phrases`, Search `/search` |
| Your app | References `/references`, Settings `/settings` |

The retired vocabulary/library/concept indexes do not compete with these destinations. Lanes 2 and 3 own their additional play/account navigation entries. Their presence and release require the corresponding integration work.

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

## Responsive, keyboard and print behavior

German text uses `lang="de"`, natural wrapping and automatic hyphenation. Reflow must preserve the word, article, plural and meaning at 320px and 360px mobile widths and 200% zoom. Focus uses the shared ring token; state outlines and semantic article borders remain distinct. Choosers and disclosures support keyboard activation and Escape, with meaningful names and restored focus. Active filters expose `aria-pressed`, and controls retain adequate pointer targets.

L1-9 prepares print from the live rendered page: current filters, selected vocabulary, on-page diagrams and recall state determine the teaching output. Duplicate print summaries are removed; there is no fixed page-count promise. Print hides shell, chooser and jump navigation, transient word dropdowns, audio/save controls and other interactive chrome. Directory content tiles and a rendered original book page remain printable; book contents, page controls and audio players are hidden. A read-only study-scope summary and effective vocabulary selection are printed, and the source credit remains a visible footer. A generated PDF and its readability must be checked after the final stack; a Print button alone is not that evidence.

## External dependencies and publication limits

- G1 “Play this sheet” and “Practise this word” depend on Lane 2's built `/play/run` scope contract. Do not show an action to an unavailable route.
- G3 retirement of `/practice/:gameId` depends on Lane 2 Phase 1 integration and happens last. Existing practice routes remain in this candidate.
- Canonical USA plural typing needs the content schema owner. Correct app presentation does not close that schema dependency.
- Selective `/review-audio` exclusion from the Pages export needs the build owner; returning Not Found alone does not remove exported files.
- German forms, synthesized pronunciation and candidate book references retain their owner review/publication gates. See [current limits](17-current-state-and-completion-matrix.md).
