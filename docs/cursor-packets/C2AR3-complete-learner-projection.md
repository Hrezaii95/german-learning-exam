# Cursor Packet C2AR3 — Complete the Learner-Safe Projection

Status: final blocking remediation before P2-02
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: C2A index/search paths, focused tests, and platform README only.

## Required corrections

1. Public `ContentIndexes.relationships` must be a genuinely published-only adjacency graph. An edge is learner-visible only when the relationship itself and both endpoints are published/learner-visible. Public adjacency must not reveal review/draft/blocked IDs or allow reconstructing teacher collection membership. Explicit `openAuthorIndexes` may expose published/review/draft edges but never blocked relationships or blocked endpoints.
2. Relationship-driven filters must use the audience-appropriate projected graph. Learner/default queries cannot match through a review/draft/blocked endpoint or relationship; explicit review can use review/draft but never blocked. Add synthetic and real teacher-collection regressions.
3. Remove `authorReviewableConceptIds` from the normal learner `ContentIndexes`. Put it only on the explicit author capability. Public `reviewableConceptIds` remains published-only.
4. Public `counts` must describe exactly the learner/published projections: entity kinds/statuses, lesson membership, relationships, collection membership, media/example links, activities, reviewables, and search documents. It must not expose review/draft/blocked aggregates or author-only count fields. Put full allowed author counts only on the explicit author capability, still excluding blocked. Rename/split count types if needed so the boundary is evident and type-safe.
5. Audit every remaining public learner field (`sourcePriorityById`, media/example maps, activities, tags, collections, entity lessons, status maps) for endpoint/key/value filtering. No review/draft/blocked ID may occur as a key or value. Add one recursive adversarial test that walks every public map/set/array/object and proves known review (`lex:elektriker`, teacher deck/collection, review listening) and synthetic blocked IDs are absent.
6. Update docs/comments and existing tests that currently expect author review IDs/counts or full relationships on the learner handle. Author assertions must call `openAuthorIndexes` explicitly.

Preserve all 98 tests semantically (updating boundary expectations), all dynamic/plaintext/integrity fixes, deterministic ordering, C0/C1 gates, and real publication behavior. Run typecheck, tests, publication validation, and check. Do not edit outside ownership or commit.
