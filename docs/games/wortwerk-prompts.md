# Wortwerk v2 prompts

Two ready-to-paste prompts for the all-skills, content-pack version of the game ([wortwerk-v2-engine-and-engagement.md](wortwerk-v2-engine-and-engagement.md)), including the book-companion scope picker and Class mode from [competitive-analysis-book-companion.md](competitive-analysis-book-companion.md). The earlier vocabulary-only prompts are in this file's git history.

1. **Screens prompt**: for ChatGPT image generation, one screenshot per view and state.
2. **Spec, build and deploy prompt**: for a coding agent (Claude Code or Codex) working in this repository.

---

## Prompt 1: every screen as a separate screenshot

````
I'm designing "Wortwerk", a German learning game inside an app called "German Learning OS". It trains every skill (vocabulary, grammar, listening, speaking, reading, writing, exam practice) and works for every level from A1 to C2, because the content comes from swappable level packs. It is a companion to the coursebook the learner uses (here: Momente A1): learners choose content by lesson, by topic, up to a lesson, or up to a page, and teachers can assign work to a class. I need a SEPARATE mockup image for every screen below: 64 images in total.

HOW TO WORK
- Generate ONE image per reply, in the numbered order below. Put the number and name above it, e.g. "07 · Smart reminder".
- After each image, wait for me to type "next". If I type "redo", regenerate the same screen.
- Every image: mobile portrait 1024x1536, flat screenshot, no phone frame, no hands, no perspective.

SHARED STYLE (identical on every screen)
- A calm, premium learning app. Warm cream background #F3EFE8. Cards: off-white #FFFDF8, thin warm-grey border #E4DDD2, 16px rounded corners, very soft shadow.
- Text: deep green-black #203536. Bold, tight, modern sans-serif headings (like Inter Display Bold); regular sans-serif body; small-caps eyebrow labels in letter-spaced grey #596660.
- German gender colours always come with the article word, never colour alone: der = blue #245FA7, die = raspberry red #B82E4C, das = green #237149, plural = purple #8C4DAA.
- Skill colours (small icon chips only): Vocabulary teal, Grammar indigo, Listening amber, Speaking coral, Reading slate blue, Writing olive. Muted, never neon.
- Illustrations: simple single-colour outline icons (2px line, rounded caps, no fill, no gradient, no 3D, no faces) inside a soft pale circle.
- Highlights: changed endings sit in a butter-yellow chip #F8E1A1 with an amber underline #B27B19; umlaut vowels sit in a lavender chip #DFD6F2 with a violet underline #8760AF.
- Primary buttons: dark green #345D4C pills with white text. Secondary: off-white pills with a thin border.
- Icons: a small orange flame for the streak, a green spark for XP, a level badge like "A1" or "B2" in a small rounded square.
- Bottom tab bar on every screen: dark indigo #211A3D with five white line icons labelled Today, Journey, Practice, Review, Me. Highlight the relevant tab with a lavender pill.
- Mood: editorial, uncluttered, generous white space, like a printed study sheet that became interactive. No mascots, no confetti, no neon, no dark mode, no leaderboards, no shop, no gems.
- Spell all German text EXACTLY as written, including ä, ö, ü, ß.

SCREENS

A · Getting started
01 · Welcome: heading "Learn German one day at a time", three skill chips, buttons "I'm new" and "Find my level".
02 · Placement check: "Question 4 / 12", a sentence "Ich ___ gestern ins Kino gegangen." with four corner answers "bin", "habe", "war", "wurde", and a small level estimate "Currently: A2".
03 · Goals: heading "What's your goal?", option cards "Pass an exam" (selected) with a date picker "Goethe A1 · 14 Nov", "Minutes per day" choices "5 · 10 · 20", and a toggle "One gentle reminder a day".
04 · Level packs: heading "Your packs", cards "A1 · Momente" (active, 214 / 660 words), "A2 · Alltag", "B1 · Unterwegs", "B2 · Beruf und Gesellschaft", each with a level badge and progress, plus a card "More packs coming".

