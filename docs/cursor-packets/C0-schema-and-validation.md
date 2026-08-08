# Cursor Packet C0 — Schema and Validation Foundation

Status: ready to dispatch after model authentication proof  
Required implementation model: `cursor-grok-4.5-high` (not Fast)  
Required Cursor review model after implementation: `composer-2.5` with `effort=high`, `fast=false` (not Max)  
Gate: G1 preparation; this packet does not publish course content.

## Role

You are worker `C-DATA`. You are not alone in this repository. Preserve all existing work and do not revert or reformat unrelated files. Codex is the orchestrator and final reviewer.

## Read first, in order

1. `docs/INDEX.md`
2. `docs/00-project-brief.md`
3. `docs/01-agent-handbook.md`
4. `docs/02-product-requirements.md`
5. `docs/07-content-model-and-schemas.md`
6. `docs/08-source-ingestion-and-provenance.md`
7. `docs/12-technical-architecture.md`
8. `docs/13-quality-and-acceptance.md`
9. `docs/17-current-state-and-completion-matrix.md`
10. `docs/18-requirement-traceability.md`
11. `plans/full-alpha-delivery-master-plan.md`
12. `plans/PLAN-BATON-full-alpha.md`

## Requirements owned in this packet

DAT-001, DAT-002, DAT-003, DAT-004, DAT-005 and the schema portion of LRN-006.

## Write-only ownership

You may create or edit only:

- `platform/package.json`
- `platform/package-lock.json`
- `platform/tsconfig.json`
- `platform/packages/content/**`
- `platform/tests/content/**`
- `platform/README.md` only for commands introduced by this packet

Do not edit `samples/`, `content/`, `resources/`, `media/`, existing root docs/plans, Git configuration or secrets.

## Build

1. Create the smallest practical TypeScript workspace for a pure content package. It must have no React dependency and no network/runtime service dependency.
2. Define discriminated, exported schemas/types for:
   - `Lesson`, `LessonStage`, `Lexeme`, `Verb`, `GrammarConcept`;
   - `PhrasePattern`, `QAPair`, `Dialogue`, `ListeningAsset`;
   - `Collection`, `LearningActivity`;
   - `Source`, `SourceAssertion`, `MediaAsset`, `Relationship`, `ContentGap`;
   - shared IDs, publication state, source priority and validation status.
3. Enforce stable ID prefixes and typed relationship endpoints.
4. Implement deterministic validators for:
   - required fields and discriminants;
   - unique IDs;
   - relationship/source/media reference resolution;
   - field-level published assertions;
   - Lesson 1–2 scope firewall, including later lessons, A1.2 and localized-audio fixtures;
   - publication rejection when a blocking gap or unverified required assertion exists.
5. Add fixtures proving:
   - a minimal valid Lesson 1 object graph passes;
   - duplicate IDs fail;
   - a broken relationship fails;
   - a published field without a verified assertion fails;
   - Lesson 3 and A1.2 publication fail;
   - an explicitly approved enrichment linked to Lesson 2 passes;
   - masculine/feminine professions are separate lexemes linked by `person-form-of`;
   - slash alternatives are not accepted as one canonical lemma.
6. Add one command that runs typecheck and content tests, and one command that validates a JSON bundle supplied by path. Do not add a fake production bundle.

## Non-negotiable constraints

- Never invent German content, translations, IPA, plurals, examples or source locations.
- Never read or write secrets.
- Never inspect or reuse code from `archive/cursor-demo-2026-07-30/`.
- Do not copy the compact `content/alpha-content.json` shape as the canonical schema; it is evidence/input, not the target contract.
- Do not add a graph database, server, authentication, UI, analytics or AI scoring.
- Use structured tokens; do not accept raw HTML content fields.
- Validation errors must contain stable codes and object/field locations without exposing source bodies.
- Tests must be portable and contain no machine-specific absolute paths.

## Required commands and gate

Run from `platform/`:

```bash
npm install
npm run typecheck
npm test
npm run validate:fixture
```

C0 passes only when:

- every command exits 0;
- at least eight negative/positive contract fixtures run;
- invalid-scope and broken-reference fixtures demonstrably fail validation inside tests;
- `rg` finds no secret-shaped value or absolute developer path in created files;
- no file outside write-only ownership changed.

## Return format

Return only:

1. exact model identifier and settings actually used;
2. files created/changed with byte sizes;
3. commands run and exit results;
4. fixture/test counts;
5. unresolved schema decisions or content/media gaps;
6. explicit confirmation that no out-of-scope file changed.

Do not commit.

