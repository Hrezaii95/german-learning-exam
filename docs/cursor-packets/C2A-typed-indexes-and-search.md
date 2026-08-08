# Cursor Packet C2A — Typed Indexes and Search

Status: authorized P2-02 implementation
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`

## Ownership

- `platform/packages/content/src/indexes/**`
- `platform/packages/content/src/index.ts`
- `platform/packages/content/package.json`
- `platform/tests/content/indexes-search.test.ts`
- `platform/package*.json`, `platform/README.md`

Do not edit published content, validators/publication code, media, docs/plans/adherence, archive or samples. Do not commit.

## Read first

- `docs/03-learning-journey-and-mastery.md`
- `docs/04-information-architecture-and-ux.md`
- `docs/07-content-model-and-schemas.md`
- `docs/11-lessons-01-02-content-spec.md`
- current content types and the validated real publication package

## Build

1. Build immutable typed indexes from a validated `ContentBundle`: by ID/kind; lesson membership; relationship adjacency; source priority; publication status; media; examples; collection membership; activity; and reviewable concept.
2. Implement normalized German-aware search across canonical learner-facing labels, lemmas, infinitives, meanings and phrase/Q&A intent. NFC-normalize, case-fold, handle umlaut/ß predictably without corrupting displayed text, tokenize safely, and return deterministic scored results with match reason/field.
3. Search/result contract must include typed entity ID/kind, display label, lesson memberships, source priority where known, publication status, hub destination and back-context payload. It must never return raw HTML or assertion values.
4. Default public search includes only `published` entities. Explicit `includeReview` can expose candidate/review items for an author/review surface, never silently to learners.
5. Provide filter primitives needed by the six hubs: lesson, learned/all-ready state placeholder, priority, category/kind, tag/relationship, mastery key, and due key. Do not implement mastery state here; accept typed optional filter projections.
6. Derive counts from the real manifest; no hardcoded content totals. Throw/fail on duplicate IDs or unresolved index inputs even if a caller bypasses prior validation.

## Tests

- Use the real five-fragment publication loader with required authority.
- Exact representative search: `heißen`, `sein`, `Ingenieur`, a formal Q&A intent, and teacher review item visibility.
- Prove default search excludes review/draft teacher members and the teacher deck; `includeReview` includes them with review status.
- Prove one representative concept resolves consistently from lesson membership, collection/hub index, relationship adjacency and search result.
- Prove NFC/case/umlaut/ß normalization, deterministic ordering, safe back-context, no assertion-value leakage, and empty/no-result behavior.
- Preserve all 75 existing tests. Run typecheck, all tests, publication validation and check.

Return exact run/model, files, derived counts, tests and remaining decisions.
