# Wortwerk: one master game for the plurals cheat sheet

This doc combines the five ideas in [plural-vocab-game-ideas.md](plural-vocab-game-ideas.md) into **one game**. It has one map, one daily session, and one shared drag gesture, and it borrows engagement mechanics from the best-known language and habit apps.

Data source: the same 660 gendered nouns, meanings, illustrations and audio as `/cheat-sheets/plurals/` (`loadSubjectVocabulary()`, `plural-patterns.ts`).

## 1. The big picture

```
            ┌─────────────── DAILY CHECK-IN ───────────────┐
            │ streak flame · today's goal · word of the day │
            └──────────────────────┬────────────────────────┘
                                   ▼
   ┌──────────── THE MAP (Grid Quest) ────────────┐
   │ der × die × das  ×  plural-pattern rows       │◄── every answer
   │ each noun = a token that fills as you master  │    updates the map
   └──────┬──────────────┬───────────────┬────────┘
          ▼              ▼               ▼
     DAILY RUN       FREE PLAY        CHALLENGES
   (5–7 min mix,   (any cell, any   (Blitz with 3 strikes,
    scheduler        station)         daily puzzle,
    picks words)                      weekly quests)
          │
          ▼
   STATIONS a word passes through, easy → hard:
   ① Four Corners: Meaning   ② Four Corners: Gender
   ③ Four Corners: Plural    ④ Listening (audio-only corners, minimal pairs, dictation)
   ⑤ Forge (build the plural)  ⑥ Echo (say it)    ★ Detective (rule cases, unlocked per row)
```

Every word has one **mastery level**, and its token on the map shows it:

| Level | Token on map | Earned by |
|---|---|---|
| 0 New | grey silhouette | n/a |
| 1 Seen | outline in gender colour | correct meaning |
| 2 Known | half fill | correct gender and plural pattern (recognition) |
| 3 Solid | full fill | correct listening and Forge (production) on a later day |
| 4 Mastered | full fill + small ring | recalled again after the FSRS interval has passed |
| 5 Gold | gold ring | correct after 30+ days with no lapses |

Learners can only move up a level on a later day than their last correct answer, so the map measures **retention**, not cramming. This follows the spaced-recall rule in `docs/10-review-and-gamification.md`.

## 2. The core gesture: Four Corners

This is the drag mechanic you asked for. A **word card** sits in the centre of the screen, with its illustration, the German word and an auto-played audio clip. Four **corner targets** sit at the screen corners. The learner **drags or flicks the card to a corner**; tapping a corner also works, for accessibility.

The gesture never changes; only what the corners hold changes. That keeps the game fast and easy to learn, the way Drops' swipe-to-picture mechanic is.

| Mode | Card shows | Corners hold | Trains |
|---|---|---|---|
| **Meaning** | German word + audio | 4 English meanings, or 4 pictures | meaning |
| **Reverse meaning** | picture or English | 4 German words (with articles) | recall of the German form |
| **Gender** | picture + bare noun "Stuhl" | **der** (blue) · **die** (raspberry) · **das** (green) · **plural only** (purple) | gender |
| **Plural pattern** | "der Stuhl" | 4 pattern chips, e.g. -e · Umlaut + -e · -(e)n · -s | plural pattern |
| **Plural form** | "der Stuhl" | 4 plural spellings: Stuhle · Stühle · Stühlen · Stuhls | exact form |
| **Listening** | speaker only, no text | 4 pictures (or 1 vs 3 objects for singular/plural) | listening |
| **Article ear** | audio "die Lehrer" | singular 👤 / plural 👥 corners | hearing the plural from the article alone |

How to make it feel good:
- When the learner lets go, the card snaps into the corner. A correct answer briefly lights the corner in its colour and plays the plural audio. A wrong answer makes the card bounce back, shows the correct corner, and puts the word back in the queue to return 3–5 cards later.
- The distractor answers come from the same grid row or the same lesson, so the learner really has to think. Easy, unrelated distractors don't teach anything.
- Answer speed is recorded, but the default mode has no timer. Speed only matters in Blitz.

