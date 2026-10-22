# Wortwerk build spec (for a coding agent)

The full specification, build plan, tests, gates and deployment steps for Wortwerk. A short prompt that points here is in [wortwerk-prompts.md](wortwerk-prompts.md). The text below is addressed to the coding agent.

> **Parallel lanes (ADR-019):** Lane 2 implements this spec. Phase 0 belongs to Lane 1. §1.9 Class mode B and Phase 7, plus the teacher side of §1.8, belong to Lane 3. Persistence must follow `docs/lanes/CONTRACTS.md` §4 (sync stores). See `docs/lanes/lane-2-game.md` for the exact split. Class mode B is **approved** (ADR-018) and built by Lane 3.

---

You are implementing Wortwerk v2 in the German Learning OS repository (Hrezaii95/german-learning-exam). Wortwerk is an all-skills learning game (vocabulary, grammar, listening, speaking, reading, writing, exam practice) built as a DATA-DRIVEN ENGINE. New levels (A2–C2) or new languages must be addable as content packs with ZERO code changes. Work as the repository's orchestrator, under its own rules.

## 0 · Read first, in this order
1. `CLAUDE.md` and everything it lists (takeover handoff, operating model, org chart, PLAN-BATON, register, docs/INDEX.md). Acquire the plan baton before writing code; release it when done.
2. `docs/games/competitive-analysis-book-companion.md` (book-aligned scope, page rule, lesson loop, Class mode, platform phases) and `docs/games/wortwerk-v2-engine-and-engagement.md`: together the AUTHORITATIVE design (engagement guard-rails, the 10 mechanics, the game catalogue, the content-pack architecture). Background: `docs/games/master-game-design.md` and `docs/games/plural-vocab-game-ideas.md`.
3. `docs/audit/README.md`, `docs/audit/ux-design-consistency-audit.md` §1 (reference design rules) and `docs/audit/ia-and-codebase-audit.md` §4 (data duplicates).
4. `docs/10-review-and-gamification.md`, `docs/07-content-model-and-schemas.md`, `docs/09-audio-and-pronunciation.md`.
5. Existing code to build on, not duplicate:
   - Content model and validation: `platform/packages/content/src/{types,validation,publication,cli}`. Note: `common.ts` hard-codes `CefrLevel = "A1"` and the German `Gender`/`Article`; `AnswerSpec`, `StructuredPrompt`, `GrammarConcept`, `Dialogue` and `Lexeme` already exist.
   - Learning engine: `platform/packages/learning/src/{review,mastery,rewards,persistence}`, especially `review/alpha-scheduler.ts` and `review/mission.ts`.
   - Web: `platform/apps/web/lib/study/subject-sheets.server.ts` (`loadSubjectVocabulary()`), `lib/study/plural-patterns.ts`, `components/study/SubjectIllustration.tsx`, `components/games/*`, `lib/games/*`, `lib/learner-state/*`, `lib/study/backup.ts`, `lib/audio/*`, `lib/recorder/*`, `components/shell/*`.
   Base branch: `codex/live-alpha`. Pull it fresh first.

## 1 · Architecture (the reuse requirement)

### 1.1 Separation
- CODE holds only: the 10 interaction mechanics, task templates, the session/scheduler logic, progress and engagement rules, rendering.
- DATA holds everything about a language or a level: items, grammar drills, maps, stories, exam definitions, difficulty knobs, UI labels for grammar terms, audio and illustrations.
- No component, template or test may branch on a level id, pack id or German string. CI enforces this with a grep test over `components/wortwerk`, `lib/wortwerk` and `packages/wortwerk` for `"A1"|"B2"|"der"|"die"|"das"|"Akkusativ"` and similar literals outside fixtures.

### 1.2 Content layout (under `platform/content/`; the repo-root `content/` is a different, existing folder)
```
platform/content/languages/<lang>.json      # language profile
platform/content/difficulty/<CEFR>.json     # difficulty knobs per level
platform/content/packs/<pack-id>/pack.json  # manifest
platform/content/packs/<pack-id>/items/*.json|csv
platform/content/packs/<pack-id>/drills/*.json
platform/content/packs/<pack-id>/story.json, exam.json
platform/content/packs/<pack-id>/media/{audio,illustrations}/…
```
- **Language profile:** articles and genders mapped to design tokens, plural pattern ids and labels, cases, prepositions by case, separable prefixes, helper keys, normalisation rules (ß/ss, ae→ä as a hint-level match), TTS voice ids, grammar UI labels.
- **Difficulty profile:** options count, timer seconds, audio speed range, hints allowed, max passage length, distractor closeness, typed-answer ratio.
- **Pack manifest:** id, language, cefr, title, units [{id, title, canDo[]}], maps [{id, title, rows: field path, cols: field path}], difficulty, story, exam, review status.

