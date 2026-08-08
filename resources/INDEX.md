# Resource Inventory

Status: audited and reorganized on 2026-08-02  
Rule: files under `original/` are immutable evidence. Extraction, OCR, normalization, and enrichment outputs must be written outside this directory.

Machine-readable evidence: `../content/source-index/source-manifest.json` records every immutable file with a stable source ID, byte size, SHA-256 hash, category, language/scope classification and publication state. `../content/source-index/source-lock.json` pins the approved manifest hash and totals. Rebuild candidates with `node tools/build-source-manifest.mjs`, but update the lock only through an explicit source-intake review. Verify the exact disk/manifest path set, every hash and count, the approval lock, and the publisher-audio rights gate with `node tools/validate-source-manifest.mjs`.

## Original learning sources

| Category | File or pack | Evidence | Intended use |
|---|---|---:|---|
| Coursebook | `original/coursebook/A1-KB-momente.pdf` | 211 pages; 33,633,314 bytes | Canonical lesson sequence, exercises, dialogues, visuals, and grammar context |
| Workbook | `original/workbook/Momente A1.1 AB_7.pdf` | 123 pages; 7,582,207 bytes | Additional exercises, listening tasks, and reinforcement |
| English glossary | `original/glossaries/Momente_A1_1_KB_Glossar_Deutsch_Englisch.pdf` | 17 pages | Priority-1 vocabulary and English meanings |
| Spanish glossary | `original/glossaries/Momente_A1_1_KB_Glossar_Deutsch_Spanisch.pdf` | 16 pages | Secondary translation and cross-checking source |
| Coursebook solutions | `original/answer-keys/Momente_A1_1_KB_Loesungen.pdf` | 4 pages; Lessons 1–12 | Exercise validation and answer-key evidence |
| Workbook transcripts | `original/transcripts/Momente_AB_A1_1_Transskriptionen_2.pdf` | 19 pages | Transcript alignment for workbook audio |
| Visual dictionary | `original/visual-reference/German Picture Dictionary.pdf` | 64 image-led pages | Visual taxonomy and illustration reference; not automatically canonical for Momente lesson scope |
| Lesson 1 checklist | `original/learner-notes/Lesson 1_260730_050234.txt` | Learner-supplied structured checklist | Candidate coverage checklist; must be checked against official sources |
| Professions notes | `original/learner-notes/Notes_260730_040559.txt` | Profession forms and translations | Teacher/personal enrichment for Lesson 2 |
| Teacher handout | `original/teacher-materials/IMG-20260723-WA0001.jpg` | Professions infographic | Required Lesson 2 teacher-extra scope and visual reference |

## Audio inventory

The pack is preserved unchanged at `original/audio/Audio-20260730T043413Z-1-001/`.

| Source folder label | Tracks | Scope inferred from filenames | Alpha status |
|---|---:|---|---|
| `Momente_A1_1_AB_CD1` | 62 | German workbook, early A1.1 material including Lessons 1–6 | In scope after transcript alignment |
| `Momente_A1_1_AB_CD2` | 56 | German workbook, later A1.1 material | Only Lesson 2-relevant tracks if any are verified; filenames begin at Lesson 7 |
| `Momente_A1_1_KB_CD2` | 31 | German coursebook Lessons 7–12 | Out of Lesson 1–2 Alpha scope |
| `Momente_A11_AB_CZ_Audios_CD1` | 59 | Czech-localized workbook A1.1 Lessons 1–6 | Quarantine until language/instruction differences are checked |
| `Momente_A11_AB_CZ_Audios_CD2` | 41 | Czech-localized workbook A1.1 Lessons 7–12 | Out of current scope; possible duplicate content |
| `Momente_A11_AB_CZ_Audios_CD3` | 43 | Czech-localized A1.2 Lessons 13–18 | Out of Alpha scope |
| `Momente_A11_AB_CZ_Audios_CD4` | 54 | Czech-localized A1.2 Lessons 19–24 | Out of Alpha scope |
| `Momente_A11_AB_SK_Audios_CD2` | 41 | Slovak-localized workbook A1.1 Lessons 7–12 | Out of current scope; possible duplicate content |

Total: 387 MP3 files, 281,078,893 bytes.

Important gap: no clearly labelled German `Kursbuch CD1` pack for Lessons 1–6 is present. The failed demo treated workbook tracks as if they were coursebook audio in places. The rebuild must never infer this mapping without evidence.

## Project context

| Category | Location | Notes |
|---|---|---|
| Original ChatGPT session | `project-context/conversation/Interactive-Course-Creation.json` | 77-message source-of-truth conversation export |
| Early composite mockup | `project-context/ui-reference/ChatGPT Image Jul 30, 2026, 07_51_07 AM.png` | Canonical early design reference |
| Duplicate early mockup | `project-context/ui-reference/ChatGPT Image Jul 30, 2026, 07_51_13 AM.png` | Byte-identical to the previous PNG; retained for provenance |
| Refined composite mockup | `project-context/ui-reference/file_000000002cac8246b09d9ffdc8b9d45b.png` | Preferred premium visual direction |

## Provenance and priority rules

1. Official glossary entries define Priority 1 core learning content.
2. Coursebook and workbook context define Priority 2 content and lesson relationships.
3. Teacher materials and assigned extras define Priority 3 content.
4. Learner additions and visual-dictionary enrichment define Priority 4 content.
5. Conflicts are never silently merged. Each value retains source, location, extraction method, confidence, and validation status.
6. No extracted item is publishable until it is traceable to a page, exercise, note row, image region, transcript segment, or audio track.
