# Agent kit setup: Telegram approvals and native connectors

This kit makes every Claude session in this repo:

- **use the native connectors** (Gmail, Google, GitHub, Cloudflare) and nothing else for those jobs (see the routing table in `CLAUDE.md`);
- **ask you on Telegram** before it emails or shares files with anyone outside your allowlist, touches money, or changes these safety settings;
- **post updates** to Telegram, one topic per project: "needs your input" and "turn finished".

If anything is missing, the gated actions are **blocked**, never silently allowed.

> **Never paste a token, key or password into the Claude chat.** Secrets only go into the settings pages named below.

---

## Phase 2: your first sitting (about 20 minutes)

### 2.1 GitHub: all repositories
1. Open https://claude.ai/connect-github and connect or reconnect GitHub.
2. Install the **Claude** GitHub App and choose **All repositories**.

### 2.2 Connectors
Open https://claude.ai/customize/connectors and:
1. Connect **Gmail**. Then check whether it lets you add your **second** Google account. If it covers only one, tell Claude which one, so the routing rules can be adjusted.
2. Connect **Google Drive** (and Docs, Sheets and Slides if you use them).
3. Add the **Cloudflare** connector that uses `https://mcp.cloudflare.com/mcp` and sign in to your Cloudflare account.
4. **Remove** the old "Cloudflare Developer Platform" connector. It's deprecated and can't deploy anything.
5. Make sure the **GitHub** connector is connected.

### 2.3 Telegram bot
1. In Telegram, open **@BotFather** and send `/newbot`. Pick a name and a username ending in `bot`.
2. BotFather replies with a **token** like `123456:ABC…`. Keep it somewhere safe, such as your password manager. You'll paste it into Cloudflare in step 3.1, **not** into Claude.

### 2.4 Telegram group with Topics
1. Create a **new group** (just you), for example "Claude approvals". Add your bot when asked.
2. Group settings → turn on **Topics**.
3. Group settings → Administrators → add your bot as an admin with **Manage topics** switched on.

### 2.5 Your Telegram user ID
Message **@userinfobot**. It replies with your numeric **Id**. Send that number to Claude in chat; it's not a secret.

### 2.6 Relay secret
Make a random string of **at least 40 letters and digits**, for example with your password manager's generator. Keep it next to the bot token. You'll save it in two places, both named below.

### 2.7 Claude environment settings
In the Claude app, open the **cloud environment menu** in the session's title bar → **Edit**.

**Environment variables:**

| Name | Value |
|---|---|
| `APPROVAL_RELAY_SECRET` | The string from 2.6 |
| `APPROVAL_RELAY_URL` | `https://claude-approval-relay.<your-subdomain>.workers.dev`. Find `<your-subdomain>` in the Cloudflare dashboard → Workers & Pages (shown as "Subdomain"). If you don't have one yet, Claude will give you the URL after deploying, and you add it then. |
| `GCLOUD_SA_KEY` | *Optional.* Only needed if the session-start check says "gcloud not signed in": paste the JSON key of a Google Cloud service account that has only the roles you need. |

**Network access → Allowed domains:** add `claude-approval-relay.<your-subdomain>.workers.dev`. Leave "Allow package managers" ticked.

### 2.8 Allowlist
Tell Claude the support addresses that may be emailed without asking, or edit `.claude/approval-policy.json` on GitHub:

```json
"email": {
  "self":    ["you@gmail.com", "you2@gmail.com"],
  "support": ["support@name.am", "@cloudflare.com"]
}
```

- `support@name.am` allows that exact address.
- `@cloudflare.com` allows anyone at exactly that domain.
- `@*.google.com` allows that domain and its subdomains.

Avoid "anything starting with `support@`": `support@attacker.com` would pass.

### 2.9 Merge and restart
Merge the pull request, then **start a new session**. Connectors and settings are only read when a session starts.

---

## Phase 3: deploy (Claude does this, with one step for you)

1. Claude deploys the relay through the Cloudflare connector (see `agent-kit/relay/DEPLOY.md`).
2. **You:** Cloudflare dashboard → Workers & Pages → `claude-approval-relay` → Settings → Variables and Secrets. Add two **Secret** entries:
   - `TELEGRAM_BOT_TOKEN` = the token from 2.3
   - `RELAY_SECRET` = the string from 2.6 (exactly the same as `APPROVAL_RELAY_SECRET`)
3. Claude registers the bot with the relay (`relay-cli.mjs setup-webhook`).
4. **You:** send `/bind` in your Telegram group. The bot answers "✅ Linked".

## Phase 4: live test (about 5 minutes)

Claude runs `relay-cli.mjs test-approval`. Tap **Deny** first and Claude confirms it was blocked. Then a second test: tap **Approve** and it goes through.

---

## Bot commands

| Command | Where | What it does |
|---|---|---|
| `/whoami` | Anywhere | Shows your user ID and the chat ID |
| `/bind` | In the group (owner only) | Links approvals to this group. Run it again after turning Topics on |
| `/unbind` | Owner only | Unlinks the group; gated actions are then blocked |
| `/pending` | Owner only | How many approvals are waiting |

## Settings you can change

| Variable (environment settings) | Default | Meaning |
|---|---|---|
| `APPROVAL_TIMEOUT_SECONDS` | 600 | How long to wait for your tap before denying |
| `APPROVAL_TOPIC_MODE` | `project` | `project+agent` gives each agent its own topic |
| `APPROVAL_AGENT_NAME` | `Claude` | Name shown in messages |
| `APPROVAL_NOTIFY_STOP` | `1` | `0` turns off the "turn finished" messages |
| `APPROVAL_FALLBACK` | `deny` | `ask` asks in the Claude app when Telegram isn't set up, instead of blocking |

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Telegram approvals are not configured" | Set `APPROVAL_RELAY_URL` and `APPROVAL_RELAY_SECRET` (2.7), then start a new session |
| "send /bind in the group" | Send `/bind` in the group, from your own account |
| "Could not reach the approval relay" | Add the relay's domain under Allowed domains (2.7). Check `RELAY_SECRET` matches `APPROVAL_RELAY_SECRET` |
| Buttons do nothing | Ask Claude to run `relay-cli.mjs setup-webhook`. Check `TELEGRAM_OWNER_ID` is your ID (`/whoami`) |
| Everything lands in one thread | Turn on Topics (2.4), then send `/bind` again |

## Limits to know

- **Payment detection is pattern-based** (billing commands, checkout and payment pages, payment-named tools). That's why the strongest rule is: never give agents card numbers or banking logins.
- **Hooks need Node.js.** It's present in Claude's cloud containers; on your own computer, install Node 22+.
- **This covers Claude Code sessions** that start in a repo containing this kit. Other agents (for example GPT) can use the same relay through its HTTP API, but need their own small hookup.
