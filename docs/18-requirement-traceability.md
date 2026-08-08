# Requirement Traceability — Lessons 1–2 Alpha

Status: implementation contract  
Updated: 2026-08-07  
Purpose: give Cursor a single, lossless map from every MUST requirement to its UX surface, canonical data/engine contract and acceptance evidence.

## Rules

1. A packet may implement only requirements named in its brief.
2. A requirement is not complete until all three columns—UX, data/engine and evidence—exist.
3. A screenshot proves appearance only. It does not prove content coverage, mastery, persistence, accessibility or audio correctness.
4. Test IDs below are stable target IDs. Cursor must preserve them even if test files are reorganized.

## Traceability matrix

| Requirement | UX / route contract | Canonical data or engine contract | Required acceptance evidence |
|---|---|---|---|
| LRN-001 | lesson activity renderer and review session | `LearningActivity.phases[]`; typed attempts across eight loop phases | `LEARN-LOOP-01`: representative vocab, verb and Q&A traverse full loop |
| LRN-002 | `/lessons/01`, `/lessons/02`, `/hubs/*` | lesson prerequisites, unlock policy, hub index | `E2E-LESSON-SELECT-01`; `E2E-HUB-ENTRY-01` |
| LRN-003 | lesson/concept progress displays | `MasteryVector` with six dimensions | `ENGINE-MASTERY-01`; reload derivation test |
| LRN-004 | no UI shortcut to Mastered | mastery threshold policy and evidence reducer | `ENGINE-MASTERY-ANTI-LUCK-01` |
| LRN-005 | Alpha scope badge and honest empty/gap states | publication scope firewall | `CONTENT-SCOPE-01` rejects Lesson 3+/A1.2 fixtures |
| LRN-006 | authoring-independent lesson sections and hub cards | generic typed lesson attachments/relations | `CONTENT-ATTACH-01` adds each concept type without schema changes |
| LES-001 | `/` dashboard | derived dashboard selectors over learner events | `E2E-DASHBOARD-NEW-01`; `E2E-DASHBOARD-RETURN-01` |
| LES-002 | `/lessons/:lessonId`, stage/activity routes | `Lesson.stages`, summary activity, completion policy | `E2E-LESSON-01`; 12 activity IDs per lesson resolve |
| LES-003 | lesson overview | source-priority counts, estimate, skill progress, required extras | `LESSON-OVERVIEW-01` values equal manifest selectors |
| LES-004 | `/lessons/:lessonId/activities/:activityId` | persisted resume pointer and activity attempt state | `E2E-RESUME-01` reloads exact activity/step |
| LES-005 | relationship drawer and source-lesson chips | inverse lesson/activity relationships | `RELATIONS-BACKLINK-01` for every published hub item |
| VOC-001 | `/hubs/vocabulary`, `/vocabulary/:id` | typed noun/lexeme forms, pronunciation, assertions and review card | `CONTENT-NOUN-01`; `E2E-VOCAB-DETAIL-01` |
| VOC-002 | profession form switch/map | independent person/form lexemes plus derivation relationships | `CONTENT-PROFESSION-FORMS-01` covers all 48 rows |
| VOC-003 | morphology infographic and formation games | ordered morphology operations and plural patterns | `MORPHOLOGY-01` regular, umlaut, deletion and lexical-pair fixtures |
| VOC-004 | vocabulary practice launcher | seven vocabulary card templates and normalization rules | `GAME-VOCAB-TEMPLATES-01` |
| VOC-005 | Teacher extra collection/filter | `Collection` membership, categories, source priority | `CONTENT-TEACHER-48-01`; `E2E-TEACHER-FILTER-01` |
| VER-001 | `/hubs/verbs`, `/verbs/:id` | typed verb uses, full paradigm, patterns, examples, assertions and cards | `CONTENT-VERB-01`; `E2E-VERB-DETAIL-01` |
| VER-002 | verb stem/ending infographic and builder | ending/stem operations independent of gender tokens | `VERB-PATTERN-01` regular, spelling-adjusted and irregular fixtures |
| VER-003 | Lessons 1–2 verb filters | canonical IDs for ten required verbs with lesson assertions | `CONTENT-VERB-REQUIRED-01` exact ID set diff empty |
| GRM-001 | `/hubs/grammar`, `/grammar/:id` activity sequence | `GrammarConcept` model, contrast, examples, manipulations and relations | `GRAMMAR-LOOP-01` representative concepts complete all stages |
| GRM-002 | lesson and hub grammar filters | required grammar concept IDs and source assertions | `CONTENT-GRAMMAR-REQUIRED-01` exact ID set diff empty |
| PQA-001 | `/hubs/phrases`, phrase/Q&A detail | first-class `PhrasePattern`, `QAPair`, `Dialogue` | `CONTENT-PQA-TYPED-01` rejects embedded-only strings |
| PQA-002 | register/slot/related-grammar controls | intent, register, accepted patterns, slots and relations | `CONTENT-QA-CONTRACT-01`; `E2E-QA-SLOTS-01` |
| PQA-003 | Lesson 1–2 Phrases & Q&A filters | required communicative-intent ID set | `CONTENT-QA-REQUIRED-01` exact intent diff empty |
| PQA-004 | model → guided → substitution → construction → role-play | five-level conversation activity graph and attempt events | `E2E-CONVERSATION-LADDER-01` |
| AUD-001 | play controls or explicit unavailable state | media requirement resolver and asset/gap manifest | `MEDIA-COVERAGE-01` zero silent gaps |
| AUD-002 | shared audio controls | singleton controller, playback rate, pitch, preload/error state | `E2E-AUDIO-CONTROLLER-01`; latency sample report |
| AUD-003 | source/generated badges and detail | distinct `MediaAsset.origin` and rights fields | `MEDIA-ORIGIN-01`; public-bundle leakage scan |
| AUD-004 | workbook listening activities | track + transcript + exercise assertions | `CONTENT-LISTENING-MAP-01` exact 15 mapped records |
| AUD-005 | recorder component | permission-safe recorder state machine and cleanup events | `E2E-RECORDER-ALLOW-01`, `DENY-01`, `NAV-01` |
| AUD-006 | self-comparison language only | scoring feature flag defaults false | `UI-NO-SCORING-CLAIM-01` text and config scan |
| HUB-001 | `/hubs/vocabulary`, `/verbs`, `/grammar`, `/phrases`, `/listening`, `/concepts` | type indexes and shared hub query contract | `E2E-HUB-ROUTES-01` six-route set diff empty |
| HUB-002 | shared filter bar | `HubQuery` learned/scope/lesson/priority/category/mastery/tag/due fields | `HUB-FILTER-01` parameterized across six hubs |
| HUB-003 | object actions/notes | tag enum, personal note record and review-deck relation | `E2E-TAGS-NOTE-01`; persistence/export test |
| REV-001 | `/review` mixed mission | mission generator over due/weak dimensions and activity modalities | `ENGINE-MISSION-MIX-01`; `E2E-MISSION-01` |
| REV-002 | due labels and review resume | event history, scheduler adapter and review-card state | `ENGINE-SCHEDULER-01` deterministic clock; export/import equivalence |
| REV-003 | practice/game selector | seven required game renderers and typed attempts | `E2E-GAMES-01` exact game-mode diff empty |
| REV-004 | XP/streak/badges and mastery displays | reward reducer separate from mastery reducer | `ENGINE-REWARD-SEPARATION-01` |
| DAT-001 | developer coverage view | stable typed IDs and relationship validator | `CONTENT-ID-RELATION-01` zero duplicates/unresolved links |
| DAT-002 | source-detail drawer | field-level `SourceAssertion` with location/method/confidence/status | `CONTENT-PROVENANCE-01` 100% published-field coverage |
| DAT-003 | consolidated object pages with all source chips | canonical identity/alias rules and multi-source links | `CONTENT-DEDUPE-01` core/teacher overlaps resolve once |
| DAT-004 | no out-of-scope results | ingest and publish scope firewall | `CONTENT-SCOPE-01` plus bundle scan |
| DAT-005 | build refuses invalid manifests | JSON/schema validators in prebuild/CI | `CI-CONTENT-GATE-01` mutation fixtures fail |
| UX-001 | all primary routes at four target viewports | responsive primitives and overflow constraints | `E2E-RESPONSIVE-01` at 1440×1000, 820×1080, 390×844, 360×800 |
| UX-002 | keyboard/focus/labels/reduced motion | accessible component contracts and motion preference | `A11Y-AUTO-01`; `A11Y-KEYBOARD-01`; manual SR checklist |
| UX-003 | label/shape/text with every semantic color | semantic token metadata and renderer rules | `A11Y-COLOR-01` DOM and visual checks |
| UX-004 | offline status/download controls | scoped service-worker/cache manifest and offline adapter | `E2E-OFFLINE-01` core Lessons 1–2 plus cached audio |
| UX-005 | global search overlay/results | typed search document with lesson/priority/mastery/matched field | `SEARCH-01`; `E2E-SEARCH-01` |
| UX-006 | back action and restored filter/scroll context | serialized `NavigationContext` | `E2E-BACK-CONTEXT-01` from lesson, hub, review and search |

## Packet coverage

| Cursor packet | Requirement families |
|---|---|
| C0 schema and validation | DAT-001–005, LRN-005–006 |
| C1 publication bundle and indexes | VOC, VER, GRM, PQA, AUD-001/003/004, LES-003/005 |
| C2 event/mastery/review engine | LRN-001/003/004, REV-001/002/004 |
| C3 shell/routes/settings | LRN-002, LES-001, UX-001/002/006 |
| C4 lesson engine | LES-002/004, LRN-001, AUD-002/005/006 |
| C5 six hubs and search | HUB-001–003, UX-005/006 |
| C6 games and speaking | VOC-004, VER-002, GRM-001, PQA-004, REV-003, AUD-005 |
| C7 offline/export/progress | UX-004, LRN-003, REV-002, HUB-003 |
| C8 release hardening | every remaining evidence ID and cross-cutting acceptance gate |
| C9 Composer review | all requirements; no write authority |

## Change history

- 2026-08-07: created with all 49 MUST requirement IDs; automated ID-diff must remain empty.

