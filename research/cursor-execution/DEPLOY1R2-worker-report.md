# DEPLOY1R2 worker report — must200 Pages hydration smoke strictness

Status: implementation evidence returned; **no deployment, staging, commit, push, or approval claimed**  
Prior review: `research/cursor-execution/DEPLOY1R1-composer-review-result.json` (Composer: not APPROVED; sole residual **P2** closed here)  
Packet scope: narrow DEPLOY1R2 — only the must200 HTTP `_next` gap from DEPLOY1R1 final review  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

| Path | Change |
|---|---|
| `platform/apps/web/scripts/smoke-pages.mjs` | Extract `assertBasePrefixedNextAssets`; every `must200` HTTP page requires exact `/german-learning-exam/_next/` and rejects bare `src`/`href` `/_next/`; game block shares the same helper; direct-run guard so the helper is importable |
| `platform/tests/web/deploy1r2-pages-smoke-hydration.test.ts` | Focused regressions: accept base-prefixed refs; reject bare-only, base-without-`_next`, mixed bare `src`/`href`; source contract that `must200` no longer uses weak `PAGES_BASE \|\| "_next"` |
| `research/cursor-execution/DEPLOY1R2-worker-report.md` | This report |

Not edited: plans, register, resources, archive, samples, media, workflows, build wrapper, other smokes. No git stage/commit/push. No external deploy.

## Composer finding → fix map

| Severity | Finding (DEPLOY1R1 final review) | Resolution |
|---|---|---|
| **P2** | `must200` HTTP loop only asserted `text.includes(PAGES_BASE) \|\| text.includes("_next")` — did not require `${PAGES_BASE}/_next/` or reject bare root `/_next` for concepts, encoded activity, detail, conversation, etc. | Every `must200` route now calls `assertBasePrefixedNextAssets(text, path)` which requires `/german-learning-exam/_next/` and rejects `src="/_next/`, `href="/_next/`, and `"\/_next/` |

Prior DEPLOY1R1 P1/P2 items left untouched (already closed). P3 tombstone hygiene out of scope.

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run test:web -- tests/web/deploy1r2-pages-smoke-hydration.test.ts` | 0 | **19** files / **168** tests; **6/6** DEPLOY1R2 hydration tests PASS |
| `npm run build:pages` | 0 | Export under `/german-learning-exam`; isolate → build → restore; `.nojekyll` + `404.html` |
| `npm run smoke:pages` | 0 | Manifest **48** routes; leak scan **296** files; HTTP **15** `must200` routes with base-prefixed `_next` + asset + 404 + game markers |

## Honesty

- **No deployment claimed.** No push to `codex/live-alpha`, no Actions run, no Pages publish.
- **No git stage/commit/push.**
- **No APPROVE claim.** Orchestrator owns re-review after this narrow P2 close.
- Scope intentionally limited to the sole residual P2 from DEPLOY1R1 final review; SHA authenticity spot-check and P3 tombstone delete remain outside this packet.
