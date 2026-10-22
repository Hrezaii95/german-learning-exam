# Lane 1 status

Updated by Lane 1 only. Latest owner instruction: one draft PR per item into `codex/live-alpha`; never merge. Plans are posted before implementation. Lane docs were read from `origin/claude/german-webapp-audit-game-i0plj0` because PR #1 is unmerged; no documentation or integration merges were performed.

| PR | Title | State | Link | Notes |
|---|---|---|---|---|
| L1-1 | Foundation: tokens, shared navigation, account slot | draft PR | [PR #2](https://github.com/Hrezaii95/german-learning-exam/pull/2) · [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341143533) | Exact contract tokens; one navigation source; preferred sheets reachable; role inputs; root uses `home` to reserve Lane 3's `dashboard`. Static export built; browser gates running. |
| L1-2 | Live defects | in progress | [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/2#issuecomment-6341400778) | Investigation found eight Lesson 4 duplicates. Canonical USA plural needs Lane 2's singular-only Gender schema; selective review-audio Pages exclusion needs Lane 3's build controller. |
| L1-3 | One article-colour scheme | in progress | [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341419141) | Isolated worktree; draft will follow L1-2. Depends on owner merging L1-1 tokens. |
| L1-4 | Reference word wrapping and focus | in progress | [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341419141) | Isolated worktree; draft will follow L1-3. |
| L1-5 | Shared cheat-sheet frame and directory | planned | — | Preserve old query strings and hashes. |
| L1-6 | Shared vocabulary entry and dropdown | planned | — | Keep illustrations backward-compatible. |
| L1-7 | Consolidate hubs and review | planned | — | Preserve old URLs. |
| L1-8 | Visual system | planned | — | Illustration, controls, audio, type and Studio. |
| L1-9 | Hygiene | planned | — | Print, CSS, breakpoints, icons and dead code. |
| L1-10 | Specification docs | planned | — | Reflect only implemented behavior. |
| L1-G1 | Play links | blocked | — | Wait for `/play/run` on `origin/lane2/main`; hide until built. |
| L1-G2 | Source-backed book page references | planned | — | No guessed pages; owner review remains open. |
| L1-G3 | Retire legacy practice games | blocked | — | Lane 2 Phase 1 required; do last. |
| L1-G4 | Game/platform nav entries | planned | — | Owned by Lanes 2/3. Reserved `play`, `dashboard`, `teaching`, `admin` active IDs. |

## Verification

L1-1: targeted regression check initially failed 3 tests, then 30/30 shell tests passed. Full check exposed stale navigation-count assertions and strict TypeScript issues; corrected before rerunning. Final `npm run check` run passed type checks, lint and 108 files / 1,229 Vitest tests, then hit the tsx CLI IPC `EPERM` at publication validation. The validator passed separately using `node --import tsx`; the dedicated web suite passed 99 files / 890 tests. Static export passed using the existing Pages controller with the same loader substitution. Browser checks remain in progress; build/smoke/Pages/attribution results will follow.

Browser setup: the pinned Chrome 151 download returned HTML instead of a ZIP. The existing Chrome Headless Shell 152.0.7977.30 launches successfully. Browser checks use a temporary config outside the repository that changes only the executable path and absolute test/server paths; repository dependencies and config are unchanged.

## Handoffs and owner gates

- Lane 3 receives `components/account/AccountSlot.tsx` after L1-1 is merged. It is a null stub now, rendered once in the always-visible toolbar header and once in the mobile Menu. `ShellLayout`, `AppShell` and `MobileNavigation` accept an optional role; session integration is not claimed.
- Lane 2 cooperation is needed for canonical USA plural support in content types/validation. Current subject vocabulary already has the correct plural tone.
- Lane 3 cooperation is needed for selective `/review-audio` exclusion from the Pages output while retaining the normal QA tool. A route-level `notFound()` alone does not exclude exported files.
- No merges, deployment, German language approval, listening approval or content-publication approval are performed by this lane.