### 1.3 Item types (TypeScript types and JSON Schema in `packages/content`; reuse the existing types where they fit)
| Type | Required fields | Optional fields that enable more games |
|---|---|---|
| lexeme | id, lemma, pos, meaning | gender, forms {plural[], comparative, participle, …}, examples[], tags, audio, image, frequencyRank |
| grammarPoint | id, title, explanation, examples[] | drills[] |
| drill | id, grammarPoint, type (sort/gap/order/transform/errorHunt/build), prompt, answer (AnswerSpec) | buckets[], distractors[], audio |
| sentence | id, text, translation | tokens[], grammarTags[], audio |
| dialogue | id, turns [{speaker, text}] | audio per turn, questions[] |
| text | id, title, body | questions[] (TF/NG, multiple choice), glossary |
| speakingPrompt / writingPrompt | id, prompt | checklist[], modelAnswers[], image, audio |
| examTask | id, section, timing, itemRefs[] | instructions, scoring |

### 1.4 Task templates and capability detection
- Each template declares `id`, `skill`, `mechanic`, a `requires` predicate over item fields, `params(difficulty)`, `generate(item, pool, rng)` and `grade(answer)`.
- At build time, the engine computes for every item which templates it supports and writes a **capability index** per pack. The UI shows only games that have enough eligible items (minimum set per template, e.g. 8).
- Distractors come first from the same map cell, then the same unit, then the same tags. Two equally correct options are never offered (check every form variant). Generated wrong forms must never exist as real forms in the pack.
- Grading: NFC normalisation, language-profile normalisation, typed answers case-sensitive for nouns, "almost" (hint-level) matches allowed.

### 1.5 The 10 mechanics (`components/wortwerk/mechanics/*`, one component each)
Corners, Sort, Build, Order, Gap, Match, Hotspot, Listen (wrapper), Record, Write.
- Each supports drag, tap and keyboard; uses 44 px targets; announces results through aria-live; respects reduced motion.

### 1.6 Game catalogue (templates on top of the mechanics)
- Vocabulary: Four Corners (meaning, reverse, gender, plural pattern, plural form), Memory Match, Word Forge, Collocation Corners, Synonym Sort.
- Grammar: Case Sort, Preposition Lanes, Verb Forge, Satzbau, Transform, Ending Snap, Error Hunt, Connector Chain.
- Listening: Hear & Pick, Dictation, Minimal Pairs, Dialogue Detective, Speed Ladder.
- Speaking: Echo, Answer Back, Picture Talk, Read Aloud. Self-rating and an optional browser speech-to-text transcript ONLY where the API exists; never a score.
- Reading: Quick Read, Tap-to-Learn (saves to the personal deck), Paragraph Order, Headline Match.
- Writing: Message Reply (checklist + model answers + self-check), Sentence Builder → typed, Gap Writer.
- Exam: Exam Simulation from `exam.json` (sections, timing, item refs).

### 1.6b No-giveaway rule (blocking for every task template)
- Every task has two render states: `question` and `feedback`. Each template declares `testedDimensions` (meaning, gender, plural, form, order, listening, …) and `revealFields`, the fields that must stay hidden until the learner answers.
- In the `question` state, the prompt must not leak a tested dimension:
  - Illustrations render with `tone="neutral"` (ink colour), never with a gender tone.
  - Gender tasks show the bare noun: no article, no gender class or colour, no plural.
  - Meaning tasks show the German word and audio WITHOUT the illustration; pictures may only be answer options.
  - Plural tasks render no ending or umlaut highlight chips in the prompt or the options.
  - Listening tasks render no text labels or captions on picture options until after the answer.
  - Order and gap tasks render all slots identically (no glow or marker on the verb slot).
- Answer options are visually identical (same component, size, colour and border) and shuffled with the seeded RNG. The correct option must never come first more often than chance (test this across 1,000 generated tasks).
- `aria-label`s, `title` attributes, `alt` text, data attributes and CSS classes in the question state must not contain the answer: no `subject-tone-male`, no "der Stuhl" in the alt text of a gender task, and so on.
- The reveal happens only in `feedback`: tone colour, article, highlight chips, labels, then audio.

