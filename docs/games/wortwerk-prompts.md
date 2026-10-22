# Wortwerk prompts (short)

The full instructions live in two files, so the prompts stay short:

| File | For |
|---|---|
| [wortwerk-mockup-brief.md](wortwerk-mockup-brief.md) | ChatGPT (or another image model): style, the **no-giveaway rule**, and 67 screens |
| [wortwerk-build-spec.md](wortwerk-build-spec.md) | Claude Code or Codex: architecture, book-aligned scope, Class mode, the no-giveaway rule, phases, tests, gates, deployment |

The branch links below work while PR #1 is open. After it merges, replace `claude/german-webapp-audit-game-i0plj0` with `codex/live-alpha`.

## Prompt 1: mockups (ChatGPT)

```
Open and follow this design brief exactly:
https://raw.githubusercontent.com/Hrezaii95/german-learning-exam/claude/german-webapp-audit-game-i0plj0/docs/games/wortwerk-mockup-brief.md

Generate one screen per reply, starting with 01, and wait for me to type "next". Before each game screen, re-check the brief's NO-GIVEAWAY RULE: the question screen must not reveal the answer (no gender-coloured pictures, no article on gender questions, no picture on meaning questions, no highlighted or labelled options).
```

If ChatGPT can't open the link (browsing off), download the brief and attach it with: "Follow the attached brief exactly, starting with screen 01."

## Prompt 2: build (Claude Code / Codex in this repo)

```
Implement Wortwerk in this repository by following docs/games/wortwerk-build-spec.md exactly (on branch claude/german-webapp-audit-game-i0plj0 until PR #1 merges into codex/live-alpha). Read everything its section 0 lists first, start with Phase 0, and post your plan before writing code. Ship one draft PR per phase into codex/live-alpha, and do not merge or start Class mode B without my approval.
```
