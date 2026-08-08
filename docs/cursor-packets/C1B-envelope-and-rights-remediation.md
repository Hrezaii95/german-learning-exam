# Cursor Packet C1B — Publication Envelope and Rights Remediation

Status: authorized bounded remediation of C1/C1A
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: `platform/content/**`, `platform/packages/content/**`, `platform/tests/content/**`, `platform/package*.json`, `platform/README.md` only.

Read C1, C1A, the five current real fragments, `content/source-index/alpha-workbook-audio-map.json`, and current publication loader/gates.

1. Add `meta.teacherSourceRows` to `teacher-professions.json`: exactly 48 unique typed records covering rows 1–48, derived from current assertion `location.noteRow` values and pointing to the appropriate canonical subject IDs. No invented approval.
2. Add `meta.workbookMappings` to `listening-assets.json`: exactly 15 unique records derived from the authoritative audio map and the current 15 listening/media records.
3. Publisher audio must remain metadata-only and non-deployable. Replace file-like publisher variant paths with a non-file `rights-gated://...` reference. Update `collectPublicSourceMp3Paths` so only an explicitly rights-gated URI is exempt; any relative/absolute/http/file path ending `.mp3` remains a publication-gate failure. Add positive and negative tests for that exact distinction.
4. Run the aggregate publication validator. Fix only mechanical schema/reference/provenance issues grounded in current fragment data. Do not falsely verify teacher German, copy MP3 files, invent transcripts, or remove explicit gaps.
5. Run typecheck, all tests, valid fixture, and real publication validation. Report the real counts, validation result, remaining content gaps, and decisions requiring qualified German/rights review.

Do not touch docs/plans/adherence/resources/media/archive/samples or commit.