### 1.7 Book-aligned scope (core: the product is a companion to the learner's coursebook)
- **bookRef on every item:** `{book, lesson, page?, exercise?}`. Pack units map to book lessons with page ranges.
- **Book position:** `{book, lesson, page}` per learner. It is set once, then advances on a one-tap confirmation when the learner opens a later interactive-book page or finishes a lesson's activities. In a class, the class position is the default.
- **One scope model for the whole app:** Daily Run, every game, maps, cheat sheets, review and printing all use it.
  - Modes: up-to-position (default), one lesson, several lessons, up to a lesson, topics (tags), teacher assignment, smart sets (tricky, due, teacher extras).
  - Filters combine (lessons × topics × sources).
  - Extend the existing `apps/web/lib/study/scope.ts` (it already supports `one / multiple / through` lessons, concepts and sources); do not create a second scope system.
  - Progress is stored per item, so changing the scope never loses data.
- **Page rule:**
  - Items in earlier lessons are in scope.
  - Items in the current lesson are in scope if `page ≤ position.page`.
  - Current-lesson items without a page ref are in scope only once the lesson is done, or with "include the whole current lesson" on.
  - Teacher extras use the lesson and page the teacher attached.
- **Lesson loop:** "Preview next lesson" (5 min), "Practise today's pages", a lesson boss that unlocks the lesson badge, and a Daily Run over everything up to the position.
- **Cheat-sheet integration:** every result and token links to its cheat-sheet card; each sheet has "Play this sheet", which uses the sheet's filters as the scope; print the current scope.
- **Data task:** page refs exist only for Lessons 1–2 and the interactive book. Add `bookRef.page` for Lessons 3–12 as a content task (owner-reviewed), never by guessing.

### 1.8 Class mode, phase A (no backend; fits the static site)
- **Assignment links:** the teacher builds a scope (lessons, pages, tags, skills, item count, due date) and gets a URL and QR code. The scope is encoded in the URL (versioned and compact). Opening it adds a task to the student's Today screen.
- **Completion receipts:** a short result code with per-skill scores and a checksum (to catch typing mistakes, NOT a security feature; say so in the UI). The teacher pastes codes into a receipts page that tabulates them and exports CSV.
- **Teacher and personal extras:** CSV or paste import (German, English, lesson, page, tags, optional gender/plural), validated, previewed, stored locally and exportable as a mini content pack file that the teacher can share with students.
- **Asynchronous challenge links:** "Beat my Blitz score on Lektion 5".

### 1.9 Class mode, phase B (needs a backend; APPROVED in ADR-018; built by Lane 3, not Lane 2)
- Accounts and sync, class position, teacher dashboard, live class game (projector + join code), a feedback inbox for writing and speaking, class and friend streaks, web push.
- Approved by the owner on 2026-10-22 (ADR-018, SO-003). Backend: Cloudflare Workers + D1 (+ Durable Objects later) at german.learnilabs.com. Design: `docs/platform/infrastructure-and-accounts.md` and `docs/platform/dashboards.md`. Implementation: Lane 3.
- Privacy: teacher-owned classes, minimal data, GDPR-ready deletion, suitable for minors.

## 2 · Engagement spec (with guard-rails)
- **Sessions:**
  - Daily Run: 5–7 min, built by extending `mission.ts`, interleaving skills, with at most 2 consecutive tasks of the same template.
    - **Adaptive task choice:** the scheduler picks the item, then the item's weakest or most overdue *dimension* (§ Progress) picks the template. Someone who knows *Buch* but forgets *Bücher* gets a plural task, not another meaning question.
    - **Personal preview:** before starting, show what the run contains and why, e.g. "5 new · 8 reviews · 3 tricky plurals · finishes 'At home'".
    - **Mistake comeback:** a missed task returns 3–6 cards later in a *different format* that tests the same dimension (a missed plural pattern comes back as Forge). Getting it right then shows a small "You fixed this" moment and counts as a corrected error.
    - **Finite finisher:** if misses remain, offer an optional "Fix these N words · ~45 s" at the end.
  - Quick review (1 min, at least 5 answers): the busy-day option. It is enough to keep the streak (see Habit).
  - Free Play by skill, map cell, unit or pack.
  - Boss battle at the end of each unit (mixed skills, 3 strikes).
  - Blitz (60 s, 3 strikes, ghost of your personal best). Personal bests are stored per scope + difficulty, so the ghost only compares like with like.
  - Tagesrätsel: 6 items chosen by a hash of the local date, the same for everyone; share grid 🟦🟥🟩⬜.
  - Strikes exist ONLY in Boss and Blitz.
