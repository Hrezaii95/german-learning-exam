# Failed Cursor Demo — Isolated Archive

This directory contains the complete failed implementation that existed before the clean restart on 2026-08-02.

## Status

- Quarantined and non-authoritative.
- Do not import its application code, schemas, extracted JSON, audio mappings, design tokens, or feature specifications into the rebuild.
- Do not run its package scripts from the repository root.
- Git history already preserves the original commits: `cd64063`, `1d20b0d`, and `e90bace`.

## Preserved contents

- `web/`: browser demo and hard-coded UI/data.
- `content/`: Cursor extraction scripts, raw text dumps, and generated JSON.
- `design/`: generated infographic HTML/CSS and sliced mockup images.
- `openspec/`: specifications inferred from the flawed implementation.
- `scripts/`: demo runtime and repair scripts.
- `package.json` and `README-ALPHA.md`: demo entry points and claims.
- `.cursor/`: Cursor state and temporary mined conversation fragments; locally ignored.
- `audio/`: the demo's runtime junction, now intentionally non-authoritative and locally ignored.
- `.gitignore`: the demo-era ignore policy.

## Permitted use

This archive may be consulted only for:

1. Regression examples of what not to reproduce.
2. Comparing visual output against the canonical ChatGPT mockups.
3. Recovering a fact only after independently verifying it against an original resource.

The clean rebuild starts from `resources/`, the approved documentation, and newly verified derived data.
