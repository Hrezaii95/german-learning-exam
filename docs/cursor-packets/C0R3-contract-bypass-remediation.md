# Cursor Packet C0R3 — Contract Bypass Remediation

Status: authorized blocking remediation of C0
Implementation model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Write ownership: `platform/packages/content/**`, `platform/tests/content/**`, and `platform/README.md` only.

Read C0, C0R1, C0R2 and the current platform implementation. Preserve every passing contract.

## Blocking fixes

1. Typed references must resolve to the expected entity kind, not merely an existing ID. Cover every typed reference field. At minimum, reject a SourceAssertion whose `sourceId` points to a Lesson, a Lexeme whose `sourceAssertionIds` point to a Lesson, and a LessonStage whose `activityIds` point to a Lesson. Emit stable structured issue codes and locations without leaking assertion values.
2. Runtime schema validation must reject invalid exported enum/discriminant values and malformed discriminated-union payloads. At minimum, reject `publication.status: "publishd"`, `cefr: "B2"`, `LessonStage.kind: "banana"`, and a plain TextToken missing required `text`. Audit analogous exported unions/enums so this is a systemic fix rather than four special cases.
3. Add adversarial tests/fixtures for both classes of bypass and for `validateContentBundleOrThrow`. A malformed publication status must not bypass provenance or scope gates by being returned as a typed ContentBundle.

Run `npm run typecheck`, `npm test`, and `npm run validate:fixture`. Do not commit, expose credentials, touch resources/archive/sample, or edit outside ownership. Return run ID, exact model params, changed files, results, test count, and any deferred P1/P2 decisions.
