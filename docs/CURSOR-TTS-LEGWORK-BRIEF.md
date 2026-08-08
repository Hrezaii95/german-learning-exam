# Cursor Legwork Packet — TTS Provider Safety and Operations

## Required Cursor model policy

- Implementation: `cursor-grok-4.5-high` (High; never the Fast variant).
- Cursor-side review: `composer-2.5` at High reasoning (non-Max).
- Codex remains accountable for scope, independent verification, and final acceptance.
- A run counts only when Cursor reports successful inference with the requested model. A stalled CLI process or files written by an earlier/default-model process do not satisfy this policy.

## Role and authority

You are a bounded implementation worker. Codex owns architecture, content, German pronunciation decisions, media generation/review and final acceptance. You are not alone in this workspace: preserve all existing work, do not revert unrelated edits, and edit only the files explicitly assigned below.

## Product context

German Learning OS is a local-first A1 learning platform. Alpha scope is Lessons 1–2 plus a 48-profession teacher list. Pronunciation is the highest-risk feature. The approved current voice is pre-generated `edge-tts` using `de-DE-KatjaNeural` at `+4%`; 327 hashed MP3s already exist. Learner playback must use cached static assets, never live client-side provider keys.

The full governing documentation is in `docs/`, beginning with `docs/INDEX.md`, `docs/01-agent-handbook.md`, `docs/07-content-model-and-schemas.md`, `docs/09-audio-and-pronunciation.md`, `docs/13-quality-and-acceptance.md`, and `docs/DECISIONS.md`.

## Non-negotiable rules

1. Keep `edge-tts` as primary. Do not regenerate or replace approved audio.
2. Cartesia, OpenRouter and TTSForFree are comparison/failover lanes only.
3. Provider rotation may improve resilience, but MUST NOT be used to evade quotas, account limits or terms.
4. No API key may enter browser code, `public/`, a manifest, a test artifact, logs, Git, or terminal output.
5. Read secrets only from:
   - `E:\claude-cursor\central-home\secrets\.secrets.env`
   - `E:\claude-cursor\central-home\secrets\german-learning-tts.env`
6. Do not modify `.secrets.env`. The project-specific TTS secret file is user-owned; do not populate blanks.
7. Do not copy or expose publisher coursebook/workbook audio. `redistributionBasis` is unset and public bundling is blocked.
8. Do not make live paid generation calls. Harmless authenticated account/model-list checks are allowed; any generation check must require an explicit command flag and a character ceiling.
9. Never print credential values. Status output may include provider, environment-variable name, HTTP status class, availability and redacted quota metadata.
10. Fail closed: unknown providers, missing keys, unsupported models and non-audio responses must produce clear errors and no misleading success artifact.

## Assigned ownership

You may create or edit only:

- `tools/tts/**`
- `config/tts-providers.schema.json`
- `docs/16-tts-provider-operations.md`
- `research/tts-provider-smoke.json` (redacted, deterministic status only)
- tests that exercise only the new TTS tooling, under `tests/tts-tools/**`

Do not edit the application, content JSON, package files, existing audio, existing docs, Git configuration or secrets.

## Required implementation

1. Create a small provider-neutral configuration loader that merges the two approved env files without overwriting already-set process environment variables.
2. Define provider records for `edge-tts`, `cartesia`, `openrouter` and `ttsforfree`, including credential variable names, base URL, enabled state, role, and whether a live generation call is allowed.
3. Create a redacted smoke command that:
   - confirms `edge-tts` executable/package availability;
   - validates configured OpenRouter keys through a harmless account/key endpoint and discovers speech models;
   - validates Cartesia and TTSForFree only when keys have been supplied;
   - never prints response bodies that could contain sensitive data;
   - writes a redacted JSON report with timestamp, provider status, checked endpoint and error category;
   - exits nonzero only for malformed configuration or secret exposure, not for an optional provider being absent.
4. Add a deterministic test that scans source/report output for known secret patterns and proves blank optional keys are handled safely.
5. Document exact nontechnical steps for adding keys, running the smoke check, interpreting results, and selecting a provider. State clearly that static cached generation is the production strategy for this three-user Alpha.
6. Run your tests and report changed files and results. Do not commit.

## Acceptance

- Existing secrets remain byte-for-byte unchanged.
- No value-shaped credential string appears in new files or console output.
- The default result selects `edge-tts` and marks missing optional providers as `not_configured`.
- OpenRouter model discovery distinguishes free speech models from general free text models.
- The design caches by normalized text + locale + voice + model/version + speaking controls, so a fallback never silently changes an existing clip.
- All output is understandable without knowing the implementation language.
