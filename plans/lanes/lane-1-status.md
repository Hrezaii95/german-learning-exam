# Lane 1 status

Updated 2026-10-22. Work is published as one draft PR per item into `codex/live-alpha`, as explicitly requested. No PR is merged, no integration merge is performed, and no deployment is claimed. The latest status is carried on `lane1/l1-g2-book-refs`; older PR snapshots retain their checkpoint status.

## Items

| Item | Work | State | PR / pre-code plan | Result |
|---|---|---|---|---|
| L1-1 | Foundation | Implemented; full checks passed | [#2](https://github.com/Hrezaii95/german-learning-exam/pull/2) · [plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341143533) | Tokens, single typed navigation source, role slots and exact null AccountSlot stub. |
| L1-2 | Live defects | Implemented; two owner boundaries blocked | [#5](https://github.com/Hrezaii95/german-learning-exam/pull/5) · [plan](https://github.com/Hrezaii95/german-learning-exam/pull/2#issuecomment-6341400778) | Lesson 4 families/aliases/forms retained; lesson 10–12 routes corrected. Canonical USA schema and selective review-audio export require Lanes 2/3. |
| L1-3 | Article palette | Implemented; full checks passed | [#7](https://github.com/Hrezaii95/german-learning-exam/pull/7) · [plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341419141) | Canonical male/female/neuter/plural/plain tones, one token palette; contrast and rendered samples reviewed. |
| L1-4 | Reference wrap/focus | Implemented; full checks passed | [#8](https://github.com/Hrezaii95/german-learning-exam/pull/8) · [plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341419141) | Correct narrow plural layouts and shared focus ring; 32 actual matrix/pattern cases pass at eight widths. |
| L1-5 | Sheet frame | Implemented; original Pages gate blocked | [#9](https://github.com/Hrezaii95/german-learning-exam/pull/9) · [plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341565819) | Directory, Countries, All vocabulary and 37-destination chooser; exact query/hash/base-path compatibility. |
| L1-6 | Vocabulary entry | Implemented; original Pages gate blocked | [#10](https://github.com/Hrezaii95/german-learning-exam/pull/10) · [plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341702639) | Shared entry/dropdown/highlighted plural; topic handoffs, local lesson filtering/reset and old word hashes. |
| L1-7 | Hubs/review | Full ordered rerun in progress | [#12](https://github.com/Hrezaii95/german-learning-exam/pull/12) · [plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341853109) | Canonical hub/profession stubs, Grammar paths and Saved guided review; public hooks only. |
| L1-8 | Visual system | Implemented; full/rendered gates queued | [#13](https://github.com/Hrezaii95/german-learning-exam/pull/13) · [plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6342039842) | Shared line-art registries, controls/audio/type; ADR-017 mapped raster detail heroes explicitly retained. |
| L1-9 | Hygiene | Implemented; full/PDF gates queued | [#14](https://github.com/Hrezaii95/german-learning-exam/pull/14) · [plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6342080361) | Live-state printing, canonical CSS, eight breakpoints, shared icons, mobile labels and proven dead-code removal. |
| L1-10 | Specification docs | Implemented; full gates queued | [#15](https://github.com/Hrezaii95/german-learning-exam/pull/15) · [plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6342287477) | Four owned docs match candidate IA/design; deployment, shared-smoke and owner qualifiers remain explicit. |
| L1-G2 | Book references | Owner-review draft; full gates queued | [#11](https://github.com/Hrezaii95/german-learning-exam/pull/11) · [plan](https://github.com/Hrezaii95/german-learning-exam/pull/1#issuecomment-6341853109) | 1,046 stable rows; 304 supported pages, 742 explicit nulls, 2,721 evidence records. No live import/publication. |
| L1-G1 | Scoped play links | Blocked | — | `origin/lane2/main` and its `/play/run` are absent; hide actions until the dependency exists and is built. |
| L1-G3 | Legacy practice retirement | Blocked; do last | — | Requires Lane 2 Phase 1 on `origin/lane2/main`. |
| L1-G4 | Platform/game nav | Other lanes | — | Lanes 2/3 add entries in their own blocks after foundation merge. |

## Executed verification

Counts below describe the executed candidate checkpoints, with the environment adaptations described afterward. A queued check is not passed.

| Item | Root Vitest | Dedicated web | Browser | Production | Pages and audits |
|---|---|---|---|---|---|
| L1-1 | 108 files / 1,229 tests | 99 / 890 | 129/129 | build + 50 route checks pass | 128-route manifest; 27,261-file leak scan; HTTP38 pass. Language1,618/0; offline159; word cards722/989; attribution0. |
| L1-2 | 108 / 1,245 | 99 / 906 | 129/129 | build + 50 pass | 128 routes; 27,259 files; HTTP38 pass. Language1,618/0; offline159; cards722/989; attribution0. |
| L1-3 | 109 / 1,251 | 100 / 912 | 129/129 | build + 50 pass | 128 routes; 27,259 files; HTTP38 pass. Language1,618/0; offline159; cards722/989; attribution0. |
| L1-4 final | 109 / 1,251 | 100 / 912 | 133/133 | build + 50 pass | 128 routes; 27,260 files; HTTP38 pass. Language1,618/0; offline159; cards722/989; attribution0. |
| L1-5 final | 111 / 1,266 | 102 / 927 | 135/135 | build + 50 pass | Fresh build/138-route manifest/leak scan pass; original HTTP smoke blocked. Owned helper40 real requests pass. Language1,620/0; offline168; cards722/989; attribution0. |
| L1-6 final | 111 / 1,285 | 102 / 946 | 135/135 | build + 50 pass | Build/138-route manifest/27,278-file leak scan pass; original HTTP smoke blocked. Owned helper40 real requests pass. Language1,620/0; offline168; cards722/989; attribution0. |
| L1-7 | 112 / 1,305 passed | 103 / 966 passed | Full two-worker rerun running | Pending | Pending; original shared expectations are known external-owner blockers. |
| L1-8 | Queued | Queued | Queued | Queued | Queued |
| L1-9 | Queued | Queued | Queued | Queued | Queued, including rendered A4/Letter PDF review. |
| L1-10 | Queued | Queued | Queued | Queued | Queued |
| L1-G2 | Queued | Queued | Queued | Queued | Queued |

All completed full adapted checks above also pass root/app/test TypeScript, changed/full lint and publication validation. L1-2’s first browser attempt exhausted disk; after removing completed reproducible outputs and rebuilding, all129 tests passed. L1-5’s first browser run found same-document country-hash handling and 200% text navigation overlap; both were fixed before its135-test rerun. L1-6’s initial browser failures were exact-path assertions missing the canonical trailing slash; query/lesson checks remain intact and the135-test rerun passes.

Additional executed evidence:

- L1-4: all139 People and456 All highlighted forms pass detached/split-ending, clipping and overflow scans for matrix/pattern layouts at320/390/768/1050/1100/1280/1366/1440px. Representative screenshots inspected; print computed layout unchanged. Article contrast on tone tints is5.01–6.82:1.
- L1-5/6 owned Pages helpers:38 canonical pages,21 subjects,15 workshops, two real legacy stubs and45 country bookmark checks, using40 real HTTP requests. L1-5 additionally passes eight actual query/hash redirects and chooser37 at390/1366px. L1-6 passes18 actual topic-to-subject exact-lesson and Back journeys at390/1366px. Canonical coverage is1,330 unique records:1,282 canonical-card rows plus48 authored dictionary extras.
- L1-7:167 stacked focused tests originally passed. Full check caught an unsupported role-query option and a stale retired-vocabulary Back expectation. Both test-only corrections are published through G2; targeted web-test types and the12-test book suite pass. The complete check now passes; the first browser run reports127 passes/nine failures, including a closed-disclosure locator and several later timeouts. An isolated actual-state probe proves global Lesson2 scope survives Back without a local lesson query; the test now checks restored Lesson2/12 controls and preserves its query/source/tag/dropdown checks. A full two-worker browser rerun is in progress; no browser pass is claimed.
- L1-8 hero follow-up: the updated lane instruction at `b04660bf` requires mapped raster heroes on details/card views. Five owned files restore that exception while retaining line-art previews/fallbacks. The L1-9 variant’s regression run changed seven failures to30/30 passes. The L1-8-specific variant passes parsing/CSS proof and independent review; its full execution is queued.
- L1-9:199 focused tests/14 files; scoped lint and80 TS/test +26 CSS parses pass. Print guards, directory visibility and food-select findings fixed. Independent review caught CSS source-order drift; original responsive precedence restored with declaration/cascade checks. Actual full browser and PDF review remain queued.
- L1-10: four owned docs; table/link/source checks and independent review pass. ADR-016 full media grant, ADR-017 raster exception, shared-smoke boundaries and G2 owner qualification are preserved.
- G2:35 focused tests/three files and independent source review pass. Deterministic1,698,311-byte sidecar retains the exact source hashes, row identities/order and explicit null reasons after restacking. It remains outside learner payloads.

## Shared smoke-gate handoff

Ownership review found that earlier appended adapters changed existing shared expectations. Those adapters are removed from every affected draft. The unowned production smoke script is byte-identical to baseline `4439d69d`; shared Pages changes are only literal route-list additions in the Lane1 block. Raw-blob comparison confirms baseline identity after removing that block. Offline precache additions and NAV_ITEMS stay inside their own blocks. No protected Lane2/3 package, dependency, config, workflow, review or learner-state files are changed; AccountSlot is the expressly authorized exact null stub.

The original Pages HTTP smoke fails `subject directory missing introductions` because it expects full content at retired `/cheat-sheets/subjects`; it also retains the old plural-page expectation. From L1-7 the original production smoke retains exact-200 destination expectations for retired `/vocabulary`, `/hubs` and `/concepts`, which now return their required308 behavior. Lane3 owns migrating those shared assertions. These failures remain visible and block the original gates. No adapter-based result is accepted as a gate pass.

Owned `tests/e2e/support/lane1-canonical-pages-smoke.mjs` and `lane1-canonical-routes-smoke.mjs` use real requests/statuses/URLs and supplementary compatibility assertions. Their success cannot clear either original shared gate. Temporary strict runners preserve raw logs, distinguish exact known retired-route failures from unrelated errors, stop on unexpected failures, and finish with exit3 / `checks-complete-shared-smoke-blocked` when an original gate remains blocked.

## Environment adaptations

The tsx CLI’s IPC socket fails with EPERM here; the unchanged publication/projection code runs with `node --import tsx`. After projection, `npm_config_ignore_scripts=true npm run build:web` skips only the already-run prebuild. The existing Pages controller runs through a temporary wrapper changing only the projection launcher; its isolate/patch/build/finalize/restore flow remains intact. The pinned Chrome151 download returned HTML; E2E uses installed Headless Chrome152 through a temporary executable/absolute-path config. After the L1-7 first browser run encountered host pauses/timeouts, full reruns use two workers and no competing browser probes, preserving all assertions, timeouts and zero retries. Repository config and dependencies are unchanged. Builds run sequentially against candidate archives; completed generated outputs are removed to keep disk space available. Source commits and verification logs are retained.

## Handoffs and Owner

- Lane2: canonical USA plural semantics require its content types/validation. Subject presentation already uses the correct plural tone. G1/G3 wait for its absent integration branch.
- Lane3: selective `/review-audio` Pages exclusion must happen in its export controller; a route-level Not Found alone is insufficient. Shared smoke expectation updates are also required. AccountSlot transfers to Lane3 after foundation merge; session/auth integration is not claimed.
- Owner: review G2 before publication; German language and generated-audio listening approval remain open. ADR-016’s full Momente A1.1/A1.2 grant with visible attribution is retained;15 workbook tracks describe publication scope, not the rights boundary.
- Owner: ADR-017’s approved raster detail/card heroes and assets are retained. Any future removal is an explicit owner decision, deferred here.
- Owner/external platform: secrets, account settings, integration/release approval and deployment are not performed by this lane.
