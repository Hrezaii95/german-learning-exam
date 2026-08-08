# Cursor Packet C2DR2 — Export Safety, Relational Validation, and Hydration Immutability

Status: final blocking remediation before P2-05/G2 approval
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: C2D persistence package/tests/README only.

1. Export must require the same mandatory validation context as adapters/import. Deep-clone the caller state first, validate the detached clone completely, then canonicalize/serialize. Never freeze or mutate caller-owned objects. Unknown/derived/reward/secret fields, malformed versions, duplicates, oversize state, unpublished IDs and raw audio cause stable rejection; they must never appear in output.
2. Strengthen the validation resolver from a boolean set to a typed/relational published-content contract capable of proving entity kind and lesson→stage→activity ownership. Resume requires a published Lesson, published LearningActivity, known stage belonging to that lesson, and the activity belonging to that stage. Update real tests/resolvers explicitly; no prefix inference.
3. Event↔card cross-reference requires matching `conceptId` and compatible measured dimension: the card’s dimension must be present in the event evidence dimensions and must respect the already-validated event/task contract. Reject mismatch stably.
4. Apply persistence string limits/path firewall recursively to all persisted learner-event string fields after event parsing, including `normalizedAnswer`, IDs and future nested string values. Reject Windows drive paths, UNC paths, absolute POSIX paths, file URIs and secret-shaped field names/values; do not echo the value in errors. Legitimate German plain text remains valid.
5. Hydration’s `masteryByConcept` must be mutation-resistant at runtime: no callable `set`, `delete`, or `clear`; iteration/forEach must expose only frozen snapshots. Add adversarial cast/mutator tests and confirm internal state cannot change.
6. Verify adapters/export/hydration all use the same exact expected bundle identity and typed resolver. No convenience overload may fall back to boolean-only or missing ownership checks.
7. Add exact regressions from executable review: event with `token:"TOPSECRET"` export rejection and no leak; export does not freeze original settings/tag/event; wrong bundle; lesson/activity/stage ownership mismatch; event for concept A referencing concept B card; event/card dimension mismatch; normalizedAnswer absolute path; mutable map clear/set/delete; plus all prior atomic/canonical/replay tests.

Preserve all 265 tests semantically, prior gates and publication validation. Do not implement UI/network or commit.
