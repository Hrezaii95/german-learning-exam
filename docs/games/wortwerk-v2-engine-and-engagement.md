# Wortwerk v2: an all-skills game engine driven by content packs

v2 extends [master-game-design.md](master-game-design.md) in three directions:

1. **Stronger engagement:** habit, progress, story and reward loops at the level of top consumer apps, with guard-rails so they reward real learning rather than empty streak-keeping.
2. **Games for every skill:** vocabulary, grammar, listening, speaking, reading, writing, and exam practice.
3. **Data-driven reuse:** the engine knows nothing about A1 or about German. Adding A2, B1, B2, C1 or C2 (or another language) means dropping in a **content pack**, with no code change.

---

## 1. Engagement: designing a habit that teaches

The aim is a habit people come back to every day. Every loop below is tied to evidence of learning (correct recall on a later day, a completed listening task, a submitted reply), never to taps or time spent. A habit that rewards empty activity produces streak-farmers who stop learning, and it eventually burns them out.

### 1.1 The core loop (Hook model: trigger → action → variable reward → investment)

| Stage | What the learner meets |
|---|---|
| **Trigger** | one reminder at their chosen time (a calendar reminder at first; push notifications such as "6 words are ready · exam in 23 days" once there is a backend); the streak flame; the word of the day; a story cliffhanger |
| **Action** | one tap on **Start Daily Run**: 5–7 min, with a 1-minute **Snack** mode for busy days |
| **Variable reward** | level-ups on the map, a surprise **bonus round**, a collectible card (rarer for harder words), the next story chapter unlocking, a weekly recap |
| **Investment** | words saved from reading, a personal deck, own example sentences, chosen goals, an exam date, story progress, the collection: things that would be lost by leaving |

### 1.2 Feature set

| Area | Features | Inspired by |
|---|---|---|
| **Habit** | daily streak; earned freezes (1 per 7 days, hold 2); 7-day check-in row; one reminder (calendar `.ics` now, push with a backend); Snack mode; installable PWA that works offline | Duolingo, Headspace, Apple Fitness rings |
| **Goal and urgency** | an exam countdown with a **readiness meter** for each exam section; a daily minutes goal; "can-do" statements unlocked by unit ("I can order in a café") | Goethe/telc preparation apps, Babbel |
| **Visible progress** | the CEFR journey path A1 → C2; "You know 1,240 words"; a skills radar; per-pack maps; a weekly recap and year-in-review | Duolingo path, Strava, Spotify Wrapped |
| **Collection** | illustrated word cards with rarity (common, uncommon, rare, legendary, set by frequency and difficulty); pattern badges; titles ("Umlaut Master", "Dativ Detective") | Pokédex, Drops |
| **Story** | each pack ships a story (A1 "Ankommen in Berlin", B2 "Das neue Projekt"); chapters unlock as their units are mastered; scenes use the pack's dialogues and audio | Duolingo Stories, visual novels |
| **Challenge** | Blitz (60 s, 3 strikes); **boss battle** at the end of a unit (mixed skills, 3 strikes); Tagesrätsel daily puzzle with a share grid; exam simulation | arcade games, Wordle, test-prep apps |
| **Surprise** | a bonus round on about 1 in 5 Runs (double XP, a rare-card chance); occasional "Golden word" events | variable-ratio rewards, kept bounded |
| **Social (later, needs a backend)** | friend streaks, study buddy, shared weekly quest; until then, share cards for the puzzle, recap and level-ups with no backend | Duolingo friend quests, Strava kudos |

### 1.3 Guard-rails (non-negotiable)
- **Nothing can be bought.** No lives, gems or freezes for sale.
- **No loss-shaming.** A broken streak shows "longest streak" and a fresh start, never guilt copy.
- **A real "done for today" state.** Once the goal is met, the app says so. Extra play is optional and has diminishing XP after 3 Runs.
- **Levels follow learning.** Level-ups need correct recall on a later day; XP for hinted answers is reduced, not removed.
- **Bounded surprise rewards.** Their size is capped, they never block progress, and there is no gambling: no currency spend on random rewards.
- **No pronunciation score** until audio gate G5 passes. Speaking games use self-rating and an optional transcript.
- **No public leaderboards** (repo spec). Competition is against your own ghost, or against friends later as an opt-in.

