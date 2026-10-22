# Platform: Cloudflare infrastructure, accounts and progress sync

Status: approved (ADR-018). Implemented by **Lane 3** (`docs/lanes/lane-3-platform.md`).

## 1. Target architecture

```
                 german.learnilabs.com  (Cloudflare zone learnilabs.com)
                              │
                  ┌───────────▼────────────┐
                  │  Worker "german-web"   │  one Worker, one origin
                  │  ├─ static assets      │  ← Next.js static export (basePath "")
                  │  └─ /api/*  (runs first)│  ← auth, sync, classes, dashboards
                  └───┬───────────┬────────┘
                      │           │
                 D1 "german-db"   Durable Objects (later: live class game)
                 (EU location)    R2 (later: speaking/writing submissions)
```

- **One origin:** pages and `/api/*` share it. This means same-origin cookies, no CORS and no third-party cookies. Use Workers Static Assets with `run_worker_first` for `/api/*`. Every other path is served from the static export.
- **The app stays a static export.** Every per-user screen is a client component that fetches `/api/*`. Use no dynamic route segments; pass ids in query strings, as today.
- **Offline-first stays.** The service worker and local storage keep working without a network or an account. The account is an optional layer that syncs.
- **Base path:**
  - The build gets a root-path variant (`GL_SITE_BASE_PATH=""`).
  - The GitHub Pages build keeps `/german-learning-exam`.
  - `smoke-pages` must run against both bases.
- **Environments:**
  - `production` → german.learnilabs.com.
  - `preview` → a `*.workers.dev` preview URL per PR (`wrangler versions upload`).
  - Each environment has its own D1 database.
- **Deploy:** a GitHub Actions workflow `deploy-cloudflare.yml`. On every push to `codex/live-alpha` it runs: gates → root-path export → `wrangler d1 migrations apply` → `wrangler deploy`. The existing GitHub Pages workflow stays until cutover.

## 2. Data model (D1, SQL migrations in `platform/apps/edge/migrations/`)

| Table | Key columns | Notes |
|---|---|---|
| `users` | id (uuid), username (unique), display_name, email (unique, nullable), email_verified_at, role (`student`/`teacher`/`admin`), status (`active`/`disabled`), must_change_password, is_demo, created_at, deleted_at | one row per person |
| `identities` | id, user_id, provider (`password` / `email_link` / `google`), provider_subject, password_hash (nullable), created_at | unique on (provider, provider_subject). **This is what makes email and Google sign-in a later add-on, not a migration** |
| `sessions` | id_hash (SHA-256 of the cookie token), user_id, created_at, expires_at, last_seen_at | 30-day sliding expiry; revocable |
| `auth_tokens` | token_hash, user_id or email, purpose (`verify_email` / `login_link` / `reset_password`), expires_at, used_at | reserved for email flows (created now, used later) |
| `devices` | id, user_id, label, last_sync_at | |
| `sync_events` | user_id, store, event_id, device_id, server_seq (increasing), created_at, payload_json | append-only; primary key (user_id, store, event_id); pull by server_seq |
| `sync_docs` | user_id, store, doc_key, value_json, updated_at, device_id | last-write-wins documents (settings, book position, notes, tags) |
| `classes` | id, name, teacher_id, book_id, position_lesson, position_page, join_code (unique), leaderboard_enabled (default 0), created_at, archived_at | |
| `class_members` | class_id, user_id, member_role (`student` / `co_teacher`), joined_at, left_at | |
| `assignments` | id, class_id, title, scope_json (the CONTRACTS scope format), skills_json, item_count, due_at, created_by, created_at | |
| `assignment_progress` | assignment_id, user_id, progress_json, completed_at | written by the server from synced events |
| `teacher_extras` | id, class_id, owner_id, pack_json (content-pack format), review_status, updated_at | served to class members as an overlay pack |
| `content_pack_status` | pack_id, review_status, enabled, updated_by, updated_at | admin control |
| `feature_flags` | key, value_json, updated_by, updated_at | e.g. `class_leaderboard`, `live_game`, `email_login`, `google_login` |
| `audit_log` | id, actor_id, action, target_type, target_id, meta_json, created_at | role changes, deletions, logins, exports |

## 3. Authentication

### 3.1 Now: username + password
- **Library:** use an established library that runs on Workers + D1 and supports password, email-link and Google OAuth providers. Evaluate Better Auth first. If it can't meet the requirements below on Workers, implement the same contract by hand with WebCrypto. Record the choice as ADR-020.
- **Password hashing:** **Argon2id** (memory 19 MiB, iterations 2, parallelism 1) via WASM in the Worker, stored as a PHC string so it can be upgraded later. WebCrypto PBKDF2 is capped at 100k iterations in Workers, so 600k is not possible there. The fallback is PBKDF2-SHA256 at 100k plus a server-side pepper; see Lane 3 orchestrator decision 3. The **Workers Paid plan** is required (CPU time, and about 27k static files).
- **Sessions:** cookie `__Host-gl_session`, 32 random bytes, `HttpOnly; Secure; SameSite=Lax; Path=/`. Only its SHA-256 is stored. Rotate it at login and on privilege change. Logout revokes it.
- **CSRF:** every state-changing `/api/*` request must carry `Origin` = `https://german.learnilabs.com` (or the preview origin) and a JSON content type.
- **Brute force:** rate-limit login per username and per IP with a D1 counter (exponential lock-out after 5 failures). Turnstile comes later, behind a flag. Fail with a generic "wrong username or password".
- **Authorisation:** every `/api/*` handler checks the session role and resource ownership on the server. The static dashboard pages contain no data; a non-admin who opens `/admin/` sees an "access denied" screen from the API response.

