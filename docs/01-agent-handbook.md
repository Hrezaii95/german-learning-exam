# Agent Handbook

## Mission

Build a personal, visual-first and audio-first German learning operating system. The learner should be able to follow the Momente sequence, explore any learned concept outside the lesson, practise actively, and return weak items to a focused review queue.

Do not digitize PDF pages. Encode their learning intent as original, connected interactions.

## Mandatory learner loop

`See → Hear → Notice → Repeat → Recall → Use → Feedback → Review → Master`

Every lesson stage and hub activity must serve at least one verb in this loop. A passive page with a Next button is not a completed learning experience.

## Agent ownership

### Cursor owns

- implementing approved components, routes, schemas, migrations and tests;
- wiring canonical content and media manifests into the UI;
- deterministic extraction scripts after the rules and expected outputs are specified;
- responsive behavior, accessibility, persistence and error states;
- reporting missing data/media as structured gaps.

### Codex owns

- product and learning-journey decisions;
- content reconciliation and German-language validation coordination;
- original infographic/image direction and generation;
- voice selection, TTS generation, audio normalization and pronunciation QA;
- accepting or rejecting Cursor’s implementation against the documentation.

### Cursor must never

- generate substitute illustrations, generic avatars, fake waveforms or synthetic audio without a supplied media task;
- scrape or invent vocabulary to fill a layout;
- treat archived Cursor JSON as canonical content;
- merge conflicting source values without provenance and review status;
- replace audio with `speechSynthesis` and call it equivalent;
- award mastery from page completion or a single correct multiple-choice answer;
- redesign the approved vocabulary, Q&A or verb learning language without an accepted decision record;
- expose content from Lesson 3+ inside the Lessons 1–2 Alpha.

## Required workflow

1. Read `docs/INDEX.md` and all dependencies for the assigned packet.
2. Inspect current code/data and preserve unrelated user work.
3. State the requirement IDs and acceptance gates being implemented.
4. Add or update tests before declaring completion.
5. Use canonical content IDs and media IDs—never UI labels as keys.
6. Run schema, provenance, unit, accessibility and E2E checks relevant to the packet.
7. Produce a short handoff: files changed, gates passed, gaps, screenshots, and exact next packet.

## Data rules

- German canonical form is stored without article in `lemma`; noun forms carry separate `article`, `gender`, and plural data.
- A canonical concept may have many source assertions. The published value must identify the assertion chosen and reviewer status.
- Teacher/personal items are not “lower quality”; priority means learning obligation/source layer, not truth confidence.
- Extra content attaches through `lessonLinks`, so adding a teacher vocabulary set never requires a schema change.
- UI strings never contain hidden curriculum data. All teachable German comes from content files.
- IDs are stable, lowercase, ASCII slugs with a type prefix: `lex:koch`, `verb:arbeiten`, `qa:beruf-casual`, `gram:feminine-in`, `lesson:01`.

## Media rules

- Every media file has a manifest entry with checksum, origin, license/use basis, locale, voice/speaker, text/transcript, speed, status and linked concepts.
- “Slow” playback normally reuses a high-quality master at 0.78–0.85× with pitch preservation. Generate a separate slow file only when intelligibility QA requires it.
- The full publisher audio track remains intact. Exercise segments may reference timestamps but must preserve the parent track relationship.
- Generated audio is cached as a file; runtime TTS calls are not the default learner experience.
- Missing media renders an honest disabled state and gap code, never a silent failure.

## UI rules

- Grammatical colors are semantic and never reused as generic interaction colors.
- Every semantic color also has text and shape: `M`, `F`, `N`, `PL`, `REG`, `SPELL`, `IRR`.
- Every action is keyboard reachable, has a visible focus state and meets a 44×44 CSS-pixel mobile target where practical.
- Responsive design is reflow, not desktop scaled down. Mobile has one primary task per screen and persistent bottom navigation.
- Content state includes loading, empty, audio unavailable, permission denied, offline, incorrect, partially correct, complete and stale-data states.

## Definition of done

A packet is done only when:

- requirement IDs are satisfied;
- canonical data and provenance validate;
- relevant media exists and plays;
- keyboard and screen-reader semantics are verified;
- desktop, tablet and mobile E2E journeys pass;
- no console errors or unexpected horizontal overflow remain;
- the implementation does not create a new decision outside the docs;
- an independent review has no unresolved high-severity finding.

“Rendered,” “committed,” or “works on my machine” is not a completion state.
