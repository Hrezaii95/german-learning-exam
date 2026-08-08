# Cursor Packet C0R1 — Composer Review Remediation

Status: authorized remediation of C0 only  
Implementation model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`  
Review model after remediation: Cursor SDK `composer-2.5`, `effort=high`, `fast=false`  
Owner: `C-DATA`; Codex remains orchestrator and final verifier.

## Read first

1. `docs/cursor-packets/C0-schema-and-validation.md`
2. `docs/07-content-model-and-schemas.md`
3. `docs/08-source-ingestion-and-provenance.md`
4. `docs/13-quality-and-acceptance.md`
5. all non-`node_modules` C0 files under `platform/`

## Write-only ownership

- `platform/package.json`
- `platform/package-lock.json`
- `platform/tsconfig.json`
- `platform/packages/content/**`
- `platform/tests/content/**`
- `platform/README.md`

Do not edit root docs/plans, samples, content, resources, media, research, Git state or secrets. Do not inspect the quarantined failed demo.

## Mandatory fixes

1. **Structured failure, never crash.** Require a valid `publication` object and `publication.status` on every publishable entity at runtime. Add defensive guards in provenance, blocking-gap and scope validators so malformed input always returns stable validation issues instead of throwing. Add adversarial missing/null-publication fixtures across at least one non-Lesson/Lexeme entity and assert the validator does not throw.
2. **Picture-dictionary / priority-4 firewall.** A published object whose published assertion comes from `sourceKind: picture-dictionary`, or from priority 4 enrichment, must carry an `approved-enrichment` scope exception attached to `lesson:01` or `lesson:02`. Reject missing/invalid exceptions with a stable error code and test it. Do not treat the presence of a picture dictionary as permission to publish it.
3. **Structured text everywhere.** Apply raw-HTML rejection and structured-token validation to every German/learner-facing structured text field, including dialogue turns, dialogue task prompts/translations, listening transcript segments, learning-activity prompt stems/choices and nested grammar/phrase realizations. Add an `HTML_CONTENT` adversarial fixture.
4. **Typed endpoint regression.** Add a fixture where both endpoint IDs resolve but `person-form-of` uses a Lesson as one endpoint. Assert `RELATIONSHIP_ENDPOINT` and the exact offending field.
5. **Publication completeness.** Prevent `status: published` from self-declaring only a convenient subset of source-controlled fields. Define and export a deterministic minimum published-field policy per entity kind. At minimum cover:
   - Lesson: `titleDe`, `communicativeGoals`;
   - Lexeme: `lemma`, `meanings`;
   - Verb: `infinitive`, `meanings`, `present`;
   - GrammarConcept: `noticeTarget`, `ruleSteps`;
   - PhrasePattern: `fixedTokens`, `acceptedRealizations`;
   - QAPair: `questionPatternId`, `answerPatternIds`;
   - Dialogue: `turns`;
   - ListeningAsset: `transcriptSegments`;
   - Collection: `membership`;
   - LearningActivity: `prompt`, and `answerSpec` when present;
   - MediaAsset: `variants`, and `spokenText` when present.
   Every required published field must map to a verified assertion whose subject and field match. Keep value bodies out of validation output. Update positive fixtures accordingly and add partial-publish/mismatch/missing tests.
6. **Nested ID uniqueness.** Include lexeme `meaning:*` IDs and example IDs in duplicate-ID checks/indexes where they are referenceable. Add a duplicate nested-ID test.
7. **Runtime enums and stable errors.** Validate `LearningActivity.mode` against `LoopMode`; test malformed IDs, bad schema version and unknown relationship type. Add optional `assertionId` and `gapId` location fields to `ValidationIssue` without exposing values, and use them where applicable.
8. **Scope hardening.** Reject every Lesson entity numbered above 2 from an Alpha bundle, regardless of draft status. Enrichment belongs on content attached to Lesson 1 or 2, not as a later Lesson entity. Validate scope-exception approval IDs for correct prefix/shape and document that resolution to a future approval registry remains a later package concern.
9. **CLI negative contracts.** Add automated subprocess tests for missing argument, invalid JSON and a structurally valid but rejected fixture. Verify stable nonzero exits and credential-free output.

## Required commands

Run from `platform/`:

```bash
npm run typecheck
npm test
npm run validate:fixture
```

## Exit gate

- all commands exit 0;
- no uncaught validator error on malformed JSON shapes;
- all Composer P0/P1 findings are closed by code and adversarial tests;
- at least 20 contract tests run;
- no file outside write-only ownership changes;
- no absolute developer path, credential shape or source assertion value appears in output.

Return exact model parameters, changed files, commands/results, test count, and unresolved decisions. Do not commit.
