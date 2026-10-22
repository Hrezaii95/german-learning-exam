# Lane 3: platform (Cloudflare, accounts, progress sync, dashboards)

**Goal:**
- Put the app on Cloudflare at **https://german.learnilabs.com**.
- Add accounts (username + password now; email and Google later, prepared), with roles and the 5 seed users.
- Sync personal progress across devices, and build the student, teacher and admin dashboards and server-backed Class mode.

**Read first:**
- `docs/lanes/README.md` and `docs/lanes/CONTRACTS.md`;
- `docs/platform/infrastructure-and-accounts.md` (the architecture, data model, auth, sync, seed and owner actions);
- `docs/platform/dashboards.md`;
- ADR-018 in `docs/DECISIONS.md`;
- `CLAUDE.md` (gates, the build-concurrency warning, the pre-commit hook).

## You own
- **The edge Worker:** `platform/apps/edge/**` (new: `wrangler.jsonc`, `src/**` for the Worker, API routes and auth, `migrations/*.sql`, `scripts/seed.ts`). Delete the old stub `platform/apps/web/worker/` once `apps/edge` replaces it.
- **Sync:** `platform/packages/sync/**` (new: the registry, client and merge logic).
- **Web routes:** `platform/apps/web/app/{login,account,dashboard,teacher,admin}/**`.
- **Web code:** `components/{account,dashboard,teacher,admin}/**` (you own `components/account/AccountSlot.tsx` **after** Lane 1's L1-1 creates the stub) and `lib/{account,api-client,sync}/**`.
- **Build and CI:** `platform/apps/web/next.config.*` (adding a root-path build variant **without** breaking the Pages variant); `.github/workflows/**` (new `deploy-cloudflare.yml` and `seed-accounts.yml`; keep `deploy-pages.yml` working until cutover).
- **Dependencies:** new npm dependencies (you are the only lane that adds them), plus the lockfile regeneration.
- **Docs:** `docs/platform/**`.

## You must not touch
- Game internals (`/play/**`, `components/wortwerk/**`, `lib/wortwerk/**`, `packages/{wortwerk,learning}/**`). Integrate only through CONTRACTS §4–§8 and §10.
- Cheat sheets, tokens or the shell (Lane 1). Your nav entries go into `lib/content/nav.ts` after L1-1 merges.

## PR plan, in this order
| PR | Content | Done when |
|---|---|---|
| **L3-1 hosting (no accounts yet)** | `apps/edge` Worker serving the static export with `basePath ""`; the root-path build variant; `smoke-pages` running against both base paths; `deploy-cloudflare.yml` (gates → export → `wrangler deploy`) on push to `codex/live-alpha`; the custom domain `german.learnilabs.com` in `wrangler.jsonc`; security headers (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`); the service worker scope working at `/` | the current app is live at german.learnilabs.com with all smokes green; GitHub Pages is unchanged |
| **L3-2 database and auth** | D1 migrations for every table in the platform doc §2; password auth per §3.1 (choose Better Auth or hand-rolled; write ADR-020); sessions, CSRF, rate limiting, Turnstile after 5 failures; `/api/auth/*`; `/login/`, `/account/` (change password, sign out, export, delete); `lib/account/session.ts` (CONTRACTS §8); `AccountSlot`; the reserved email/Google routes and flags (§3.2), returning 501 while their flag is off | log in and out work end to end in preview; the security tests pass |
| **L3-3 seed accounts** | `seed-accounts.yml` (`workflow_dispatch`) + `scripts/seed.ts`: hash the `SEED_PW_*` secrets with the API's hash module and upsert the 5 users, the demo class and its memberships via `wrangler d1 execute`; never print passwords; write an audit row | the owner runs it once and all 5 can sign in; `admin` must change the password |
| **L3-4 sync** | `packages/sync` (the registry, `event-log` and `lww-doc` strategies, an offline queue, backoff); wrap `LearnerStateStorageAdapter`; register `wortwerkSyncStores` when present; `/api/sync/push|pull`; the "add this device's progress" prompt; sync status in AccountSlot; the GitHub Pages "We moved" banner + backup export → import page | progress made on device A appears on device B; an offline edit syncs later; repeated merges change nothing |
| **L3-5 classes and assignments** | classes, join codes, roster, class position; assignments stored with the CONTRACTS §6 scope; `assignment_progress` derived from synced `assignment.progress` events; teacher extras as overlay packs (`/api/me/extras`, CONTRACTS §5) | a teacher assigns, a student completes it, and the teacher sees the result |
| **L3-6 dashboards** | `/dashboard/` (student), `/teacher/**` and `/admin/**` per `docs/platform/dashboards.md`; embed `TodayPanel` / `ProgressSummary` (CONTRACTS §10); nav entries by role | each seed account sees its own dashboard; access control is tested for every role |
| **L3-7 cutover** | after the owner says go: GitHub Pages shows the "We moved" banner with a progress export; docs and README point to german.learnilabs.com | the owner confirms |
| **Later (flag-gated, needs owner credentials)** | the email-link and Google sign-in providers; password reset by email; web push reminders; live class game (Durable Objects); feedback inbox (R2) | n/a |

## Security checklist (must pass in L3-2 and later)
- **Secrets:** no secrets or passwords in the repo, logs, error messages or client bundles. Secrets live only in GitHub and Cloudflare.
- **Authorisation on every route:** every `/api` route checks the session, role and resource ownership. Tests try each route as anonymous, student, other-class student, teacher, other teacher and admin.
- **Cookie and input safety:**
  - session cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`;
  - an Origin check on every write;
  - inputs validated with a shared schema;
  - parameterised SQL only.
- **Brute force and user enumeration:** login rate limiting with a generic error message.
- **Privacy:** D1 in an EU location; data export and deletion work; admin actions are audit-logged.

## Rules
- **Branches and PRs:** branches `lane3/<topic>`; draft PRs into `codex/live-alpha`; **never merge**; rebase before each push.
- **Gates (one at a time):** the repo gates, plus `wrangler` dry-run deploys and the API test suite (Miniflare/`wrangler dev` with a local D1).
- **Owner-only steps:** you cannot create Cloudflare resources or secrets. List exactly what the owner must do in each PR body (`docs/platform/infrastructure-and-accounts.md` §7).
- **Status:** update only `plans/lanes/lane-3-status.md`.
