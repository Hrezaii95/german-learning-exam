# DEPLOY1R1 worker report — GitHub Pages release hardening

Status: implementation evidence returned; **no deployment, staging, commit, or push claimed**  
Packet: `docs/cursor-packets/DEPLOY1R1-release-hardening.md`  
Prior review: `research/cursor-execution/DEPLOY1-composer-review-result.json` (Composer: not APPROVED; P1/P2 closed here)  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

| Path | Change |
|---|---|
| `platform/apps/web/scripts/build-pages-lib.ts` | Transactional Pages isolation: immediate bak tracking, `finally` restore, SIGINT/SIGTERM cleanup, unambiguous stale auto-recover, fail-closed ambiguity, documented recovery, `shell: false` spawns |
| `platform/apps/web/scripts/build-pages.ts` | CLI entry via `tsx` calling the lib controller |
| `platform/apps/web/scripts/build-pages.mjs` | Legacy bridge → `tsx scripts/build-pages.ts` (no `shell: true`) |
| `platform/apps/web/scripts/build-pages-lib.mjs` | Superseded stub (throws; use `.ts`) |
| `platform/apps/web/scripts/build-pages-lib.d.ts` | Placeholder after `.ts` migration |
| `platform/apps/web/package.json` | `build:pages` → `tsx scripts/build-pages.ts` |
| `platform/apps/web/lib/content/pages-export-env.ts` | Fail-fast when `GL_PAGES_EXPORT=1` lacks nonempty matching `NEXT_PUBLIC_GL_PAGES_BASE_PATH` |
| `platform/apps/web/next.config.ts` | Calls `assertPagesExportEnv` before Pages export config |
| `platform/apps/web/.gitignore` | `*.pages-bak`, `proxy.ts.pages-disabled` |
| `platform/apps/web/lib/content/ssg-dynamic-params.ts` | Neutralized tombstone (filesystem unlink blocked by sandbox; unused; safe to delete) |
| `platform/apps/web/scripts/smoke-pages.mjs` | Require base-prefixed `_next`; reject bare `/_next`; HTTP probes for `/concepts/` + encoded activity |
| `.github/workflows/deploy-pages.yml` | Full SHA pins; sequential normal gates before Pages build/smoke/upload/deploy |
| `.github/dependabot.yml` | `github-actions` weekly updates |
| `platform/tests/web/deploy1r1-pages-hardening.test.ts` | Fault injection: partial patch restore, stale recovery, signal cleanup, missing-base, byte-for-byte restore |
| `platform/tests/web/build-pages-lib-shim.d.ts` | Residual empty shim after `.ts` migration |
| `research/cursor-execution/DEPLOY1R1-worker-report.md` | This report |

Not edited: plans, register, resources, archive, samples, media, governance packets. No git stage/commit/push. No external deploy.

## Composer finding → fix map

| Severity | Finding | Resolution |
|---|---|---|
| **P1** | Partial `dynamicParams` patch without restore | Bak written → tracked immediately; `restoreAll` in `finally` + signal handlers |
| **P2** | SIGINT/SIGTERM / hard-kill ops | Handlers restore same path; recovery docs for SIGKILL residue |
| **P2** | Stale `proxy.ts.pages-disabled` blocks next run | Auto-recover when proxy missing + parked present; fail closed if both exist |
| **P2** | `GL_PAGES_EXPORT=1` without public base | `assertPagesExportEnv` fail-fast + negative tests |
| **P2** | Floating Action majors | Pinned to resolved upstream commit SHAs + version comments |
| **P2** | CI missing normal gates | Workflow runs `check`, `build:web`, `audit:prod`, `smoke:web-routes`, `smoke:dev`, then Pages |
| **P2** | Game `_next` false pass | Require `${PAGES_BASE}/_next/`; reject bare root `_next` |
| **P2** | Missing gitignore for park/bak | Added |
| **P3** | Unused `ssg-dynamic-params.ts` | Tombstoned; physical unlink sandboxed (see Honesty) |
| **P3** | Optional concepts/activity HTTP probes | Added to `smoke:pages` |