B · Today (daily habit)
05 · Today home: flame "🔥 12 days", a 7-dot week row, a goal ring "Daily Run 0 / 1", an exam card "Goethe A1 in 23 days · readiness 64%", a word of the day "die Brille → die Brillen" with a speaker, and a big button "Start Daily Run · 6 min" with a small link "Only 1 minute? Snack mode".
06 · Streak and freezes: a month calendar, "2 freezes saved", "Longest streak: 31 days", and the note "Earn a freeze every 7 days in a row".
07 · Smart reminder: a time "19:30", a preview notification "6 words are ready · exam in 23 days", and a toggle "Skip when I've already practised".
08 · Snack mode: a compact card "1-minute snack", 5 dots for progress, and one Four Corners card "der Tisch" with corners "table", "chair", "door", "window".
09 · Done for today: a calm card "Done for today ✓", "You remembered 18 words and finished 2 listening tasks.", buttons "Keep going (optional)" and "See you tomorrow".

C · Journey and progress
10 · CEFR journey: a vertical path of level nodes "A1 · A2 · B1 · B2 · C1 · C2" with A1 in progress. Units on A1: "Kennenlernen ✓", "Familie ✓", "Wohnen (current)", "Essen (locked)", and a can-do card "I can describe my flat."
11 · Skill hub: six skill tiles "Vocabulary", "Grammar", "Listening", "Speaking", "Reading", "Writing", each with a small level bar and "next game" text.
12 · Map, A1 pack: heading "Gender × plural", a 3-column grid "der / die / das" × rows "-e", "-(e)n", "—", "Umlaut + -e", with round noun tokens at five fill levels.
13 · Map, B2 pack (the same component with other data): heading "Collocations", rows "treffen", "stellen", "nehmen" × columns "Arbeit", "Alltag", with tokens such as "eine Entscheidung treffen", "eine Frage stellen", "Rücksicht nehmen".
14 · Word detail: "der Stuhl → die Stühle" (ü lavender, e yellow), singular and plural speaker buttons, skill bars "Meaning · Gender · Plural · Listening", "Level 3 · Solid", "Next review: in 4 days".
15 · Weekly recap: "Your week in German", big numbers "312 words reviewed", "48 min listened", "6 / 7 days", a best moment "First C-level word: die Nachhaltigkeit", and a "Share card" button.
16 · Skills radar: a six-axis radar chart (Vocabulary, Grammar, Listening, Speaking, Reading, Writing) and the note "Separate skills, not one score".
17 · Collection: a grid of illustrated word cards with small rarity labels "common", "uncommon", "rare", "legendary" (rarity shown by border style, not by bright colours), and "142 / 660 collected".
18 · Badges and titles: round outline badges "Umlaut Master", "Dativ Detective", "7-day streak", "First dictation", with earned ones coloured and the rest grey with progress.

D · Vocabulary games
19 · Four Corners, meaning: progress "3 / 20", combo "×3"; a centre card with a chair outline, "der Stuhl" and a speaker, dragged toward a corner; corners "chair", "table", "door", "lamp".
20 · Gender corners: a centre card "Lampe" with a lamp outline; corners "der" (blue), "die" (raspberry red), "das" (green), "plural" (purple).
21 · Memory match: a 3×4 grid of face-down and face-up cards pairing German words and pictures ("der Apfel" ↔ apple, "das Buch" ↔ book), "Pairs 4 / 6".
22 · Word Forge: "das Buch" → tiles "die B ü ch e r", "ü" lavender, "er" yellow; shelves "Umlaut" and "Ending"; button "Check".
23 · Collocation corners (B2 badge): the centre card "eine Entscheidung ___"; corners "treffen", "machen", "tun", "geben".

E · Grammar games
24 · Case Sort: two buckets "Akkusativ" and "Dativ"; cards "den Mann", "dem Kind", "die Frau", "der Frau" being sorted; a hint line "Wen? → Akkusativ · Wem? → Dativ".
25 · Preposition Lanes: two lanes "Wohin? (+ Akk)" and "Wo? (+ Dat)"; sentence cards "Ich lege das Buch auf den Tisch." and "Das Buch liegt auf dem Tisch.".
26 · Satzbau (word order): the start "Ich bleibe zu Hause," and tiles "weil", "ich", "keine Zeit", "habe" to place in order; the verb slot at the end glows.
27 · Verb Forge: "arbeiten" with person chips "ich / du / er / wir"; building "du arbeit + est", the ending in a yellow chip.
28 · Transform (B2 badge): "Ich habe keine Zeit. Ich reise nicht." → a target frame "Wenn ich Zeit ___, ___ ich reisen." with answer chips "hätte", "würde", "habe", "werde".
29 · Error Hunt: the sentence "Gestern ich bin ins Kino gegangen." with the tapped words "ich bin" outlined, and feedback "Verb second: Gestern bin ich…".
30 · Ending Snap: "mit dem neu__ Auto" with ending chips "-e", "-en", "-er", "-es"; "-en" snapping in.

