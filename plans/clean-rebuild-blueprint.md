# German Learning OS — Clean-Rebuild Blueprint

Status: draft for review  
Created: 2026-08-02  
Execution mode: documentation-first; no application implementation before the documentation gate

## Objective

Replace the failed Cursor demo with a source-verifiable, visual/audio-first Lesson 1–2 Alpha built from clean specifications and reproducible content pipelines.

## Invariants

- Original resources are immutable.
- Derived data never lives beside originals.
- Every learning object and asset has provenance.
- The refined ChatGPT mockup is the visual direction, not executable truth.
- Article colors remain consistent and are never the only carrier of meaning.
- Lesson 1–2 scope is enforced at ingestion, data, API, and UI layers.
- Cursor archive content is quarantined.
- No feature is implemented before its specification and acceptance criteria are approved.

## Dependency graph

```text
Repository + resource governance
            ↓
Product/learning scope ──→ UX/design specification
            ↓                       ↓
Content model ───────────→ Data/metadata model
            ↓                       ↓
Ingestion + validation ──→ Verified L1/L2 dataset
                                    ↓
Technical architecture + test strategy
                                    ↓
Design system + application shell
                                    ↓
Learning vertical slices
                                    ↓
Integrated Alpha QA and release
```

## Phase 0 — Documentation completion gate

Documents must be completed in the following order. Documents on the same numbered row may be developed in parallel after their dependencies are approved.

### 0. Repository and governance

1. `README.md` — mission, current status, navigation, and non-implementation gate.
2. `docs/INDEX.md` — document registry with status, owner, dependencies, and review date.
3. `docs/00-foundation/agent-handbook.md` — cold-start instructions for future agents.
4. `docs/00-foundation/agent-rules.md` — source, documentation, naming, change, and review rules.
5. `docs/00-foundation/glossary.md` — controlled meanings for lesson, concept, item, source, mastery, priority, and status.
6. `docs/10-decisions/README.md` plus ADR template — durable product and architecture decisions.

### 1. Product and learning foundation

7. `docs/00-foundation/product-vision.md`.
8. `docs/00-foundation/learning-philosophy.md`.
9. `docs/00-foundation/design-philosophy.md`.
10. `docs/00-foundation/scope-and-non-goals.md`.
11. `docs/00-foundation/success-metrics.md`.
12. `docs/01-product/product-requirements.md` — complete PRD.
13. `docs/01-product/software-requirements.md` — testable SRS/FRS.
14. `docs/01-product/alpha-definition-of-done.md`.

### 2. Source and content governance

15. `docs/04-content/source-inventory.md` — authoritative expansion of `resources/INDEX.md`.
16. `docs/04-content/source-priority-and-conflicts.md`.
17. `docs/04-content/content-architecture.md`.
18. `docs/04-content/lesson-1-scope.md`.
19. `docs/04-content/lesson-2-scope.md`.
20. `docs/04-content/lesson-template.md`.
21. `docs/04-content/vocabulary-spec.md`.
22. `docs/04-content/verb-spec.md`.
23. `docs/04-content/grammar-spec.md`.
24. `docs/04-content/phrases-qa-dialogue-spec.md`.
25. `docs/04-content/listening-spec.md`.
26. `docs/04-content/pronunciation-spec.md`.
27. `docs/04-content/infographic-library.md` and completion checklist.
28. `docs/04-content/exercise-and-assessment-spec.md`.
29. `docs/04-content/content-quality-checklists.md`.

### 3. Information architecture and UX

30. `docs/03-ux/information-architecture.md`.
31. `docs/03-ux/screen-inventory.md`.
32. `docs/03-ux/navigation.md`.
33. `docs/03-ux/core-user-flows.md`.
34. `docs/03-ux/dashboard.md`.
35. `docs/03-ux/lesson-and-concept-hubs.md`.
36. `docs/03-ux/vocabulary-and-verb-flows.md`.
37. `docs/03-ux/listening-and-pronunciation-flows.md`.
38. `docs/03-ux/practice-quiz-and-review-flows.md`.
39. `docs/03-ux/conversation-flow.md`.
40. `docs/03-ux/responsive-behavior.md`.
41. `docs/03-ux/state-and-feedback-catalog.md` — loading, empty, error, offline, locked, and success states.

