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
- Current application gates pass, but `node tools/audit-alpha-tts.mjs` fails because 27 supplement MP3s are present outside the base 327-asset manifest.
- The owner restored the previously missing full Kursbuch audio set under `resources/original/hossein added new material that needs to be moved to organized folder structure/Kursbuch-20260813T121208Z-1-001/`: 90 MP3s total (CD1: 59; CD2: 31). Claude must register hashes and provenance, deduplicate against the mixed archive, move it into the governed audio structure, and map the 17 Lesson 1–2 CD1 tracks before using it.
- Generated pronunciation remains preview audio pending qualified German listening approval.
- Acquire the existing plan baton before implementation; one engine writes it at a time.

Do not ask the owner to restate requirements already encoded in the handoff and specifications.

The initial owner instruction should be treated as the `/goal` block in section 9 of the takeover handoff. Claude decides the implementation and worker configuration after reading the linked files.
