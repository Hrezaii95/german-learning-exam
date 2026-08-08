# PLAN-BATON — German Learning OS Full Alpha

updated: 2026-08-08T05:50:00+03:30
orchestrator_session: current Codex task
active_engine: cursor-sdk
active_phase: P3
meta_status: n/a
gate_status: {G0: green, G1: green, G2: green, G3: pending, G4: pending, G5: pending, G6: pending, G-OWNER: pending}
workers: [C-WEB]
parallel_groups: []
file_ownership:
  - C-WEB: `platform/apps/web/**`, `platform/tests/web/**`, web package integration and README only
open_items_unchanged: true
violations: []
next_action: Implement P3-02 six canonical hubs over the approved learner indexes; preserve 23 learner-published activity routes and the review-only teacher deck boundary.

## Current verified facts

- 77-message original session is present and indexed in the decision ledger.
- Failed Cursor demo is quarantined under `archive/cursor-demo-2026-07-30/`.
- Current application is a partial vertical slice, not the complete Alpha.
- 327 generated pronunciation assets reproduce from the audio manifest.
- All 327 generated clips pass exact-path, hash, encoding and duration technical audit; all 327 remain pending qualified German listening approval.
- 15 workbook tracks are provenance-mapped and excluded from the public artifact while rights are open.
- Cursor CLI print mode is affected by a known silent-hang failure. Official Cursor SDK 1.0.27 successfully completed a no-tools probe with `grok-4.5`, `effort=high`, `fast=false`, the SDK-equivalent of the requested non-Fast High variant.

## Worker log

| Phase | Agent ID | Model | Status | Artifact paths | Verify result |
|---|---|---|---|---|---|
| P0 | ORCH | Codex | complete | `docs/17-current-state-and-completion-matrix.md`; `content/source-index/source-manifest.json`; `docs/00-session-decision-ledger.md`; `docs/18-requirement-traceability.md` | pass — 397/397 sources hashed, 49/49 requirements mapped, missing ID count 0 |
| P1 | C-DATA | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | implementation returned; review pending | packet-owned `platform/` paths only | 42 project files; install/typecheck/13 tests/valid fixture pass; no artifact promoted yet |
| P1 | C-REVIEW | Cursor SDK `composer-2.5` (`effort=high`, `fast=false`) | WARNING returned | none | one P0 and four P1 classes recorded in `research/cursor-execution/C0-composer-review-2026-08-08.md`; C0 not approved |
| P1 | C-DATA | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | C0R1 complete | packet-owned `platform/` paths only | independent typecheck + 30 tests + valid fixture pass; Composer re-review approved |
| P1 | C-REVIEW | Cursor SDK `composer-2.5` (`effort=high`, `fast=false`) | APPROVE | none | zero P0/P1; eight P2 hardening items routed to C0R2 |
| P1 | C-DATA | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | C0R2 complete | packet-owned `platform/` paths only | independent typecheck + 41 tests + valid fixture pass |
| P1 | C-REVIEW | Codex code review | WARNING | none | two P1 bypass classes found: typed-reference kinds and runtime discriminants |
| P1 | C-DATA | Codex after Cursor authentication stop | C0R3 complete | `platform/packages/content/**`; `platform/tests/content/**` | Cursor kept at Grok 4.5 High non-Fast but two runs failed before edits with invalid key; bounded remediation passed typecheck + 48 tests + valid fixture |
| P1 | C-REVIEW | Codex code review | APPROVE | none | all seven original probes and analogous reference probes fail correctly; zero P0-P2 in C0R3 scope |
| P1 | C-DATA | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | C1/C1A/C1B complete after remediation | `platform/content/**`; `platform/packages/content/src/publication/**`; publication tests | five fragments, exact 2/24/48/15 counts, rights-gated audio, source authority projections |
| P1 | C-REVIEW | Cursor SDK `composer-2.5` (`effort=high`, `fast=false`) + Codex reviewer | WARNING then APPROVE after C1R1/C1R2 | none | final 75 tests, fixture/publication/check pass; authority and recursive rights gates fail closed; zero remaining P0-P2 |
| P2 | C-DATA | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | C2A approved after C2AR1-C2AR5 | `platform/packages/content/src/indexes/**`; focused tests; README | independent typecheck + 106 tests + publication/check pass; learner/author projections, dynamic queries, filters, German aliases and nested relationship metadata approved by Composer and executable reviewer with zero actionable P0-P2 |
| P2 | C-LEARN | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | C2B approved after C2BR1-C2BR3 | `platform/packages/learning/src/mastery/**`; mastery tests; package integration | independent typecheck + 168 tests + publication/check pass; six-dimensional event-sourced mastery, UTC/stability, anti-luck, event-kind and per-dimension lapse recovery approved by Composer and executable reviewer with zero actionable P0-P2 |
| P2 | C-LEARN | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | C2C approved after C2CR1 | `platform/packages/learning/src/review/**`; review tests; package integration | independent typecheck + 208 tests + publication/check pass; deterministic scheduler, balanced mission quotas, new-card authority, learner eligibility and mastery weakness bridge approved by Composer and executable reviewer with zero actionable P0-P2 |
| P2 | C-LEARN | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | C2D approved after C2DR1-C2DR3 | `platform/packages/learning/src/persistence/**`; persistence tests; package integration | independent typecheck + 288 tests + publication/check pass; adapters/import/export, typed ownership, atomic replay and complete string firewall approved by Composer and executable reviewer with zero actionable P0-P2 |
| P3 | C-WEB | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | P3-01 approved after P3AR1-P3AR2 | `platform/apps/web/**`; `platform/tests/web/**`; web package integration | 2 lessons; 24 validated activity records; 23 learner-published SSG routes plus review-only teacher-deck 404; 320 tests, Next 16.3 build, zero production audit vulnerabilities, 8/8 HTTP route smoke and 5/5 responsive visual E2E; Composer and executable review findings remediated |
| P5 | X-MEDIA | Codex | technical audit complete; human gate open | `media/qa/alpha-tts-technical-audit.json`; `tools/audit-alpha-tts.mjs` | pass — 327 manifest assets = 327 disk files = 327 audited rows; zero technical failures; 327 listening reviews pending |
