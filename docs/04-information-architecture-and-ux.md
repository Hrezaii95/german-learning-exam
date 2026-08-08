# Information Architecture and UX

## Navigation model

The system has three equally valid entry modes:

1. **Continue:** resume the next recommended activity.
2. **Lessons:** follow Momente Lesson 1 or Lesson 2.
3. **Hubs:** explore or review content by type/concept.

The desktop primary navigation is:

`Dashboard · Lessons · Vocabulary · Verbs · Grammar · Phrases & Q&A · Listening · Review`

Search, progress and settings are secondary actions. Mobile uses:

`Home · Lessons · Hubs · Review · Profile`

“Hubs” opens the six type hubs rather than squeezing them all into bottom navigation.

## Route contract

| Route | Purpose |
|---|---|
| `/` | Dashboard and daily mission |
| `/lessons` | Lesson browser |
| `/lessons/01` | Lesson 1 overview and stage map |
| `/lessons/01/activity/:activityId` | Stable lesson activity route |
| `/lessons/02` | Lesson 2 overview and stage map |
| `/vocabulary` | Learned/unlocked vocabulary hub |
| `/vocabulary/:id` | Rich word/person-form detail |
| `/verbs` and `/verbs/:id` | Verb hub and detail |
| `/grammar` and `/grammar/:id` | Grammar hub and visual explorer |
| `/phrases` and `/phrases/:id` | Phrase/Q&A hub and pattern detail |
| `/listening` and `/listening/:id` | Listening hub and player/activity |
| `/concepts/:id` | Cross-type concept hub |
| `/review` | Today’s mission and deck filters |
| `/review/session/:id` | Resumeable mixed review |
| `/search` | Typed global results |
| `/progress` | Mastery and skill evidence |
| `/settings` | Audio, study, accessibility and data controls |

This table is the target route contract. The Lessons 1–2 Alpha currently implements `/`, `/lessons`, `/lessons/01`, `/lessons/02`, the six top-level hubs, `/review`, and `/vocabulary/:id` for the 48 teacher professions. Unimplemented target routes MUST return Not Found; Cursor must not route them silently to Dashboard or a generic hub.

Route IDs use canonical IDs or stable slugs mapped to them. Navigation history records an `entryContext` (`lesson`, `hub`, `review`, `search`) so Back returns to the right place.

## Object cross-linking

Every detail page has a consistent Related drawer:

- **Learned in:** lesson/activity and source priority;
- **Used with:** verbs, grammar, phrases/Q&A and examples;
- **Hear it in:** generated examples and verified source listening;
- **Practise:** available card/game templates;
- **Review status:** due, tags and last result;
- **Source:** page/exercise/track assertions.

There are no dead-end pages. A deep link always exposes at least source lesson, parent hub and one next practice action.

## Lesson architecture

Each lesson page uses a stage rail on desktop and a compact stepper on mobile:

1. Overview
2. Visual introduction
3. Vocabulary & phrases
4. Verbs & grammar
5. Listening & pronunciation
6. Guided practice
7. Conversation/use
8. Checkpoint
9. Review & summary

Activities are small (target 2–6 minutes), can be resumed, and display the skill being trained. Source priority filters exist inside content drawers, not as competing curricula.

## Hub architecture

All hubs share:

- search;
- learned/all toggle;
- filters: lesson, source priority, category, mastery, tag, due, audio/media availability;
- count and active-filter summary;
- grid/list switch where useful;
- bulk action: start a review deck from current filter;
- persistent item status and due signal;
- empty state explaining how to unlock/add content.

Hub-specific views:

- Vocabulary: card grid, semantic collections, morphology families.
- Verbs: infinitive grid, meaning families, conjugation pattern matrix.
- Grammar: prerequisite map and lesson/topic list.
- Phrases & Q&A: communicative-intent collections and register filters.
- Listening: word/sentence/dialogue/source-exercise levels.
- Concepts: cross-type living maps such as Introductions or Professions.

## Responsive behavior

### Desktop (≥ 1100px)

- persistent dark navigation rail or top shell;
- content width constrained for reading, with optional contextual side panel;
- two-column learning cards when relationships are useful;
- keyboard shortcuts may be shown.

### Tablet (700–1099px)

- condensed top navigation;
- contextual side panels become drawers;
- two-column cards reflow to balanced single/two-column layouts;
- touch targets remain 44px minimum.

### Mobile (360–699px)

- one primary task column;
- bottom navigation and sticky primary action where needed;
- large infographics become swipeable/zoomable regions or reordered cards, never tiny desktop screenshots;
- secondary metadata collapses into Details;
- record/play controls remain visible while practising;
- bottom navigation does not cover content or microphone controls.

## Global states

Every data-driven view specifies:

- loading skeleton matching final geometry;
- empty state with a useful next action;
- offline with cached/uncached distinction;
- content validation failure with object ID;
- missing media with honest disabled control;
- audio playback blocked/error;
- microphone unsupported/denied/busy;
- no review due;
- stale content manifest requiring refresh;
- destructive data reset confirmation.

## Search behavior

Search matches German forms, normalized umlaut alternatives only as secondary aliases, English/Spanish meanings, IDs, examples, categories and source labels. Results are grouped by type, never flattened. German orthography is displayed canonically; matching `koechin` may find `Köchin`, but the UI must teach the umlauted spelling.

## Adding extra content

Alpha’s learner-facing add flow may be a simple structured import later, but the data contract exists now:

1. choose destination lesson(s) and source type (`teacher`, `personal`);
2. choose object type;
3. enter/import assertions;
4. validate required fields and duplicates;
5. send media gaps to the Codex media queue;
6. publish only after validation;
7. the object automatically appears in the lesson drawer, appropriate hub, search and eligible review templates.
