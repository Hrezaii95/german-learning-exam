# DEPLOY1 — GitHub Pages continuous deployment

## Decision

Cloudflare token smoke returned 401 and no Vercel/Cloudflare cached login exists. GitHub authentication has push access to public `Hrezaii95/german-learning-exam`. Deliver a static GitHub Pages production build with automatic Actions deployment from a dedicated `codex/live-alpha` branch. Keep the normal webpack server build/dev gates working.

## Requirements

1. Add a separate `build:pages` target using Next 16 `output: "export"`, `trailingSlash: true`, unoptimized images if relevant, and environment-derived `basePath`/`assetPrefix` of `/german-learning-exam`. Normal `build`/`dev` must retain their current behavior.
2. Make every currently shipped page statically exportable without losing functionality:
   - dashboard, lessons, 23 activities;
   - six hubs + directory;
   - search;
   - three details;
   - practice selector + seven game pages;
   - conversation selector + representative ladder.
   Convert request-time `searchParams` pages to static server shells plus client `useSearchParams` under Suspense. Do not silently remove filters/search/back context.
3. Proxy is unsupported in static export. Preserve canonical encoded links; static deployment may omit raw-colon redirect behavior, but canonical routes must work and aliases/unknowns must not expose data. Do not weaken normal server route tests. Isolate/disable proxy only for Pages build using a safe build wrapper if necessary; no destructive source mutation and restore-on-failure if files must move.
4. All internal asset/navigation URLs must work under the repo base path. Route logic and semantic canonical paths remain app-relative; apply the base path only at rendering/deployment boundary so normal runtime tests remain stable.
5. Produce `.nojekyll` and an honest custom `404.html`. No service-worker/offline claim yet.
6. Add `.github/workflows/deploy-pages.yml`:
   - triggers push to `codex/live-alpha` and manual dispatch;
   - least permissions: contents read, pages write, id-token write;
   - concurrency cancel-in-progress;
   - Node 22, `npm ci` in `platform`, `npm run check`, `npm run build:pages`;
   - upload only `platform/apps/web/out` via official Pages actions and deploy-pages;
   - never consume local app/service secrets.
7. Add deterministic static-export verification:
   - exact expected route/file manifest (2 lessons, 23 activities, 3 details, 7 games, conversation route, hubs/search);
   - asset references include correct base path and no broken `_next` URLs;
   - serve `out` through a Pages-like static server under `/german-learning-exam/` and HTTP-smoke representative routes/assets, 404, game interaction hydration where feasible;
   - recursively scan output for secrets, absolute developer paths, review plurals, private/media paths, `.mp3`, and source/assertion metadata.
8. Do not include or copy `resources/original`, archive, samples, candidate media, secrets, recordings, or `.cursor` state into output/workflow artifacts.

## Gates/report

Run normal `npm run check`, `npm run build:web`, audit, server route smoke, dev smoke; plus `npm run build:pages` and `npm run smoke:pages`. Write `research/cursor-execution/DEPLOY1-worker-report.md`. No git staging/commit/push or external deployment in this packet; orchestrator performs security review and release. Do not edit plans/register, claim full Alpha/audio approval, or claim deployment.
