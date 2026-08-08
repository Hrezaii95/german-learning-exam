# Cursor Packet C1R1 — Publication Review Remediation

Status: blocking remediation before G1
Implementation model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: `platform/package*.json`, `platform/README.md`, `platform/content/**`, `platform/packages/content/**`, `platform/tests/content/**` only.

Read C1/C1A/C1B, current code/fragments, and both authorities: `content/alpha-content.json` and `content/source-index/alpha-workbook-audio-map.json`. Preserve all honest candidate/review states and explicit gaps.

## Required P1 fixes

1. Remove every full/private publisher MP3 path from `platform/content/published/**`, including `sourceAssertions[].value.originalPathPrivateOnly`. Keep only the rights-gated source ID and the basename/checksum metadata explicitly needed for reconciliation. Add a recursive real-package test proving no string contains an MP3 path/URL; a bare filename metadata field may remain, but any slash, backslash, drive, file URI, HTTP URL, or query/fragment MP3 path must fail.
2. Make `npm run check` include `validate:publication`. Add a test that loads the real `platform/content/published/` directory and requires `loadAndValidatePublication(...).ok === true`, thereby enforcing full aggregate reference/provenance/scope/count validation in the normal suite.
3. Stop silently deduplicating publication metadata. Reject duplicate teacher rows, duplicate workbook mapping IDs, incomplete records and invalid subject IDs. Preserve typed teacher `{sourceRow, subjectId}` records in aggregate metadata.
4. Enforce teacher bijection: exactly 48 metadata rows, exactly the same 1–48 rows as canonical `field:"sourceRow"` assertions, each subject resolves to the appropriate Lexeme, and each row/subject pair agrees. A fabricated or duplicate row must fail.
5. Enforce workbook bijection: exactly 15 metadata mappings, 15 ListeningAssets, and 15 publisher MediaAssets; each metadata ID/sourceAudioId/filename/exerciseRef agrees with its listening/media/assertion record. Add a pinned, non-published authority projection under `platform/content/authority/` derived exactly from `alpha-workbook-audio-map.json`, and make the real publication CLI/test compare the 15 mapping projections. Do not include original source paths or copy MP3s in that projection.
6. Activity ownership must be unambiguous: canonical `activity:lesson-01-*` IDs require `lessonId:"lesson:01"`, and lesson-02 likewise. Count from `lessonId`; separately fail any prefix mismatch. Add the contradictory-ownership mutation test.
7. Rights firewall must scan all media origins, normalize/strip query and fragment, reject HTTP/file/relative/absolute paths whose path component ends in `.mp3`, and exempt only exact `rights-gated:` scheme references. Add the query-string bypass test.

## Required P2 fixes

8. Portable-path validation must reject Windows drive paths, UNC paths and any POSIX absolute path using Node path utilities; distinguish URIs explicitly. Add `/tmp/...` and UNC tests. Correct any README overclaim only after behavior is enforced.
9. `activity:lesson-02-teacher-professions-deck` must remain `review`/unpublished while its collection/members are candidate/review. Add a validator or explicit runtime contract test that a published activity cannot imply publication of an unpublished collection/member.
10. Fix the deterministic encoder/generator first, then regenerate real fragments; do not hand-patch generated JSON only.

Run `npm run typecheck`, `npm test`, `npm run validate:fixture`, `npm run validate:publication`, and `npm run check`. Return exact counts, test total, changed files, remaining gaps, and decisions. Do not commit or touch outside ownership.
