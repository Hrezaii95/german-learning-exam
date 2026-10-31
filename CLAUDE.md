# CLAUDE.md

Instructions for Claude (and any other agent) working in this repository.

## Project

German Learning OS: a static study web app (`web/`) for German exam prep. It runs with `npm start` (serves on port 3456). Course content is in `content/` and design assets are in `design/`.

## Tool routing: one approved tool per job

Use **only** the tool listed for each job. Don't switch to another path because it seems easier, and don't work around a missing login.

| Job | Use only | Never |
|---|---|---|
| Email (read, draft, send) | The native **Gmail** connector | Composio, the browser, SMTP/`sendmail`, raw Gmail API calls with `curl` |
| Drive / Docs / Sheets / Slides | The native **Google Drive / Docs / Sheets / Slides** connectors | Composio, scraping, the browser |
| GitHub (issues, PRs, CI) | The native **GitHub** connector, plus `git` for code | Asking the user for tokens; other GitHub plugins |
| Cloudflare (Workers, D1, DNS) | The **Cloudflare API** connector (`mcp.cloudflare.com`) | `wrangler` with keys pasted into chat. The old "Cloudflare Developer Platform" connector is deprecated and read-only |
| Google Cloud | The built-in `gcloud` CLI with the environment's credentials | Interactive `gcloud auth login`, the browser |
| Approvals and notifications | The approval hook (automatic; don't call it yourself) | Asking for confirmation in chat *instead of* the hook |

### If a login or connector is missing

1. Stop that part of the task.
2. Tell the user exactly what's missing and where to fix it: connectors at https://claude.ai/customize/connectors, secrets and variables in the cloud environment's settings (see `SETUP.md`).
3. Carry on with whatever doesn't depend on it. Never fake results, never ask for passwords or tokens in chat, and never switch to a different tool to get around it.

If the user has two Gmail accounts and the connector covers only one, say so. Don't try to reach the other account another way.

## Confirmation rules (enforced by `.claude/hooks/approval-gate.mjs`)

These need the owner's tap on **Telegram** before they run:

- **Email or file sharing to anyone not on the allowlist** in `.claude/approval-policy.json`. Allowlisted support addresses and the owner's own addresses go through without asking.
- **Anything involving money**: billing, payments, checkout, purchases, domain registration or renewal.
- **Changes to the safety kit itself**: `.claude/settings*.json`, `.claude/hooks/`, `.claude/approval-policy.json`.

How to behave with the gate:

- A gated call can wait up to 10 minutes for the owner's answer. That's normal; don't cancel it or retry.
- If the gate **denies** a call, or blocks it because approvals aren't set up, do **not** retry it through another tool or route. Tell the user what was blocked and why.
- Never store, type or ask for card numbers or banking logins.

## Session start

The SessionStart hook prints an "Agent kit status" block that says what's ready and what's missing. Read it before using a gated tool, and pass any "Still to do" items on to the user.
