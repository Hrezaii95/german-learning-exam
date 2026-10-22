# Cloudflare hosting — L3-1

This item supplies static hosting and `/api/health`. Accounts and D1 are later
items. A draft PR or a local dry run does not mean the custom domain is live.

## Build and verification

Run these commands from `platform/`, sequentially:

```sh
npm ci
npm run check
npm run build:web
npm run audit:prod
npm run smoke:web-routes
npm run smoke:dev
npm run gates:pages
npm run typecheck:edge
npm run test:edge
npm run build:cloudflare
npm run smoke:cloudflare
npm run deploy:cloudflare -- --dry-run
```

For real-browser verification, install Playwright Chromium and run
`npm run smoke:cloudflare:browser`, or set `GL_BROWSER_EXECUTABLE` to a suitable
local Chromium. It checks mobile hydration, client navigation, CSP, root
service-worker control and an offline reload. It creates no cloud resources.

Also run the source manifest, pronunciation and attribution audits named in
`CLAUDE.md` from the repository root. Do not overlap builds or typechecks.

The original Pages wrapper, base-path guard, smokes, shell and offline source
remain unchanged. The root exporter reuses their recovery/isolation primitives
and restores all temporary changes in `finally`. It invokes Next with
`GL_SITE_BASE_PATH=""`, `GL_PAGES_EXPORT=0` and an explicitly empty public base.
The root manifest, registration and precache use `/`.

`smoke:cloudflare` is the separate root-path smoke-pages runner in `apps/edge`.
It checks every exported route, local references, exact audio allowlists,
private-path/secret leaks, offline hashes/scope, asset limits and real local
Wrangler routing. This keeps the existing Pages smokes' fixed-base assertions
intact, within the lane ownership boundary.

Security headers apply at both layers: generated `_headers` protects static
assets served before the Worker; the Worker protects API and fallback responses.
The static CSP permits inline script/style because the existing static Next
export embeds hydration scripts. It prohibits remote scripts and `unsafe-eval`,
objects and framing. A nonce policy would require a rendering change.

The production configuration names `german-web` and the custom domain. The
`preview` environment has its own Worker name and no custom-domain route.
L3-1 creates no database. Later items add lookup/migrations once D1 exists.

## Owner-only steps for this item

1. Review and merge the approved changes into `codex/live-alpha`.
2. Ensure `learnilabs.com` is active in the intended Cloudflare account and
   enable Workers Paid. The current export exceeds the Free asset-count limit.
3. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub repository
   secrets, using the permissions in [GO-LIVE.md](GO-LIVE.md).
4. Let the push deployment run, or dispatch **Deploy Cloudflare** on
   `codex/live-alpha`. Missing credentials produce a notice and a successful
   skip. GitHub Actions must be available for this deployment.

No Cloudflare resources or secrets are created by the lane. The release job
deploys only after both exports, gates and a dry run pass. It then tests the
public URL; the job summary records the commit and outcome. The existing Pages
workflow remains independent.

Workers Paid is required for later auth and for exports above 20,000 assets;
the root smoke reports the actual count. The per-file limit is 25 MiB. Current
limits: https://developers.cloudflare.com/workers/platform/limits/#static-assets.

## Release gate prerequisites

The full source audit is a canonical gate in the operating model. A fresh Git
checkout contains only two original note files; 454 original PDFs/media are
intentionally excluded by `.gitignore`. The validator therefore fails on this
checkout. It remains unchanged and blocking in both new workflows, after the
reproducible application checks and before any deployment. The orchestrator
must arrange a trusted archive-bearing validation environment or record an
explicit gate-placement amendment. This lane does not omit the gate or claim
that the full archive has passed validation.

The current root smoke also rejects three inherited links on `/lessons/`:
`/lessons/010/`, `/lessons/011/`, `/lessons/012/`. Their source belongs to Lane 1
(`NewChapterCards` in `components/study/LessonFour.tsx`). They remain release
blockers until corrected; all 1,616 exported public pages and 497 referenced
assets pass the separate real local Worker HTTP checks.

## Follow-up before accounts

The existing service-worker source caches successful same-origin GETs,
including `/api/*`. Before L3-2 ships, the generated Cloudflare service worker
must bypass API requests and private/no-store responses, with behavioral tests.
Headers alone do not solve this cache behavior.
