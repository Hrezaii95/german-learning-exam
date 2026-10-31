# agent-kit

The approval gate, Telegram relay and routing rules for Claude sessions. To set it up, start with `../SETUP.md`.

## Files

| Path | Role |
|---|---|
| `CLAUDE.md` (repo root) | Tool routing table and confirmation rules that every session reads |
| `.claude/settings.json` | Wires the hooks and blocks duplicate paths (Composio) |
| `.claude/approval-policy.json` | Your allowlist and settings; agents need your approval to change it |
| `.claude/hooks/approval-gate.mjs` | PreToolUse hook: allow, deny, or wait for a Telegram tap; fails closed |
| `.claude/hooks/lib/classify.mjs` | Decides which calls are gated, with built-in payment detection |
| `.claude/hooks/notify.mjs` | "Needs input" and "turn finished" messages |
| `.claude/hooks/session-check.mjs` | Status block at session start; signs gcloud in from `GCLOUD_SA_KEY` |
| `agent-kit/relay/worker.js` | Cloudflare Worker that talks to Telegram and stores decisions in D1 |
| `agent-kit/scripts/relay-cli.mjs` | `status`, `setup-webhook`, `test-approval`, `test-notify` |
| `agent-kit/tests/` | `npm run test:agent-kit` (Node 22+, no dependencies) |

## Adding the kit to another repo

Copy `CLAUDE.md` (keep its routing and confirmation sections, and replace the "Project" section), `.claude/settings.json`, `.claude/approval-policy.json` and `.claude/hooks/`. Only one relay is needed: every repo uses the same `APPROVAL_RELAY_URL`, and each project gets its own Telegram topic automatically.
