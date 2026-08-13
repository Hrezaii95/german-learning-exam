# P4A worker report — Seven game contracts and representative renderers

Status: implementation evidence returned; **no approval claimed**  
Packet: `docs/cursor-packets/P4A-seven-games.md`  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

Write-scoped:

| Path | Change |
|---|---|
| `platform/apps/web/lib/games/game-ids.ts` | Exact seven IDs; immutable; runtime assert + empty diff helper |
| `platform/apps/web/lib/games/game-types.ts` | Availability, feedback kinds, emit result types; audio unavailable copy |
| `platform/apps/web/lib/games/game-prompts.ts` | Prompts from P3D canonical pins only (no invented German) |
| `platform/apps/web/lib/games/game-grading.ts` | Normalize + documented hint/reveal → partial/incorrect; HTML/path reject |
| `platform/apps/web/lib/games/game-events.ts` | Emit via `parseLearnerEvent` from `@german-learning/learning` |
| `platform/apps/web/lib/games/practice-paths.ts` | Canonical `/practice` + `/practice/[gameId]` helpers |
| `platform/apps/web/lib/games/index.ts` | Barrel exports |
| `platform/apps/web/lib/content/routes.ts` | Fail-closed practice resolve; unknown/malformed/extra 404 |
| `platform/apps/web/lib/content/navigation-context.ts` | Allowlist practice paths; detail→practice back context |
| `platform/apps/web/lib/content/nav.ts` | `practice` nav key |
| `platform/apps/web/components/shell/AppShell.tsx` | Practice primary nav link |
| `platform/apps/web/components/games/*` | Selector, renderer, seven mode UIs, PractiseLink, nav wrappers |
| `platform/apps/web/components/details/DetailViews.tsx` | Practise action on all three representatives |
| `platform/apps/web/app/practice/page.tsx` | Practice selector route |
| `platform/apps/web/app/practice/[gameId]/page.tsx` | Exact seven SSG game routes |
| `platform/apps/web/app/globals.css` | Practice/game styles (44px targets, feedback states) |
| `platform/apps/web/proxy.ts` | Matcher includes `/practice` |
| `platform/apps/web/package.json` | `@german-learning/learning` dep; `next build --webpack` |
| `platform/apps/web/tsconfig.json` | Learning package path |
| `platform/apps/web/next.config.ts` | transpilePackages + webpack `.js`→`.ts` extensionAlias for learning ESM |
| `platform/apps/web/scripts/smoke-canonical-routes.mjs` | Practice 200 + unknown/malformed/extra 404 checks |
| `platform/tsconfig.json` | Exclude `p4a-games-ui.test.ts` from root (covered by web-tests) |
| `platform/tests/web/p4a-games.test.ts` | IDs, prompts, grading, parseLearnerEvent, routes |
| `platform/tests/web/p4a-games-ui.test.ts` | SSR selection, unavailable, Practise links, keyboard attrs |
| `research/cursor-execution/P4A-worker-report.md` | This report |

Not edited: plans, register, packet docs, content package, learning mastery semantics, resources, archive, samples, media, governance.

## Enabled / unavailable matrix

| Game ID | Availability | Task family | Dimension | Event kind |
|---|---|---|---|---|
| `flashcards` | enabled | `flashcard` | `recall` | `selfRatedAttempt` only (never objective correctness) |
| `picture-word-match` | enabled | `pictureRecognition` | `recognition` | `objectiveAttempt` |
| `article-choice` | enabled | `multipleChoice` | `recognition` | `objectiveAttempt` |
| `audio-match` | **unavailable** | — | — | **no graded event** |
| `word-order` | enabled | `sentenceOrder` | `form` | `objectiveAttempt` |
| `verb-builder` | enabled | `formManipulation` | `form` | `objectiveAttempt` |
| `morphology-puzzle` | enabled | `formManipulation` | `form` | `objectiveAttempt` |

Representative prompts (P3D pins only):

- Vocab `lex:architekt`: `der Architekt` / `die Architektin` / stem `Architekt` + `-in` (no plurals; never `Architekten`/`Architektinnen`)
- Verb `verb:sein`: exact seven published present forms
- Q&A `qa:profession-casual-main`: exact informal question tokens for word-order

`picture-word-match` uses the existing semantic gender badge contract and labels itself as a semantic visual — not a profession photograph. No image assets added.

`audio-match` shows a focused unavailable state (listening approval absent). `emitAudioMatchAttempt()` always returns `emitted: false`.

## Hint / reveal rule (documented)

Normalize only for grading (NFC + trim + collapse whitespace). If `revealed === true` OR `hintsUsed > 0` before submit: matching answer → `partial`, otherwise `incorrect`. Never emit `correct` after hint/reveal (not strong evidence). HTML/path-shaped answers → `incorrect` without echoing unsafe raw text into feedback/DOM.

## Routes

- `/practice` selector + `/practice/{exactGameId}` for the seven IDs (SSG via `generateStaticParams`)
- Exact kebab IDs only (encoding is identity); unknown / malformed / extra segments → 404; no catch-all fallback
- Practise action on the three detail pages preserves typed back context to the detail canonical path

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run check` | 0 | typecheck + typecheck:web + typecheck:web-tests + test + validate:publication + test:web; **17** files / **395** tests; publication `VALIDATION_OK`; web **11** files / **107** tests |
| `npm run build:web` | 0 | Next 16.3.0 webpack; **●** 2 lessons + **●** 23 activities + **●** 3 details + **○/●** practice selector + **7** game routes SSG |
| `npm run audit:prod` | 0 | **0** vulnerabilities |
| `npm run smoke:web-routes` | 0 | **37/37** checks PASS (prior SSG/hubs/search/details + practice 200/404) |

## Remaining gaps (honest)

- **Persistence / missions / rewards:** not in scope — events are emitted in-session only (“not persisted yet”).
- **Audio match:** remains unavailable until a safe listening-approved public-media contract exists; no paths/IDs/hashes exposed.
- **Plurals:** still unpublished — never invented for distractors.
- **Webpack build:** production uses `next build --webpack` because Turbopack cannot resolve TypeScript ESM `.js` → `.ts` for `@german-learning/learning`. Dev `next dev` (Turbopack) may still fail to resolve that package until Turbopack gains extensionAlias parity; gates use the webpack production build.
- **Review / Add-to-Review / recorder / mastery reducer UI:** still later P4+.
- Orchestrator owns approval / register closure; this report does not claim them.

## Honesty

No approval claim. No commit/push. No German invention, review-plural promotion, candidate-media exposure, resources/archive/samples/media edits, plans/register edits, or security/publication gate weakening. Mastery schema is exclusively `parseLearnerEvent` from `@german-learning/learning` — no UI-local mastery schema. Local feedback is not equated with mastery.