## Action SHA resolution (mechanical)

Resolved 2026-08-13 via official GitHub API (`gh api repos/<org>/<repo>/git/ref/tags/<tag>`, deref annotated → commit):

| Action | Tag | Full commit SHA |
|---|---|---|
| `actions/checkout` | v4.4.0 | `11d5960a326750d5838078e36cf38b85af677262` |
| `actions/setup-node` | v4.4.0 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `actions/configure-pages` | v5.0.0 | `983d7736d9b0ae728b81ab479565c72886d7745b` |
| `actions/upload-pages-artifact` | v3.0.1 | `56afc609e74202658d3ffba0e8f6dda462b719fa` |
| `actions/deploy-pages` | v4.0.5 | `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` |

Dependabot `github-actions` weekly config added so pins stay renewable.

## Workflow sequencing

Single job, strictly sequential (no parallel Pages wrapper mutation):

1. `npm ci` → `check` → `build:web` → `audit:prod` → `smoke:web-routes` → `smoke:dev`
2. Then `build:pages` → `smoke:pages`
3. Then configure/upload/deploy Pages artifact from `platform/apps/web/out` only

Concurrency group `pages-german-learning-exam` with `cancel-in-progress: true` retained.

## Fault-injection coverage

`tests/web/deploy1r1-pages-hardening.test.ts` (13 tests):

- Partial patch failure restores every written bak byte-for-byte
- Successful patch+restore byte-for-byte
- Failed-build path `restoreAll` byte-for-byte (incl. proxy)
- Stale proxy missing+parked auto-recover
- Stale source+valid bak pairs auto-recover
- Ambiguous both-proxy / patched-without-bak fail closed
- SIGTERM handler registration + restore (`exitProcess: false`)
- Missing/mismatched/empty `NEXT_PUBLIC_GL_PAGES_BASE_PATH` fail-fast; matching base OK

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run check` | 0 | typecheck + web + web-tests + test + validate:publication + test:web; **24** files / **450** tests (incl. **13** DEPLOY1R1); publication `VALIDATION_OK`; web **18** / **162** |
| `npm run build:web` | 0 | Next 16.3.0 webpack; **ƒ Proxy** present; hubs/search static; 2 lessons + 23 activities SSG |
| `npm run audit:prod` | 0 | **0** vulnerabilities |
| `npm run smoke:web-routes` | 0 | **45/45** PASS (canonical + raw-colon redirects + 404 boundaries) |
| `npm run smoke:dev` | 0 | **4/4** PASS |
| `npm run build:pages` | 0 | Export under `/german-learning-exam`; isolate → build → restore (6 routes + proxy); no Proxy in export table |
| `npm run smoke:pages` | 0 | Manifest **48** routes; leak scan **296** files clean; HTTP **15** routes (incl. concepts + encoded activity) + base-prefixed `_next` + 404 + game markers |

Post-`build:pages`: `proxy.ts` restored; no `*.pages-bak` / parked residue.

## Honesty

- **No deployment claimed.** Workflow updated only; no push to `codex/live-alpha`, no Actions run, no Pages publish.
- **No git stage/commit/push.**
- **No full Alpha / audio approval claimed.**
- Physical delete of `ssg-dynamic-params.ts` was blocked by the local sandbox; file content was neutralized to an unused tombstone. Operators may delete the path entirely; nothing imports it.
- Legacy `build-pages.mjs` / `build-pages-lib.mjs` remain only as bridge/stub; canonical entry is `tsx scripts/build-pages.ts`.
- SIGKILL still cannot run JS cleanup (documented); unambiguous stale recovery covers the safe cases.

## Remaining gaps (honest)

- Orchestrator owns security re-review, branch cut, and first Pages release after this hardening.
- Tombstone file path for `ssg-dynamic-params.ts` should be deleted on a machine without the unlink sandbox if a clean tree is required.
