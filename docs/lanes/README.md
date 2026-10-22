# Parallel implementation lanes

Three Codex sessions work in parallel (ADR-019). Each lane owns a fixed set of files and builds against the shared interfaces in [CONTRACTS.md](CONTRACTS.md), so the lanes don't collide.

| Lane | Plan | Owns (summary) | First PR |
|---|---|---|---|
| **1 · App consistency and audit fixes** | [lane-1-app-fixes.md](lane-1-app-fixes.md) | every existing route and component, styles and tokens, the shell and nav, canonical content data, page refs | **L1-1** tokens + single nav config + AccountSlot stub |
| **2 · Wortwerk game** | [lane-2-game.md](lane-2-game.md) → [../games/wortwerk-build-spec.md](../games/wortwerk-build-spec.md) | `/play/**`, `packages/wortwerk`, `packages/learning`, content types and packs, scope + book position | **L2-1** content types, packs and A1 migration |
| **3 · Platform** | [lane-3-platform.md](lane-3-platform.md) → [../platform/](../platform/) | Cloudflare (`apps/edge`), D1, auth, sync, `/login` `/account` `/dashboard` `/teacher` `/admin` `/api`, workflows, `next.config`, dependencies | **L3-1** the current app live at german.learnilabs.com |

## How the lanes stay apart
1. **File ownership:** each lane edits only the files its plan lists. Shared files are append-only inside the lane's own block (CONTRACTS §11).
2. **Contracts, not code:** the lanes meet only through CONTRACTS.md. Tokens, the nav config, routes, sync stores, overlay packs, scope links, assignment events, the session hook and the embeddable panels are all specified there. Changing the contracts needs the owner's OK.
3. **One branch per lane, while the owner is away:**
   - **Create the branch:** create `laneN/main` from `origin/codex/live-alpha`, then merge in `origin/claude/german-webapp-audit-game-i0plj0` (PR #1: these docs; docs only, no conflicts). Skip that merge if PR #1 is already merged.
   - **Commits:** make one commit (or a small series) per planned item, with the item id in the message (e.g. `L1-3: one article-colour scheme`). Push after every item, so the work survives if the session ends.
   - **Visibility PR:** keep one draft PR `laneN/main → codex/live-alpha` open for visibility, with the plan checklist in its body.
   - **Never** merge into `codex/live-alpha`, and never push to another lane's branch.
4. **Status:** each lane writes only its own `plans/lanes/lane-N-status.md`. A resumed or new session reads it first and continues from there. Claude updates the plan baton and the register when integrating.
5. **Gates after every item:** the repo gates, one at a time (CLAUDE.md), with the results recorded in the status file.
6. **Integration (any lane, whenever it finishes an item):**
   1. Fetch.
   2. Create or update `integration/all` from `origin/codex/live-alpha`.
   3. Merge whichever of `origin/lane1/main`, `origin/lane2/main` and `origin/lane3/main` exist, **in that order**.
      - A lane may instead use one branch per item (`laneN/<topic>`, one draft PR each into `codex/live-alpha`), as Lane 1 started doing. In that case, merge that lane's open-PR head branches in plan order (L1-1, L1-2, …) at that lane's position.
      - Never include a branch whose PR is closed without merging.
   4. Resolve conflicts only in the append-only files (CONTRACTS §11: keep both sides; regenerate the lockfile with `npm install`). For any other conflict, stop and record it in your status file.
   5. Run **all** gates on the result and push.
   6. Keep one PR **"integration/all → codex/live-alpha"** up to date: not a draft once all gates pass, with a body that lists every included item, the gate results and the go-live checklist link.

   If the push is rejected because another lane pushed first, re-fetch and redo the steps. **The owner merges this single PR.**

## Dependencies between lanes (without merging to the live branch)
- **Before L1-1 has reached your branch:** Lanes 2 and 3 don't depend on Lane 1's code; they use the contracts with fallbacks. Add your nav entry in your own block of `lib/content/nav.ts`. If that file doesn't exist on your branch yet, merge `origin/lane1/main` into your lane branch first (allowed, and the only cross-lane merge permitted), or leave the nav entry for the integration step.
- **Items that need another lane's code:** L1-G1 needs `/play/run`; L3-6 embeds `TodayPanel`. Build them against the contract; they get exercised end to end on `integration/all`.

## When the owner is back (about 5 minutes)
Follow [../platform/GO-LIVE.md](../platform/GO-LIVE.md):
1. Merge the integration PR.
2. Cloudflare: plan upgrade and API token.
3. Add 3 GitHub secrets.
4. Click "Go live".

## Work until done
- Work through your **whole** plan without waiting for the owner. Don't stop after the first item.
- Anything only the owner can do (secrets, Cloudflare account settings, German language review) goes into your status file under "Owner", and you keep going.
- While the owner is away, contract changes must be **additive and backward-compatible**. Record each one in the CONTRACTS changelog.

## Short prompts (one per Codex session)

**Lane 1**
```
You are Lane 1 (app consistency and audit fixes) in the repo Hrezaii95/german-learning-exam. Fetch origin/claude/german-webapp-audit-game-i0plj0, then read docs/lanes/README.md, docs/lanes/CONTRACTS.md and docs/lanes/lane-1-app-fixes.md from it and follow them exactly. Work on branch lane1/main, only in files your lane owns, and complete your WHOLE plan without waiting for me: commit and push after each item, run the gates, keep plans/lanes/lane-1-status.md current, and update the integration/all PR as described. Never merge into codex/live-alpha.
```

**Lane 2**
```
You are Lane 2 (Wortwerk game) in the repo Hrezaii95/german-learning-exam. Fetch origin/claude/german-webapp-audit-game-i0plj0, then read docs/lanes/README.md, docs/lanes/CONTRACTS.md, docs/lanes/lane-2-game.md and docs/games/wortwerk-build-spec.md from it and follow them exactly. Work on branch lane2/main, only in files your lane owns, and complete your WHOLE plan without waiting for me: commit and push after each item, run the gates, keep plans/lanes/lane-2-status.md current, and update the integration/all PR as described. Never merge into codex/live-alpha.
```

**Lane 3**
```
You are Lane 3 (platform: Cloudflare, accounts, sync, dashboards) in the repo Hrezaii95/german-learning-exam. Fetch origin/claude/german-webapp-audit-game-i0plj0, then read docs/lanes/README.md, docs/lanes/CONTRACTS.md, docs/lanes/lane-3-platform.md and docs/platform/ from it and follow them exactly. Work on branch lane3/main, only in files your lane owns, and complete your WHOLE plan without waiting for me, so that docs/platform/GO-LIVE.md takes me about 5 minutes: commit and push after each item, run the gates, never commit secrets, keep plans/lanes/lane-3-status.md current, and update the integration/all PR as described. Never merge into codex/live-alpha.
```
