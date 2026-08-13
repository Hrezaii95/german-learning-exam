# P3BR1 — Hub acceptance and baseline timing remediation

## Execution identity

- Implement with Cursor CLI model `cursor-grok-4.5-high` (non-Fast).
- The orchestrator owns final judgment and governance.
- Do not commit, push, deploy, use MCPs/subagents, or alter user-owned unrelated changes.

## Read first

1. `plans/CURSOR-FINAL-HANDOFF.md`
2. `plans/PLAN-BATON-full-alpha.md`
3. `plans/full-alpha-delivery-master-plan.md`
4. `plans/full-alpha-register.csv`
5. `docs/cursor-packets/P3B-six-canonical-hubs.md`
6. `docs/04-information-architecture-and-ux.md`
7. `docs/18-requirement-traceability.md`
8. current `platform/apps/web/**` and `platform/tests/web/**`
9. `platform/tests/content/schema-contract.test.ts`

## Write only

- `platform/apps/web/**`
- `platform/tests/web/**`
- `platform/tests/content/schema-contract.test.ts` only for the proven CLI-process timing issue
- `research/cursor-execution/P3BR1-worker-report.md`

Do not edit canonical content, content/learning packages, source/media manifests, resources, archive, samples, plans, or other docs.

## Current evidence

- P3B currently builds six canonical hubs and `/hubs`.
- Last derived counts: vocabulary 69, verbs 4, grammar 0, phrases 58, listening 0, concepts 0.
- On 2026-08-13, the root check reproduced one failure: the synchronous TSX CLI negative test at `schema-contract.test.ts:511` finishes slightly after Vitest's default 5000ms timeout (isolated observed ~5493ms). The CLI behavior itself is not reported wrong. Fix the test deterministically with the smallest justified change; do not weaken its assertions, skip it, or globally inflate unrelated timeouts.
- Source manifest validates 397 files / 350139546 bytes.
- TTS technical audit validates 327/327 assets; all remain human-review pending.

## Objective A — independently accept/remediate the hub slice

1. Recompute exact six hub ID sets through the learner-safe typed index and compare to the generated artifact.
2. Recursively reject review/draft/blocked IDs and known review-only teacher collection, six Lesson 2 verbs, listening assets, and teacher-deck activity.
3. Recursively reject Source/SourceAssertion/assertion values, private/absolute paths, MP3 paths/URLs, secrets, and forbidden keys from browser artifacts.
4. Verify two projection runs are byte-identical.
5. Verify canonical German display and matching-only umlaut/ß aliases.
6. Adversarially test query parsing: duplicate/array values, excessive length, HTML, control characters, malformed encoding, unknown lesson/category, and unsafe reflection. Fail safely and bound values.
7. Verify populated, no-published-content, and no-match states with real rendered components.
8. Verify exact `aria-current`, one main, skip link, disabled non-focusable items, mobile `/hubs`, and zero active nav on 404.
9. Verify unknown detail routes remain 404 and all P3A route behavior remains intact.
10. Add/strengthen behavioral tests where current evidence is missing. Source-text grep alone is insufficient.

## Objective B — baseline timing remediation

- Apply a narrowly scoped explicit timeout to the three CLI subprocess negative tests or their describe block, justified for Windows/TSX cold start.
- Preserve all negative assertions and fail-closed behavior.
- Do not mask a hanging child: add a bounded `spawnSync` timeout and surface spawn errors/timeouts clearly if absent.
- Ensure the missing-argument command exits nonzero and does not print secrets or machine paths.

## Required commands

From `platform/`:

```powershell
npx vitest run --config vitest.config.ts tests/content/schema-contract.test.ts
npm run check
npm run build:web
npm run audit:prod
npm run smoke:web-routes
```

Also run deterministic hub projection twice and record SHA-256/byte equality in the worker report.

## Return

Write `research/cursor-execution/P3BR1-worker-report.md` with:

- exact changed paths;
- root cause and exact timing fix;
- independent hub ID counts and diff results;
- recursive leak-scan results;
- deterministic artifact hashes;
- exact command exit/test/build/route/audit counts;
- remaining content/human/rights gaps;
- no approval claim.

Stop and report if the fix requires publishing review content, inventing German, touching resources/archive/samples, changing pinned models, or weakening a security/publication gate.
