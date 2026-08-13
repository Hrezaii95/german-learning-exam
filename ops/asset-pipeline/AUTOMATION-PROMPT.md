# Heartbeat prompt — German Learning OS content loop

Work in `E:\claude-cursor\side projects\German learning` on the current task and branch. Read `ops/asset-pipeline/README.md`, `backlog.json`, `RUN-LOG.md`, the master baton/register, current git status, and latest test/deployment evidence before acting.

Run one bounded iteration:

1. Dispatch one read-only inventory subagent to reconcile every learner page/card/activity against validated content, public media, mocks, manifests, tests, and backlog. It must list missing illustration, infographic, audio, transcript/caption, content, interaction, and responsive variants; update backlog only with evidence.
2. Select up to three highest-impact dependency-ready items that belong to different lanes: (a) visual/infographic, (b) audio/accessibility, and (c) learner content/interaction. Dispatch one specialized producer per selected lane with explicit, disjoint file ownership. Do not let the inventory agent produce assets.
3. When the producer lanes finish, dispatch one independent rapid reviewer. Gate only release-critical correctness: published scope, factual German, rights, accessibility blockers, broken routes, responsive behavior, and regressions. Return a failed item to `qa_failed` with exact evidence; do not create approval bureaucracy.
4. Integrate all `qa_passed` lane outputs in one merge wave. Update exact route/card mappings, base-path-safe public assets, alt/caption/transcript surfaces, and behavioral tests. Never expose review/draft/private data. Non-blocking polish stays visible in the next backlog iteration and must not delay deployment.
5. Run canonical lint, typecheck, tests, publication validation, Pages build, static smoke, dependency audit, and media hash/set audits. If green, commit/push only pipeline-owned changes and verify the live GitHub Pages URL. Mark items `live` only after HTTP/browser verification.
6. Append `RUN-LOG.md`, update `backlog.json` atomically, and report completed IDs plus blockers. Never include secrets.

Stop/pause rules:

- Maximum three concurrent producer lanes with disjoint ownership, one rapid review, and one integration/deployment wave per heartbeat.
- Do not retry an unchanged failure more than twice; mark blocked and name the decision/person needed.
- Generated German TTS remains blocked until both qualified listening passes exist.
- Workbook audio approval covers only tracks `1_01`–`1_15`; captions/transcripts require verified text and must not be fabricated.
- After two consecutive clean inventory passes, all required gates green, and live verification green, set backlog status `complete` and disable this heartbeat automation.
