# Lane 3 status

Updated by Lane 3 only. Format: one row per PR.

| PR | Title | State (planned / in progress / draft PR / merged / blocked) | Link | Notes |
|---|---|---|---|---|
| L3-1 | Cloudflare static hosting at the root path | draft PR | https://github.com/Hrezaii95/german-learning-exam/pull/3 | Implementation verified locally; release blocked by three Lane 1 links and unavailable private-source audit. No live deployment claimed. |
| L3-0 | Secret-free lane CI | draft PR | https://github.com/Hrezaii95/german-learning-exam/pull/6 | Independent two-file CI PR; source-archive gate remains blocking. |
| L3-2 | Database and auth | blocked | — | Approved 600,000-iteration WebCrypto PBKDF2 conflicts with the current Workers runtime limit; see below. No hashing requirement reduced. |
| L3-3 | Seed accounts | planned | — | Depends on the approved auth hash module. |
| L3-4 | Sync | planned | — | Depends on authenticated API; API service-worker exclusion must precede release. |
| L3-5 | Classes and assignments | planned | — | Depends on auth and sync. |
| L3-6 | Dashboards | planned | — | Depends on role API and Lane 2's optional panels. |
| L3-7 | One-click go-live | planned | — | Depends on migrations, hashing, seed and live account smoke. |

## Working rules

The owner explicitly requested L3-1 first and one draft PR per item into
`codex/live-alpha`, with no merges. This overrides the older single visibility
and integration-PR procedure. `lane3/main` is the Lane 3 checkpoint branch;
item branches retain each draft's snapshot. No other lane files, publication
state, secrets, Cloudflare resources or the orchestrator baton are changed.

## Verification

Verified 2026-10-22, with builds and typechecks run sequentially:

| Check | Result |
|---|---|
| Application typechecks (platform, web, web tests) and web lint | pass |
| Full unit suite | 108 files / 1,225 tests pass |
| Publication validation | pass via `node --import tsx` |
| Dedicated web suite | 99 files / 886 tests pass |
| Normal production build | pass, 1,618 generated pages |
| Production dependencies | 0 vulnerabilities |
| Production route smoke | 50 checks pass |
| Default-dev smoke | 4 checks pass with direct-loader harness |
| GitHub Pages export | pass, same Pages env/controller/finalizer |
| Original Pages smoke | 128-route manifest, 27,250-file leak scan, 38 HTTP routes + assets/errors pass |
| Pages language/offline/card audits | pass; 1,618 HTML files, 159 precache URLs, 989/989 forms with audio, 722 card routes |
| TTS/attribution audits | pass; 354 recordings / 0 technical failures; attribution after export |
| Edge typecheck + tests | pass, 9 tests including failure recovery fixtures |
| Root export | pass, 27,258 assets, 166 verified precache URLs, scope `/` |
| Local real Wrangler routing/security smoke | 1,616 pages + 497 assets + API and honest 404s pass |
| Overall root smoke | **FAIL** on exactly three inherited lesson links (below); no exemption |
| Real Chromium, mobile 390 × 844 | pass: root hydration, client navigation, no CSP violations, SW control at `/`, offline reload HTTP 200 |
| Wrangler production dry run | pass; no resources created |
| Workflow YAML/preflight | pass; missing config skips, configured release ref proceeds; CI script detector validated |
| Full original-source audit | **FAIL**: 454 originals absent from checkout; mandatory gate retained |
| Hosted CI | run 39787162824: checkout, immediate credential cleanup and Node setup pass; remaining gates running, no green claim |
| Live custom domain | pending owner merge/setup and release blockers; no live deployment claimed |

The local host refuses the Unix IPC socket created by the `tsx` CLI, so literal
`npm run check` stopped at its publication CLI after the typechecks, lint and
1,225 tests passed. The remaining publication/web steps passed separately.
Normal/Pages builds and the dev smoke used the same existing modules and
assertions with `node --import tsx` substituted for the CLI; those are equivalent
runs, not claims that the literal wrapper commands passed here. Lane 3 scripts
use the direct loader. The existing scripts are unchanged.

