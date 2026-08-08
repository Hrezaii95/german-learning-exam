# Cursor Packet C1A — Publication Loader and Count Gates

Status: authorized bounded slice of C1
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: `platform/package*.json`, `platform/packages/content/**`, `platform/tests/content/**`, `platform/README.md` only.

Read C1 and the current C0 package. Implement infrastructure only; do not create the five real content fragments in this slice.

1. Add a deterministic loader that accepts the five required fragment paths, requires matching `schemaVersion`, merges disjoint ContentBundle arrays, rejects duplicate entity IDs across fragments before normal validation, and returns a single aggregate bundle.
2. Add a CLI and `npm run validate:publication` that defaults to `platform/content/published/`. Until the five real fragments exist, it must exit nonzero with a stable missing-fragment diagnostic.
3. Add reusable count-gate validation for exactly: lessons 01 and 02; 24 unique activities split 12/12; 48 unique teacher `sourceRow` values covering 1–48 with zero unresolved; 15 workbook mapping records; zero public source MP3s; no absolute paths; no slash lemmas. Define a small typed publication metadata envelope for fragment-specific row/mapping metadata without weakening ContentBundle validation.
4. Add isolated temporary test fixtures under `platform/tests/content/fixtures/publication-package/` proving positive merge and negatives for duplicate cross-fragment ID, missing fragment, missing activity, missing teacher row, and attempted public source MP3.
5. Preserve all current 48 tests. Run typecheck/tests/valid fixture. The default real publication command is expected to remain nonzero until later C1 slices create the five artifacts; state that honestly.

Do not invent course content, edit sources/media/docs/plans, or commit. Return exact files and results.
