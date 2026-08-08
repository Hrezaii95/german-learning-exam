# Cursor Packet C1 — Canonical Lessons 1–2 Publication Package

Status: authorized P1-02 through P1-06 implementation
Implementation model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`

## Write ownership

- `platform/content/**`
- `platform/packages/content/**`
- `platform/tests/content/**`
- `platform/package.json`, `platform/package-lock.json`, `platform/README.md`

Do not edit `resources/**`, `content/alpha-content.json`, source indexes, media, docs other than this packet, archive, samples, plans, or adherence files. Do not commit.

## Read first

- `docs/07-content-model-and-schemas.md`
- `docs/08-source-ingestion-and-provenance.md`
- `docs/11-lessons-01-02-content-spec.md`
- `docs/13-quality-and-acceptance.md`
- `content/alpha-content.json`
- `content/source-index/alpha-workbook-audio-map.json`
- `content/source-index/source-manifest.json`
- current `platform/packages/content/**` and tests

Treat source files and the content spec as authority. Do not invent German, translations, plurals, source locations, review approvals, or audio rights.

## Required artifact model

Create five human-reviewable JSON fragments under `platform/content/published/`:

1. `lesson-01.json`
2. `lesson-02.json`
3. `teacher-professions.json`
4. `activities.json`
5. `listening-assets.json`

Each fragment uses the C0 schema version and owns disjoint entity IDs. Add a deterministic publication loader/validator that merges the fragments into one `ContentBundle`, rejects conflicting scalar versions and duplicate IDs, then runs the existing schema, provenance, scope, typed-reference, and gap validators. Do not solve cross-file references by duplicating entities.

## Exact content gates

- Exactly one Lesson 1 object and one Lesson 2 object, with the documented titles, goals, stages, prerequisites and source assertions.
- Exactly 24 required learning activities: 12 for Lesson 1 and 12 for Lesson 2, matching the ordered activity lists in `docs/11-lessons-01-02-content-spec.md`. Every lesson stage activity reference resolves.
- Exactly 48 teacher source rows reconciled with unique `sourceRow` coverage 1–48 and zero unresolved source rows. Slash alternatives become separate canonical lexemes and typed relationships; never put slash alternatives in a lemma. Preserve source wording through assertions/notes. Do not silently modernize disputed labels.
- Exactly 15 workbook audio mapping records sourced from `alpha-workbook-audio-map.json`. These are metadata/reference records only: public source MP3 count must be zero while rights remain open. Do not copy or expose publisher audio. Localized Czech/Slovak tracks must not be promoted.
- Core Lesson 1/2 content from `content/alpha-content.json` must be represented as typed canonical entities: lesson objects, required verbs/forms, vocabulary/lexemes, phrase/Q&A patterns, grammar concepts, examples/relationships where evidence exists, and explicit `ContentGap` records where a required value cannot be evidenced.
- Every source-controlled field marked published resolves to a verified assertion. Teacher rows that still need qualified German review must remain `review`/candidate rather than being falsely promoted; include an explicit non-blocking or blocking gap according to the existing publication contract.
- Generated pronunciation media may be referenced only by IDs that exist in the approved generated-audio manifest and must retain human-review-pending status. Do not change or regenerate media.

## Tooling and tests

- Add `npm run validate:publication`.
- Add deterministic count and integrity tests for the five exact paths, Lesson count, 24 activity IDs, 48 unique teacher rows, zero unresolved rows, 15 audio mappings, zero public source MP3s, aggregate typed-reference closure, no slash lemmas, source provenance, and portable relative paths.
- Add negative tests for a duplicate cross-fragment ID, missing activity, missing teacher row, and attempted public source MP3 path.
- Keep all existing 48 C0 tests green.
- Run `npm run typecheck`, `npm test`, `npm run validate:fixture`, and `npm run validate:publication`.

Return the SDK run ID, exact model parameters, changed files, counts, commands/results, explicit content gaps, and every decision still requiring owner or qualified German review.
