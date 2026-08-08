# Review and Gamification

## Review unit

The scheduler schedules **cards**, while progress is reported for **concepts and skill dimensions**. One concept can produce multiple cards:

- image → German;
- English → German;
- audio → German/meaning;
- noun → article;
- singular → plural;
- profession masculine ↔ feminine;
- pronoun + infinitive → conjugated verb;
- prompt → phrase/Q&A response;
- scrambled tokens → sentence;
- sentence audio → typed gap;
- scene prompt → spoken rehearsal.

Card templates declare which skill dimension they measure. The system does not generate invalid cards (for example an article card for a phrase).

## Scheduling

Persist raw review events and an FSRS-compatible state per card: due, stability, difficulty, elapsed days, scheduled days, reps, lapses, state and last review. Use the maintained TypeScript FSRS implementation only after its API/version is pinned and wrapped behind `ReviewScheduler`.

Alpha may start with global default parameters and desired retention around 0.90. Personal optimization begins only after sufficient history; never claim personalized optimization with a tiny sample.

## Rating and grading

- Objective tasks store correctness, latency, hints and normalized answer.
- Flashcard reveal requires learner rating: Again, Hard, Good, Easy.
- A wrong objective answer maps to Again regardless of confidence.
- Listening stores playback speed and transcript/hint use.
- Recording cycle stores completion/self-rating but no pronunciation accuracy score.
- Tags and repeated error types influence mission selection, not scheduler math unless documented.

## Today’s Mission

The mission generator selects in this order:

1. overdue cards;
2. recent failed/difficult cards;
3. lesson-required cards preventing stage completion;
4. balanced listening and production targets;
5. older interleaved maintenance;
6. new cards only within the daily limit.

It produces a reason summary: “8 due · 4 difficult professions · 3 listening · 2 Q&A.” The learner can shorten the mission without losing state.

## Required Alpha game modes

| Game | Data dependency | Mastery evidence |
|---|---|---|
| Flashcards | any card template | self-rated recall, stronger when typed/audio |
| Picture match | image-linked lexemes | recognition only |
| Article sort | noun gender | form recognition |
| Audio match | audio + concepts | listening recognition |
| Plural forge | noun morphology segments | form recall |
| Verb builder | stem + endings | conjugation/form recall |
| Sentence rails | phrase/Q&A tokens | word-order recall |
| Dialogue ladder | linked Q&A turns | communicative selection/recall |
| Syllable puzzle | reviewed segmentation | orthographic/pronunciation support |

Word search may be included as a low-stakes warm-up but contributes little mastery evidence.

## Difficulty and help

Each task can offer layered help:

1. replay audio/context;
2. show category or morphology cue;
3. show first letter/slot;
4. reveal answer with explanation.

Hint use reduces the evidence strength but does not punish XP harshly. Correcting an error is rewarded.

## XP, streaks and badges

- XP rewards retrieval, listening attempts, corrections, recording cycles, checkpoints and spaced returns.
- Daily streak uses the learner’s timezone and a configurable minimum meaningful-study threshold.
- A “streak freeze” or shame mechanic is unnecessary for a personal Alpha.
- Badges represent real milestones: first delayed recall, 25 teacher professions heard, all Lesson 1 Q&A produced, seven-day review return.
- No leaderboard.

## Tags and custom decks

Built-in tags: Favorite, Difficult, Confusing, Exam, Teacher. Personal notes are separate from tags. Any hub filter can become a temporary review deck, such as:

- Lesson 2 + Teacher + Difficult;
- feminine profession forms due now;
- irregular verb forms;
- formal Q&A;
- listening errors this week.

## Progress reporting

Dashboard percentages display labelled dimensions, not a misleading single score. Concept detail can show:

`Recognition 90 · Recall 72 · Listening 61 · Form 80 · Production practised · Stability 4 days`

No AI pronunciation percentage appears until the assessment gate is passed.