### 3.2 Later: email and Google (prepared now, switched on by feature flag)
- Routes are reserved: `/api/auth/email/start`, `/api/auth/email/verify`, `/api/auth/google/start`, `/api/auth/google/callback`.
- Config names are reserved: `EMAIL_PROVIDER` (e.g. Resend or Postmark), `EMAIL_API_KEY`, `EMAIL_FROM` (`no-reply@learnilabs.com`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. The Google redirect URI is `https://german.learnilabs.com/api/auth/google/callback`.
- **Account linking:**
  - A signed-in user can add an email or Google identity from Account settings.
  - On first Google sign-in, an account is matched only through a **verified** email; never link silently on an unverified one.
- The login page shows the email and Google buttons only when the flags `email_login` / `google_login` are on.
- Password reset by email arrives with the email provider. Until then, an admin resets passwords and the user must change it at next login.

## 4. Progress sync

### 4.1 Model
Every syncable local store registers in a **sync registry** (`packages/sync`) with: `store` (name), `schemaVersion`, and a **strategy**:
- `event-log`: append-only events with globally unique ids (uuid v7). The server stores the union. The client rebuilds state from local plus pulled events. Used for review events, attempts and Wortwerk answers.
- `lww-doc`: small documents keyed by `doc_key`, newest `updated_at` wins. Used for settings, the book position, the study scope, notes, tags and saved items.

The existing learner state (`german-learning:learner-state:v1`, `LearnerStateStorageAdapter`) is synced by wrapping the adapter, not by changing it. Its events go into `event-log`; notes and tags go into `lww-doc`. Lane 2 registers the Wortwerk store (`wortwerk.v2`) through the registry (see CONTRACTS §4).

### 4.2 Protocol
- `POST /api/sync/push {deviceId, store, events[] | docs[]}` is idempotent: event ids are deduplicated, and docs are compared by `updated_at`.
- `GET /api/sync/pull?store=&since=<server_seq>` returns events and docs after the cursor.
- **Client behaviour:**
  - Push on change, debounced to 5 s.
  - Pull at app start, when the window regains focus, and every 10 minutes while open.
  - While offline, queue changes locally and retry with backoff.
  - The sync status is visible in the account menu: Synced · Syncing · Offline · Error.

### 4.3 First sign-in on a device that already has progress
Show "This device has progress from before you signed in. Add it to your account?" with **Add it** / **Keep separate**. Because event-log merging is a union, adding it is safe and can be repeated.

### 4.4 Moving from the GitHub Pages address
Browser storage is tied to the site address, so progress made on `hrezaii95.github.io` doesn't appear on `german.learnilabs.com`. After cutover:
1. The old site shows a banner: "We moved to german.learnilabs.com · Take my progress with me".
2. That button exports a backup file (the existing `lib/study/backup.ts`) and opens the new site's import page.
3. Importing while signed in adds the progress to the account.

## 5. Seed accounts (5)

| Username | Role | Display name | Notes |
|---|---|---|---|
| `admin` | admin | Admin | must change password at first login |
| `teacher1` | teacher | Frau Weber (Demo) | owns the class "A1 Demo-Klasse", class position Lektion 5 |
| `student1` | student | Anna (Demo) | member of the demo class |
| `student2` | student | Ben (Demo) | member of the demo class |
| `student3` | student | Cem (Demo) | member of the demo class |

- **Passwords are never committed.** The owner stores them in one GitHub Actions secret, `SEED_ACCOUNTS_JSON` = `{"admin":"…","teacher1":"…","student1":"…","student2":"…","student3":"…"}`.
- **Seeding is a step of the one-click "Go live" workflow** (`go-live.yml`, run manually). The step:
  1. hashes each password with the same hash module as the API;
  2. writes the users, password identities, the demo class and its memberships through `wrangler d1 execute`;
  3. is idempotent (creates or updates);
  4. never prints passwords;
  5. writes an `audit_log` row.
- Demo users have `is_demo = 1`, so an admin can reset or remove them later.

## 6. Privacy and safety
- Create D1 with an EU location/jurisdiction.
- Store only what the features need. No ads, no third-party trackers.
- **Self-service in Account settings:** export my data (JSON) and delete my account, which removes rows and anonymises `audit_log` actor ids.
- **Visibility:** teachers see only students who joined their class; a student can leave a class at any time. Admin actions are audit-logged.
- **Metrics:** learning metrics stay on the device unless the user is signed in. Server-side aggregate analytics need explicit consent and a later decision.

## 7. Owner actions (Codex cannot do these)
See **[GO-LIVE.md](GO-LIVE.md)** (about 5 minutes):
1. Merge the integration PR.
2. Cloudflare Workers Paid, plus an API token.
3. Three GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SEED_ACCOUNTS_JSON`.
4. Run "Go live (Cloudflare)".

Google and email sign-in come later.
