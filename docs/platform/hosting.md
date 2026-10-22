# Cloudflare hosting and release operations

The app remains a Next static export. `german-web` serves its root-path assets
at `german.learnilabs.com`, with `/api` and `/api/*` reaching the Worker first.
The `DB` binding targets `german-db` in the EU jurisdiction. The GitHub Pages
variant keeps `/german-learning-exam`; its deployment workflow is unchanged.

## Sequential verification

From `platform/`, run the application/Pages checks, followed by the edge/root
checks. Never overlap builds or typechecks; the export wrapper briefly parks
`proxy.ts` and patches dynamic route literals.

```sh
npm ci
npm run check
npm run build:web
npm run audit:prod
npm run smoke:web-routes
npm run smoke:dev
npm run gates:pages
node ../tools/audit-attribution.mjs
npm run typecheck:edge
npm run test:edge
node apps/edge/scripts/rehearse-go-live.mjs
npm run build:cloudflare
npm run smoke:cloudflare
npm run deploy:cloudflare -- --dry-run
node apps/edge/scripts/rehearse-go-live.mjs --local
```

`gates:pages` includes export, route/asset smoke, learner-language, offline and
word-card checks. Technical pronunciation auditing runs separately as
`node tools/audit-alpha-tts.mjs` from the repository root. Qualified German and
listening review remain independent human gates.

The full `tools/validate-source-manifest.mjs` audit requires the private original
archive. Per the orchestrator's 2026-10-22 decision, it remains a local/owner-
machine check. Hosted CI runs the existing deploy-pages gate set and additional
reproducible checks; published audio still has exact byte allowlists. Do not
report an unavailable private-source audit as passed.

## Export and security boundaries

The root exporter sets `GL_SITE_BASE_PATH=""`, `GL_PAGES_EXPORT=0` and an empty
public base. It reuses the existing isolation and offline-finalization helpers,
and restores only the source mutations it owns. Failed ambiguous-state recovery
leaves conflicting files for inspection. The existing Pages guard remains
unchanged.

Root manifest IDs, `start_url`, service-worker scope and precache URLs use `/`.
The root smoke scans the export, verifies media allowlists and offline hashes,
then exercises real local Wrangler routing. The combined branch must have no
broken local references; Lane 1 owns the existing Lesson 10–12 link corrections.

Static assets bypassing the Worker receive the generated `_headers` policy.
The Worker protects API/fallback responses. The static CSP allows inline
hydration scripts/styles used by the existing static export, but disallows
remote scripts, `unsafe-eval`, objects and framing. Authenticated API responses
use `no-store`; the generated service worker must bypass all API/private data.

Workers Paid is required already for the export's static asset count, and for
the password hash workload. The root smoke reports the actual file count and
rejects assets above the platform limit. CPU evidence for the selected Argon2id
parameters belongs to the workerd auth tests and the Lane 3 status record.

## Release scripts

Only the owner-run `go-live.yml` creates resources. Its first step checks branch
and secrets, before checkout or Cloudflare commands. Ordinary push deployment
checks token/account first and reuses an existing database; missing credentials
or an absent database produce an explicit successful skip.

`release-config.mjs` parses the pinned Wrangler configuration as strict JSON,
validates one matching database UUID with `jurisdiction=eu`, and writes a
temporary configuration beside the original. This preserves relative source,
asset, migration and module-rule paths. The file contains identifiers and the
tested commit, never secrets, and is removed in `finally`.

`go-live.mjs` executes argument arrays without a shell. D1 listing uses JSON;
creation text is discarded and the result is re-listed as JSON. Existing
non-EU databases fail closed. Migrations run before deployment; seeding uses
only the environment secret and never requests a password reset. Raw provider
stdout/stderr are withheld to prevent accidental credential/hash disclosure;
logs and summaries show fixed step names.

`smoke-accounts.mjs` signs in as the demo student and teacher, checks role,
secure host-cookie attributes and session ownership, then signs out and verifies
revocation. Cookies/passwords remain in memory. Continuous deployment performs
public/version smoke without demo passwords.

Rollback derives a target from deployment metadata and deploys that explicit
version to 100% traffic. An annotation makes a repeated rollback a no-op until
another deployment occurs. No database operations are part of rollback.

`rehearse-go-live.mjs` defaults to an injected simulation of the entire
find/create/migrate/dry-run/deploy/seed/smoke sequence, repeated twice. Add
`--local` after building the root export to exercise the same release function
against an isolated real local D1 database. This mode runs real migrations and
the Argon2id seed CLI twice, replaces both deployment commands with actual
`wrangler deploy --dry-run`, and starts local workerd to verify pages, headers,
health/version, honest 404s, and student/teacher sign-in and session revocation.
It verifies five users, five identities, one class, three members and zero
remaining sessions after each run, then deletes temporary state and configs.

Local rehearsal generates temporary passwords in memory and removes Cloudflare
credentials from child environments. D1 discovery/creation and EU registry
metadata remain explicit fixtures; no Cloudflare API or remote resource is
used. HTTPS, DNS, EU cloud placement and actual deployment still require the
owner workflow. A simulated pass is never reported as a real local pass.

## Owner-only setup and evidence

Before release, Lane 1 must update the normal-route smoke's former future-route
assumption: `apps/web/scripts/smoke-canonical-routes.mjs` currently puts
`/dashboard` in the list expected to return 404 (around line 231). L3-6 implements
that route, so its correct result is now 200. Move only `/dashboard` into the
successful learner-route checks and retain the malformed vocabulary/verb 404
assertions. The unchanged normal smoke currently fails on this exact assertion;
Lane 3 does not edit the Lane 1-owned script or suppress the failure. This is
separate from the three known lesson 010–012 links and must be resolved before
the combined branch or deployment workflow can pass.

Follow [GO-LIVE.md](GO-LIVE.md): merge the reviewed integration, expose the manual
workflow on the default branch, activate the intended zone/Workers Paid, add
exactly three repository secrets and run Go live. Lane workers create no remote
resources or secrets and never merge the live branch.

The initial repository default was `master`, so selecting `codex/live-alpha` as
the default branch is a one-time owner action needed for the new workflow's
Run workflow button. Missing-token skips, draft PRs, local simulations and dry
runs must be distinguished from a successful public deployment.

The checkout action is pinned. Immediately after checkout, workflows remove its
temporary credential and remove only the pre-existing malformed sample gitlink
from the ephemeral runner index so the action's cleanup can complete. HEAD and
the archived sample bytes are unchanged; the runner never commits that index.
