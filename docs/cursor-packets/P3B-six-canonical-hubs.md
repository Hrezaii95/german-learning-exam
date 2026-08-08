# P3B — Six canonical learner hubs

## Role and execution contract

You are the mechanical implementation worker. The Codex orchestrator owns product judgment, content promotion, media, final review, and gate approval.

- Model: `grok-4.5`
- Effort: High
- Fast mode: false
- Work only in the paths listed below.
- Do not use subagents or MCP tools.
- Do not edit, import from, or revive `archive/` or `samples/`.
- Do not publish or expose review/draft/blocked records.
- Do not add fake learner state, progress, streak, XP, mastery, due counts, completion, or audio availability.

## Owned paths

- `platform/apps/web/**`
- `platform/tests/web/**`
- `platform/package.json` and `platform/package-lock.json` only if a test dependency is genuinely necessary
- this packet only for a short completion note

Do not edit canonical content fragments, content schemas/indexes, planning registers, docs other than this packet, generated audio, or governance artifacts.

## Approved baseline to preserve

- Next 16.3 / React 19 responsive shell.
- `/`, `/lessons`, `/lessons/01`, `/lessons/02`.
- 23 learner-published activity routes.
- `activity:lesson-02-teacher-professions-deck` is review-only and must remain 404.
- Canonical activity alias handling and all current route smoke behavior.
- `npm audit --omit=dev --audit-level=high` is currently clean.

## Objective

Implement the six canonical top-level hubs over the validated learner-safe content indexes:

1. `/vocabulary`
2. `/verbs`
3. `/grammar`
4. `/phrases`
5. `/listening`
6. `/concepts`

Also implement `/hubs` as the mobile directory that links to those six canonical routes. It is a directory, not a seventh content hub.

This slice is the hub/list experience only. Do not implement rich detail pages, review scheduling, games, conversation, recording, TTS, or author/review surfaces here. Any unknown detail route must continue to return Not Found.

## Source of truth and security boundary

1. Load and validate the publication with the existing publication loader.
2. Build the existing typed indexes from that validated bundle.
3. Use the public learner `ContentIndexes` projection and its learner-safe helpers. Never call `openAuthorIndexes` in the web app.
4. Generate a deterministic web hub artifact at build time, alongside the existing lesson projection.
5. The generated artifact may contain only learner-facing fields required for the hubs: canonical ID, typed kind, display label, category, published lesson memberships, source priority, canonical hub/detail destination, and safe searchable display fields.
6. The artifact must not contain Source, SourceAssertion, assertion values, original/private paths, rights-gated MP3 paths, review/draft/blocked IDs, internal relationship endpoints, or arbitrary raw content objects.
7. Validate artifact shape/counts at load time and fail closed.

## Hub membership

- Vocabulary: `Lexeme`
- Verbs: `Verb`
- Grammar: `GrammarConcept`
- Phrases & Q&A: `PhrasePattern`, `QAPair`
- Listening: `Dialogue`, `ListeningAsset`
- Concepts: `Collection`

Current publication is intentionally asymmetric. Do not hard-code prose counts, but the implementation must faithfully derive the current learner result:

- vocabulary is populated, including published Lesson 2 job lexemes;
- verbs contains only currently published verbs (Lesson 2 verbs remain review-only);
- phrases is populated;
- grammar, listening, and concepts may be empty because current records are absent or review-only.

An empty hub is valid. Render a specific honest state such as “No published items yet” and explain that approved content will appear here. Never substitute review data or fabricated examples.

## Shared hub UX

Create a reusable hub shell/list component rather than six copied pages.

Each hub page must provide:

- H1 and short learner-facing explanation.
- Derived published item count.
- Search field using canonical display labels and safe indexed display fields.
- Lesson filter: All, Lesson 1, Lesson 2.
- Category filter derived from the current hub records when categories exist.
- Active-filter summary and a clear-filters action.
- Deterministic card/list results with canonical German display text and concise type/category/lesson metadata.
- A no-matches state distinct from the no-published-content state.
- No fake learned/due/mastery controls. If future state controls are mentioned, render them as explanatory unavailable text, not enabled widgets.
- Server-rendered query parameter behavior so copied URLs preserve filters. Unknown query values must fail safely to defaults; no crashes or unsafe reflection.

Cards must not link to detail routes that do not exist in this slice. They may use non-link article cards with an honest “Detail view next phase” cue. Internal IDs must not be the primary learner-facing label.

## Navigation and responsive behavior

- Desktop/tablet primary nav: Dashboard, Lessons, Vocabulary, Verbs, Grammar, Phrases & Q&A, Listening, Review (disabled Next phase).
- Mobile bottom nav remains compact: Dashboard, Lessons, Hubs, Review (disabled), Profile (disabled). `Hubs` links to `/hubs` and is current for `/hubs` and all six hub routes.
- Extend `NavKey` and current-route behavior accurately. A 404 must still have no `aria-current`.
- Preserve one `<main>`, skip target, visible keyboard focus, 44px targets, no horizontal overflow, and desktop/tablet/mobile breakpoints.
- Use the established dark rail, warm off-white canvas, restrained violet, typography, and semantic morphology/gender tokens. Gender colors must not become generic decoration.

## Canonical route behavior

- The seven list/directory paths above return 200.
- Trailing slash, duplicate slash, dot-segment, malformed encoding, and unknown detail aliases must not create parallel content pages. Follow the existing canonical route policy.
- `/vocabulary/lex:ingenieur` and all other unimplemented detail URLs must return 404 in this slice.
- Existing lesson/activity routing behavior must not regress.

## Tests and acceptance

Add behavioral tests, not source-text grep, for at least:

1. Exact six hub routes plus `/hubs` directory are represented.
2. Membership derives from the learner-safe index kind mapping.
3. Every projected hub record is `published`; known review-only IDs (teacher collection, review verbs/listening, teacher deck) are absent recursively.
4. Current derived counts equal independent learner index filters; no prose literals.
5. Search supports canonical German text and normalized umlaut aliases only for matching; displayed orthography remains canonical.
6. Lesson and category filters, combined filters, clear state, no matches, and empty hub behavior.
7. Real server-rendered components have one main/accurate `aria-current`; mobile Hubs navigation is real, disabled items remain non-focusable.
8. Existing lesson/activity canonical and 404 tests remain green.
9. Web projection output is deterministic across two runs.

Run and report exact results for:

```powershell
cd platform
npm run check
npm run build:web
npm run audit:prod
npm run smoke:web-routes
```

Do not claim approval. Report files changed, key design decisions, command output summaries, and any content gaps or blockers for the orchestrator.

## Completion note (mechanical worker)

Implemented six canonical hub list routes + `/hubs` directory over a build-time `learner-hubs.json` artifact derived from `buildContentIndexes` (learner projection only; no `openAuthorIndexes` in the web app). Shared `HubListView` covers search/lesson/category filters via GET query params; cards are non-linking with “Detail view next phase”. Empty hubs render honest empty state. Nav updated (desktop hubs + mobile Hubs current). Required commands: `check` PASS; `build:web` PASS; `audit:prod` 0 vulnerabilities; `smoke:web-routes` PASS (15 checks). Not claiming approval.