---

### 1.4 Learning-quality upgrades (reviewed suggestions, adopted)
- **Progress per word, per dimension.** Instead of one level, a noun has Meaning · Gender · Plural · Listening segments. A segment is *secured* after correct recall on 2 different days; milestones are permanent, and a due dot shows when a review is needed.
- **Adaptive Daily Run.** The weakest dimension of each due item picks the game, and a personal preview explains the run.
- **Format ladder.** Options → fewer cues → typed or built recall, as each segment strengthens.
- **Mistake comeback.** A missed task returns later in another format; "You fixed this"; an optional "Fix these 2 words · 45 s".
- **Next milestone.** "die × -(e)n · 9 / 12 secured · 3 more" keeps a goal close at hand.
- **Streak ≠ daily goal.** A 1-minute Quick review keeps the streak (Duolingo reported +3.3% day-14 retention from this separation); the goal ring is separate.
- **Feedback at the moment of answering** (snap, colour reveal, segment fill, optional haptics on Android) and **personal results** ("You fixed Bücher and Äpfel").
- **Measure what matters**, privately on the device: 7-day return, run completion, 1-week delayed recall.

## 2. Games for every skill

All games are built from **10 reusable mechanics**. Each mechanic is a gesture or interaction engine, written once. A **game** is a mechanic plus a task template plus the content fields it needs. New games are mostly configuration.

| Mechanic | Gesture | Used by |
|---|---|---|
| **Corners** | drag a card to 1 of 4 corners | meaning, gender, plural, collocations, listening picks |
| **Sort** | drag cards into 2–6 labelled buckets | case, preposition, separable verbs, register (formal/informal) |
| **Build** | assemble tiles into a word | plural, conjugation, compounds, adjective endings |
| **Order** | reorder tokens or blocks | word order, paragraph order, dialogue order |
| **Gap** | choose or type into a blank | cloze, prepositions, connectors, endings |
| **Match** | pair cards (memory or two columns) | word ↔ meaning, question ↔ answer, headline ↔ paragraph |
| **Hotspot** | tap inside a text | error hunt, find the verb, tap unknown words |
| **Listen** | audio first, then any answer mechanic | dictation, minimal pairs, dialogue questions |
| **Record** | record, compare with the model, self-rate | echo, answer back, picture talk, read aloud |
| **Write** | free text + checklist + model answers | message reply, sentence writing, summary (C1+) |

### 2.0 No-giveaway rule (applies to every game)
A question screen must never reveal what it tests:
- Pictures on the prompt are drawn in neutral ink, never in a gender colour. A blue chair answers "der" before the learner thinks.
- Gender questions show the bare noun, without its article.
- Meaning questions show the word and audio, but not its picture; pictures can only be answer options.
- Plural, listening and word-order questions show no highlight chips, labels or glowing slots.
- All options look identical.

Gender colour, articles, highlights and labels are the **reward** shown in feedback. The build spec makes this a tested rule (§1.6b).

### 2.1 Game catalogue by skill

