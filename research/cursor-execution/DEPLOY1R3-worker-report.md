# DEPLOY1R3 worker report — smoke-pages.mjs type declaration + tombstone hygiene

Status: implementation evidence returned; **no deployment, staging, commit, push, or approval claimed**  
Prior: DEPLOY1R2 APPROVED; residual gap was root/`typecheck:web-tests` **TS7016** on `smoke-pages.mjs` import  
Packet scope: narrow DEPLOY1R3 — module typing for `assertBasePrefixedNextAssets` + unused `ssg-dynamic-params` absence  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

| Path | Change |
|---|---|
| `platform/apps/web/scripts/smoke-pages.d.mts` | **New** ESM declaration sibling for `smoke-pages.mjs` — exports `assertBasePrefixedNextAssets(html, label, pagesBase?)` |
| `platform/apps/web/lib/content/ssg-dynamic-params.ts` | Confirmed **absent** on disk; cleared staged AD tombstone so index no longer reintroduces the unused stub |

Not edited: plans, register, resources, archive, samples, media, workflows, smoke logic, tests (logic), deploy configs. No git stage/commit/push. No external deploy.

## Finding → fix map

| Severity | Finding | Resolution |
|---|---|---|
| **P2** (typecheck) | `tests/web/deploy1r2-pages-smoke-hydration.test.ts` imports `../../apps/web/scripts/smoke-pages.mjs` → **TS7016** under root `tsc` and `typecheck:web-tests` | Colocate `smoke-pages.d.mts` (`.mjs` pairs with `.d.mts` under bundler resolution; plain `.d.ts` / ambient relative `declare module` do **not** bind). Signature matches runtime: `(html: string, label: string, pagesBase?: string) => void` |
| **P3** (hygiene) | Unused `ssg-dynamic-params.ts` tombstone (DEPLOY1R1 leftover; AD staged+deleted) | File absent from working tree; staged phantom add unstaged so path is fully gone |

## Why `.d.mts` (not `.d.ts`)

`tsc --traceResolution` strips the `.mjs` extension and looks for `smoke-pages.mts` then `smoke-pages.d.mts`. A sibling `.d.ts` is treated as CJS-shaped and is **not** used for the `.mjs` import.

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run check` | 0 | typecheck + web + web-tests + test + validate:publication + test:web; **25** files / **456** tests; publication `VALIDATION_OK`; web **19** / **168** (incl. **6** DEPLOY1R2 hydration) |
| `npm run build:pages` | 0 | Isolate → project → Next export under `/german-learning-exam`; restore; `.nojekyll` + `404.html` |
| `npm run smoke:pages` | 0 | Manifest **48** routes; leak scan **296** files; HTTP **15** `must200` + asset + 404 + game markers |

## Honesty

- **No deployment claimed.** No push to `codex/live-alpha`, no Actions run, no Pages publish.
- **No git stage/commit/push** of the new declaration (working tree only). Tombstone: only `git restore --staged` to drop the AD phantom — no commit.
- **No APPROVE claim.** Orchestrator owns re-review after this narrow typecheck/tombstone close.
- Smoke helper runtime behavior unchanged; typing only.