Run the optional browser verification with
`GL_BROWSER_EXECUTABLE=/path/to/chromium npm run smoke:cloudflare:browser`, or
install Playwright Chromium and omit the variable. The ordinary Playwright
browser download was truncated on this host; the passing run used a separately
extracted Chromium 153 binary. No browser test dependency was added.

## Cross-lane/release blockers

- **Lane 1:** `components/study/LessonFour.tsx` `NewChapterCards` builds
  `/lessons/0${c.number}`, producing `/lessons/010/`, `/lessons/011/` and
  `/lessons/012/`. Its existing badge and canonical route generator use
  `String(c.number).padStart(2, "0")`. Only `out/lessons/index.html` has these
  three bad links. Lane 3 does not edit the source or exempt the links. Plan
  update on PR #1: comment 6341629747.
- **Orchestrator:** `validate-source-manifest.mjs` is explicitly a canonical
  project gate. The checkout has 2 of 456 originals because `.gitignore`
  intentionally excludes the rest. Arrange trusted archive-bearing validation
  or explicitly record a gate-placement amendment; do not silently drop it.
  Both new workflows keep it blocking after reproducible checks and before
  deployment. Existing publication and exported audio checksum checks pass.
- **Before accounts:** generated Cloudflare SW must bypass `/api` and
  `/api/*`, and must not cache private/no-store responses. The current source
  caches successful same-origin GETs; headers alone are insufficient.

## L3-2 architecture conflict

The approved document requires PBKDF2-HMAC-SHA256 via WebCrypto with 600,000
iterations. Cloudflare's current source sets
`DEFAULT_MAX_PBKDF2_ITERATIONS = 100000`; its Node crypto implementation calls
the same `checkPbkdfLimits`, so `nodejs_compat` does not remove the limit.
The proposed increase is still open. Local workerd can have different limits;
a passing local test would not establish production support.

- https://github.com/cloudflare/workerd/blob/main/src/workerd/io/limit-enforcer.h
- https://github.com/cloudflare/workerd/blob/main/src/workerd/api/node/crypto.c%2B%2B
- https://github.com/cloudflare/workerd/pull/7550

Better Auth was evaluated: D1 is supported, but its default email-required user
creation and plaintext session-token schema need adapting to the approved
nullable-email and hash-only-session contract. Its custom hash callback faces
the same runtime cap. A supported implementation preserving all 600,000
iterations, or a revised auth architecture, needs an explicit design decision;
silently lowering the iteration count is not an option.

## Owner

- Merge approved PRs; this lane never merges them.
- For L3-1, activate/verify the `learnilabs.com` Cloudflare zone, add
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, enable Workers Paid
  (the static export already exceeds 20,000 assets), and run the deployment.
- GitHub Actions must be available; local passing checks cannot manufacture
  hosted check results if billing or account policy prevents execution.
- Before full platform go-live, enable Workers Paid and add
  `SEED_ACCOUNTS_JSON` as documented in `docs/platform/GO-LIVE.md`.
- Resolve the L3-2 hashing/runtime design conflict without weakening security.

## Hosted checkout correction (L3-0 / L3-1)

Run 39786214328 reached a hosted runner, then checkout failed because immediate
credential cleanup traversed the archived gitlink without a `.gitmodules` URL.
A minimal Git fixture reproduced this; sparse checkout alone also failed.
Both new workflows now remove the authorization header immediately after
checkout (before setup/install/build), then remove only that gitlink entry
from the ephemeral runner index so post-job cleanup can traverse safely.
The archive and committed repository tree stay unchanged. The fixture verifies
credential removal, successful submodule traversal and preserved source/archive
bytes. Unexpected credential-cleanup errors fail closed.

Hosted rerun 39787162824 confirms Checkout, immediate credential cleanup and
Node setup pass on the published L3-0 fix. Dependency installation and the
remaining gates were still running at this checkpoint; no full-CI success is
claimed. The retained private-source audit remains a known release blocker.
