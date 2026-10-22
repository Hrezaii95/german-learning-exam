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
3. **One branch per PR:** `lane1/…`, `lane2/…`, `lane3/…`. Draft PRs into `codex/live-alpha`. **Only the owner merges.** Rebase on `origin/codex/live-alpha` before each push.
4. **Status:** each lane writes only its own `plans/lanes/lane-N-status.md`. Claude updates the plan baton and the register when integrating.
5. **Gates on every PR:** the repo gates, one at a time (CLAUDE.md), with the output in the PR body.

## Merge order (owner)
1. **Merge PR #1** (these docs) into `codex/live-alpha` first, so all three sessions can read the plans from the base branch.
2. Merge **L1-1** as early as possible. Lanes 2 and 3 add their nav entries only after it.
3. Everything else can merge in any order once green. When one PR depends on another, its plan says so (e.g. L1-G1 needs Lane 2's `/play/run`; L3-6 embeds Lane 2's `TodayPanel` when it exists).

## Owner actions
See `docs/platform/infrastructure-and-accounts.md` §7:
1. **Cloudflare plan:** upgrade to Workers Paid.
2. **API token:** create a Cloudflare API token, then add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub secrets.
3. **Seed passwords:** add the five `SEED_PW_*` secrets to the GitHub `production` environment. Run "Seed accounts" once after L3-3 merges.
4. **Later:** a Google OAuth client and an email-provider key.

## Short prompts (one per Codex session)

**Lane 1**
```
You are Lane 1 (app consistency and audit fixes) in the repo Hrezaii95/german-learning-exam. Read docs/lanes/README.md, docs/lanes/CONTRACTS.md and docs/lanes/lane-1-app-fixes.md and follow them exactly. Work only in the files your lane owns, start with PR L1-1, post your plan before coding, open one draft PR per item into codex/live-alpha, never merge, and keep plans/lanes/lane-1-status.md up to date.
```

**Lane 2**
```
You are Lane 2 (Wortwerk game) in the repo Hrezaii95/german-learning-exam. Read docs/lanes/README.md, docs/lanes/CONTRACTS.md and docs/lanes/lane-2-game.md, then docs/games/wortwerk-build-spec.md, and follow them exactly. Work only in the files your lane owns, start with PR L2-1, post your plan before coding, open one draft PR per slice into codex/live-alpha, never merge, and keep plans/lanes/lane-2-status.md up to date.
```

**Lane 3**
```
You are Lane 3 (platform: Cloudflare, accounts, sync, dashboards) in the repo Hrezaii95/german-learning-exam. Read docs/lanes/README.md, docs/lanes/CONTRACTS.md and docs/lanes/lane-3-platform.md, then docs/platform/, and follow them exactly. Work only in the files your lane owns, start with PR L3-1 (deploy to german.learnilabs.com), post your plan before coding, open one draft PR per item into codex/live-alpha, never merge, never commit secrets, list the owner-only steps in every PR, and keep plans/lanes/lane-3-status.md up to date.
```
