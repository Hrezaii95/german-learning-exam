# DEPLOY1R1 — GitHub Pages release hardening

Close every P1/P2 in `research/cursor-execution/DEPLOY1-composer-review-result.json`:

1. Make the Pages source-isolation wrapper transactional. A failure after any partial route patch must restore every written backup. Track mutation immediately, restore in `finally`, and add SIGINT/SIGTERM cleanup. On startup, safely auto-recover only unambiguous stale states (`proxy` missing + parked present; source + valid backup pairs), fail closed on ambiguity. Document recovery.
2. Add `.gitignore` patterns for `*.pages-bak` and `proxy.ts.pages-disabled`; delete unused `ssg-dynamic-params.ts`.
3. Fail fast if `GL_PAGES_EXPORT=1` lacks a nonempty, valid `NEXT_PUBLIC_GL_PAGES_BASE_PATH` matching the configured Pages base. Test this negative boundary.
4. Pin every GitHub Action to its current full upstream commit SHA with a version comment. Resolve SHAs from official action repositories; do not guess. Add Dependabot configuration for github-actions updates if appropriate.
5. Workflow must run normal `build:web`, `audit:prod`, `smoke:web-routes`, and `smoke:dev` in addition to check/pages build/smoke before upload/deploy. Ensure no parallel mutation of the Pages wrapper.
6. Strengthen Pages smoke to require base-prefixed `_next` hydration references, add concepts + encoded activity HTTP probes, and reject bare root `_next`. Remove Node `shell:true` child-spawn deprecation/injection risk.
7. Add focused fault-injection tests for partial patch failure, stale recovery, signal cleanup where safely testable, config missing-base failure, and source byte-for-byte restoration after both successful and failed builds.

Run every normal/pages gate and write `research/cursor-execution/DEPLOY1R1-worker-report.md`. Do not stage/commit/push/deploy, edit plans/register/resources/archive/samples/media, weaken gates, or claim deployment.
