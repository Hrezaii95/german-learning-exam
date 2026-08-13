# P5 rapid visual coverage

Generated 2026-08-13 with the built-in OpenAI image generator. The UI boards under `resources/project-context/ui-reference/` were visual-quality references only; all characters and compositions are original.

## First integration-ready batch

Four assets now cover the largest remaining published-page gaps: Lesson 1 identity/origin, Lesson 1 wellbeing, Lesson 2 profile/relationship context, and all thirteen published core profession pairs. Exact routes/concepts, alternative text, dimensions, hashes, responsive crop guidance, and prompt summaries are in `media/manifests/rapid-lesson-assets.json`.

Visual inspection passed for composition, readable expressions/props, absence of intended text/logos/watermarks, and consistency with the premium 2D editorial direction. The profession grid contains exactly thirteen occupied cells and three empty cells. It includes only the core list from `docs/11-lessons-01-02-content-spec.md`: parcel delivery, hairdressing, service, engineering, automotive mechatronics, university student, journalism, architecture, medicine, teaching, retail sales, school student, and retirement.

## Coverage against all 23 published activities

- Rich direct/contextual coverage now exists for greetings, greeting/farewell, name dialogue, spelling, origin, wellbeing, guided introduction, casual/formal Q&A, personal profile, relationship status, core professions, profession person forms, profession Q&A, profile reading/writing, `sein`/`arbeiten`, and both checkpoints.
- Existing integrated visuals cover greetings, profession ensemble, architect detail, verb context, and conversation/Q&A.
- Semantic/code-native presentation remains preferable for `heißen` versus `sein`, pronoun/verb building, full conjugation, numbers 0–100, and workbook listening. Forms and instructional labels must remain accessible HTML rather than raster text.
- Workbook transcripts remain blocked on qualified German approval. No visual can honestly substitute for that missing accessibility content.

## QA cautions

- The wellbeing image is a five-panel system. On narrow screens, display the whole sequence with horizontal scrolling or crop each panel deliberately; do not show one state as if it represented the full scale.
- The profession sheet should be used as an overview or split mechanically into its known grid cells. Do not use AI/object recognition to infer labels; map cells in the published order recorded by the manifest.
- The personal-profile illustration intentionally presents possible life-profile cues without declaring a relationship status. Keep learner claims in HTML and user-entered fields.
- Raster illustrations provide memory and context only. German words, articles, gender colors, plural forms, conjugations, questions, answers, pronunciation controls, and feedback remain semantic UI.

## Provenance

Generator: built-in OpenAI image generation tool. Generation session files were copied from the Codex generated-images store into the project-owned directory. SHA-256 hashes in the manifest bind the reviewed files. No external stock asset or publisher image was incorporated.