- **Progress:**
  - **Per-dimension word progress** (replaces a single level per item):
    - Each item has one segment per *dimension* it supports, derived from its capabilities (noun: Meaning · Gender · Plural · Listening; verb: Meaning · Forms · Listening; sentence: Order · Listening; and so on). This is data-driven, so new packs get the right segments automatically.
    - Each segment goes New → Learning → **Secured**. Secured needs correct *recall* (not recognition) on at least 2 different calendar days.
    - A secured milestone is **permanent**. When the scheduler says a segment is due, or a review is missed, the token shows a subtle "due" dot instead of taking progress away. The skills radar and readiness meters use current recall strength, so they stay honest.
    - An item is **Complete** when all its segments are secured, and **Gold** when it is still recalled after 30+ days.
  - **Format ladder per segment:** recognition (4 options) → reduced cues (2 options, the missing ending only, or a partial word) → free recall (typed, Forge, no options). The ladder moves up as the segment strengthens and down after a miss. The illustration is offered as a hint in meaning tasks, and a hinted answer counts as hinted.
  - **Next milestone:** Today and the map always show the nearest achievable goal in the current scope, e.g. "die × -(e)n · 9 / 12 secured · 3 more to complete this pattern". Completing it unlocks the rule card and one short challenge with an unfamiliar word from the same pattern.
  - Per-skill levels and a skills radar.
  - CEFR journey with unit can-do statements.
  - Per-pack maps rendered from `pack.maps`.
  - "Words known" counter.
  - Weekly recap, plus a year-in-review stub.
- **Habit:**
  - **Streak and daily goal are separate.** The streak is kept by any Quick review or Run (one meaningful session) by local midnight, with a 03:00 grace. The daily goal ring (e.g. 1 full Run) is tracked on its own. Duolingo's A/B test of this separation reported +3.3% day-14 retention (blog: "Improving the streak"); our own effect is unproven.
  - Earned freezes: 1 per 7 days, hold 2.
  - 7-day check-in row; one optional reminder a day at a time the learner chooses.
    - **Platform limit:** a static web app cannot reliably schedule a notification without a push server; Chrome's Notification Triggers API has not shipped.
    - Phase A: offer "Add a daily reminder to my calendar" (a generated `.ics` file with a recurring event and the app link), plus in-app nudges.
    - Phase B (backend): web push, with the text taken from a real due item, e.g. "Remember the plural of Buch? Your review is ready." Never put the answer in the notification.
  - Exam countdown + a readiness meter per exam section.
  - An explicit "Done for today" state, and diminishing XP after 3 Runs a day.
- **Answer feedback (the reward happens at the moment of answering):**
  - A correct card snaps into its corner. On gender tasks, the neutral illustration turns into its gender colour.
  - In Forge, the umlaut dots settle and the ending tiles lock into the word.
  - When a word advances, its segment fills and the token visibly returns to the map.
  - An optional haptic tick uses `navigator.vibrate` where supported (Android browsers; iOS Safari does not support it), and optional sounds. Both are off when reduced motion is on, and every drag has a tap alternative.
- **Results screen:** lead with personal change, not just a score. For example: "You remembered 8 words from last week · You fixed Bücher and Äpfel · 3 words left to finish 'At home'". Then show "Back to map" and ONE purposeful optional challenge.
- **Learning metrics (private, on the device):** 7-day return, run completion and **1-week delayed recall** (accuracy on segments tested 7+ days after they were last seen). Show them to the learner in Progress. Aggregate A/B testing needs consent + a backend (Phase B) and is out of scope until approved.
- **Rewards:**
  - XP: retrieval 10, hinted 5, corrected error 5, listening 3, speaking cycle 3, writing submission 8, detective/boss 30.
  - Combo ×2 from 5 in a row, ×3 from 10.
  - A bonus round on about 1 in 5 Runs.
  - Collectible word cards with rarity from frequencyRank and difficulty.
  - Badges and titles from data (`pack.badges` or the language profile).
- **Story:** `story.json` chapters gated by unit mastery; scenes reuse dialogues and audio.
- **Investment:** personal deck (Tap-to-Learn, "Difficult" tag, mistakes ≥2 in 14 days), notes, own example sentences, goals.
- **Guard-rails:** nothing purchasable, no loss-shaming copy, no public leaderboard, no pronunciation score until gate G5, surprise rewards size-capped and never blocking.

