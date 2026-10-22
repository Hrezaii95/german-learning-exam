# Lane 2: the Wortwerk game

**Goal:** build Wortwerk, the all-skills game driven by content packs and aligned with the book, as specified in **`docs/games/wortwerk-build-spec.md`**. That file is your authoritative spec. This page only says which parts of it are yours and how to avoid colliding with Lanes 1 and 3.

**Read first:**
- `docs/lanes/README.md` and `docs/lanes/CONTRACTS.md`;
- `docs/games/wortwerk-build-spec.md` and everything its §0 lists;
- `docs/games/wortwerk-mockup-brief.md` for the screens.

## You own
- **Game code:** `platform/packages/wortwerk/**` (new), `platform/apps/web/components/wortwerk/**`, `platform/apps/web/lib/wortwerk/**`, `platform/apps/web/app/play/**`.
- **Content packs:** `platform/content/{packs,languages,difficulty}/**`, plus the pack fixtures under `platform/tests/fixtures/{packs,languages}/**`.
- **Content model:** `platform/packages/content/src/{types,validation}/**` (widen `CefrLevel`, add the pack and item schemas).
- **Learning engine:** `platform/packages/learning/**` (scheduler, mission, mastery: the per-dimension progress, the format ladder).
- **Scope:** `platform/apps/web/lib/study/scope.ts` and the new `lib/study/book-position.ts` (book-aligned scope, the page rule).
- **Old games:** `platform/apps/web/components/games/**` and `lib/games/**` (reuse them, or leave them for Lane 1 to redirect).
- **Tests** for the above under `platform/tests/{learning,web,e2e}/wortwerk*`.

## You must not touch
- Cheat-sheet pages, the shell or tokens (Lane 1). Use the tokens with fallbacks (CONTRACTS §1); add your nav entry only after Lane 1's L1-1 merges (CONTRACTS §2).
- Auth, `/api`, sync transport, Cloudflare, workflows, `next.config.*`, the dashboards (Lane 3).

## Which parts of the build spec are yours
| Build spec item | Owner |
|---|---|
| Phase 0 (data fixes) | **Lane 1** (L1-2). Build the item pool so it **fails loudly on duplicate headwords**, and re-run after L1-2 merges |
| Phases 1, 2, 3, 4, 4b, 5 | **Lane 2** |
| §1.8 Class mode A | **Lane 2**, the student side only: signed-out result codes, challenge links, a CSV import of *personal* words. Assignment creation and teacher extras are Lane 3 |
| §1.9 Class mode B and Phase 7 | **Lane 3** |
| §3 Persistence | now: local first **plus** the sync stores in CONTRACTS §4 (export `wortwerkSyncStores`); every progress value derives from events |
| §8 Deployment | GitHub Pages now; Cloudflare after Lane 3's cutover. Don't edit workflows. Make `packs:validate` part of `npm run check` (an append-only edit to the `check` script) so CI runs it in both pipelines |

## Interfaces you must provide
- **Links:** `lib/wortwerk/links.ts` with `encodeScope` / `decodeScope` / `playHref` (CONTRACTS §6).
- **Sync:** `lib/wortwerk/sync-store.ts` with `wortwerkSyncStores` (CONTRACTS §4).
- **Overlay packs:** `registerOverlayPacks()` in your pack loader (CONTRACTS §5).
- **Assignments:** `assignment.progress` events (CONTRACTS §7).
- **Embeddable panels:** `components/wortwerk/TodayPanel.tsx` (the Today content: streak, goal ring, run preview, next milestone, Quick review) and `components/wortwerk/ProgressSummary.tsx`, so Lane 3 can put them on the student dashboard (CONTRACTS §11).

## PR plan
1. **L2-1:** content types (widened `CefrLevel`), the language profile, the pack schema, loader, validator, capability index, the A1 pack migration script.
2. **L2-2:** the Corners mechanic, Four Corners templates, the no-giveaway question and feedback states.
3. **L2-3:** Daily Run (adaptive dimension choice, preview, comeback, finisher), per-dimension progress, streak and goal, results, `/play` and `/play/run`, `links.ts`, `sync-store.ts`, TodayPanel.
4. **L2-4 onward:** follow the build spec phases 2 → 3 → 4 → 4b → 5, one PR per coherent slice.

## Rules
- **Branches and integration:** work on `lane2/main` and do the integration step exactly as in `docs/lanes/README.md` (rules 3–6). One commit series per plan item, with the item id in the message. **Never merge into `codex/live-alpha`**; the owner merges the single `integration/all` PR.
- **Gates:** run the build spec §6 gates, one at a time.
- **Status:** update only `plans/lanes/lane-2-status.md`.