| Skill | Game | Mechanic | Example (level) |
|---|---|---|---|
| **Vocabulary** | Four Corners | Corners | der Stuhl → chair (A1) |
| | Memory Match | Match | 6 pairs, German ↔ picture (A1–A2) |
| | Word Forge | Build | Buch → Bücher (A1); Lehrer → Lehrerin (A1); Haus + Tür → Haustür (B1) |
| | Collocation Corners | Corners | eine Entscheidung ___ → treffen (B2) |
| | Synonym Sort | Sort | beginnen / anfangen / einleiten by register (C1) |
| **Grammar** | Case Sort | Sort | den Mann / dem Mann → Akkusativ / Dativ (A2) |
| | Preposition Lanes | Sort | Ich lege das Buch auf den Tisch (Wohin?) vs. Das Buch liegt auf dem Tisch (Wo?) (A2) |
| | Verb Forge | Build | ich arbeite, du arbeitest (A1); ich hätte gemacht (B2) |
| | Satzbau | Order | …, weil ich keine Zeit habe (B1) |
| | Transform | Gap / Write | Das Haus wurde 1990 gebaut (passive, B1) · Wenn ich Zeit hätte, würde ich reisen (Konjunktiv II, B2) |
| | Ending Snap | Build / Gap | mit dem neuen Auto (B1) |
| | Error Hunt | Hotspot | find the wrong ending or word order in a sentence (B1–C1) |
| | Connector Chain | Gap / Order | obwohl / trotzdem / deshalb (B1–B2) |
| **Listening** | Hear & Pick | Listen + Corners | one apple vs three apples (A1) |
| | Dictation | Listen + Write | die Äpfel (A1); full sentences (B1+) |
| | Minimal Pairs | Listen + Corners | Mutter / Mütter (A1); Bären / Beeren (A2) |
| | Dialogue Detective | Listen + Gap/Match | a station announcement → platform and time (A2–B1) |
| | Speed Ladder | Listen | the same clip at 0.8×, then 1×, then 1.2× (all levels) |
| **Speaking** | Echo | Record | shadow a word or sentence |
| | Answer Back | Listen + Record | "Wie heißen Sie?" → answer within 8 s, compare with model answers |
| | Picture Talk | Record + checklist | describe a picture: who, where, what (A2–B2) |
| | Read Aloud | Record | read a short passage; optional transcript |
| **Reading** | Quick Read | Gap / Corners | a passage + true / false / not given (A2–C1) |
| | Tap-to-Learn | Hotspot | tap unknown words → personal deck (investment) |
| | Paragraph Order | Order | put an email or article back in order (B1–C1) |
| | Headline Match | Match | headlines ↔ short news items (B1–B2) |
| **Writing** | Message Reply | Write | reply to an email with a checklist of required points (A2–C1) |
| | Sentence Builder | Order → Write | first with tiles, later typed |
| | Gap Writer | Gap | type the missing word in context |
| **Exam** | Exam Simulation | all of the above | sections and timing taken from the pack's exam definition (Goethe/telc style) |

---

## 3. Data-driven architecture: content packs

### 3.1 Principle
Code holds **mechanics and task templates**. Data holds **everything about language and level**. A template declares the item fields it needs. The engine looks at the items in a pack and turns on every game whose requirements are met. If a pack has no audio, its listening games simply don't appear; if it has grammar drills, the grammar games do.

### 3.2 Folder layout
```
content/
  languages/
    de.json                 # language profile
  packs/
    de-a1-momente/          # today's content, migrated
      pack.json
      items/lexemes.json    # or lexemes.csv
      items/grammar.json
      items/sentences.json
      items/dialogues.json
      items/texts.json
      items/prompts.json    # speaking + writing prompts
      drills/*.json         # authored grammar drills
      story.json
      exam.json
      media/audio/…, media/illustrations/…
    de-b2-beruf/            # a new level = a new folder, no code
```

### 3.3 Language profile (`languages/de.json`)
Holds everything that is specific to German:
- **articles and genders**, with display tokens (`der → tone-masc`, …);
- **plural pattern ids** and labels;
- **cases** and **prepositions by case**;
- **helper keys** (ä ö ü ß) and normalisation rules (ß ↔ ss, ae → ä as a hint-level match);
- **TTS voice ids** and the UI strings for grammar labels.

French or Spanish would be a new profile, and gender corners would adapt automatically (le/la, el/la).

### 3.4 Pack manifest (`pack.json`)
```json
{
  "id": "de-b2-beruf",
  "language": "de",
  "cefr": "B2",
  "title": "B2 · Beruf und Gesellschaft",
  "units": [{ "id": "u1", "title": "Bewerbung", "canDo": ["Ich kann ein Bewerbungsgespräch führen."] }],
  "maps": [{ "id": "colloc", "title": "Verb + noun collocations", "rows": "tags.verb", "cols": "tags.domain" }],
  "difficulty": "B2",
  "story": "story.json",
  "exam": "exam.json",
  "review": { "germanReview": "pending" }
}
```

