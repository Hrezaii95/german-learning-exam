# Cursor Packet C2AR4 — Nested Link, Lesson, and Tag Projection

Status: narrow final remediation before P2-02
Model: Cursor SDK `grok-4.5`, `effort=high`, `fast=false`
Ownership: C2A index/search paths, focused tests, and platform README only.

## Required fixes

1. `getEntityRecord` and `getIndexedEntity` must return the same audience-projected record shape as the corresponding projected `byId`. Learner/default nested `lessonIds`, `mediaIds`, `exampleIds`, `collectionIds`, and `activityIds` contain only published-visible IDs. Review contains published/review/draft visible IDs and never blocked. Add real regressions for published `lex:ingenieur` and `lesson:02`, plus synthetic blocked linked endpoints; recursively scan helper return values.
2. Fully project Lesson identity. If a Lesson is hidden/blocked, its ID must not appear as a key or value in learner or author `lessonMembership`, `activitiesByLesson`, `entityLessons`, entity-record `lessonIds`, search-document `lessonIds`, or lesson-count maps. Filter keys and nested values against audience-visible Lesson records, recompute counts from projected maps, and add a synthetic blocked `lesson:02` regression covering every named surface for learner and author.
3. Derive relationship tags from the audience-projected relationship graph, not the full graph. Learner tags and tag filters cannot retain `rel:*` semantics sourced only from review/draft/blocked edges; review tags may use review/draft endpoints but never blocked. Preserve non-relationship source tags such as grammar common-error tags. Add a teacher-collection and synthetic blocked edge regression.
4. Extend the recursive leak test beyond the `ContentIndexes` object to helper-returned entity records and search hits for known real review IDs and synthetic blocked IDs.

Preserve all 100 tests semantically, C2A–C2AR3 fixes, deterministic counts/order, dynamic/plaintext/integrity behavior, C0/C1 gates, and real publication validation. Run typecheck, tests, publication validation, and check. Do not edit outside ownership or commit.
