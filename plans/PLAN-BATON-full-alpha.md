# PLAN-BATON — German Learning OS Full Alpha

updated: 2026-08-13T16:30:00+03:30
orchestrator_session: Claude Code takeover 2026-08-13 (session 3a449151)
active_engine: claude-code
active_phase: T1-TTS-GATE
meta_status: n/a
gate_status: {G0: green, G1: green, G2: green, G3: green, G4: review, G5: partial, G6: pending, G-OWNER: pending}
workers: [C-LEARN, C-WEB]
parallel_groups: []
file_ownership:
  - C-LEARN: `platform/packages/learning/**`, `platform/tests/learning/**`, learning package integration only
  - C-WEB: `platform/apps/web/**`, `platform/tests/web/**`, web package integration and README only
open_items_unchanged: true
violations: []
next_action: Ingest and register the 90 restored Kursbuch MP3s (hash, dedupe, governed structure, CD1 1_01-1_17 Lesson 1-2 alignment), then complete P4-04 independent review and dispatch the Codex UX three-direction brief. G4 remains review until behavior review closes; G5 remains partial because generated TTS still needs qualified human listening approval.

## Current verified facts

- 77-message original session is present and indexed in the decision ledger.
- Failed Cursor demo is quarantined under `archive/cursor-demo-2026-07-30/`.
- Current application is a partial vertical slice, not the complete Alpha.
- 327 generated pronunciation assets reproduce from the audio manifest.
- The 27-clip exact-gap supplement is merged verbatim into the canonical TTS manifest: `node tools/audit-alpha-tts.mjs` passes with an exact 354 manifest = 354 disk = 354 audited bijection, zero technical failures, no audio regenerated; all 354 remain pending qualified German listening approval.
- The project owner explicitly approved public redistribution on 2026-08-13 for exactly 15 mapped workbook CD1 tracks (1_01–1_15). They are byte-identical, hash-audited, and mapped only to their original Lesson 1–2 exercises; no other publisher media is approved.
- The owner-restored 90-track Kursbuch delivery is ingested: 59 new CD1 MP3s registered under `resources/original/audio/Kursbuch-20260813T121208Z-1-001/Kursbuch/CD1/` (source manifest now 456 files, lock updated, validator green); the 31 CD2 intake copies were byte-identical duplicates of the registered `Momente_A1_1_KB_CD2` pack and are quarantined at `archive/duplicates/`, not re-registered. CD1 tracks `1_01`–`1_17` carry publisher filenames naming Lessons 1–2; exact exercise/transcript alignment remains open. Evidence: `research/kursbuch-ingestion-2026-08-13.json`. All Kursbuch audio remains private-rights-gated; nothing new is published.
- Cursor CLI print mode is affected by a known silent-hang failure. Official Cursor SDK 1.0.27 successfully completed a no-tools probe with `grok-4.5`, `effort=high`, `fast=false`, the SDK-equivalent of the requested non-Fast High variant.
- The current learner web slice is live at `https://hrezaii95.github.io/german-learning-exam/`; pushes to `codex/live-alpha` deploy through the guarded GitHub Pages workflow.
- P4-01, P4-02 and P4-03 are implemented and current-disk verified by 169/169 focused web tests, including behavioral game, five-level conversation, and race-safe recorder lifecycle coverage.
- Local-first persistent learner events, review cards, tags, notes, resume state, daily mission, export/import recovery, and derived XP/streak/badges are implemented; independent review and live-browser evidence remain open.
- Seven original responsive infographic families passed technical QA. Three published-only families are wired into learner routes; mixed/review-only families remain outside the learner bundle.
- A deterministic learner-safe enrichment artifact maps 23 activities and 26 core profession cards while excluding 48 teacher rows and 86 review-only lexemes.

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
| P3 | C-WEB | Cursor CLI attempted then SDK `grok-4.5` (`effort=high`, `fast=false`) | P3-02 approved after P3BR1-P3BR2 | `platform/apps/web/**`; `platform/tests/web/**`; narrow CLI timing test; review evidence | six learner-safe hubs plus `/hubs`; exact counts 69/4/0/58/0/0; on-disk recursive leak scan; deterministic artifact; 339 tests, 37-page build, zero vulnerabilities, 15/15 route smoke; Composer final APPROVE with zero actionable P0-P2 |
| P3 | C-WEB | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | P3-03 approved after P3CR1 | learner search/context web paths and tests | 156 learner-only search docs; canonical alias matching and typed back context; 2 lesson + 23 activity SSG restored; 361 tests, 38-page build, zero vulnerabilities, 18/18 smoke; Composer final APPROVE zero P0-P2 |
| P3 | C-WEB | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | P3D approved after review remediation | representative vocabulary, verb and Q&A detail surfaces | responsive learner-safe detail pages, canonical navigation context and explicit audio gaps; full web and publication gates passed |
| P4 | C-WEB | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | P4-01 approved after P4AR1 | seven registered game modes and behavioral tests | six functional modes plus rights-honest unavailable audio match; deterministic events, hint/anti-luck semantics and responsive UI verified |
| P4 | C-WEB | Cursor SDK `grok-4.5` (`effort=high`, `fast=false`) | P4-02 and P4-03 approved after P4BR1 | five-level conversation ladder and recorder lifecycle | level locks, published-answer grading, non-strong hint/reveal evidence, record/playback/self-check, permission/error/cleanup races verified |
| Deploy | ORCH | Codex | live and auto-deploying | `.github/workflows/deploy-pages.yml`; Pages-safe public routes | commits `84abdbb` and `6610fa3`; hosted workflow `31663777289` green; representative public routes HTTP 200 and unknown route 404 |
| P5 | X-MEDIA | Codex | technical audit complete; human gate open | `media/qa/alpha-tts-technical-audit.json`; `tools/audit-alpha-tts.mjs` | pass — 327 manifest assets = 327 disk files = 327 audited rows; zero technical failures; 327 listening reviews pending |
| P4 | C-WEB/C-LEARN | Codex subagents + ORCH | implementation complete; independent review open | learner-state controller/provider, review/settings routes, reward engine and tests | `npm run check` green: 482/482 total tests and 181/181 web tests; review verdict pending |
| P5 | X-MEDIA | Codex subagents + ORCH | public integration complete for approved subset | 15 source tracks; 7 infographic families; enrichment projection | 69/69 rapid audio technical checks; 7/7 infographic QA; exact rights scope recorded; generated TTS human listening remains open |
| T1 | CC-ORCH | Claude Code (fable) | complete | `media/manifests/alpha-tts-manifest.json`; `media/qa/alpha-tts-technical-audit.json` | pass — 27-clip supplement merged verbatim; audit 354 manifest = 354 disk = 354 audited, 0 failures; no audio regenerated; 354 listening reviews remain pending |
| T1b | CC-ORCH | Claude Code (fable) | complete | `content/source-index/source-manifest.json`; `content/source-index/source-lock.json`; `research/kursbuch-ingestion-2026-08-13.json`; `tools/build-source-manifest.mjs` | pass — validator green at 456 files; 59 new KB CD1 tracks registered, 31 CD2 byte-dupes quarantined; 17 CD1 tracks filename-aligned to Lessons 1–2, transcript alignment open |