F · Listening games
31 · Hear & Pick: a large speaker card with no text and a "0.75×" toggle; corners showing one apple, three apples, one chair, three chairs.
32 · Dictation: a speaker card, a text field "die Äpf", helper keys "ä ö ü ß", button "Check".
33 · Minimal pairs: "Which one did you hear?", two cards "die Mutter" and "die Mütter" (ü lavender), a replay button.
34 · Dialogue Detective: a short transcript-hidden audio player "Bahnhofsdurchsage · 0:18", questions "Gleis?" with choices "3 · 7 · 13" and "Abfahrt?" with "8:15 · 8:50 · 18:15".
35 · Speed Ladder: one sentence card, three steps "0.8× ✓", "1× ✓", "1.2×" (current), and a waveform.

G · Speaking games
36 · Echo: the target "die Äpfel", a big record button with a pulsing ring, waveform rows "Model" and "You", buttons "✓ Close" and "↻ Again", a tiny label "Preview voice".
37 · Answer Back: an audio question bubble "Wie heißen Sie?", an 8-second countdown ring, a record button, and after it "Model answers: Ich heiße … · Mein Name ist …".
38 · Picture Talk: an outline illustration of a kitchen, a checklist "Who? ✓ · Where? ✓ · What are they doing? ○", a record button and "Self-check".

H · Reading games
39 · Quick Read: a short text "Liebe Anna, am Samstag mache ich eine Party…" and statements with "Richtig / Falsch / Steht nicht im Text" buttons.
40 · Tap-to-Learn: the same text with one tapped word "Einladung" showing a popover "die Einladung · invitation · + Save to my deck".
41 · Paragraph Order: four blocks of an email with drag handles, two already placed, numbered slots 1–4.

I · Writing games
42 · Message Reply: the prompt "Reply to Anna: say yes, ask what to bring, say when you arrive", a text field with a short German reply, a checklist with two items ticked, and a button "Show model answer".
43 · Sentence Builder → typed: a top row of used tiles, then a text field to type the full sentence "Am Wochenende besuche ich meine Eltern.", with the ending of "besuche" in a yellow chip as feedback.

J · Story and challenges
44 · Story map: "Ankommen in Berlin", chapters as illustrated outline scenes "1 Am Bahnhof ✓", "2 Die WG ✓", "3 Im Supermarkt (new)", "4 Beim Amt (locked: master unit 4)".
45 · Story scene: an outline scene of a supermarket, a dialogue bubble "Kann ich Ihnen helfen?", three reply choices "Ja, ich suche Äpfel.", "Nein, ich bin Äpfel.", "Ich habe Äpfel gesucht morgen.".
46 · Boss battle: "Unit boss · Wohnen", strikes "✕ ○ ○", mixed task icons (vocabulary, grammar, listening), the current card "Wo ist die Lampe?" with lane buckets "auf dem Tisch / auf den Tisch".
47 · Blitz: a 60-second timer bar, strikes "✕ ✕ ○", score "18", a ghost bar "Yesterday: 21", a card "das Kind" with corners "-e", "-er", "-s", "-(e)n".
48 · Tagesrätsel: "Tagesrätsel · 22 Oct · Same 6 words for everyone", six cards "Tisch", "Lampe", "Kind", "Apfel", "Lehrerin", "Auto", each with der/die/das buttons and a plural field.
49 · Exam simulation: "Goethe A1 · Hören · Teil 1", a section timer "12:40", question "1 / 6", an audio player and three picture choices.
50 · Readiness report: "Exam readiness 64%", bars per section "Hören 70% · Lesen 72% · Schreiben 51% · Sprechen 48%", and a recommendation card "Focus this week: Schreiben · Message Reply ×3".