## 3. Stations beyond the corners (the five earlier ideas, folded in)

| Station | From | What changes in the master game |
|---|---|---|
| **Forge** | Plural Forge | the production step: drag umlaut dots and ending chips onto the word. Required to reach level 3 |
| **Echo** | Hör-Echo | the speaking step: record, compare with the model, rate yourself. Optional and never blocks progress, because the TTS voice is still pending approval (G5) |
| **Listening lab** | Hör-Echo | adds **dictation** (hear "die Äpfel", type it; the umlaut keys sit on screen) and **minimal pairs** (Apfel/Äpfel, Mutter/Mütter, Lehrer/Lehrer) |
| **Detective** | Muster-Detektiv | a once-per-row "case". Solving it unlocks that row's **rule card** and a 2× XP bonus for that row for a week |
| **Map** | Grid Quest | becomes the home screen and progress display |
| **Doors** | Drei Türen | becomes the Gender mode of Four Corners |

## 4. A Daily Run (the 5–7 minute session)

The scheduler builds about 20 cards in this order: due reviews → recent mistakes → new words (capped by the daily goal). It then **interleaves the stations**:

1. **Warm-up (3 cards):** Meaning corners on words learned yesterday, so the session starts with easy wins.
2. **Main set (12–14 cards):** a mix of Gender, Plural and Listening corners, with 2–3 Forge cards.
3. **Mistakes return (2–4 cards):** every error from this run comes back once.
4. **Finisher (1 card):** an Echo card, or a Detective question if a row is close to being mastered.
5. **Results:** XP, accuracy, combo best, words that levelled up (shown as an animation of the tokens filling on the map), and a streak update.

The learner can stop at any point; anything answered is saved. Finishing one Run meets the daily goal.

## 5. Engagement mechanics borrowed from top apps

| Mechanic | Seen in | How Wortwerk uses it | Guard-rail |
|---|---|---|---|
| **Daily streak** 🔥 | Duolingo, Snapchat-style habit apps | +1 day when the daily goal is met (default: 1 Run) | uses the learner's time zone, with an "already counted" grace until 3 a.m. |
| **Streak freeze** | Duolingo | **earned, never bought**: 1 freeze for every 7-day streak, hold up to 2 | no guilt messages if the streak breaks; show "longest streak" too |
| **Daily check-in calendar** | mobile games, Duolingo calendar | open the app → today's dot fills. A 7-day row of dots, with a small reward on day 7 (bonus Detective case or a new illustration set) | the reward is cosmetic or content, never needed to keep learning |
| **Word of the day** | dictionary apps | the check-in card shows one noun from your grid, with audio | links to its cheat-sheet card |
| **In-round combo** | Duolingo combo, rhythm games | 3, 5 and 10 correct in a row → ×2 / ×3 XP flair | resets quietly; no loud failure sound |
| **Strikes** ✕✕✕ | arcade games, Duolingo hearts | only in **Blitz** mode: 60 seconds, 3 strikes and you're out | **never in learning mode**; Daily Run and Free Play have no lives |
| **Daily puzzle** | Wordle | **Tagesrätsel**: the same 6 nouns for everyone that day; guess each one's gender and plural; share a coloured result grid (🟦🟥🟩) | one attempt; no account needed to share |
| **Weekly quests** | Duolingo quests, Fortnite challenges | e.g. "Hear 50 plurals", "Forge 10 umlaut plurals", "Clear the -in → -innen row" | quests are chosen from the learner's own weak rows |
| **Collection** | Pokédex, Drops topics | the map is the collection; completing a row unlocks a **pattern badge** and a printable rule card | badges mark real milestones only |
| **Mastery levels** | Duolingo crowns and Legendary, Memrise levels | the 0–5 word levels above | levelling up needs a correct answer on a later day |
| **Spaced repetition** | Anki (FSRS), Memrise, Babbel review manager | the existing scheduler (`alpha-scheduler.ts`) picks the Daily Run | already in the repo spec |
| **Mistakes deck** | Duolingo practice hub, Memrise "difficult words" | an auto "Tricky words" deck plus the existing Difficult tag | n/a |
| **Speed review** | Memrise speed review, Clozemaster | Blitz mode | opt-in |
| **Personal best / ghost** | racing games, Elevate | "Beat yesterday's you": your best Blitz score as a ghost bar | no public leaderboard (repo spec), so you race yourself |
| **Smart reminders** | Duolingo | one daily reminder at the learner's chosen time, phrased as an invitation ("3 words are ready") | max one per day; easy to switch off |
| **Celebration moments** | most top apps | token fill animation, row-complete badge, level-up sound | short (under 1.5 s) and skippable; respect "reduced motion" |

