# German Learning OS — Claude Code takeover entrypoint

Claude Code is the active orchestrator for this repository. Start by reading, in order:

1. `docs/22-claude-code-takeover-and-codex-design-handoff.md`
2. `config/claude-codex-operating-model.yaml`
3. `docs/23-claude-codex-org-chart.md`
4. `plans/PLAN-BATON-full-alpha.md`
5. `plans/full-alpha-register.csv`
6. the authoritative specification order in `docs/INDEX.md`

## Current project allocation

- Claude Code and its own agents: orchestration, source/content audit, German-content issue routing, architecture, frontend/backend implementation, tests, accessibility, deployment, Git, and release evidence.
- Claude Code also owns all Claude/Codex integration setup, MCP/skill/agent configuration, routing, permissions, automations and loops.
- Codex specialist studio: senior UX/UI direction and adversarial visual critique, image generation/editing, semantic infographics, TTS/audio production and technical media QA.
- Claude integrates Codex artifacts. Codex must not independently promote content, change publication status, deploy, or close human-language/owner gates.

This allocation may be expanded or reduced. Before changing it, Claude must propose the change in chat with the quality benefit, cost impact, files affected, and stop condition. Record the owner's approval under `scope_overrides` in `config/claude-codex-operating-model.yaml` or a superseding decision row.

## Immediate orientation facts

- Live app: `https://hrezaii95.github.io/german-learning-exam/`
- Active implementation: `platform/`; the sample and failed Cursor demo are not implementation foundations.
- Current root worktree has one pre-existing dirty submodule: `samples/german-learning-ui-samples`. Do not revert or absorb it.
- All application gates pass, including `node tools/audit-alpha-tts.mjs` (354 manifest = 354 disk = 354 audited, zero failures) after the 27-clip supplement was merged into the canonical manifest.
- The restored Kursbuch delivery is ingested: 59 new CD1 tracks registered (source manifest 456 files, lock updated), the 31 CD2 intake copies were byte-identical duplicates and are quarantined per ADR-014. Evidence: `research/kursbuch-ingestion-2026-08-13.json`.
- ADR-015/ADR-016: the owner holds full Momente A1.1/A1.2 rights, conditional on attribution. The 15 workbook listening tracks are published and the `/references` page discharges the credit; `node tools/audit-attribution.mjs` enforces it.
- Generated TTS pronunciation remains preview audio pending qualified German listening approval (G5). This is a pedagogical gate about the synthetic voice and is unaffected by the rights decisions.
- Release gates now include `cd platform && npm run gates:pages` (build → smoke → learner-language) plus `node tools/audit-attribution.mjs`. Never run two builds, or a typecheck alongside a build, concurrently — `build:pages` globally renames `proxy.ts`. A pre-commit hook blocks commits that capture build-intermediate state.
- Acquire the existing plan baton before implementation; one engine writes it at a time.

Do not ask the owner to restate requirements already encoded in the handoff and specifications.

The initial owner instruction should be treated as the `/goal` block in section 9 of the takeover handoff. Claude decides the implementation and worker configuration after reading the linked files.
