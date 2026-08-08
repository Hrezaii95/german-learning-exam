# Cursor Execution Plan

Cursor receives one packet at a time. It must not start the next packet until the packet gate passes. Each packet begins by citing requirement IDs and ends with evidence, not narrative.

Paste-ready, write-bounded packet briefs live under `docs/cursor-packets/`. The current first packet is `C0-schema-and-validation.md`. A packet does not count as executed unless Cursor reports the owner-required model identity and Codex independently verifies its files and tests.

## Packet 0 — foundation

1. Create clean platform project from the approved Sites/sample baseline.
2. Add typed content/media schema package and validators.
3. Add CI/local commands for lint, typecheck, content validation, tests and build.
4. Add local persistence adapter and event schema tests.

**Gate:** empty shell runs at desktop/tablet/mobile; invalid fixture fails validation; no lesson UI invented.

## Packet 1 — canonical content integration

1. Consume the supplied Lesson 1–2 content manifest and source assertions.
2. Build indexes by ID, lesson, type, collection, relation and search.
3. Implement scope firewall and duplicate/reference checks.
4. Render a developer-only content coverage report.

**Gate:** counts match frozen manifest; Lesson 3+ fixture is rejected; every relation resolves.

## Packet 2 — shell and dashboard

1. Implement responsive shell/navigation/routes.
2. Implement dashboard with real local state and zero-data state.
3. Implement settings for target minutes/audio speed/reduced motion/text size.
4. Add keyboard/focus/mobile-nav tests.

**Gate:** UX-001–006 relevant checks pass; no hard-coded progress.

## Packet 3 — lesson engine

1. Implement lesson browser, overview and stage/activity routes.
2. Implement stable resume state and stage completion reducer.
3. Implement shared feedback and relationship drawer.
4. Wire Lesson 1 and Lesson 2 manifests without custom per-lesson page logic.

**Gate:** direct selection, prerequisite recommendation, resume and backlinks pass E2E.

## Packet 4 — approved learning details

1. Port vocabulary, Q&A and verb sample components into data-driven renderers.
2. Add GrammarVisual and PhrasePattern renderers.
3. Add tabs, tags, source detail, related links and review actions.
4. Use supplied media/illustrations only.

**Gate:** sample behavior preserved; multiple content fixtures prove renderers are generic.

## Packet 5 — audio/listening/recording

1. Implement one shared audio controller and current-activity prefetch.
2. Implement source listening player with staged transcript and tasks.
3. Implement recorder with safe permission-race/navigation cleanup.
4. Implement offline/error states and audio-event logging.

**Gate:** AUD-001–006 and microphone E2E pass. No runtime TTS authority.

## Packet 6 — hubs and search

1. Implement six hubs with shared learned/all and filter framework.
2. Implement typed global search.
3. Implement concept hub grouped relationship map/mobile list.
4. Implement temporary deck creation from filters.

**Gate:** the same concept opens from lesson, hub, review and search with correct back context.

## Packet 7 — practice games

Implement, in order: flashcards, picture match, article sort, audio match, plural forge, verb builder, sentence rails, dialogue ladder, syllable puzzle. Renderers must use content templates and emit typed attempts.

**Gate:** keyboard/touch, error feedback, normalization and skill-dimension tests pass per game.

## Packet 8 — review/mastery/progress

1. Implement scheduler adapter and review-card state.
2. Implement mission generator and resumeable mixed session.
3. Implement derived concept/lesson mastery.
4. Implement progress, weak skills, tags and notes.
5. Implement versioned export/import.

**Gate:** deterministic clock tests; reload/import reproduces due state and derived progress.

## Packet 9 — offline, polish and release

1. Implement scoped asset caching/download controls.
2. Finish all loading/empty/error/offline states.
3. Run accessibility, responsive visual and performance passes.
4. Produce release evidence bundle and private deployment.

**Gate:** every checklist in `13-quality-and-acceptance.md` is green or explicitly waived by the owner.

## Media request format

Cursor sends Codex a JSON gap list:

```json
[{"objectId":"lex:arzt","needed":["image-1x1","image-4x3","word-audio","example-audio"],"text":{"word":"der Arzt","example":"Er ist Arzt."},"priority":"blocks-packet-4"}]
```

Codex returns files + manifest updates. Cursor verifies checksums and wiring; it does not regenerate.

## Handoff template

```md
Packet:
Requirements:
Files changed:
Tests/gates passed:
Screenshots:
Content/media gaps:
Known limitations:
Exact next packet:
```
