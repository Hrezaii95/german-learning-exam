# Cursor Packet C2DR1 — Fail-Closed Persistence Boundary

Status: blocking remediation before P2-05/G2 approval
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: C2D persistence package/tests/README only.

1. Make validation context mandatory for every production adapter: published-ID resolver plus expected content-bundle identity. Key-value and in-memory adapter construction without it must be impossible at type level and fail stably at runtime. `load` always parses/migrates/validates stored JSON; never cast/freeze raw parsed data.
2. `replace` always fully validates before any write. Invalid direct replace leaves prior state unchanged. Both adapters must use identical validation semantics; storage write failures remain atomic from the adapter contract perspective.
3. Remove public validation escape hatches: delete `alreadyValidated`, dead `skipByteLimit`, and caller-controlled under-reporting of `jsonByteLength`. Public hydration always validates. Keep an internal validated helper only if it is not exported and accepts an opaque validated type, not a boolean.
4. Enforce the 5 MB cap automatically: JSON import measures UTF-8 bytes before `JSON.parse`; object-envelope parsing computes a trustworthy canonical/serialized byte size internally after safe prototype/shape preflight. Callers cannot override or omit it.
5. Require exact expected `contentBundle.schemaVersion` and `bundleId`; reject spoof/mismatch before storage. Migration output is always revalidated. Remove arbitrary per-import migration code execution from the learner-facing import API; migration registry is configured by trusted application composition only.
6. Strengthen event-card cross references: when `event.cardId` is present, the referenced card must exist and its `conceptId` must equal the event concept. Reject conflicts stably without echoing answer/note content.
7. Preserve transactional import: validate, migrate, replay/hydrate, then one validated replace. Any failure—including adapter validation—leaves existing state unchanged.
8. Add adversarial tests for poisoned KV load without prior import, invalid direct replace rollback on both adapters, missing validation context, bundle spoof, byte-limit under-report attempt, public hydration bypass removal, event/card concept mismatch, and all prior canonical/replay/immutability behavior.

Treat parse-before-limit for JSON as closed by the pre-parse UTF-8 byte cap. Stage IDs remain bounded resume metadata under a validated lesson/activity and need not become content entities in this packet.

Preserve all 255 tests semantically, all prior engine gates, publication validation and check. Do not implement UI/network or commit.