K · Rewards and settings
51 · Run results with bonus: "Daily Run complete · 18 / 20", "🔥 13 days", "4 words levelled up", and a gently highlighted card "Bonus round unlocked: rare card chance", with a revealed rare card "die Sehenswürdigkeit".
52 · Pack settings: "Content packs", a list of installed packs with level badges and toggles, "Study scope: Lessons 1–6", a "German review status" label per pack ("Reviewed" or "Pending review"), and a button "Check for new packs".

L · Book companion
53 · Book position: heading "Where are you in Momente A1?", a lesson picker showing "Lektion 5" selected, a page stepper "Seite 62" with − and + buttons, a small book-cover outline, and a button "Save position".
54 · Scope picker (bottom sheet): mode options "Up to my position (L5 · p. 62)" (selected), "This lesson", "Pick lessons", "Up to a lesson", "Topics", "Teacher assignment", "My tricky words"; below them combinable chips "Topics: Food · Numbers" and "Sources: Course · Teacher extra", and a live count "312 items in scope".
55 · Position advance: a small card at the top of the interactive book "You opened page 64. Move your position to p. 64?" with buttons "Move" and "Not now".
56 · Lesson loop on Today: three stacked cards "Before class · Preview Lektion 6 · 5 min", "After class · Practise p. 58–62", "Lesson boss · Lektion 5 (locked until 80% mastered)".
57 · Play this sheet: the top of an illustrated cheat sheet "Food & ordering" with its filters ("Lessons 1–5", "Nouns") and a prominent button "Play this sheet · 48 items".

M · Class mode
58 · Teacher, create assignment: heading "New assignment", fields "Class: A1 Abendkurs", scope chips "Lektion 5 · p. 58–62", "Dativ", skills checkboxes "Vocabulary ✓ Grammar ✓ Listening ✓", "20 items", "Due: Fri 24 Oct", and a large QR code with a "Copy link" button.
59 · Student, assignment on Today: a card "Homework from Frau Weber · due Fri", progress "8 / 20", and a button "Continue".
60 · Completion receipt: "Assignment done", per-skill results "Vocabulary 18/20 · Grammar 7/8 · Listening 5/6", a short result code "K7Q-4M2-WX9" and buttons "Copy code" and "Share".
61 · Teacher dashboard: a table of students × skills with soft colour cells, a "Tricky words this week" list ("der Schlüssel", "die Mütter", "das Café"), and "3 students behind position".
62 · Live class game (projector, landscape 1536x1024 for this one only): a big Four Corners card "die Lampe" with corners "der / die / das / plural", a join code "Join: 482 913", team bars "Team Blau 12 · Team Grün 10", and a 15-second timer.
63 · Student joins live game: a code entry "482 913", a name field, team choice "Blau / Grün", and a button "Join".
64 · Teacher extras import: a pasted table preview with columns "German · English · Lesson · Page · Tags" and rows like "die Fachärztin · specialist (f) · 2 · 27 · people", validation ticks per row, and a button "Add 48 words as Teacher extra".

Start with 01.
````

---

## Prompt 2: specification, build and deployment

````
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

