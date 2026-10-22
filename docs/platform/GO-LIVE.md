# Go live in about 5 minutes (owner checklist)

Everything else is built, tested and waiting in one pull request. These are the only steps that need you.

## 1. Merge the integration PR (1 min)
- Open the PR **"integration/all → codex/live-alpha"**. Its body lists what's inside and the gate results for the combined code.
- Merge it. GitHub Pages redeploys automatically with all Lane 1 and Lane 2 work, and PR #1's docs are included.

## 2. Cloudflare (2 min)
1. In the Cloudflare dashboard, go to **Workers & Pages → Plans** and choose **Workers Paid** (≈ 5 USD per month; needed for secure password hashing).
2. Go to **My Profile → API Tokens → Create Token** and start from the **"Edit Cloudflare Workers"** template. Then:
   - add **Account · D1 · Edit**;
   - add **Zone · DNS · Edit**;
   - set Zone Resources to `learnilabs.com`;
   - create the token and copy it.
3. Copy your **Account ID** (on the account's overview page, right sidebar).

## 3. GitHub secrets (1 min)
In **Settings → Secrets and variables → Actions → New repository secret**, add:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | the account ID |
| `SEED_ACCOUNTS_JSON` | `{"admin":"…","teacher1":"…","student1":"…","student2":"…","student3":"…"}`, with the passwords from the Claude chat or your own |

## 4. Click "Go live" (30 s, then wait about 5–10 min)
Go to **Actions → "Go live (Cloudflare)" → Run workflow**. The workflow is idempotent, so it's safe to run again:
1. It creates the D1 database (EU) if it doesn't exist yet, and applies the migrations.
2. It builds the root-path export and deploys the Worker with the custom domain **german.learnilabs.com**. The DNS record is created automatically.
3. It creates or updates the 5 accounts and the demo class from `SEED_ACCOUNTS_JSON`. Passwords are never printed.
4. It smoke-tests the live site: pages, `/api/health`, and a login as `student1` and `teacher1`.
5. It writes a summary with the URL and the result of every check.

Once Cloudflare is live, the old GitHub Pages site detects it on its own (it calls `german.learnilabs.com/api/health`) and shows the "We moved, take my progress with me" banner. You don't have to do anything for that.

## Later (optional)
- **Google sign-in:** create an OAuth client with the redirect URI `https://german.learnilabs.com/api/auth/google/callback`, add the secrets `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, re-run "Go live", and switch on the `google_login` flag in Admin.
- **Email sign-in:** add `EMAIL_API_KEY` (e.g. Resend), re-run "Go live", and switch on the `email_login` flag.

## If something fails
- **The workflow summary names the step that failed.** Re-running is safe.
- **To roll back the site,** revert the integration merge on `codex/live-alpha`. To take Cloudflare offline, re-run "Go live" with the input `rollback: true`, which redeploys the previous Worker version.