### 4. Design system

42. `docs/02-design-system/foundations.md` — color, typography, spacing, grids, elevation, and shape.
43. `docs/02-design-system/semantic-color-and-gender.md`.
44. `docs/02-design-system/components.md`.
45. `docs/02-design-system/learning-components.md`.
46. `docs/02-design-system/illustration-and-infographic-style.md`.
47. `docs/02-design-system/iconography.md`.
48. `docs/02-design-system/motion-and-audio-feedback.md`.
49. `docs/02-design-system/accessibility.md`.
50. `docs/02-design-system/canonical-screen-specs.md` — references every supplied render.

### 5. Data and knowledge model

51. `docs/05-data/canonical-metadata-schema.md`.
52. `docs/05-data/identifiers-and-versioning.md`.
53. `docs/05-data/taxonomy.md`.
54. `docs/05-data/provenance-confidence-validation.md`.
55. `docs/05-data/knowledge-graph.md`.
56. `docs/05-data/relationships.md`.
57. `docs/05-data/mastery-and-review-model.md`.
58. `docs/05-data/database-schema.md`.
59. `docs/05-data/search-index.md`.
60. `docs/05-data/privacy-backup-and-portability.md`.

### 6. Ingestion and asset pipelines

61. `docs/06-ingestion/pipeline-overview.md`.
62. `docs/06-ingestion/pdf-and-ocr.md`.
63. `docs/06-ingestion/coursebook-workbook.md`.
64. `docs/06-ingestion/glossary.md`.
65. `docs/06-ingestion/teacher-materials-and-notes.md`.
66. `docs/06-ingestion/image-and-visual-reference.md`.
67. `docs/06-ingestion/audio-inventory-and-deduplication.md`.
68. `docs/06-ingestion/transcript-audio-alignment.md`.
69. `docs/06-ingestion/normalization-and-deduplication.md`.
70. `docs/06-ingestion/enrichment.md`.
71. `docs/06-ingestion/validation-and-human-review.md`.
72. `docs/06-ingestion/publishing-and-content-diffs.md`.
73. `docs/08-assets/audio-library.md`.
74. `docs/08-assets/image-illustration-library.md`.
75. `docs/08-assets/licensing-and-attribution.md`.

### 7. AI, adaptation, and future-facing contracts

76. `docs/07-ai/ai-coach.md`.
77. `docs/07-ai/speech-recognition-and-pronunciation-evaluation.md`.
78. `docs/07-ai/conversation-tutor.md`.
79. `docs/07-ai/adaptive-learning-and-recommendations.md`.
80. `docs/07-ai/ai-safety-quality-and-evaluation.md`.
81. `docs/07-ai/studyme-legacy-integration.md`.

### 8. Engineering and release specifications

82. `docs/09-engineering/architecture.md`.
83. `docs/09-engineering/technology-decisions.md`.
84. `docs/09-engineering/api-contracts.md`.
85. `docs/09-engineering/offline-and-sync.md`.
86. `docs/09-engineering/security-and-privacy.md`.
87. `docs/09-engineering/testing-strategy.md`.
88. `docs/09-engineering/content-validation-tests.md`.
89. `docs/09-engineering/accessibility-test-plan.md`.
90. `docs/09-engineering/performance-budgets.md`.
91. `docs/09-engineering/analytics-and-observability.md`.
92. `docs/09-engineering/deployment-backup-and-rollback.md`.
93. `docs/09-roadmap/alpha-roadmap.md`.
94. `docs/09-roadmap/backlog-and-dependencies.md`.
95. `docs/09-roadmap/risk-register.md`.
96. `docs/09-roadmap/release-checklist.md`.

### Documentation exit criteria

- Every document has purpose, scope, normative requirements, examples, acceptance criteria, dependencies, owner, status, and change history.
- Cross-document terms use the controlled glossary.
- Every Alpha requirement maps to at least one acceptance test.
- Every canonical screen maps to content/data requirements and responsive states.
- Every source type maps to an ingestion and validation procedure.
- Conflicts and open questions are explicitly recorded; no placeholders masquerade as decisions.
- Human approval freezes Phase 0 before implementation begins.

