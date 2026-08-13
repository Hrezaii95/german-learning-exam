# German Learning OS — continuous content production loop

This directory is the durable handoff between recurring agent runs. It prevents the media program from becoming a sequence of disconnected one-off batches.

## Roles per iteration

1. **Inventory agent (read-only):** compares validated learner publication, implemented pages, manifests, public assets, tests, and `backlog.json`. It may add or refine backlog items but may not create media.
2. **Dispatcher:** opens at most three lean lanes with non-overlapping ownership: visual/infographic, audio/accessibility, and learner content/interaction. Each lane takes one bounded asset family.
3. **Producer agents:** create one bounded asset family each, record prompt/source/provenance, and never integrate their own work unless the item explicitly assigns integration.
4. **Independent QA agent:** checks factual/content scope, German/audio status, originality/rights, responsiveness, accessibility, hashes, and publication boundaries.
5. **Integrator:** promotes only QA-passed assets, updates exact route/card mappings and tests, then runs build/static-export smoke.
6. **Release verifier:** verifies the public deployment; only then may an item become `live`.

## State machine

`needed → assigned → produced → qa_passed → integrated → live`

Failure states are `blocked` (requires owner/external decision) and `qa_failed` (must return to production with evidence). Agents must not skip states.

## Loop limits and stop rule

- At most three specialized producer lanes may run concurrently, one per media/content class and with disjoint paths.
- Use one fast independent release review after the lanes finish. Review only publication scope, correctness, rights, accessibility blockers, broken routes, and regressions; avoid ceremonial documents or duplicate approvals.
- Integrate once per heartbeat, then build, deploy, and verify. Keep partial non-blocking polish in the backlog instead of delaying a usable release.
- No more than two retries for the same unchanged failure; then mark `blocked` with evidence.
- The loop is complete only after two consecutive inventory passes find no dependency-ready `needed`, `qa_failed`, `produced`, `qa_passed`, or `integrated` items, all required gates are green, and the live URL is verified.
- Generated German TTS cannot become `qa_passed` without the recorded qualified listening passes.
- Publisher assets require an exact recorded rights scope. Current approval covers only workbook CD1 tracks `1_01`–`1_15`.
- Missing transcript/caption evidence must remain visible as an accessibility blocker; do not fabricate transcripts.

## Evidence

Every transition updates `backlog.json` and appends one concise record to `RUN-LOG.md` with timestamp, item IDs, agent roles, files, checks, deployment SHA/URL, and remaining blockers.
