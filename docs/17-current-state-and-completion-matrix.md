# Current State and Completion Matrix

Status: authoritative gap audit for the active Lessons 1–2 goal  
Audited: 2026-08-07  
Authority: current files, manifests, executable tests and browser behavior—not prior agent completion language.

## How to read this matrix

- **Proven** — direct current-state evidence covers the full requirement.
- **Partial** — a real slice exists, but at least one named behavior or content class is absent.
- **Missing** — no implementation evidence covers the required behavior.
- **Blocked** — implementation may exist, but a named external/human gate prevents acceptance.

Documentation alone is specification evidence, not implementation evidence. The current application under `samples/german-learning-ui-samples/` is the approved visual baseline and a partial vertical slice. The intended clean production target remains `platform/`.

## Requirement-to-evidence matrix

| Requirement | Status | Direct current evidence | What remains for completion |
|---|---|---|---|
| LRN-001 | Partial | `app/page.tsx` lesson cards, audio, recall and completion; review UI | Generic activities must implement every See→Hear→Notice→Repeat→Recall→Use→Feedback→Review→Master phase and emit evidence |
| LRN-002 | Partial | stable `/lessons/01`, `/lessons/02` and hub routes | prerequisite recommendation, resumeable activities and learned-object hub scope |
| LRN-003 | Missing | local state has only XP, heard, completed, reviews and difficult IDs | exposure, recognition, recall, listening, production and stability dimensions |
| LRN-004 | Partial | docs forbid page/MCQ mastery; current app never claims Mastered | tested mastery reducer enforcing the rule |
| LRN-005 | Proven | content bundle has only two lessons plus teacher collection; content-integrity test checks scope | keep firewall when canonical publishing replaces compact bundle |
| LRN-006 | Partial | lesson records contain vocabulary, verbs and Q&A; teacher collection attaches to Lesson 2 | typed generic attachment model for every concept/activity type |
| LES-001 | Partial | dashboard shows continue, mission-like counts, lessons and hubs | weak skills, recent items, real due state and non-hard-coded progress |
| LES-002 | Partial | lesson rail has representative overview and topic stages | required Overview/Learn/Listen/Practise/Check/Review contract, 24 canonical activities and two-minute summaries |
| LES-003 | Partial | overview shows goals and rough content descriptions | validated source-priority counts, estimated time, skill progress and required extras |
| LES-004 | Missing | stage is component-local state | stable activity IDs, URLs and persisted resume pointer |
| LES-005 | Partial | hub buttons and vocabulary Lesson 2 footer exist | every canonical object must expose all lesson/activity backlinks |
| VOC-001 | Partial | profession detail has article, four forms, meaning and audio | generic typed nouns, pattern metadata, examples, assertions and review state |
| VOC-002 | Proven | all 48 teacher rows store independent masculine/feminine singular/plural forms | German human review remains a publication gate, not a schema gap |
| VOC-003 | Partial | detail and puzzle mention stem change/regular suffix; semantic styling exists | explicit machine-readable change operations and representative irregular plural renderers |
| VOC-004 | Partial | cards, article choice and word puzzle exist | image→German, audio→word, plural formation, typing and spoken-repeat templates |
| VOC-005 | Partial | 48 rows render and category/search filters exist | explicit Teacher extra filter, verified semantic grouping and canonical deduplication with core professions |
| VER-001 | Partial | verb hub shows paradigms/patterns and audio | uses, separability/reflexivity fields, examples, source links and review templates |
| VER-002 | Partial | regular/irregular/spelling labels and CSS exist | consistent ending/stem operation model across lesson, hub and games |
| VER-003 | Proven | compact bundle contains the required ten unique verbs across Lessons 1–2 | assertion-level provenance and German review still apply |
| GRM-001 | Partial | grammar hub has visual rule, examples and notes | guided manipulation, recall and contextual-use activity records |
| GRM-002 | Partial | grammar list names the required Lesson 1–2 topics | full examples, constraints, relations, activities and acceptance coverage for each concept |
| PQA-001 | Partial | Q&A records have stable IDs in lesson JSON and a separate hub | PhrasePattern and Dialogue records remain absent/incomplete |
| PQA-002 | Partial | Q&A has register, question, answer arrays and audio resolution | intents, slots, accepted variants, grammar links and conversation-use relations |
| PQA-003 | Partial | greetings, name, origin, wellbeing, age, residence and occupation exist | identity/family/relationship patterns need canonical first-class records and source assertions |
| PQA-004 | Partial | sample page supports model, word construction, audio and recording | data-driven guided choice, substitutions and independent role-play progression for all patterns |
| AUD-001 | Partial | 327/327 cached assets pass exact manifest/disk, SHA-256, codec, sample-rate, channel and duration checks in `media/qa/alpha-tts-technical-audit.json`; current compact content coverage includes all teacher-profession forms | canonical publication-manifest coverage diff plus qualified German listening approval for all candidate clips |
| AUD-002 | Proven | shared audio controller supports prompt gesture playback, repeat, 0.8 study speed, pitch preservation and error state | preserve in production implementation |
| AUD-003 | Proven | generated manifest and source workbook map are separate; UI labels rights-gated source lane | preserve metadata/UI distinction |
| AUD-004 | Proven | 15 tracks mapped by filename/exercise/transcript and tested; public MP3 leakage test exists | use only after rights basis or keep gated |
| AUD-005 | Partial | recorder supports permission, record/stop/playback/retry and unmount cleanup | dedicated denial and permission/navigation race tests in the platform |
| AUD-006 | Proven | UI does not claim AI scoring; docs and decisions explicitly defer it | preserve feature gate |
| HUB-001 | Partial | Vocabulary, Verbs, Grammar, Phrases/Q&A and Listening exist; Review is separate | Concepts hub is missing and all hub routes must become canonical-data renderers |
| HUB-002 | Partial | vocabulary has learned toggle, text search and category | shared lesson/priority/category/mastery/tag/due filters across all six hubs |
| HUB-003 | Partial | Difficult flag exists | Favorite, Confusing, Teacher, Exam and personal note |
| REV-001 | Partial | review copy describes a mixed mission and shows mix counts | actual deck contains teacher vocabulary only; must generate real mixed attempts |
| REV-002 | Missing | only review count persists | event history, review-card state, scheduler contract and deterministic clock tests |
| REV-003 | Partial | flashcards, article sort and word puzzle exist | picture/word match, audio match, word order and verb builder |
| REV-004 | Partial | XP and streak UI/state exist | event-based reward policy proving mastery independence |
| DAT-001 | Partial | lessons, verbs, Q&A and teacher rows have IDs | all teachable objects need typed IDs and validated relationship vocabulary |
| DAT-002 | Missing | teacher rows carry only one source ID and candidate status; lesson fields use file/page summaries | field-level assertions with location, extraction method, confidence and validation state |
| DAT-003 | Missing | core and teacher professions are duplicated in separate shapes | canonical deduplication and multi-source links |
| DAT-004 | Partial | current bundle is scoped and tested | ingestion/publication firewall with invalid Lesson 3+/A1.2 fixtures |
| DAT-005 | Partial | content/media integrity tests exist | schema validation and publication manifests must be CI build prerequisites |
| UX-001 | Proven | browser smoke passes 1440×1000, 820×1080 and 390×844 with overflow assertions | add required 360×800 release baseline |
| UX-002 | Partial | semantic controls, labels and reduced-motion CSS exist | automated axe-equivalent gate plus complete keyboard/screen-reader journeys |
| UX-003 | Proven | gender colors include M/F/PL labels and text | preserve across generated infographic families |
| UX-004 | Partial | generated audio is local static media; app is local-first | service-worker/cache/download policy and offline E2E |
| UX-005 | Partial | vocabulary text search works | typed global search with lesson, priority, mastery and matched-field metadata |
| UX-006 | Partial | history-backed hub/deep vocabulary URLs exist | back-context object across lesson, hub, review and search plus E2E |

