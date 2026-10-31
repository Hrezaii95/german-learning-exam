# Deploying the approval relay

These are the steps Claude follows in Phase 3, using the **Cloudflare API connector**. They're written down so any session, or you, can repeat them.

## What gets created

| Resource | Name | Notes |
|---|---|---|
| D1 database | `claude-approval-relay` | The schema is created automatically on first request |
| Worker | `claude-approval-relay` | ES module `worker.js`, served at `https://claude-approval-relay.<your-subdomain>.workers.dev` |
| Worker binding `DB` | → the D1 database above | |
| Worker var `TELEGRAM_OWNER_ID` | your numeric Telegram id | Not a secret |
| Worker secret `TELEGRAM_BOT_TOKEN` | from @BotFather | **You** add this in the dashboard |
| Worker secret `RELAY_SECRET` | same value as `APPROVAL_RELAY_SECRET` | **You** add this in the dashboard; at least 24 characters |

## Steps

1. Create the D1 database `claude-approval-relay` and note its id.
2. Upload `worker.js` as the module script for Worker `claude-approval-relay`, with this metadata:
   ```json
   {
     "main_module": "worker.js",
     "compatibility_date": "2026-10-01",
     "bindings": [
       { "type": "d1", "name": "DB", "id": "<D1 id>" },
       { "type": "plain_text", "name": "TELEGRAM_OWNER_ID", "text": "<owner id>" }
     ]
   }
   ```
   Use `keep_bindings: ["secret_text"]` on later uploads so your secrets survive redeploys.
3. Enable the `workers.dev` route for the script.
4. **You**: in the Cloudflare dashboard, go to Workers & Pages → `claude-approval-relay` → Settings → Variables and Secrets, and add `TELEGRAM_BOT_TOKEN` and `RELAY_SECRET` as **Secret** type.
5. In a session where `APPROVAL_RELAY_URL` and `APPROVAL_RELAY_SECRET` are set:
   ```bash
   NODE_USE_ENV_PROXY=1 node agent-kit/scripts/relay-cli.mjs setup-webhook
   NODE_USE_ENV_PROXY=1 node agent-kit/scripts/relay-cli.mjs status
   ```
6. **You**: send `/bind` in your Telegram group. `status` should then show `chatBound: true, forum: true`.

## Manual alternative (wrangler)

From `agent-kit/relay/`: fill in `wrangler.toml`, then run `npx wrangler d1 create claude-approval-relay`, `npx wrangler secret put TELEGRAM_BOT_TOKEN`, `npx wrangler secret put RELAY_SECRET`, and `npx wrangler deploy`.
