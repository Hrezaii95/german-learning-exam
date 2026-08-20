# Cowork → Codex control smoke test

- Date: 2026-08-16
- Operator: Claude (Cowork mode, Claude desktop app)
- Question: can Cowork drive the Codex CLI on this device the way Claude Code does in this repo?
- Verdict: **yes, confirmed by two live runs.** Non-interactive `codex exec` orchestration works. Interactive TUI driving does not and is not needed.

## 1. Control path

Cowork has no Codex-specific tool. The working channel is the **Desktop Commander MCP**, which executes PowerShell on the host (`win32`, PC-Rezaee, `defaultShell = powershell.exe`, `allowedDirectories = []` i.e. unrestricted).

Cowork's own `mcp__workspace__bash` is **not** usable for this: it runs in an isolated Linux sandbox that only sees mounted folders, and Codex is a Windows binary on the host.

## 2. Environment verified

| Item | Value |
| --- | --- |
| Codex binary | `C:\Users\h.rezaee\AppData\Local\Programs\OpenAI\Codex\bin\codex.exe` |
| Version | `codex-cli 0.146.0` |
| Auth | `~/.codex/auth.json` present — keys `auth_mode`, `OPENAI_API_KEY`, `tokens`, `last_refresh` |
| Default model | `gpt-5.6-sol`, `model_reasoning_effort = high` |
| Default sandbox | `sandbox_mode = "danger-full-access"` (global) |
| Repo trust | `[projects.'e:\claude-cursor\side projects\german learning'] trust_level = "trusted"` — already registered |

## 3. Invocation pattern that works

```powershell
$cargs = @(
  'exec',
  '-C','"E:\claude-cursor\side projects\German learning"',
  '-s','read-only',                       # or workspace-write
  '-c','model_reasoning_effort="low"',
  '-o','"<dir>\last.txt"',                # final message to file
  '"<prompt>"'
)
Start-Process -FilePath codex -ArgumentList $cargs `
  -RedirectStandardOutput "<dir>\out.log" `
  -RedirectStandardError  "<dir>\err.log" `
  -WindowStyle Hidden -PassThru
# then poll the output files
```

Three failure modes were hit and solved during the test:

1. **Codex consumed the MCP shell's stdin** — `Reading additional input from stdin...`, run stalled. Fixed by detaching with `Start-Process` (new console, no inherited pipe) rather than running inline.
2. **Desktop Commander terminates the child when the MCP call times out** (~60s cap regardless of `timeout_ms`). A Codex turn takes 1.5–3 min, so an inline run is always killed mid-flight. Fixed by the same detach, then polling result files across several short calls.
3. **`Start-Process -ArgumentList` does not auto-quote paths containing spaces** — `error: unexpected argument 'learning' found`. Fixed by embedding literal quotes in each argument.

## 4. Test A — read-only, inside this repo

- Sandbox: `read-only`; workdir: repo root; session `01a00c3c-e7e6-70e1-b983-422107fb1045`
- Prompt: report `name`, `version`, and script count from `platform/package.json`
- Codex returned: `NAME=german-learning-platform VERSION=0.0.0 SCRIPTS=25`
- Independent verification (PowerShell `ConvertFrom-Json`): `NAME=german-learning-platform VERSION=0.0.0 SCRIPTS=25` — **exact match**

Repo state after the run: working tree unchanged by Codex. `git status --porcelain` shows only pre-existing modifications (`.gitignore`, `git-hygiene-log.md`, `platform/package.json`, `platform/package-lock.json`, the `samples/german-learning-ui-samples` submodule, plus untracked `platform/playwright.config.ts` and `platform/tests/e2e/`); all carry mtimes of 2026-08-15, i.e. hours before the 2026-08-16 23:51 run. Branch `codex/live-alpha`, HEAD `88ade22`.

## 5. Test B — workspace-write, isolated scratch dir

- Sandbox: `workspace-write`, `--skip-git-repo-check`, workdir `C:\Users\h.rezaee\.claude\codex-cowork-smoke\ws`
- Prompt: create `codex-artifact.json` with fixed keys, then report the path
- Codex final message: `WROTE C:\Users\h.rezaee\.claude\codex-cowork-smoke\ws\codex-artifact.json`
- File on disk (118 bytes), read back:

```json
{"agent":"codex","cli_version":"unknown","utc_timestamp":"2026-08-16T20:24:57.584Z","check":"cowork-orchestration-ok"}
```

Codex genuinely wrote to the host filesystem under an explicit sandbox scope. It answered `cli_version: unknown` rather than fabricating a version — the `read-only`/`workspace-write` policy blocked it from shelling out to `codex --version`, which is correct behaviour.

## 6. Observations relevant to the operating model

- **Startup overhead is large.** Codex loads every MCP server in `~/.codex/config.toml` on each `exec` — Docker gateway, Cloudflare, GitHub Copilot, dataverse, n8n, composio, tooluniverse. Roughly 45s of the wall time before the first token, with a wall of `AuthRequired` / `Transport channel closed` errors on stderr for unauthenticated servers. `-c mcp_servers={}` did **not** suppress this.
  - Recommended fix for orchestration: a dedicated lean profile, `$CODEX_HOME/<name>.config.toml`, invoked as `codex exec -p <name>`, with no MCP servers and `model_reasoning_effort` tuned per task.
- **Three malformed skills log errors on every run:** `~/.agents/skills/{commit,pr-review,test-writer}/SKILL.md` — "missing YAML frontmatter delimited by ---". Noise, not fatal.
- **Codex memories are on** (`generate_memories = true`, `use_memories = true`) and it ran a memory write phase during the read-only run. Codex sessions and memories are side effects of every invocation even under `-s read-only`; use `--ephemeral` if that matters.
- **Global default is `danger-full-access`.** Always pass an explicit `-s` per invocation; never rely on the inherited default.
- **Interactive TUI control is not viable and not needed.** `mcp__computer-use` grants terminals only "click" tier (no typing), so driving the Codex TUI by keystrokes is blocked by design. `codex exec` is the correct and fully sufficient channel.

## 7. Bearing on the Claude/Codex allocation

Cowork can do what `CLAUDE.md` assigns to Claude Code for Codex integration: dispatch scoped, non-interactive Codex jobs into a sandboxed workspace, collect the artifacts, verify them, and integrate. Codex remains unable to promote content, change publication status, deploy, or close owner gates — nothing in this test alters that, and no gate was touched.

## Evidence files (host, outside the repo)

- `C:\Users\h.rezaee\.claude\codex-cowork-smoke\A_last.txt`, `A_out.log`, `A_err.log`
- `C:\Users\h.rezaee\.claude\codex-cowork-smoke\B_last.txt`, `B_out.log`, `B_err.log`
- `C:\Users\h.rezaee\.claude\codex-cowork-smoke\ws\codex-artifact.json`
