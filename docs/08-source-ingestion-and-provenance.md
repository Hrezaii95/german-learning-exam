# Source Ingestion and Provenance

## Immutable input rule

Everything under `resources/original/` is immutable evidence. OCR, extracted text, thumbnails, audio derivatives and normalized data live elsewhere and carry a checksum link to the original.

## Source authority and scope

| Source | Use | Authority notes |
|---|---|---|
| English glossary | core item inventory, first occurrence, English meaning, noun plural notation | Priority 1; italics/non-learning-vocabulary formatting must be captured if extraction can verify it |
| Coursebook pages 10–18 | lesson goals, sequence, examples, dialogues, visual lexicon, grammar context | Priority 2; printed page and exercise required |
| Workbook pages 6–13 | practice forms, pronunciation tasks, listening exercise linkage | Priority 2 |
| Workbook transcript PDF | exact German source-audio transcript and exercise/track mapping | Required for listening publication |
| German workbook audio CD1 | source listening tracks for Lessons 1–2 | Track mapping must match transcript and exercise |
| Coursebook solutions | checkpoint validation where applicable | Does not replace content evidence |
| Teacher image + professions note | required Lesson 2 enrichment | Priority 3; original image is a reference, not hosted illustration |
| Learner Lesson 1 note | coverage cross-check | Candidate assertions; verify against official sources |
| Picture dictionary | semantic/visual inspiration and possible personal enrichment | Priority 4 unless explicitly assigned |
| Original ChatGPT JSON and renders | product/design requirements | Not German-content authority |

## Standard pipeline

1. **Register source:** stable ID, original path, SHA-256, type, language, edition, page/track count, use basis.
2. **Extract:** page-aware text/OCR or audio metadata; keep raw output and tool/version.
3. **Segment:** lesson, page, exercise, heading, dialogue turn, glossary entry or track.
4. **Normalize:** Unicode NFC, whitespace, punctuation, German capitalization; never ASCII-fold stored German.
5. **Parse assertions:** keep field value and exact source location.
6. **Resolve concepts:** match canonical ID using German form, type and context; log candidate duplicates.
7. **Enrich:** relationships, morphology, IPA/stress, examples, activity/card eligibility. Generated enrichment is separately attributed.
8. **Validate:** schema, scope, cross-source conflicts, references, German QA, audio alignment.
9. **Publish:** select verified assertions and produce content/media manifests.
10. **Diff:** new ingestion produces an assertion-level change report; it never overwrites silently.

## PDF extraction rules

- Store both physical PDF page and printed page.
- Preserve exercise number and surrounding heading.
- Multi-column glossary text must be reconstructed by layout, not naïve line order.
- Detect italic/non-core formatting where possible; if not reliable, mark the field unknown rather than infer.
- Hyphenation across line breaks is repaired only with dictionary/context evidence.
- `..` glossary notation means plural with umlaut; `-` means plural identical to singular. Store the actual plural form after morphological resolution.
- Every automated output is candidate status until reviewed.

## Lessons 1–2 known page map

| Content | Printed pages | Physical PDF evidence |
|---|---:|---|
| Coursebook Lesson 1 | 10–14 | verify against current 211-page PDF during extraction |
| Coursebook Lesson 2 | 15–18 | verify against current 211-page PDF during extraction |
| Workbook Lesson 1 | 6–9 | current 123-page workbook |
| Workbook Lesson 2 | 10–13 | current 123-page workbook |
| English glossary Lessons 1–2 | glossary PDF pages 1–4 | 17-page glossary |

The extractor records physical pages programmatically; this table is a human navigation aid, not a substitute.

## Audio alignment

For German workbook CD1, filename evidence and transcript headings currently support:

- `1_01`–`1_04`: Lesson 1, Workbook Exercise 3;
- `1_05`: Lesson 1, Exercise 9a;
- `1_06`: Lesson 1, Exercise 9b;
- `1_07`–`1_10`: Lesson 2, Exercise 6a;
- `1_11`–`1_14`: Lesson 2, Exercise 6b;
- `1_15`: Lesson 2, Exercise 12.

These mappings still require checksum registration and a listening review. No German Coursebook CD1 pack is clearly present; workbook tracks must never be labeled coursebook audio.

## Deduplication

Canonical equality requires type-aware review:

- same lemma + same part of speech may merge source assertions;
- masculine/feminine profession forms remain separate linked lexemes;
- same surface form with different meanings/types remains separate;
- spelling variants become aliases only after validation;
- `Landwirt/Bauer`, `Postbote/Briefträger`, `Klempner/Installateur` are related alternatives, not slash-filled canonical lemmas;
- source labels that are dated, regional or awkward remain source assertions with usage notes; the app may display a reviewed preferred term while preserving the assignment wording.

## Scope firewall

The Alpha manifest build fails when:

- `lessonNumber > 2` and no approved enrichment link exists;
- source audio folder is A1.2 or a later lesson;
- Czech/Slovak-localized track is published without explicit review;
- a picture-dictionary item is promoted into Lessons 1–2 without source priority and approval;
- an unverified assertion supplies a required published field.

## Content gap ledger

Every missing item is explicit:

```json
{
  "gapId": "gap:audio:lex-ingenieur",
  "objectId": "lex:ingenieur",
  "field": "pronunciation.audioId",
  "reason": "generated audio pending review",
  "owner": "codex-media",
  "blocksPublication": true
}
```

Cursor stops that object’s publication and reports the ledger; it does not improvise.