### 1.2 Content layout (repo root)
```
content/languages/<lang>.json      # language profile
content/difficulty/<CEFR>.json     # difficulty knobs per level
content/packs/<pack-id>/pack.json  # manifest
content/packs/<pack-id>/items/*.json|csv
content/packs/<pack-id>/drills/*.json
content/packs/<pack-id>/story.json, exam.json
content/packs/<pack-id>/media/{audio,illustrations}/…
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

### 1.9 Class mode, phase B (needs a backend; BLOCKED until the owner approves)
- Accounts and sync, class position, teacher dashboard, live class game (projector + join code), a feedback inbox for writing and speaking, class and friend streaks, web push.
- These are listed as deferred in `docs/02-product-requirements.md`. Do not start them until the owner approves the change and it is recorded under `scope_overrides` in `config/claude-codex-operating-model.yaml`, together with the backend choice. The repo's unused Cloudflare worker stub (`apps/web/worker/index.ts`) suggests Workers + D1 + Durable Objects; Supabase is the alternative.
- Privacy: teacher-owned classes, minimal data, GDPR-ready deletion, suitable for minors.

## 2 · Engagement spec (with guard-rails)
- **Sessions:**
  - Daily Run: 5–7 min, built by extending `mission.ts`, interleaving skills, with at most 2 consecutive tasks of the same template.
  - Snack mode (1 min).
  - Free Play by skill, map cell, unit or pack.
  - Boss battle at the end of each unit (mixed skills, 3 strikes).
  - Blitz (60 s, 3 strikes, ghost of your personal best).
  - Tagesrätsel: 6 items chosen by a hash of the local date, the same for everyone; share grid 🟦🟥🟩⬜.
  - Strikes exist ONLY in Boss and Blitz.
- **Progress:**
  - Item levels 0–5. Reaching level 3+ requires correct recall on a later calendar day; a lapse drops one level, never below 1.
  - Per-skill levels and a skills radar.
  - CEFR journey with unit can-do statements.
  - Per-pack maps rendered from `pack.maps`.
  - "Words known" counter.
  - Weekly recap, plus a year-in-review stub.
- **Habit:**
  - Streak (goal met by local midnight, 03:00 grace).
  - Earned freezes: 1 per 7 days, hold 2.
  - 7-day check-in row; one optional reminder a day.
  - Exam countdown + a readiness meter per exam section.
  - An explicit "Done for today" state, and diminishing XP after 3 Runs a day.
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
  - Pack and language-profile JSON Schemas; pack loader, validator CLI (`npm run packs:validate`) and auto-registry (glob `content/packs/*/pack.json`); capability index.
  - Migrate today's A1 content into `content/packs/de-a1-momente` with no visible change to existing pages.
  - Corners mechanic + Four Corners templates, Daily Run, streak, check-in, map, results.
- **Phase 2, grammar + listening:** the Sort, Build, Order and Gap mechanics and the grammar and listening games in §1.6.
- **Phase 3, speaking, reading, writing:** the Record, Hotspot, Write and Match mechanics and their games.
- **Phase 4, engagement depth:** journey, story, collection, boss, Blitz, Tagesrätsel, quests, recap, exam countdown, readiness, exam simulation.
- **Phase 4b, book companion:** the scope picker and book position (§1.7), the page rule, auto-advance, the lesson loop, "Play this sheet", printing the current scope. Content task in parallel: `bookRef.page` for Lessons 3–12.
- **Phase 5, reuse proof:**
  - Add a real second pack (A2 or B1) by data only.
  - Add the CSV → JSON authoring CLI and the preview route.
  - The PR for that pack must contain ZERO changes outside `content/`.
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
  - CSV import validation (missing fields, duplicates, umlauts).
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
- Branch per phase from fresh `codex/live-alpha`: `feat/wortwerk-v2-phase-N`. Commit in small steps.
- Open a **draft PR into `codex/live-alpha`** listing:
  - what shipped;
  - mobile and desktop screenshots of each new screen;
  - gate output;
  - anything deferred.
  Mark it ready only when all gates pass. Never push directly to `codex/live-alpha`, and never merge without the owner's approval.
- **Deployment is automatic:** `.github/workflows/deploy-pages.yml` runs on every push to `codex/live-alpha` (`npm ci` → `check` → `build:web` → `audit:prod` → smokes → `build:pages` → `smoke:pages` → word-card audit → Pages deploy). Add `packs:validate` to that workflow in Phase 1.
- After each deploy, verify https://hrezaii95.github.io/german-learning-exam/:
  - `curl` every `/play/*` route and expect 200;
  - run a Daily Run with Playwright at 390 px against the live URL and save screenshots;
  - confirm the Play nav on desktop and mobile, and the cheat-sheet links.
  Post the results on the PR.
- **Rollback:** revert the merge commit on `codex/live-alpha` (this redeploys the previous version). Old builds must ignore `wortwerk.v2` data safely; test this.

## 9 · Out of scope
- Purchases or currency.
- Public leaderboards.
- Pronunciation scoring.
- New TTS generation.
- Accounts or a server backend (Class mode B waits for the owner's approval and backend choice).
- Rewriting existing cheat-sheet pages beyond the links.
- The wider design-system clean-up from the audit.

## 10 · Definition of done (per phase)
- All gates pass, locally and in CI.
- Screens match the reference design and the accessibility rules.
- The reuse tests are green.
- Screenshots are on the PR, and the live verification has passed after merge.
- The plan baton is updated and released, and `plans/full-alpha-register.csv` has a row per phase with evidence links.

Start with Phase 0. Before writing code, post a short plan (files, risks, any conflict with the repo's specs) and wait for the owner's go-ahead on conflicts.
````
