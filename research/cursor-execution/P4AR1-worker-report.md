# P4AR1 worker report — Dev parity and behavioral game tests

Status: implementation evidence returned; **no approval claimed**  
Packet: `docs/cursor-packets/P4AR1-dev-and-behavior.md`  
Prior review: `research/cursor-execution/P4A-composer-review-result.json` (not approved; two P2 + P3 hygiene)  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

Write-scoped:

| Path | Change |
|---|---|
| `platform/apps/web/package.json` | Default `dev` → `next dev --webpack`; add `smoke:dev` script |
| `platform/package.json` | Root `smoke:dev` gate; RTL + jsdom + user-event deps |
| `platform/package-lock.json` | Lockfile for new test deps |
| `platform/apps/web/scripts/smoke-dev-practice.mjs` | Bounded default-dev smoke (project → webpack `next dev` → HTTP/content → kill tree) |
| `platform/apps/web/next.config.ts` | Comment: webpack for both `build` and default `dev` |
| `platform/apps/web/components/games/AudioMatchGame.tsx` | Remove impure render-time `emitAudioMatchAttempt`; static unavailable copy only |
| `platform/apps/web/components/games/GameRenderer.tsx` | Exhaustive `switch` dispatch tied to `PracticeGameId` |
| `platform/apps/web/components/games/FlashcardsGame.tsx` | Retry sets visible `retry` feedback message (parity with other modes) |
| `platform/apps/web/lib/content/routes.ts` | `listCanonicalPracticeRoutePaths` uses `PRACTICE_GAME_IDS` |
| `platform/tests/web/p4a-games-behavior.test.ts` | RTL/jsdom interaction tests: select/submit/reveal/retry/keyboard/emit/non-emit |
| `platform/tests/web/p3c-search.test.ts` | Allow `-behavior.test.ts` in root-exclude naming contract |
| `platform/tsconfig.json` | Exclude behavior test from root tsc (covered by web-tests) |
| `research/cursor-execution/P4AR1-worker-report.md` | This report |

Not edited: plans, register, packet docs, content/learning packages, resources, archive, samples, media, governance.

## P2 fixes

### 1 — Dev vs production module resolution

- Default `dev` is now `npm run project && next dev --webpack`, matching production `next build --webpack` + `extensionAlias` / learning alias.
- Named gate `npm run smoke:dev` runs `apps/web/scripts/smoke-dev-practice.mjs`:
  - projects content via `tsx` (same as `npm run project`)
  - starts **webpack** `next/dist/bin/next dev --webpack` on controlled port `4321` (override `SMOKE_DEV_PORT`)
  - asserts `/practice`, `/practice/article-choice` (enabled), `/practice/audio-match` (unavailable) HTTP 200 + content
  - terminates only its process tree (`taskkill /T` on Windows; process-group SIGTERM on POSIX)
- Evidence: `smoke:dev PASS (3 checks)`; port 4321 free after exit.

### 2 — Behavioral component interaction tests

- New `p4a-games-behavior.test.ts` (`@vitest-environment jsdom`) uses `@testing-library/react` + `user-event` against real client components (not static markup grep).
- Covered: empty non-emit; selection + submit → correct emit; reveal → partial; retry reset; flashcard selfRatedAttempt + keyboard Enter/Space flip; verb-builder Enter submit; morphology incorrect/partial; audio-match no Submit / no emit.
- Flashcards retry now surfaces `data-feedback="retry"` with message (was kind-only / message null → invisible).

## P3 hygiene (adjacent)

- AudioMatch: no render-time emit call; unit `emitAudioMatchAttempt` remains in `p4a-games.test.ts`.
- Practice route list centralized on `PRACTICE_GAME_IDS`.
- `GameRenderer` dispatch is exhaustive (`never` default).

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run check` | 0 | typecheck + typecheck:web + typecheck:web-tests + test + validate:publication + test:web; **18** files / **402** tests; publication `VALIDATION_OK`; web **12** files / **114** tests |
| `npm run build:web` | 0 | Next 16.3.0 webpack; practice selector + **7** game routes SSG; prior lessons/activities/details intact |
| `npm run audit:prod` | 0 | **0** vulnerabilities |
| `npm run smoke:web-routes` | 0 | **37/37** checks PASS |
| `npm run smoke:dev` | 0 | **3/3** checks PASS (selector + enabled game + audio unavailable under webpack default-dev) |

## Remaining gaps (honest)

- Persistence / missions / rewards still out of scope.
- Audio match still unavailable until listening-approved public media.
- `EmitResult.reason: "unsafe-input"` remains unused (P3 note; emit still grades unsafe as incorrect — allowed).
- Orchestrator owns approval / register closure; this report does not claim them.

## Honesty

No approval claim. No commit/push. No German invention, review-plural promotion, candidate-media exposure, resources/archive/samples/media edits, plans/register edits, or security/publication gate weakening. Gates were not weakened.