### 3.5 Item types (validated by `packages/content`)
| Type | Key fields | Turns on |
|---|---|---|
| `lexeme` | pos, lemma, gender?, forms {plural, comparative, participle, …}, meaning, examples[], tags, audio?, image? | vocabulary games; gender and plural games when gender/forms exist; listening when audio exists |
| `grammarPoint` | id, title, explanation, examples[], drills[] | grammar games through the drill types |
| `drill` | type (sort / gap / order / transform / errorHunt / build), prompt, answer spec, distractors?, buckets? | the matching grammar game |
| `sentence` | text, translation, tokens, grammar tags, audio? | Satzbau, dictation, error hunt, gap |
| `dialogue` | turns (speaker, text, audio) | Dialogue Detective, Answer Back, story scenes |
| `text` | title, body, level, questions[] | Quick Read, Paragraph Order, Tap-to-Learn |
| `speakingPrompt` / `writingPrompt` | prompt, checklist[], modelAnswers[] | Picture Talk, Answer Back, Message Reply |
| `examTask` | section, timing, item refs | Exam Simulation |

These reuse the existing types (`Lexeme`, `GrammarConcept`, `Dialogue`, `AnswerSpec`, `StructuredPrompt`) wherever they fit.

### 3.6 Difficulty profiles (data, per CEFR level)
`difficulty/B2.json` sets the per-level knobs:
- options per question;
- timer;
- audio speed range;
- hints allowed;
- passage length;
- distractor closeness;
- how often typed answers replace multiple choice.

Templates read these knobs. A2 and C2 run on the same code.

### 3.7 What needs code once
1. Widen `CefrLevel` from `"A1"` to `A1–C2`. Move `Gender`/`Article` and the other German-specific types into the language profile.
2. Build the pack loader, schema validation and registry (`content/packs/*/pack.json` is found automatically at build time).
3. Build the 10 mechanics, the task templates and the capability detector.
4. Migrate today's A1 content into `de-a1-momente` with no visible change for learners.

After that, **adding a pack is data-only**:
1. Add the folder.
2. Run `npm run packs:validate`.
3. Review the German (packs start with status `pending-german-review`, as today).
4. Open a PR.

A CI test proves this: it loads a small fixture pack (`tests/fixtures/packs/de-b2-sample`, ~20 items across all item types) and checks that every expected game appears, **with no code referring to it**.

### 3.8 Content authoring
- A CSV template for each item type, converted to JSON by a CLI.
- A **pack preview** route that shows every generated task for every item, used to review a pack before release.
- AI-drafted content is allowed, but it ships only after German review. The existing `pending-german-review` state applies.

---

## 4. Phases (replace §8 of the master design)

| Phase | Ships |
|---|---|
| 0 | data fixes from the audit (duplicate headwords, 404s, USA gender) |
| 1 | **engine core**: pack format, language profile, loader + validation, the A1 pack migration, the Corners mechanic, Daily Run, streak, check-in, map, results |
| 2 | **grammar + listening**: Sort, Build, Order, Gap mechanics; Case Sort, Preposition Lanes, Verb Forge, Satzbau, Ending Snap; Hear & Pick, Dictation, Minimal Pairs, Dialogue Detective |
| 3 | **speaking, reading, writing**: Record, Hotspot, Write mechanics; Echo, Answer Back, Picture Talk, Quick Read, Tap-to-Learn, Paragraph Order, Message Reply |
| 4 | **engagement depth**: CEFR journey, story mode, collection cards, boss battles, Blitz, Tagesrätsel, quests, recap, exam countdown, readiness, exam simulation |
| 5 | **reuse proof**: a real A2 or B1 pack added with zero code changes, plus authoring CLI and preview |
