# P6-02 — Accessibility, responsive, E2E and offline evidence

Status: **accessibility remediated and guarded; offline policy shipped and
live-verified; end-to-end layer built and green.** Unadjudicated audit leads and
human-only checks remain open. Recorded 2026-08-15, updated 2026-08-16 by Claude
Code ORCH.

## Method

A five-dimension audit (accessibility semantics, contrast/zoom/motion, responsive,
E2E coverage, offline/performance) ran against a single frozen export so every
auditor saw identical bytes. Every finding then faced two independent skeptics —
one asking "is this already handled somewhere you did not look?", one asking "does
this actually reach a learner?" — and survived only if neither refuted it.

**48 raw findings → 7 confirmed, 41 refuted.** The 85% rejection rate is the point:
acting on a plausible-but-wrong finding costs more than never raising it.

Caveat on completeness: the verification stage was interrupted by an account
session limit after 24 of 102 agents. The 7 confirmed findings are fully verified;
an additional set of raw findings was never adjudicated and is listed below as
unverified rather than silently dropped or silently believed.

## Confirmed and fixed (each guarded by a test that fails without the fix)

| WCAG | Finding | Before | After |
|---|---|---|---|
| 2.4.2 (A) | Duplicate page titles | 156 of 205 pages titled "German Learning OS"; 50 distinct | 203 distinct titles / 205 pages (only the three 404 copies repeat) |
| 2.5.3 (A) | Accessible name missing visible label | 321 failing controls on 122 pages — every pronunciation control unreachable by voice control | 0 failures across 591 labelled controls |
| 4.1.3 (AA) | Status messages never repeat | Region mounted with its message; constant strings meant a repeated wrong answer announced nothing | Regions render from first paint; every announcement carries a bumped sequence |
| 1.4.3 (AA) | Gender badge contrast | 4.10 / 3.32 / 3.13:1 | 7.00 / 5.87 / 5.25:1, identifying hue retained on swatch, border and shape |
| 3.1.2 (AA) | German not marked in controls | 34 options, activity tokens and typing input unmarked | `lang="de"` on the German that is the exercise |
| 2.5.3 (A) | Practice cards suppressed their own description | aria-label replaced title + description + availability | aria-label removed; visible text computes the name |
| 2.5.3 (A) | Q&A input name mismatch | aria-label overrode a correct `<label for>` on 15 pages | aria-label removed |

Independently re-measured by ORCH against the export, not taken from the worker
report: title distinctness, label-in-name failures, and all three contrast ratios.

## Verified good (stated so the evidence is not merely a defect list)

3,227 elements already carry `lang="de"`; landmarks, heading order and form
labelling were broadly sound; a reduced-motion block exists; the meaning plate and
per-type hub cards hold their reserved geometry at 360/390/820/1440 with zero
horizontal overflow (browser-verified during Phase 2b).

## Open — NOT closed by this work

1. ~~**Offline-first policy does not exist.**~~ **CLOSED 2026-08-16.** Shipped as a
   versioned service worker + manifest with a shell precache and a runtime
   cache-on-use tier, gated by `tools/audit-offline-export.mjs`. Verified on the
   live deployment in-browser: the worker registers, activates and controls the
   page, and `/vocabulary/` is genuinely served from an 85-entry shell cache.
   Evidence: `offline-live-verification.json`.
2. ~~**No end-to-end layer exists.**~~ **CLOSED 2026-08-16.** 12 Playwright specs /
   36 tests drive the served export across all 10 critical journeys; 36/36 green.
   Its first run found a real product defect — the resume pointer was overwritten
   on every mount, so no stored pointer survived a reload and Continue always sent
   the learner backwards. Fixed, with a non-vacuous guard (3 of 4 guard cases fail
   when the fix is disabled).
3. **Delivery weight** — raw PNG illustrations, font subsetting, per-route bundle
   contents and eager/lazy policy were audited but the findings were not verified.
4. **Real assistive-technology testing.** Automated checks cannot establish that a
   screen-reader journey is coherent. This requires a human and stays open.

## Unverified raw findings (adjudication interrupted)

Recorded for honesty; treat as leads, not facts:
`no-service-worker-no-cache-version-policy`, `no-end-to-end-layer-exists`,
`png-only-illustrations-21mib`, `font-not-subset-and-force-preloaded`,
`whole-content-corpus-in-every-route-bundle`, `below-fold-illustrations-eager-and-preloaded`,
`activity-completion-never-executed`, `review-card-creation-zero-coverage`,
`import-recovery-never-executed`, `word-order-game-never-played`,
`review-session-only-runs-against-a-mock`, `conversation-ladder-never-reaches-level-five`,
`game-and-conversation-persistence-branch-dead`, `storage-failure-code-collapsed-no-quota-strategy`,
`dashboard-permanent-loading-on-write-failure`, `practice-loop-silently-discards-attempts`,
`listening-page-15-metadata-fetches`, `duplicate-rsc-txt-payloads`,
`unhandled-rejection-activity-progress`, `route-smoke-orphaned-from-gate-chain`,
plus several contrast/reflow items on infographic and morphology surfaces.

Full data: `p6-02-confirmed-findings.json`.