### What to leave out and why
- **Selling lives, gems or streak freezes:** pay-to-keep-learning works against the goal.
- **Public leagues and leaderboards:** the repo spec rules them out, and for a personal study app they push people towards speed over accuracy. The ghost race gives the same competitive pull without that.
- **Confetti on every answer:** frequent rewards lose their effect. Save celebrations for level-ups and completed rows.

## 6. Screens

1. **Home / check-in:** streak flame and calendar dots, today's goal ring, word of the day, the "Start Daily Run" button, and a small map preview.
2. **Map:** the full gender × plural grid with token levels. Tap a cell to start Free Play on it.
3. **Four Corners (each mode):** the card in the centre, four corners, a progress bar and the combo counter.
4. **Forge / Echo / Detective:** as described in the ideas doc.
5. **Blitz:** a 60-second timer bar, three strike marks, score, and a ghost bar for yesterday's best.
6. **Daily puzzle:** 6 cards, the result grid and a share button.
7. **Results:** XP, accuracy, tokens that levelled up, streak, and quest progress.

## 7. How it fits the existing code

| Need | Already exists | New |
|---|---|---|
| Words, gender, plural, audio, illustrations | `loadSubjectVocabulary()`, `SubjectVocabularyVisual`, `plural-patterns.ts` (incl. `PluralDifference`) | n/a |
| Scheduling | FSRS-compatible `alpha-scheduler.ts` and the Today's Mission builder `mission.ts` in `packages/learning/src/review` | extend `mission.ts` into the Daily Run (station mix and interleaving above) |
| Mastery/XP/streak storage | `packages/learning/src/{mastery,rewards,persistence}`, `lib/learner-state` | level rules, freeze inventory, check-in log, quests |
| Games | `ArticleChoiceGame`, `PictureWordMatchGame`, `AudioMatchGame`, `MorphologyPuzzleGame`, `GameFeedback` | `FourCornersGame` (one component, a `mode` prop), `BlitzMode`, `DailyPuzzle` |
| Recording | `lib/recorder` | n/a |

## 8. Build in phases

| Phase | Ship | Why first |
|---|---|---|
| **1 · Core loop** | Four Corners (Meaning, Gender, Plural pattern, Listening), Daily Run, results, daily streak + check-in, map showing levels | delivers the drag game, listening, streaks and check-ins in one release, almost all from existing data |
| **2 · Production** | Forge station, dictation, minimal pairs, mistakes deck, level rules 3–5 | turns recognition into recall |
| **3 · Challenge** | Blitz with strikes + ghost, Tagesrätsel daily puzzle with share grid, weekly quests, streak freezes | adds variety and the habit hooks once the core loop is proven |
| **4 · Depth** | Detective cases + rule cards, Echo shadowing, badges, reminders | needs reviewed rule wording and a decision on the G5 audio approval |

**Before phase 1:** fix the duplicate headwords on the plurals sheet (see `docs/audit/README.md`). Otherwise the game would ask about the same word twice with different translations.
