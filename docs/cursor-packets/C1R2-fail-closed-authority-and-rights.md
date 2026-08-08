# Cursor Packet C1R2 — Fail-Closed Authority and Recursive Rights Gate

Status: final blocking remediation before G1
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: `platform/package*.json`, `platform/README.md`, `platform/content/**`, `platform/packages/content/**`, `platform/tests/content/**` only.

1. Publication validation must fail closed when the workbook authority projection is missing, invalid, or not supplied. `loadAndValidatePublication({publishedDir})` requires the sibling `content/authority/workbook-audio-map.projection.json` by default. Explicit fragment-path validation must also require an authority path unless a deliberately named fixture/test-only opt-out is set; production CLI can never opt out.
2. Emit a stable `PUBLICATION_AUTHORITY` or equivalent error for missing/invalid authority rather than returning `authority:null` and skipping comparison.
3. Integrate the existing recursive forbidden-MP3-path scanner into the reusable publication gate. Any forbidden path/URL nested anywhere in source assertion values or fragment metadata must fail `loadAndValidatePublication`, not only a checked-in-file test. Bare filename metadata and exact `rights-gated:` references remain permitted by the established contract.
4. Add exact regression tests for both reviewer probes: real fragment paths with no authority must fail; injecting `sourceAssertions[0].value.leakedPath = "resources/original/audio/private-source.mp3"` must fail normal publication gates.
5. Preserve all C1R1 behavior and regenerate only if necessary. Run typecheck, 72+ tests, fixture validation, publication validation and check. Do not commit or touch outside ownership.
