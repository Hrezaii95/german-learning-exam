# Go live: owner checklist

Use this after the reviewed integration is merged and its combined checks pass.
A draft PR, simulated rehearsal or local dry run is not evidence that the public
domain is live. Current evidence and remaining gates are in
`plans/lanes/lane-3-status.md`.

## 1. Merge and expose the manual workflow

Preflight: Lane 1 must make the normal-route smoke expect the now-implemented
`/dashboard` to return 200, while retaining unknown-route 404 checks (see
[hosting.md](hosting.md)). Its lesson 010–012 link fixes must also be present.
Both checks remain enabled; the release workflow stops until they pass.

1. Review and merge the approved integration into `codex/live-alpha`. Lane
   workers never merge it themselves.
2. One-time GitHub setting: make `codex/live-alpha` the repository's default
   branch, in **Settings → General → Default branch**. The repository was still
   using `master` when checked on 2026-10-22. GitHub shows **Run workflow** for
   a new manual workflow only when its file is on the default branch.

The required workflow is `.github/workflows/go-live.yml`, named
**Go live (Cloudflare)**. Its release guard accepts only `codex/live-alpha`.
Changing the default branch does not merge another branch or publish code.

## 2. Cloudflare account and token

1. Confirm `learnilabs.com` is an active zone in the intended account.
2. Enable **Workers Paid**. The current export exceeds the free-tier static
   asset count, and password hashing requires the paid CPU allowance.
3. Create an API token from **Edit Cloudflare Workers**, limited to the intended
   account and the `learnilabs.com` zone. It needs Workers script deployment,
   **Account · D1 · Edit**, and the zone permissions to edit **DNS** and
   **Workers Routes/custom domains**.
4. Copy the account ID from the account overview.

No database creation, SQL, manual DNS record or pepper secret is required from
the owner. The workflow creates `german-db` with the **EU jurisdiction** and
declares the `german.learnilabs.com` custom domain. A geographic location hint
alone is not treated as an EU data-residency guarantee.

## 3. Add exactly three GitHub repository secrets

Open **Settings → Secrets and variables → Actions**:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | The scoped token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | The intended Cloudflare account ID |
| `SEED_ACCOUNTS_JSON` | A JSON object containing the five passwords below |

Use your own passwords, each 12–128 characters, for these exact keys:

```json
{"admin":"…","teacher1":"…","student1":"…","student2":"…","student3":"…"}
```

Enter the actual passwords in the secret editor. Do not put them in a PR,
commit, workflow input or chat log. The seed creates Admin, Frau Weber (Demo),
Anna (Demo), Ben (Demo), Cem (Demo), the A1 demo class and its memberships.
Admin must change its password after first sign-in.

## 4. Run Go live

Open **Actions → Go live (Cloudflare) → Run workflow**. Select
`codex/live-alpha`; leave `rollback` unchecked.

The workflow checks the secrets and branch before doing any Cloudflare work.
Missing configuration produces a **notice and a successful skip**; this does
not mean the site was deployed.

For a configured release, it:

1. Runs the existing application/Pages release gates and the new edge/root
   checks sequentially. The full original-source archive validator remains an
   owner-machine gate because the private originals are intentionally absent
   from Git; published content and audio checks still run in CI.
2. Finds `german-db`, or creates it once with `jurisdiction=eu`. Existing
   databases with an unset or different jurisdiction are rejected.
3. Writes a temporary deploy configuration containing the database UUID and
   tested Git commit, applies pending migrations, and dry-runs the bound Worker.
   The checked-in configuration is never overwritten.
4. Deploys the Worker and custom domain, then seeds the five accounts from the
   secret. Passwords, cookies, password hashes and SQL are not printed.
5. Checks public routes, assets, security headers, honest 404s and `/api/health`;
   health must report the tested commit. It signs in as `student1` and
   `teacher1`, verifies their roles/session cookies, signs out and verifies
   session revocation.
6. Removes the temporary configuration and writes the result of each release
   stage in the workflow summary.

The public URL is **https://german.learnilabs.com**. Sign in at `/login/`.
Use the successful workflow run and its commit-matched live smoke as release
evidence. The existing Pages site continues independently.

## Re-running and automatic updates

Re-running Go live reuses the EU database and applies only pending migrations.
The seed creates missing demo rows and preserves existing passwords, disabled
status, changed roles, book positions and voluntary class leaves. It does not
silently restore demo users to their initial state.

If a demo user changes their password, update its value in
`SEED_ACCOUNTS_JSON` before using that account in another live sign-in smoke.
A stale secret causes a clear smoke failure; it never resets an account.

After the first successful setup, pushes to `codex/live-alpha` run
**Deploy Cloudflare**. This workflow finds the existing EU database, applies
migrations, deploys and checks the live commit. It creates no resources and
does not reseed accounts. If the database is absent, it emits a notice directing
the owner to Go live.

The Pages migration banner checks the public health endpoint before offering
**We moved · take my progress with me**. The link exports local progress for
import at the new origin; browser storage does not move automatically.

## Rollback and failures

- A failed stage stops the release and names the last attempted stage. Pending
  migrations are not run after a failed application gate. A failed post-deploy
  smoke leaves the new version live for diagnosis or an explicit rollback.
- To restore the previous stable Worker version, run **Go live (Cloudflare)**
  with `rollback` checked. It reads deployment timestamps and version IDs,
  restores the previous distinct version to 100% traffic, verifies the new
  deployment metadata and checks the public site. Repeating this same rollback
  is a no-op while its rollback marker remains the latest deployment.
- Rollback restores **Worker code and static assets only**. It does not roll
  back D1 data or schema, delete resources, disable Cloudflare, or reseed users.
  Migrations must remain compatible with the prior deployed code. D1 recovery
  is a separate owner operation if ever needed.
- If `german-db` already exists outside the EU jurisdiction, stop and plan an
  explicit owner-managed data migration. This workflow will not relocate or
  delete it.

## Optional providers later

Email and Google routes remain disabled behind feature flags until their
providers are implemented and configured. Reserved secrets are `EMAIL_API_KEY`,
`EMAIL_FROM`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`; these are not
required for username/password deployment. The reserved Google callback is
`https://german.learnilabs.com/api/auth/google/callback`.

References: [GitHub manual workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow),
[D1 jurisdictions](https://developers.cloudflare.com/d1/configuration/data-location/),
[Worker rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
