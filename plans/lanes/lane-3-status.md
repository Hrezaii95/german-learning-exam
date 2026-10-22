# Lane 3 status

Updated 2026-10-22 by Lane 3. The owner requested one draft per item into `codex/live-alpha`; this lane never merges. The continuation plan was posted before code on PR #1, comment 6344290752.

| Item | State | Draft PR | Evidence / remaining dependency |
|---|---|---|---|
| L3-0 CI | Draft | https://github.com/Hrezaii95/german-learning-exam/pull/6 | Deploy-pages gate set plus edge/root; private originals remain an owner-local audit. |
| L3-1 hosting | Draft | https://github.com/Hrezaii95/german-learning-exam/pull/3 | Local routing/security/offline and deploy dry run verified; no live deployment. |
| L3-2 auth | Draft | https://github.com/Hrezaii95/german-learning-exam/pull/18 | Argon2id, schema, secure sessions, account controls and security regressions implemented. |
| L3-3 seed | Draft | https://github.com/Hrezaii95/german-learning-exam/pull/19 | Real local D1 seed twice; all five accounts authenticate. |
| L3-4 sync | Draft | https://github.com/Hrezaii95/german-learning-exam/pull/21 | Sixteen sync tests and real offline/cross-device mounted-view refresh pass. |
| L3-5 classes | Draft | https://github.com/Hrezaii95/german-learning-exam/pull/22 | Scoped classes, assignments, derived progress, extras and transactional role checks pass. |
| L3-6 dashboards | Draft | https://github.com/Hrezaii95/german-learning-exam/pull/23 | Student/teacher/admin UI/API implemented; Lane 1 must update the obsolete normal-smoke dashboard assertion. |
| L3-7 go-live | Draft | https://github.com/Hrezaii95/german-learning-exam/pull/25 | Owner workflow, rollback, move banner and actual local release rehearsal twice pass; no remote mutation. |

## Orchestrator decisions applied

Read `origin/claude/german-webapp-audit-game-i0plj0:docs/lanes/lane-3-platform.md` (b04660bf).

- Argon2id PHC, m=19,456 KiB, t=2, p=1, fresh 16-byte salt and 32-byte digest. No PBKDF2 downgrade or pepper fallback.
- CI mirrors `deploy-pages.yml` plus edge/root checks. The complete audit requiring 454 private originals remains a local owner-machine gate, not a failing fresh-checkout CI step.
- Lane 1 owns lesson links 010–012. Every assertion is retained: exactly those three root-smoke failures are allowed on this lane, and must be green after integration.

## Verification

- **116 platform tests pass**: auth/session/middleware, Wasm wiping, real Miniflare D1 seed/logins, sync/SQLite/browser isolation, class/admin authorization and rollback, UI runtime/CSV, move banner and release control flow.
- **1,225 application tests and 886 web tests pass**. Edge/platform/web/web-test typechecks, lint and publication validation pass. Normal production build and default-dev smoke pass. Production dependency audit reports zero vulnerabilities; pronunciation audit passes.
- Root export builds 1,636 pages. Root smoke verifies 191 byte-hashed precache URLs, then real local Wrangler serves 1,634 page routes and 518 assets with security headers, API JSON and honest 404s. Its final result is red on **exactly** `/lessons/010/`, `/lessons/011/`, `/lessons/012/`.
- Final Pages export builds 1,636 pages. Its manifest/HTTP smoke passes (128 manifest routes, 38 HTTP sample routes plus assets/404/game markers). Learner-language audit has zero findings; offline audit verifies 185 precache entries; all 591 Word Cards, 989 audio forms and 722 exported card routes pass; attribution audit has zero failures. Admin review copy was corrected to clear the language gate.
- Actual local HTTPS/D1/Chromium passes all **11 phases**: teacher class/assignment creation; student joining and book position; role denial; existing-lesson global runtime; offline Save to a fresh device; offline note replay into the first device's already-mounted Saved view; logout restoring anonymous data and revoking its session; forced admin password change and cookie rotation; no private API caches, no-store policy and zero browser runtime errors.
- Actual `release()` rehearsal passes **twice** against isolated real local D1: two migration/seed runs, four actual Wrangler deploy dry runs, local pages/headers/version/404 checks and four student/teacher sign-ins and revocations. Each run preserves five users, five identities, one class, three members and zero sessions. D1 registry discovery/create and EU metadata are explicit fixtures; actual EU placement, DNS/TLS and deployment are not claimed.
- Independent Argon2id implementations agree across four successive local workerd hashes. Sampled CPU averages **152.08 ms/hash**, request wall time **164.17 ms/hash**, including memory wiping: local target <300 ms passes. Production Paid CPU is not measured.
- Draft snapshots were independently checked for syntax, relative imports and declared dependencies; all publication omissions were corrected and reverified on the item refs.

## Gates still requiring integration

1. The unchanged Lane 1-owned `platform/apps/web/scripts/smoke-canonical-routes.mjs` places `/dashboard` in its future-route 404 list (around line 231). L3-6 now correctly returns 200. Move only that route into successful learner-route checks; preserve malformed/unknown 404 assertions. Latest inspected Lane 1 spec-docs commit 3ef71038 still has the old assertion. This failure is separate from the three permitted lesson links and blocks deployment until fixed.
2. Integrate Lane 1's lesson 010–012 corrections and rerun every combined-branch gate.
3. Run the full private-original source audit on the archive-bearing owner machine; its absence here is not reported as a pass.

## Working and integration boundaries

No merges, live Cloudflare resources, secrets, shell/nav edits, game internals or other lanes' source changes. Item branches carry prerequisite commits because all drafts target `codex/live-alpha`; review the item commit/series and integrate in dependency order. AccountSlot replaces Lane 1's already-created foundation stub when combined. Optional Lane 2 panels use the contract's practice-link fallback while absent; external game stores require an account-isolated bridge before registration.

Builds and typechecks run sequentially. This host refuses tsx CLI IPC, so direct `node --import tsx` equivalents are used. Wrangler port discovery needs a temporary loopback-only interface adapter. The host's export-copy race required cleaning ignored output and restamping it with the existing finalizer; final root/Pages byte and offline checks pass. These local adapters are not committed, and Worker/Wasm/database code is unchanged by them. Generated audits outside this lane are restored after reading their results.

## Owner-only steps

1. Review and integrate approved drafts in order: CI #6, hosting #3, auth #18, seed #19, sync #21, classes #22, dashboards #23, go-live #25. This lane never merges.
2. Complete the Lane 1 normal-smoke and lesson-link handoffs; resolve AccountSlot/nav with its foundation and optional Lane 2 contracts; require all combined gates green.
3. Run the private-source audit with the archived originals. Qualified German approval remains human-owned; optional `GERMAN_REVIEWER_IDS` grants only qualified review, never ordinary-admin self-approval.
4. Verify active `learnilabs.com` zone and Workers Paid (the export exceeds the free asset limit).
5. Add exactly `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `SEED_ACCOUNTS_JSON` as GitHub repository secrets. Never put credentials in files or PRs.
6. After integration, expose the manual workflow on the default branch (currently `master`; documented setting is `codex/live-alpha`).
7. Run Go live on `codex/live-alpha` per `docs/platform/GO-LIVE.md`. No live deployment is claimed by this lane.
