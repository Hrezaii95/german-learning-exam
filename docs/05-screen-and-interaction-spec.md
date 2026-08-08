# Screen and Interaction Specification

The refined composite render at `resources/project-context/ui-reference/file_000000002cac8246b09d9ffdc8b9d45b.png` sets the premium shell. The functional sample under `samples/german-learning-ui-samples/` supersedes it for vocabulary, Q&A, verb interactions and responsive behavior.

## Screen inventory

| Screen | Required content | Primary action | Critical states |
|---|---|---|---|
| Dashboard | greeting, Continue, daily mission, Lessons 1–2, hubs, due/weak skills, streak/XP | Continue learning / Start mission | new learner, no due items, offline |
| Lesson browser | two lesson covers, objectives, content counts, progress, estimated time | Open lesson | selected but not started, completed but due |
| Lesson overview | hero, communicative outcome, stage rail, source layers, teacher extras, skill progress | Start/resume stage | prerequisite recommendation, skipped stages |
| Visual introduction | original infographic, clickable items, play-all, legend | Begin guided learning | reduced motion, image unavailable |
| Vocabulary detail | approved sample system plus source, tags, due state, related drawer | Hear / practise | masculine/feminine pair, multiple plurals |
| Verb detail | approved sample system plus meanings/uses, tense scope, source and cards | Hear / conjugate | regular, spelling adjustment, irregular |
| Grammar explorer | visual rule, contrast, examples, manipulator, mistake note | Try guided example | prerequisite missing, alternative valid answer |
| Phrase/Q&A detail | register, intent, model question/answers, slot map, audio, builder, recording | Build and say answer | casual/formal, multiple answers |
| Listening activity | illustration/context, player, waveform/progress, staged transcript, task | Play / submit response | source vs generated, transcript hidden/revealed |
| Practice game | one clear mechanic, progress, hint, feedback, keyboard/touch input | Answer | correct, partial, incorrect, timeout optional |
| Conversation rehearsal | scene, model dialogue, role, turn prompt, recording, substitutions | Respond | guided/independent, microphone denied |
| Checkpoint | mixed task list and skill coverage | Start / finish check | incomplete required skill, retry plan |
| Hub list | filters, learned/all, collection cards, status/due | Open item / review filter | no unlocked items, no matches |
| Concept hub | visual map linking objects and activities | Choose learning branch | dense graph on mobile becomes grouped list |
| Review setup | mission rationale, counts by skill/source, time estimate, custom filters | Start mission | nothing due, only media gaps |
| Review session | mixed card/game renderer, remaining, feedback, pause/resume | Answer / rate recall | interrupted/reloaded session |
| Progress | mastery by skill, lesson and concept; weak patterns; review stability | Practise weak area | low data, scoring caveat |
| Search | typed grouped results and filters | Open result | spelling alias, no result |
| Settings | audio speed, autoplay, target minutes, reduced motion, text size, data export/reset | Save | unsupported setting, reset confirmation |

## Dashboard layout

Desktop uses a dark navigation shell and a quiet off-white workspace. The first viewport contains:

1. greeting + Continue card with exact next activity;
2. Today’s Mission with skill mix and time estimate;
3. compact metrics: lessons, learned concepts, due review, streak;
4. Lessons 1–2 cards;
5. Hub shortcuts with learned/due counts;
6. Weak skills and recent items.

On mobile, Continue and Today’s Mission appear before all metrics. Charts never displace the next study action.

## Lesson screen interactions

- Clicking a visual overview item opens a peek card, not an unexpected full route; “Open detail” deep-links.
- Play All progresses item-by-item, highlights the active label and stops on navigation.
- Stage completion is derived from required activity evidence.
- Teacher extras are shown as an attached assignment collection after the core lesson profession set, with separate progress.
- The lesson summary can filter to `Everything`, `Difficult`, `Teacher`, or one skill.

## Vocabulary detail baseline

Use the sample behavior and extend it:

- form toggle has `aria-pressed` and updates word, IPA, meaning, example and illustration;
- normal and study-speed audio are explicit;
- person-form and plural diagrams expose each transformation separately;
- tabs: Details, Examples, Grammar, Source, Quiz;
- tags and Add to review are persistent actions;
- Related shows lesson, verb, phrase/Q&A, category and listening links;
- pronunciation cycle supports listen → record → playback → retry.

## Q&A baseline

- register toggle changes pronoun, verb and audio together;
- question and answer audio are independently playable;
- sentence slots use consistent roles (question word, finite verb, person, complement);
- answer alternatives are data-driven and can change profession/name/country/etc.;
- builder accepts only one use of each supplied token unless data marks duplicates;
- guided model, build, then record are separate progressive steps;
- independent prompt hides the model until Help is requested.

## Verb baseline

- hero communicates meaning visually before the table;
- infinitive-to-stem equation identifies the removed ending;
- conjugation rows are playable and switch between pattern and meaning;
- regular endings, inserted spelling vowels and irregular forms have separate tokens;
- a contrast card explains why a pattern differs;
- recall field gives morphology-specific feedback;
- examples connect to Lesson 1/2 Q&A and vocabulary.

## Game interaction contracts

### Flashcards

Prompt direction is declared. Reveal does not equal correct. Learner rates Again/Hard/Good/Easy after attempting; optional typed/listening tasks can auto-grade and still ask confidence.

### Picture/word match

Use 4–8 items, one-to-one matching, keyboard-selectable cards, no time pressure by default. Completion reports the specific confused pairs.

### Article sort

Bins show label+shape+color. Plural is a separate purple bin. Feedback explains the noun, not only the bin.

### Word order

Tokens are buttons; selected tokens can be removed/reordered; punctuation is handled consistently; accepted alternatives come from content data.

### Verb builder

Prompt gives pronoun + infinitive. Learner builds stem + ending. Feedback identifies stem, inserted spelling element and ending.

### Word puzzle

May use syllable assembly, word search or form-family connection. It must preserve correct German capitalization and diacritics and must not become the primary mastery signal.

## Audio interaction contract

- one active player at a time;
- same button toggles stop for short clips;
- active state has text and animation that respects reduced motion;
- prefetch current activity clips, not the entire course;
- navigation pauses source audio and stops/relinquishes microphone tracks;
- failure identifies retry/offline status;
- study-speed playback preserves pitch;
- transcript reveal is staged in listening tasks.
