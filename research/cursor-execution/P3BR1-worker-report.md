# P3BR1 worker report — Hub acceptance and baseline timing remediation

Status: implementation evidence returned; **no approval claimed**  
Packet: `docs/cursor-packets/P3BR1-hub-acceptance-and-baseline-remediation.md`  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

Write-scoped only:

| Path | Change |
|---|---|
| `platform/apps/web/lib/content/hub-query.ts` | Adversarial query sanitization/bounding; array/duplicate first-param handling; markup-delimiter strip; control/surrogate drop |
| `platform/tests/content/schema-contract.test.ts` | Bounded `spawnSync` timeout + clear spawn/timeout errors; describe-level Vitest timeout for three CLI negative tests; stronger path/secret assertions on missing-arg output |
| `platform/tests/web/p3b-hubs.test.ts` | Independent ID-set vs generated artifact; recursive key/string leak scan; SHA-256 byte identity; adversarial query suite; P3A route preservation |
| `platform/tests/web/p3b-hubs-ui.test.ts` | 404 zero `aria-current`; `/hubs` mobile directory; populated hub + unsafe query reflection render checks |
| `research/cursor-execution/P3BR1-worker-report.md` | This report |

Not edited: plans, docs (except this report), content packages, resources, archive, samples, media, governance.

## Objective B — root cause and timing fix

**Root cause:** The three synchronous TSX CLI negative probes in `C0R1 CLI negative contracts` use `spawnSync(process.execPath, ["--import", "tsx", …])`. On Windows cold start, the missing-argument case was observed finishing slightly after Vitest’s default **5000ms** (~5493ms). CLI behavior itself was correct; the wall clock was not.

**Exact fix (narrow):**

1. `CLI_SPAWN_TIMEOUT_MS = 20_000` on `spawnSync` (`timeout`, `killSignal: "SIGTERM"`, `maxBuffer`).
2. Fail closed with explicit errors on spawn failure / `ETIMEDOUT` / null status (do not mask a hung child).
3. Same `20_000` ms Vitest timeout on the CLI describe block only — not a global suite timeout.
4. Negative assertions preserved (nonzero exit, `Usage:` / `INVALID_JSON` / `SLASH_LEMMA`+`VALIDATION_FAILED`, no secrets/credentials/machine paths). Missing-arg additionally rejects `/Users/` and `E:\claude-cursor`.

## Objective A — independent hub ID counts and diffs

Independent learner `ContentIndexes.byKind` sets vs projection vs `apps/web/generated/learner-hubs.json`:

| Hub | Independent count | Projection | Artifact | Diff |
|---|---:|---:|---:|---|
| vocabulary | 69 | 69 | 69 | 0 |
| verbs | 4 | 4 | 4 | 0 |
| grammar | 0 | 0 | 0 | 0 |
| phrases | 58 | 58 | 58 | 0 |
| listening | 0 | 0 | 0 | 0 |
| concepts | 0 | 0 | 0 | 0 |

Exact ID sets equal across independent index, live projection, and generated artifact (covered by `matches generated learner-hubs artifact ID sets exactly`).

## Recursive leak-scan results

Against serialized hub projection + recursive key walk:

- Known review-only IDs (teacher collection, six Lesson 2 verbs, sample listening asset, `lex:elektriker`, teacher-deck activity) absent.
- All author `review`/`draft`/`blocked` IDs absent.
- No `assert:` tokens, `.mp3` / mp3 URLs, absolute/Windows/`/Users/`/`resources/original` paths.
- Forbidden key fragments absent (`SourceAssertion`, assertion values, private/original paths, apiKey/secret/password/token/credential, etc.).
- Top-level forbidden keys (`Source`, `sources`, `assertions`, `sourceAssertions`) absent.
- No `publicationStatus` of review/draft/blocked in artifact text.

## Deterministic artifact hashes

Two consecutive `tsx apps/web/scripts/project-content.ts` runs:

| Run | SHA-256 (`learner-hubs.json`) | Bytes |
|---|---|---:|
| 1 | `B1BF7552A3262B212F4CD95CA98340D90F935EBC57556BC0D9A1D12EAF932AB5` | 383130 |
| 2 | `B1BF7552A3262B212F4CD95CA98340D90F935EBC57556BC0D9A1D12EAF932AB5` | 383130 |

`DETERMINISTIC_EQUAL=yes` (byte identity + SHA-256).

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npx vitest run --config vitest.config.ts tests/content/schema-contract.test.ts` | 0 | 1 file, **48** tests passed; CLI probes ~1261/1458/700 ms |
| `npm run check` | 0 | typecheck + typecheck:web + test + validate:publication + test:web; **11** test files, **337** tests; publication `VALIDATION_OK`; web **5** files / **49** tests |
| `npm run build:web` | 0 | Next 16.3.0; **37** pages; hubs projected `vocabulary=69, verbs=4, grammar=0, phrases=58, listening=0, concepts=0`; 23 learner activities |
| `npm run audit:prod` | 0 | **0** vulnerabilities |
| `npm run smoke:web-routes` | 0 | **15/15** checks PASS (canonical/raw-colon/wrong-lesson/404/hubs/detail) |

## Remaining content / human / rights gaps (unchanged)

- Grammar, listening, concepts hubs empty because records are absent or review-only — intentional; not filled from review data.
- Six Lesson 2 verbs, teacher professions collection, teacher-deck activity, workbook listening assets remain review-only.
- 327 TTS assets technically audited; all remain human-review pending.
- Publisher workbook MP3s remain rights-gated / non-public.
- P3-02 register acceptance and G3 remain orchestrator-owned; this report does not close them.

## Honesty

No approval claim. No commit/push. No review-content promotion, German invention, resources/archive/samples edits, model pin changes, or security/publication gate weakening.
