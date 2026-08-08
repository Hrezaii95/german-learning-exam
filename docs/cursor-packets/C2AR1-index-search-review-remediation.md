# Cursor Packet C2AR1 — Index/Search Learner-Safety and Filter Completion

Status: blocking remediation before P2-02
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: same C2A paths only.

## P1 learner-safety fixes

1. Every learner-facing index helper must fail closed to `publication.status === "published"` by default: `filterIndexedEntities`, lesson membership, collection membership, reviewable-concept retrieval and any all-searchable/hub path. Review/draft content is visible only through an explicit typed `audience:"review"` or equivalent; `blocked` is never visible through learner or review helpers.
2. Make unsafe/raw membership access unmistakably internal or require explicit review audience. A caller omitting options must not receive teacher candidate lexemes, teacher collection/deck, review listening assets, drafts or future blocked entities.
3. Add synthetic blocked-entity tests plus real teacher/listening/deck tests for search, filters, lesson members, collection members and reviewable concepts.
4. Make every exported index genuinely mutation-resistant. `Object.freeze(new Map())` is not sufficient: consumers must not be able to call `set`, `delete`, or `clear`, and exported sets must not expose `add`, `delete`, or `clear`. Add adversarial runtime tests proving mutation attempts cannot alter index sizes or membership.
5. Reject contradictory duplicated membership/ownership authorities with a stable error. Static collection members must agree exactly with their corresponding membership relationships when both are present. `Activity.lessonId` must agree with lesson-stage ownership; an activity must not be silently indexed under two lessons. Add both adversarial tests.

## P2 contract completion

6. Implement `masteryKey` semantics or remove it from the public type. Prefer a typed projection contract where the requested key selects a named mastery projection deterministically; tests must prove two distinct keys can produce distinct results and wrong/missing keys fail closed.
7. `learnedScope:"all-ready"` with missing `readyIds` must return none or a typed error, never fall back to learned IDs. Test it.
8. Implement the requested tag primitive. Build deterministic entity tags from source-supported fields (for example relationship types and grammar common-error tags) and accept an explicit typed tag projection for runtime learner tags. Never invent content tags.
9. Materialize dynamic collections deterministically for supported query fields (`type`, `lessonId`, `tags`). Unsupported/ambiguous queries fail closed with a stable error; no silent empty/overbroad collection.
10. Split learner `reviewableConceptIds` (published only) from an explicitly named author/review set that may include review/draft but never blocked.
11. `plainTextFromStructured` must reject malformed raw strings rather than index them. Do not permit HTML/assertion-shaped content if callers bypass validation.
12. Unknown candidate IDs in filters must throw a stable error rather than disappear silently.
13. Strengthen Unicode tests: default `Gaertner` excludes the review item; explicit review audience returns `Gärtner` without display corruption. Canonical spelling must report `exact`; transliterated/case-folded aliases such as `Gaertner`, `GARTNER`, and `heissen` must report `normalized-alias`, not `exact`.

Preserve deterministic ordering, back-context safety, C1 gates and all 86 existing tests. Run typecheck, tests, publication validation and check. Do not edit outside ownership or commit.