## Gate-level audit

| Acceptance gate | Current verdict | Evidence weakness |
|---|---|---|
| Source/content | RED | compact tuples are not assertion-level canonical objects; many candidate German forms still need human review |
| Media | PARTIAL | manifest and rights separation are strong; per-object coverage diff, visual assets and human audio QA are missing |
| Learning behavior | RED | no mastery dimensions, scheduler, stable activity resume or real mixed mission |
| Functional journeys | RED | current E2E covers a representative dashboard/vocabulary/listening/review slice, not the 12 required journeys |
| Accessibility | PARTIAL | responsive/reduced-motion semantics exist; no full automated/manual accessibility evidence |
| Responsive/visual | PARTIAL | current routes pass three sizes; 360×800 and every required screen family are not covered |
| Engineering | PARTIAL | lint/build/render/content/E2E pass for the sample; clean `platform/`, schemas and production release bundle do not yet exist |
| German/audio owner review | BLOCKED | no qualified German sign-off or two-pass audio QA record exists |
| Publisher media rights | BLOCKED | `redistributionBasis` remains unset; private lane must remain private |

## Immediate build order

1. Freeze this matrix and source inventory as G0 evidence.
2. Publish typed canonical Lessons 1–2 content with assertions and explicit gaps.
3. Build the generic content/learning engine and only then migrate the approved sample UI into `platform/`.
4. Implement lesson activity routes, six hubs, search, seven games and multidimensional review.
5. Have Codex generate missing visual/audio assets from manifests.
6. Run the complete release matrix; do not rename the sample “finished Alpha” before it passes.

## Change history

- 2026-08-07: initial evidence-based matrix created from current docs, content JSON, application source and test suites.