## 3 · Persistence, routes and design
- **Persistence:** client-side only (static export). A versioned schema `wortwerk.v2` in the existing learner-state persistence, keyed by item id and pack id. Include it in `lib/study/backup.ts` export/import. Every storage call is wrapped in try/catch, with an in-memory fallback.
- **Routes:** fixed static routes `/play`, `/play/run`, `/play/journey`, `/play/skills`, `/play/map`, `/play/story`, `/play/blitz`, `/play/puzzle`, `/play/exam`, `/play/progress`, `/play/packs`, plus a dev-only `/play/preview` that lists every generated task for every item in a pack (excluded from the Pages export unless the env flag is set). Pass state through query strings and hashes.
- **Navigation:** add the Play entry to every navigation definition in `components/shell/*`, with identical labels. Link each cheat-sheet word to `/play/run?item=<id>` and each map token back to its cheat-sheet card.
- **Design:** follow audit §1 exactly. Article tones, chips, paper, ink and action colours are CSS custom properties defined once; add no new hex literals. Reuse `SubjectVocabularyVisual` and one audio button. Mobile-first at 360, 390 and 430 px, then 768 and 1280 px; no horizontal scroll; German text gets `lang="de"`, `overflow-wrap:break-word` and `hyphens:auto`.
- **Accessibility (blocking):** WCAG 2.2 AA; every drag has a tap and a keyboard path; colour is never the only signal; focus is managed between cards; no autoplay before the first user gesture; captions/text for every audio cue.
- **Audio:** use the existing manifest and files; generate no new TTS in this work. Show the "Preview voice" label until G5 passes.

## 4 · Build plan: one PR per phase, each shippable
- **Phase 0, data fixes:**
  - Merge the Lesson 4 rows into existing word families (no duplicate headwords: Bild, Million, Glück, nur, mal, neu, finden, kennen, ein/eine, kein/keine; see `lib/content/word-cards.ts:35`).
  - Correct USA to plural.
  - Fix the `/lessons/010–012/` 404s (zero-pad the lesson segment to two digits).
  - Add a test that `loadSubjectVocabulary()` has no duplicate headwords.
- **Phase 1, engine core:**
  - Widen `CefrLevel` to A1–C2; move German-specific types into the language profile.
  - Pack and language-profile JSON Schemas; pack loader, validator CLI (`npm run packs:validate`) and auto-registry (glob `platform/content/packs/*/pack.json`); capability index.
  - Migrate today's A1 content into `platform/content/packs/de-a1-momente` with no visible change to existing pages.
  - Corners mechanic + Four Corners templates, Daily Run, streak, check-in, map, results.
- **Phase 2, grammar + listening:** the Sort, Build, Order and Gap mechanics and the grammar and listening games in §1.6.
- **Phase 3, speaking, reading, writing:** the Record, Hotspot, Write and Match mechanics and their games.
- **Phase 4, engagement depth:** journey, story, collection, boss, Blitz, Tagesrätsel, quests, recap, exam countdown, readiness, exam simulation.
- **Phase 4b, book companion:** the scope picker and book position (§1.7), the page rule, auto-advance, the lesson loop, "Play this sheet", printing the current scope. Content task in parallel: `bookRef.page` for Lessons 3–12.
- **Phase 5, reuse proof:**
  - Add a real second pack (A2 or B1) by data only.
  - Add the CSV → JSON authoring CLI and the preview route.
  - The PR for that pack must contain ZERO changes outside `platform/content/`.
- **Phase 6, Class mode A:** assignment links + QR, Today assignment card, completion receipts + teacher receipts page, the CSV importer for teacher and personal extras, challenge links (§1.8).
- **Phase 7, Class mode B:** only after the owner's recorded approval and backend choice (§1.9).

