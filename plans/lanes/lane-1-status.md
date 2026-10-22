# Lane 1 status

Updated by Lane 1 only. Latest owner instruction: one draft PR per item into `codex/live-alpha`; never merge. Plans are posted before implementation. Lane docs were read from `origin/claude/german-webapp-audit-game-i0plj0` because PR #1 is unmerged; no documentation or integration merges were performed.

| PR | Title | State | Link | Notes |
|---|---|---|---|---|
| L1-1 | Foundation: tokens, shared navigation, account slot | draft PR | [PR #2](https://github.com/Hrezaii95/german-learning-exam/pull/2) · [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341143533) | Exact contract tokens; one navigation source; preferred sheets reachable; role inputs; root uses `home` to reserve Lane 3's `dashboard`. Implementation verified; draft awaits owner review. Full results below. |
| L1-2 | Live defects | draft PR | [PR #5](https://github.com/Hrezaii95/german-learning-exam/pull/5) · [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/2#issuecomment-6341400778) | Implemented duplicate/chapter/link/save fixes; independent review accepted; 207 focused tests passed. Full gates running. Canonical USA plural and selective review-audio export remain cross-lane blockers. |
| L1-3 | One article-colour scheme | draft PR | [PR #7](https://github.com/Hrezaii95/german-learning-exam/pull/7) · [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341419141) | Canonical palette and presentation vocabulary implemented; focused tests and independent review passed. Full gates queued after L1-2. Includes L1-1/L1-2 prerequisites. |
| L1-4 | Reference word wrapping and focus | in progress | [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341419141) | Isolated worktree; draft will follow L1-3. |
| L1-5 | Shared cheat-sheet frame and directory | in progress | [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341565819) | Checkpoint prepared; 196 focused tests and independent redirect/frame review passed; publication follows L1-4. |
| L1-6 | Shared vocabulary entry and dropdown | in progress | [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341702639) | Checkpoint prepared; 135 catalogue and 28 topic/content/recall tests passed; publication follows L1-5. |
| L1-7 | Consolidate hubs and review | in progress | [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341853109) | Redirects, owned Saved review composition and source context in progress; preserve legacy learning paths. |
| L1-8 | Visual system | in progress | [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6342039842) | Illustration, controls, audio, type and Studio work in isolated branch. |
| L1-9 | Hygiene | planned | [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6342080361) | Print, CSS, breakpoints, icons and dead code; implementation follows L1-7 checkpoint. |
| L1-10 | Specification docs | planned | — | Reflect only implemented behavior. |
| L1-G1 | Play links | blocked | — | Wait for `/play/run` on `origin/lane2/main`; hide until built. |
| L1-G2 | Source-backed book page references | in progress | [Plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341853109) | Source audit and candidate references in isolated branch; no guessed pages or publication approval. |
| L1-G3 | Retire legacy practice games | blocked | — | Lane 2 Phase 1 required; do last. |
| L1-G4 | Game/platform nav entries | planned | — | Owned by Lanes 2/3. Reserved `play`, `dashboard`, `teaching`, `admin` active IDs. |

## Verification

L1-1: targeted regression check initially failed 3 tests, then 30/30 shell tests passed. Full check exposed stale navigation-count assertions and strict TypeScript issues; corrected before rerunning. Final `npm run check` run passed type checks, lint and 108 files / 1,229 Vitest tests, then hit the tsx CLI IPC `EPERM` at publication validation. The validator passed separately using `node --import tsx`; the dedicated web suite passed 99 files / 890 tests. Static export passed using the existing Pages controller with the same loader substitution. Browser: 129/129 passed (5.2m) with Chromium 152 substitution. Production build passed after running the unchanged projection via the Node loader, then `npm_config_ignore_scripts=true npm run build:web` to skip only the already-completed tsx prebuild. `smoke:web-routes`: 50 checks passed. The normal `gates:pages` launcher also hits IPC EPERM; its unchanged controller was exercised with the loader substitution against an immutable archive of commit `663e27fc`, then every remaining gate component passed: 128-route Pages manifest / 27,261 files scanned / HTTP 38 routes; learner-language 1,618 files / 0 findings; offline 159 cached files; 722 word-card exports / 989 forms with audio / 0 failures; attribution 0 failures. No repository script/config or dependency changes were made for these environment adaptations.

L1-2: full adapted check passed (108 files / 1,245 tests; dedicated web 99 files / 906 tests; publication VALIDATION_OK). Initial browser run exhausted disk and reported ERR_INSUFFICIENT_RESOURCES/page crashes; reproducible old outputs removed, fresh export rebuilt, full unchanged suite rerunning. Remaining ordered gates follow that run.

Browser setup: the pinned Chrome 151 download returned HTML instead of a ZIP. The existing Chrome Headless Shell 152.0.7977.30 launches successfully. Browser checks use a temporary config outside the repository that changes only the executable path and absolute test/server paths; repository dependencies and config are unchanged.

## Handoffs and owner gates

- Lane 3 receives `components/account/AccountSlot.tsx` after L1-1 is merged. It is a null stub now, rendered once in the always-visible toolbar header and once in the mobile Menu. `ShellLayout`, `AppShell` and `MobileNavigation` accept an optional role; session integration is not claimed.
- Lane 2 cooperation is needed for canonical USA plural support in content types/validation. Current subject vocabulary already has the correct plural tone.
- Lane 3 cooperation is needed for selective `/review-audio` exclusion from the Pages output while retaining the normal QA tool. A route-level `notFound()` alone does not exclude exported files.
- No merges, deployment, German language approval, listening approval or content-publication approval are performed by this lane.
