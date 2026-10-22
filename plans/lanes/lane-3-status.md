# Lane 3 status

Updated 2026-10-22 by Lane 3. Owner requests one draft per item into `codex/live-alpha`; never merge. The continuation plan was posted before code on PR #1, comment 6344290752.

| PR | Title | State | Link | Notes |
|---|---|---|---|---|
| L3-0 | Secret-free lane CI | draft PR | https://github.com/Hrezaii95/german-learning-exam/pull/6 | Orchestrator gate amendment applied: private originals remain a local owner gate. |
| L3-1 | Cloudflare root hosting | draft PR | https://github.com/Hrezaii95/german-learning-exam/pull/3 | Local hosting verified; no live deployment. Exactly three lesson links may remain red on lane branches until Lane 1 integration. |
| L3-2 | Database and auth | in progress | — | Argon2id unblocks auth; D1 schema/API/account UI implemented, security review and combined validation underway. |
| L3-3 | Seed accounts | in progress | — | Idempotent CLI and real local D1 seeding/sign-in tests pass; publication pending review. |
| L3-4 | Progress sync | in progress | — | Registry, durable queue, learner wrapper, consent/import and API implemented; cross-tab isolation review underway. |
| L3-5 | Classes and assignments | in progress | — | Membership/position/assignments/progress/extras implemented; role-change transaction review underway. |
| L3-6 | Dashboards | in progress | — | Student/teacher/admin API and static client screens implemented; combined type/browser validation underway. |
| L3-7 | One-click go-live | in progress | — | Token-first EU D1/deploy/seed/live-smoke/rollback workflow and local rehearsal implemented; no external resource mutation. |

## Orchestrator decisions applied

Read the decisions at the end of `origin/claude/german-webapp-audit-game-i0plj0:docs/lanes/lane-3-platform.md` (b04660bf).

- Use Argon2id PHC, m=19,456 KiB, t=2, p=1, fresh 16-byte salt, 32-byte digest. The PBKDF2 runtime conflict is resolved; no hashing downgrade or pepper fallback is used.
- CI mirrors `deploy-pages.yml` plus edge/root checks. The full 454-private-original source audit remains a documented **local owner-machine gate**, not a failing fresh-checkout CI step.
- Lane 1 fixes lesson links 010–012. Keep every assertion; exactly those three failures are allowed on Lane 3 branches, and must be green on the combined branch. No Lane 1 source edits or exemptions.

## Current verification

- Local workerd with precompiled Wasm: independent Argon2id output agrees across four successive hashes; sampled CPU averages 152.08 ms/hash, request wall averages 164.17 ms/hash, including memory wiping. Local target <300 ms passes. Production Paid hardware is not measured.
- Auth: 19 tests pass, including concurrent login/reset, transactional password/deletion failures, bounded legacy upgrades, atomic rate limits and Wasm wiping. Middleware: two cookie rotation/sliding tests pass.
- Seed: seven tests pass, including real Miniflare D1 seeding twice and all five temporary accounts signing in. Actual local Wrangler D1 rehearsal also passes. Random test credentials are memory-only and never printed or committed.
- Sync: engine/SQLite/browser fixtures pass; cross-tab review is still in progress. Anonymous initial/repeated cleanup regression is fixed.
- Classes/admin: 16 SQLite tests pass; independent role-mutation/metrics review is in progress.
- Release: nine tests pass, including no-store/private response handling and cleanup of smoke-created sessions. Injected-runner workflow rehearsal passes twice (simulation, not a cloud deployment).
- UI: 11 tests pass. Combined typechecks, full application/Pages/root gates and browser journeys are underway; no final green claim yet.
- Historical L3-1 baseline: 1,225 app tests, 886 web tests, normal/Pages exports, audits, local Worker routing/security, Chromium mobile hydration/CSP/offline and deploy dry-run passed. These precede the new auth/sync/dashboard code and are not a claim that the expanded candidate is verified yet.

## Working and integration boundaries

No merges, real Cloudflare resources, secrets, publication changes, game internals or other lanes' source files are changed. Only the checkpoint branch `lane3/main` and separate item drafts are published. Optional Lane 2 stores/panels are integrated structurally with a practice-link fallback while their modules are absent. AccountSlot replaces Lane 1's already-created stub when the owner combines the foundation and platform slices; nav/shell remain Lane 1-owned.

Builds and typechecks run sequentially. This host refuses the tsx CLI IPC socket, so previously documented direct `node --import tsx` equivalents are used where necessary. Current Wrangler port discovery also needs a temporary loopback-only network-interface adapter; Worker/Wasm/database code stays unchanged.

## Owner-only steps

1. Review and merge approved item PRs in dependency order; this lane never merges.
2. Clear the combined-branch lesson-link checks with Lane 1 and run the full source-manifest audit on the archive-bearing owner machine.
3. Verify active `learnilabs.com` zone and Workers Paid (the static export already exceeds the free asset count).
4. Add only `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `SEED_ACCOUNTS_JSON` as GitHub repository secrets. Never put credentials in PRs or files.
5. Ensure Actions is available. The repo default branch is currently `master`; after integration, set the default to `codex/live-alpha` so GitHub exposes the new manual Go live workflow.
6. Run Go live on `codex/live-alpha` as described in `docs/platform/GO-LIVE.md`. No live deployment is claimed by this lane.
7. German-language approval remains human-owned. Optional `GERMAN_REVIEWER_IDS` server configuration grants qualified review; ordinary admin access never silently promotes content.