## 5 · Tests
- **Unit tests (vitest):**
  - schema validation (good and bad fixtures);
  - capability detection;
  - every template's `generate` and `grade`, run across every fixture pack;
  - distractor rules;
  - NFC and language normalisation;
  - level transitions (later-day rule, lapses);
  - streak across midnight, the 03:00 grace and DST changes (Europe/Berlin, America/New_York);
  - freezes;
  - puzzle determinism;
  - diminishing XP;
  - persistence migration and the private-mode fallback;
  - the page rule (earlier lesson / same lesson before and after the page / no page ref / teacher extra);
  - scope combinations (lessons × topics × sources) matching the cheat-sheet filters exactly;
  - auto-advance of the position;
  - assignment-link encode/decode round trip, including old link versions;
  - receipt checksums;
  - CSV import validation (missing fields, duplicates, umlauts);
  - per-dimension progress: segments derived from capabilities, "secured" only after recall on 2 different days, milestones never removed, due dots set by the scheduler;
  - adaptive selection: the weakest or most overdue dimension picks the template;
  - format ladder up and down;
  - mistake comeback uses a different template for the same dimension within 3–6 cards;
  - streak kept by a Quick review while the goal ring stays incomplete;
  - Blitz bests keyed by scope + difficulty;
  - `.ics` reminder file validity (RFC 5545, recurring, local time zone);
  - on-device metrics (7-day return, completion, 1-week delayed recall) computed from fixture histories;
  - **no-giveaway:** for every template and fixture item, render the `question` state and assert that the DOM (text, `aria-*`, `alt`, `title`, `class`, `data-*`) contains none of the item's `revealFields` values, no gender tone class or colour token when gender is tested, and no highlight-chip class when the plural is tested; plus an option-position distribution test across 1,000 seeded tasks.
- **The zero-code reuse test:**
  - `tests/fixtures/packs/de-b2-sample` (~20 items covering every item type, with a fake `B2` difficulty) and `tests/fixtures/languages/xx.json` (a toy second language with two genders).
  - CI loads both and asserts that the expected games appear and are playable end to end.
  - Plus the hard-coded-literal grep test from §1.1.
- **Playwright e2e at 390×844 and 1280×900:**
  - a Daily Run by drag, by tap and by keyboard only;
  - one game per mechanic;
  - streak and levels persist after a reload;
  - backup round-trip;
  - reduced motion;
  - no horizontal scroll;
  - switching packs changes the content without a reload error.
- **Smoke and offline:** add every new route to `platform/apps/web/scripts/smoke-pages.mjs` and to the offline precache in `platform/apps/web/scripts/offline-export.ts`.

## 6 · Quality gates (all must pass before a PR is marked ready)
Run from `platform/`, ONE AT A TIME. Never run two builds, or a typecheck alongside a build: `build:pages` globally renames `proxy.ts`.
1. `npm run check`
2. `npm run packs:validate`
3. `npm run test:e2e`
4. `npm run build:web`, then `npm run smoke:web-routes`
5. `npm run gates:pages`
6. From the repo root: `node tools/audit-attribution.mjs`
7. `npm run audit:prod`

Never bypass the pre-commit hook. If it fires, restore `proxy.ts` and clean the build output.

## 7 · Content quality gate
- Every new or AI-drafted German string ships with review status `pending-german-review`.
- The pack is marked Reviewed only by the owner or a qualified reviewer.
- The UI shows the review status on `/play/packs`.
- Pending packs can be enabled for testing but are off by default.

## 8 · Git, PRs and deployment
- **Branches and integration:** follow `docs/lanes/README.md` (rules 3–6). Work on `lane2/main`; push after every item; take part in the `integration/all` step. **Never merge into `codex/live-alpha`.** The owner merges the single integration PR.
- **Deployment:**
  - GitHub Pages deploys automatically when the owner merges the integration PR.
  - Cloudflare goes live through Lane 3's one-click "Go live" workflow (`docs/platform/GO-LIVE.md`).
  - Don't edit workflows. Make `packs:validate` part of `npm run check`, so every pipeline runs it.
- **Verification:**
  - Before pushing the integration branch, run one Daily Run with Playwright at 390 px against the **local export** and save the screenshots to `research/release-evidence/wortwerk/`.
  - After go-live, the workflow's smoke test covers the live site.
- **Rollback:** revert the integration merge on `codex/live-alpha`. Old builds must ignore `wortwerk.v2` data safely; test this.

## 9 · Out of scope
- Purchases or currency.
- Public leaderboards.
- Pronunciation scoring.
- New TTS generation.
- Accounts, `/api`, sync transport and dashboards: approved, but owned by Lane 3, not this spec's lane.
- Rewriting existing cheat-sheet pages beyond the links.
- The wider design-system clean-up from the audit.

## 10 · Definition of done (per phase)
- All gates pass, locally and in CI.
- Screens match the reference design and the accessibility rules.
- The reuse tests are green.
- Screenshots are on the PR, and the live verification has passed after merge.
- The plan baton is updated and released, and `plans/full-alpha-register.csv` has a row per phase with evidence links.

Start with Phase 0. Before writing code, post a short plan (files, risks, any conflict with the repo's specs) and wait for the owner's go-ahead on conflicts.
