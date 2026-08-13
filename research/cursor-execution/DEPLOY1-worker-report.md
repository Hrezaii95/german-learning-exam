# DEPLOY1 worker report — GitHub Pages continuous static export

Status: implementation evidence returned; **no deployment or approval claimed**  
Packet: `docs/cursor-packets/DEPLOY1-github-pages-continuous.md`  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

Write-scoped:

| Path | Change |
|---|---|
| `platform/apps/web/next.config.ts` | Conditional Pages export (`GL_PAGES_EXPORT=1`): `output: "export"`, `trailingSlash`, unoptimized images, `basePath`/`assetPrefix` `/german-learning-exam`. Normal `build`/`dev` unchanged. |
| `platform/apps/web/lib/content/pages-base-path.ts` | Deploy-boundary base-path helper for raw HTML form `action` only (`next/link` uses Next `basePath`). |
| `platform/apps/web/lib/content/search-params-record.ts` | `URLSearchParams` → record for hub/search parsers. |
| `platform/apps/web/lib/content/ssg-dynamic-params.ts` | Empty stub left after abandoned imported-constant approach (Next requires literal `dynamicParams`). |
| `platform/apps/web/components/hubs/HubNavViews.tsx` | Client `useSearchParams` hub filter shell. |
| `platform/apps/web/components/hubs/HubRoutePage.tsx` | Static server shell + Suspense; no async `searchParams`. |
| `platform/apps/web/components/hubs/HubViews.tsx` | Form `action` via `withPagesBasePath`. |
| `platform/apps/web/components/search/SearchNavViews.tsx` | Client `useSearchParams` for `q` + `nav`. |
| `platform/apps/web/components/search/SearchViews.tsx` | Form `action` via `withPagesBasePath`. |
| `platform/apps/web/app/{vocabulary,verbs,grammar,phrases,listening,concepts}/page.tsx` | Static hub shells (no request-time `searchParams`). |
| `platform/apps/web/app/search/page.tsx` | Static search shell + Suspense client params. |
| `platform/apps/web/app/lessons/.../activity/.../page.tsx` | Comment: Pages build temporarily patches `dynamicParams`. Literal remains `true` for server. |
| `platform/apps/web/scripts/build-pages.mjs` | Safe wrapper: park `proxy.ts`, patch `dynamicParams=false` on 6 routes, `next build --webpack` with Pages env, write `.nojekyll`, restore always. |
| `platform/apps/web/scripts/smoke-pages.mjs` | Manifest + asset base-path + leak scan + Pages-like static HTTP smoke. |
| `platform/apps/web/package.json` | `build:pages`, `smoke:pages`. |
| `platform/package.json` | Workspace `build:pages`, `smoke:pages`. |
| `.github/workflows/deploy-pages.yml` | Push/`workflow_dispatch` on `codex/live-alpha`; least permissions; Node 22; `npm ci`/`check`/`build:pages`/`smoke:pages`; upload `out/` only; no local secrets. |
| `research/cursor-execution/DEPLOY1-worker-report.md` | This report |

Not edited: plans, register, packet docs, resources, archive, samples, media, governance. No git stage/commit/push. No external deploy.

## Requirement map

| # | Requirement | Evidence |
|---|---|---|
| 1 | Separate `build:pages` with export/trailingSlash/basePath; normal build/dev preserved | `next.config.ts` gated on `GL_PAGES_EXPORT`; `build:web` route table still shows `ƒ Proxy`; Pages build omits Proxy |
| 2 | All shipped pages statically exportable; hubs/search keep filters via client params | Hub/search static shells + `HubNavViews`/`SearchNavViews`; `smoke:pages` hits `?q=sein` routes |
| 3 | Proxy unsupported in export; isolate without weakening server tests | `build-pages.mjs` parks/restores `proxy.ts`; `smoke:web-routes` still 45/45 incl. raw-colon 308 |
| 4 | Base path only at render/deploy boundary | Canonical paths app-relative; `withPagesBasePath` + Next `basePath` only under Pages env |
| 5 | `.nojekyll` + honest `404.html` | Build finalize + smoke asserts both; HTTP 404 honest body |
| 6 | Workflow on `codex/live-alpha` | `.github/workflows/deploy-pages.yml` as specified |
| 7 | Deterministic static verification | `smoke:pages`: 48-route manifest, asset base path, leak scan (296 files), HTTP smoke |
| 8 | No original/archive/samples/secrets in artifacts | Leak scan + path forbids |

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run check` | 0 | typecheck + web + web-tests + test + validate:publication + test:web; **23** files / **437** tests; publication `VALIDATION_OK`; web **17** / **149** |
| `npm run build:web` | 0 | Next 16.3.0 webpack; Proxy present; hubs/search ○ static; 2 lessons + 23 activities SSG |
| `npm run audit:prod` | 0 | **0** vulnerabilities |
| `npm run smoke:web-routes` | 0 | **45/45** PASS (canonical + raw-colon redirects + 404 boundaries preserved) |
| `npm run smoke:dev` | 0 | **4/4** PASS (practice + conversation) |
| `npm run build:pages` | 0 | Export under `/german-learning-exam`; proxy isolated then restored; `dynamicParams` patched then restored; `.nojekyll` + Next `404.html` |
| `npm run smoke:pages` | 0 | Manifest **48** routes (2 lessons, 23 activities, 3 details, 7 games + hubs/search/conversation); HTTP + asset + 404 + game markers; leak scan clean |

## Honesty

- **No deployment claimed.** Workflow file is present; this packet did not push to `codex/live-alpha` or run Actions deploy.
- **No full Alpha / audio approval claimed.**
- Static Pages omits raw-colon **redirect** behavior (no proxy); canonical encoded routes work; unknowns/404 do not expose learner bodies (smoke-checked).
- Server/dev gates were not weakened: proxy + `dynamicParams = true` remain in source for normal builds.
- Empty stub `lib/content/ssg-dynamic-params.ts` is unused residue from an invalid imported-constant attempt (Next rejects non-literal page config); safe to delete in a follow-up cleanup.

## Remaining gaps (honest)

- Orchestrator owns security review, branch cut to `codex/live-alpha`, and first Pages release.
- Client-side RSC prefetch quirks under `basePath` + static export (upstream Next issues) were not exhaustively browser-automation tested beyond HTTP + hydration asset markers.
- No service-worker / offline claim (per packet).
