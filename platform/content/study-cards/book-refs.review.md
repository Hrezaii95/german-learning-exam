# Draft vocabulary book references: owner review required

`book-refs.draft.json` is a candidate sidecar. Every requested source-row occurrence has a `bookRef` object; unresolved pages are explicitly `null` with a reason and note. The sidecar is not imported by the live catalogue or learner UI. Owner review must precede publication.

The inventory contains 1,046 source-row occurrences, preserving their text, order, IDs and source lesson labels. Stable keys use `lesson:sourceId:sourceRowIndex` before canonical family aggregation, so a later `l4-*` alias merge does not discard either lesson's evidence. Repeated families and row variants remain separate occurrences.

| Lesson inventory | Rows | Exact lesson labels | Broad range candidates | Page selected | Page unresolved | Exercise known |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 | 289 | 63 | 226 | 34 | 255 | 45 |
| 4 | 45 | 45 | 0 | 12 | 33 | 43 |
| 5 | 98 | 98 | 0 | 31 | 67 | 85 |
| 6 | 74 | 74 | 0 | 26 | 48 | 46 |
| 7 | 94 | 94 | 0 | 34 | 60 | 68 |
| 8 | 74 | 74 | 0 | 21 | 53 | 55 |
| 9 | 101 | 101 | 0 | 36 | 65 | 57 |
| 10 | 87 | 87 | 0 | 39 | 48 | 60 |
| 11 | 82 | 82 | 0 | 28 | 54 | 40 |
| 12 | 102 | 102 | 0 | 43 | 59 | 54 |
| Total | 1,046 | 820 | 226 | 304 | 742 | 553 |

The Lesson 3 inventory includes existing Module 1 / Lessons 1–3 range labels. Those 226 records remain `broad-range-candidate` and are not claims that Lesson 3 first teaches them. A module-only occurrence retains its candidate page and evidence but cannot establish a Lesson 3 page. Shared partner pages retain their full source section label. No selected page establishes first introduction.

All 742 unresolved records are in `rows`, with their stable key, copied German form, original source labels, candidate pages, exercise context and evidence references:

| Reason | Rows | Meaning |
| --- | ---: | --- |
| `no-literal-page` | 347 | No case-preserving single-line form was found in the applicable source context. |
| `multiple-pages` | 334 | Several pages contain the form; none was selected. |
| `broad-module-context` | 57 | A module occurrence does not establish this broad candidate's Lesson 3 attribution. |
| `extraction-misalignment` | 4 | A manifest match lacks a matching raw-text occurrence on the same PDF page. |

Source evidence is restricted to these exact files. The sidecar records their SHA-256 hashes and a hash of the complete per-lesson source-row inventory.

| Source | Path | SHA-256 |
| --- | --- | --- |
| Interactive book | `platform/apps/web/generated/interactive-book.json` | `247d80d0a90e9b2763257486a3ac11b9ae148add5803385fd1bce6dbefe110b8` |
| Coursebook raw text | `archive/cursor-demo-2026-07-30/content/extracted/_pdf_raw/kursbuch_full.txt` | `bcbf5e2e9cde91fc0c3bd70c03b7258d3857f4732f3266ea47b9c89221f88b3f` |
| Glossary raw text | `archive/cursor-demo-2026-07-30/content/extracted/_pdf_raw/glossary_full.txt` | `4638dc13205a866f0955c1b92cc6f3b3b4a06d47ebd48a86736e351542c3924c` |

The supplied glossary identifies itself as Momente A1.1 Deutsch–Spanisch, ISBN 978-3-19-001791-1. Its original lesson and exercise markers are used without translating or authoring vocabulary. Glossary PDF pages are separate from coursebook printed pages.

Each row's `bookRef.evidenceIds` indexes the sidecar's deduplicated `evidence` records. `m:` identifies a manifest line, `r:` a raw coursebook line, `g:` a glossary line, `h:` an exercise heading, and `a:` an audio exercise. Records include text and global line numbers or manifest IDs, page mapping, and source context as applicable.

A selected page requires one applicable manifest page and a matching occurrence on that raw PDF page. These files share an extraction lineage, so this checks alignment rather than providing independent confirmation. Matching preserves case and word boundaries, strips noun articles and separable-verb extraction marks, and rejects line starts that continue a hyphenated compound. It does not stem, translate or supply missing German forms. This deliberately leaves sentence-initial and wrapped forms unresolved when literal proof is insufficient.

An exercise can be retained from a unique exact-lesson glossary match even when its page is unresolved. When a page is selected, an exercise-page association additionally requires a matching main heading or audio entry on that core lesson page. `glossaryExercises` retains unverified or multiple exercise contexts without presenting them as the selected page's exercise.

Regeneration uses the pure projector in `platform/apps/web/lib/content/vocabulary-book-refs.server.ts` and writes only the draft sidecar. From `platform`:

```sh
node --import tsx --input-type=module -e 'import {writeFileSync} from "node:fs"; import {generateVocabularyBookRefDraft,BOOK_REF_DRAFT_PATH} from "./apps/web/lib/content/vocabulary-book-refs.server.ts"; writeFileSync(`../${BOOK_REF_DRAFT_PATH}`,JSON.stringify(generateVocabularyBookRefDraft(),null,2)+"\n");'
```

Focused validation covers source-row preservation and coverage, broad range attribution, aliases and variants, literal boundaries and case, comma phrases, wrapped compounds, ambiguous and module-only page matches, inspectable page/exercise proof, reproducibility, and the adjacent existing book/subject-sheet suites. The final run passed 35 tests across 3 files. No build, typecheck, live projection, schema or dependency changes were made.
