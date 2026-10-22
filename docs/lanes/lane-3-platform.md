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
- **Build and CI:** `platform/apps/web/next.config.*` (adding a root-path build variant **without** breaking the Pages variant); `.github/workflows/**` (new `ci.yml`, `deploy-cloudflare.yml` and `go-live.yml`; keep `deploy-pages.yml` working). `deploy-cloudflare.yml` runs on push to `codex/live-alpha` and skips while there is no token or no database yet; after go-live it finds the D1 database by name and redeploys.
- **Dependencies:** new npm dependencies (you are the only lane that adds them), plus the lockfile regeneration.
- **Docs:** `docs/platform/**`.

## You must not touch
- Game internals (`/play/**`, `components/wortwerk/**`, `lib/wortwerk/**`, `packages/{wortwerk,learning}/**`). Integrate only through CONTRACTS §4–§8 and §10.
- Cheat sheets, tokens or the shell (Lane 1). Your nav entries go into `lib/content/nav.ts` after L1-1 merges.

## PR plan, in this order
| PR | Content | Done when |
|---|---|---|
| **L3-0 CI first** | `.github/workflows/ci.yml` runs every repo gate on `pull_request` and on pushes to `lane*/main` and `integration/all` (no secrets needed), so every lane and the integration PR show green or red | the integration PR shows checks |
| **L3-1 hosting (no accounts yet)** | `apps/edge` Worker serving the static export with `basePath ""`; the root-path build variant; `smoke-pages` running against both base paths; `deploy-cloudflare.yml` (gates → export → `wrangler deploy`) on push to `codex/live-alpha`; the custom domain `german.learnilabs.com` in `wrangler.jsonc`; **every Cloudflare job checks for `CLOUDFLARE_API_TOKEN` first and skips with a notice, not a failure, when it is missing**; security headers (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`); the service worker scope working at `/` | the current app is live at german.learnilabs.com with all smokes green; GitHub Pages is unchanged |
| **L3-2 database and auth** | D1 migrations for every table in the platform doc §2; password auth per §3.1 (choose Better Auth or hand-rolled; write ADR-020); sessions, CSRF, rate limiting with a D1 counter (Turnstile only later, behind a flag, because it needs an extra owner step); `/api/auth/*`; `/login/`, `/account/` (change password, sign out, export, delete); `lib/account/session.ts` (CONTRACTS §8); `AccountSlot`; the reserved email/Google routes and flags (§3.2), returning 501 while their flag is off | log in and out work end to end in preview; the security tests pass |
| **L3-3 seed accounts** | `scripts/seed.ts`: read the single secret `SEED_ACCOUNTS_JSON` (`{"admin":…, "teacher1":…, "student1":…, "student2":…, "student3":…}`), hash the passwords with the API's hash module, and upsert the 5 users, the demo class and its memberships via `wrangler d1 execute`; never print passwords; write an audit row. Test it against a local D1 | seeding a local D1 twice gives the same result, and all 5 can sign in locally |
| **L3-4 sync** | `packages/sync` (the registry, `event-log` and `lww-doc` strategies, an offline queue, backoff); wrap `LearnerStateStorageAdapter`; register `wortwerkSyncStores` when present; `/api/sync/push|pull`; the "add this device's progress" prompt; sync status in AccountSlot; the GitHub Pages "We moved" banner + backup export → import page | progress made on device A appears on device B; an offline edit syncs later; repeated merges change nothing |
| **L3-5 classes and assignments** | classes, join codes, roster, class position; assignments stored with the CONTRACTS §6 scope; `assignment_progress` derived from synced `assignment.progress` events; teacher extras as overlay packs (`/api/me/extras`, CONTRACTS §5) | a teacher assigns, a student completes it, and the teacher sees the result |
| **L3-6 dashboards** | `/dashboard/` (student), `/teacher/**` and `/admin/**` per `docs/platform/dashboards.md`; embed `TodayPanel` / `ProgressSummary` (CONTRACTS §10); nav entries by role | each seed account sees its own dashboard; access control is tested for every role |
| **L3-7 one-click go-live** | `.github/workflows/go-live.yml` (`workflow_dispatch`, input `rollback`). It is idempotent and does exactly what `docs/platform/GO-LIVE.md` §4 lists: find or create the D1 database (EU) by name and inject its id into the deploy config; apply migrations; build the root-path export; `wrangler deploy` with the custom domain; seed from `SEED_ACCOUNTS_JSON`; live smoke (pages, `/api/health`, login as `student1` and `teacher1`); a job summary. **Plus the automatic move banner:** the GitHub Pages build checks `https://german.learnilabs.com/api/health` (CORS-allowed, `GET` only) and shows "We moved · take my progress with me" only when it answers. Rehearse the whole workflow against a local D1 and a `wrangler deploy --dry-run` | GO-LIVE.md is accurate step by step; a dry run passes; no owner action beyond GO-LIVE.md is needed |
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
- **Branches and integration:** work on `lane3/main` and do the integration step exactly as in `docs/lanes/README.md` (rules 3–6). One commit series per plan item, with the item id in the message. **Never merge into `codex/live-alpha`**; the owner merges the single `integration/all` PR.
- **Gates (one at a time):** the repo gates, plus `wrangler` dry-run deploys and the API test suite (Miniflare/`wrangler dev` with a local D1).
- **Owner-only steps:** you cannot create Cloudflare resources or secrets. Everything that needs them must run inside `go-live.yml`, so the owner's whole part is `docs/platform/GO-LIVE.md`. If you find an owner step that GO-LIVE.md doesn't list, add it there and to your status file.
- **Status:** update only `plans/lanes/lane-3-status.md`.