## Phase 1 — Verified Lesson 1–2 content foundation

1. Create immutable source IDs and a machine-readable source manifest.
2. Extract Lesson 1–2 ranges from coursebook, workbook, glossaries, solutions, transcripts, notes, and teacher image.
3. Inventory audio by actual content; fingerprint duplicates and classify language/scope.
4. Align relevant transcript segments and audio tracks.
5. Normalize candidates without discarding source-specific forms.
6. Resolve conflicts through documented human review.
7. Produce canonical Lesson 1 and Lesson 2 datasets with provenance.
8. Validate coverage, links, morphology, translations, and scope firewall.

Rollback: derived outputs are disposable; original resources remain unchanged. Revert by deleting only the versioned derived dataset and rebuilding from the manifest.

## Phase 2 — Technical foundation

1. Select the stack through ADRs after requirements are frozen.
2. Define typed domain contracts and schema validators before persistence.
3. Build a local/offline content adapter and user-progress boundary.
4. Establish automated content, accessibility, unit, integration, and end-to-end test harnesses.
5. Create CI quality gates and reproducible development setup.

Rollback: each architectural decision includes an alternative and migration boundary; avoid framework-specific data contracts.

## Phase 3 — Design system and application shell

1. Translate canonical visuals into approved tokens and responsive primitives.
2. Build accessibility-compliant navigation and page shells.
3. Implement reusable learning components with fixtures from verified data.
4. Validate desktop and mobile visual fidelity before feature expansion.

Rollback: components remain isolated behind documented contracts; token changes must not alter content semantics.

## Phase 4 — Vertical learning slices

Recommended order:

1. Vocabulary: see, hear, reveal, recall, tag weak, review.
2. Verbs and grammar: visual explanation, audio examples, production practice.
3. Phrases/Q&A/dialogues: linked patterns and response building.
4. Listening: transcript-aligned playback, slow/repeat, comprehension.
5. Pronunciation rehearsal: record/replay and structured self-comparison before AI scoring.
6. Quiz and mastery: evidence across recognition, recall, listening, and production.
7. Conversation builder: constrained Lesson 1–2 scenarios with corrective feedback contracts.

Each slice must include data, UI, interaction, accessibility, analytics, tests, and documentation updates in one releasable unit.

## Phase 5 — Integrated Alpha

1. Dashboard and lesson/concept navigation.
2. Cross-linking and search.
3. Focused weak-item review and mastery evidence.
4. Offline behavior and progress persistence.
5. Full Lesson 1–2 content reconciliation.
6. Visual regression, accessibility, performance, and end-to-end acceptance.
7. User acceptance review and documented release limitations.

## Parallel work opportunities

After foundation approval, these lanes can proceed independently with no shared output files:

- source/audio forensics;
- UX flow specification;
- design-token specification;
- metadata/knowledge-model specification;
- testing/accessibility specification.

They converge at the documentation consistency review before implementation.

## Anti-patterns prohibited

- Hard-coded content inside UI components.
- Treating filenames as sufficient audio provenance.
- Mixing source, normalized, enriched, and published data.
- Inventing translations, plurals, IPA, or example sentences without provenance/status.
- Using color as the only gender cue.
- Claiming pronunciation accuracy from generic speech-to-text confidence.
- Calling a contact-sheet mockup a complete UX specification.
- Building the whole architecture before one verified vertical slice.
- Reusing the Cursor demo because a fragment appears convenient.
- Reporting aggregate progress that hides listening and speaking weakness.

## Plan mutation protocol

- **Insert:** add a numbered step with explicit dependencies and update the graph.
- **Split:** preserve the original step ID as a parent and give child steps acceptance criteria.
- **Reorder:** document why dependencies changed and re-run consistency review.
- **Skip:** record the approver, rationale, risk, and compensating control.
- **Abandon:** preserve outputs in an archive and create an ADR explaining the replacement.

No plan mutation may weaken source provenance, scope isolation, accessibility, or verification gates without explicit user approval.
