# P4A — Seven game contracts and representative renderers

## Objective

Implement the exact seven required game modes as a typed, reusable learner UI layer over the already-approved mastery event schema. Use only the three P3D published representative contracts and their learner-visible fields. This packet does not implement persistence, missions, rewards, or promote media.

## Exact game IDs

1. `flashcards`
2. `picture-word-match`
3. `article-choice`
4. `audio-match`
5. `word-order`
6. `verb-builder`
7. `morphology-puzzle`

The exact set must be centralized, exhaustive, immutable, and runtime-validated. Unknown/duplicate/missing modes fail closed.

## Canonical representative prompts

- Vocabulary: `lex:architekt`, `der Architekt`, related published `die Architektin`, stem `Architekt`, operation `+ -in`. Plurals remain unavailable; never use `Architekten`/`Architektinnen`.
- Verb: `verb:sein`; use exact published seven-form paradigm from the P3D canonical contract.
- Q&A: `qa:profession-casual-main`; use exact informal published question/answer patterns from P3D.
- Do not invent German distractors. Choices must be drawn from published canonical values in the representative projection.
- `picture-word-match`: use the existing semantic visual/gender badge contract to match the two published person forms. Clearly label it as a semantic visual—not a profession photograph. Do not add/generated image assets.
- `audio-match`: matching TTS is not listening-approved. The renderer must exist but display a focused unavailable state and must not emit a graded event. It must be activatable later only by a safe approved public-media contract. No paths/IDs/hashes.

## Typed attempts

- Every enabled game emits an object accepted by `parseLearnerEvent` from `@german-learning/learning`; never invent a UI-local mastery schema.
- `flashcards` emits `selfRatedAttempt` only and must never claim correctness/mastery.
- semantic visual match uses `pictureRecognition` / recognition.
- article choice uses `multipleChoice` / recognition.
- word order uses `sentenceOrder` / form.
- verb builder and morphology puzzle use `formManipulation` / form.
- Use `sourceActivityMode: "review"` (or the exact mapped canonical activity mode where embedded), stable canonical concept/activity IDs, generated UUID event/session IDs, timezone-bearing timestamp, measured dimension matching the family, latency and hint counts.
- Normalize only for grading; keep learner feedback clear. Reveal/hint is not correctness. Submitting after reveal/hint must be `partial` or `incorrect` according to a deterministic documented rule, never strong evidence.
- Inputs must be bounded and HTML/path shaped answers rejected or safely treated as incorrect without injecting them into the DOM/error text.

## UI / route integration

- Build a reusable game selector/renderer that will be consumed by P4 review sessions.
- Add a canonical `/practice` route and `/practice/[gameId]` representative routes only if route integration remains fail-closed: encoded/exact IDs, unknown/malformed/extra segments 404, canonical alias behavior documented. Otherwise embed the selector on the representative detail pages. Do not create a generic catch-all fallback.
- Link a clear “Practise” action from the three representative detail pages while preserving typed back context.
- Keyboard and touch: 44px targets, fieldsets/legends, focusable feedback, Enter/Space where appropriate, visible focus, no color-only feedback.
- Responsive at 360×800, 768×1024, 1024×768, 1440×900 without horizontal page overflow.
- Include empty, retry, correct, partial/incorrect, revealed, and unavailable states.

## Publication and honesty boundaries

- Projection must be deterministic, typed, runtime asserted, recursively leak-scanned, and checked into `apps/web/generated` only if a new artifact is needed.
- No review/draft/blocked entities, assertion/source fields, private paths, media metadata, secrets, or archive/sample code.
- Do not pretend audio works. Do not claim picture assets exist. Do not persist yet.
- Do not equate local UI feedback with mastery; it is an emitted evidence event for the later reducer/persistence integration.

## Required tests/gates

- exact seven-ID diff is empty;
- all six enabled representative renderers emit events accepted by `parseLearnerEvent` with exact family/dimension; audio-match emits no graded event while unavailable;
- flashcard cannot emit objective correctness;
- hint/reveal cannot produce unqualified strong evidence;
- canonical German and event IDs match validated representative content;
- no unpublished plural/audio/review leak;
- route resolver and live smoke for any new routes, including unknown/malformed/extra 404;
- behavioral SSR/client component tests for selection, submit, retry, keyboard semantics and feedback;
- prior P3 gates remain green.

Run `npm run check`, `npm run build:web`, `npm run audit:prod`, `npm run smoke:web-routes`. Write `research/cursor-execution/P4A-worker-report.md` with exact changes, tests, enabled/unavailable matrix, commands, and honest gaps. Do not edit plans/register, commit, push, or claim approval.
