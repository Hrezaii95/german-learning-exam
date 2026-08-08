# German Learning OS — Clean-Rebuild Project Brief

Status: pre-implementation  
Scope of first demo: Momente A1.1 Lessons 1 and 2 only  
Primary learner: one adult learner using the product for personal study

## Mission

Build a visual-first, audio-first German learning environment that turns source-backed course material into connected learning experiences. The goal is demonstrated communicative competence, not passive content completion.

## Non-negotiable learning model

Every concept follows the loop:

`See → Hear → Notice → Repeat → Recall → Use → Receive feedback → Review → Master`

The product must support a learn-by-doing learner whose primary weaknesses are listening and pronunciation. Multiple-choice success alone cannot establish mastery.

## Product principles inherited from the original session

1. Visuals before walls of text.
2. Native or source audio before synthetic speech whenever licensed audio is available and correctly mapped.
3. Consistent noun-gender encoding everywhere: `der` blue, feminine singular `die` red, `das` green, plural `die` purple.
4. Irregular forms, stress, syllables, common errors, and contrasts are visually highlighted.
5. Lessons and concepts are both valid entry points; nothing is trapped in a linear lesson list.
6. Vocabulary, verbs, grammar, phrases, questions and answers, dialogues, audio, exercises, and infographics are cross-linked.
7. Learner difficulty signals drive focused review.
8. Every published fact and asset is traceable to its source.
9. Teacher extras are first-class lesson content, not detached appendices.
10. A lesson is complete only when its content, visuals, audio, practice, review, and provenance pass documented quality gates.

## Alpha content boundary

The first clean demo contains only Lessons 1 and 2 plus explicitly assigned teacher extras attached to those lessons. Later textbook lessons and A1.2 resources may be indexed now but must not leak into the Alpha learning experience.

Expected Lesson 1 domains include greetings, farewells, introductions, wellbeing, countries/nationalities, personal pronouns, core question-and-answer patterns, and the verbs `sein`, `heißen`, `kommen`, and `lernen`, subject to source verification.

Expected Lesson 2 domains include professions, asking and answering about occupation, relevant verb/grammar patterns, coursebook/workbook dialogues and exercises, and the full teacher-supplied professions set, subject to source verification.

## Canonical visual direction

The refined composite PNG in `resources/project-context/ui-reference/file_000000002cac8246b09d9ffdc8b9d45b.png` is the preferred visual reference. It establishes:

- dark indigo navigation against a quiet off-white workspace;
- spacious cards and strong typographic hierarchy;
- illustration-led lesson and vocabulary heroes;
- a restrained purple interaction accent distinct from grammatical colors;
- dedicated desktop views for dashboard, lesson, vocabulary, verbs, grammar, listening, quiz, and conversation;
- responsive mobile equivalents with simplified navigation;
- a coherent component and token system.

The mockup is design evidence, not a complete functional specification. Accessibility, responsive behavior, empty/error/loading states, keyboard interaction, feedback, and content density must be specified before implementation.

## New evidence added after the original ChatGPT session

The repository now contains resources that materially strengthen the plan:

- the complete A1 coursebook PDF;
- the A1.1 workbook;
- official German-English and German-Spanish glossaries;
- the official coursebook answer key;
- official workbook transcripts;
- a 64-page picture dictionary;
- a 387-track mixed audio archive;
- teacher professions material and learner notes;
- the complete original product conversation and canonical UI renders.

These sources enable bilingual validation, answer-key checking, transcript-aligned listening exercises, source-backed audio navigation, and richer visual taxonomies. They also expose a critical need for provenance-aware ingestion because the audio archive mixes German, Czech, Slovak, A1.1, and A1.2 packs.

## Required product enhancements

1. **Evidence ledger:** every field and asset stores source ID, page/exercise or track, extraction method, confidence, reviewer, and validation state.
2. **Audio alignment workstation:** map transcript segments to MP3 time ranges and lesson concepts; never rely only on filenames.
3. **Contrastive bilingual validation:** use both English and Spanish glossaries to find omissions or ambiguous meanings while German remains canonical.
4. **Visual taxonomy pipeline:** use the picture dictionary and teacher infographic as visual references without silently importing out-of-scope vocabulary.
5. **Scope firewall:** prevent Lesson 3+ and A1.2 items from appearing in the Lesson 1–2 Alpha.
6. **Mastery evidence model:** distinguish recognition, recall, listening discrimination, pronunciation, production, and conversation use.
7. **Pronunciation readiness:** store IPA, syllables, stress, phoneme targets, minimal-pair links, native audio, slow playback policy, and future speech-evaluation hooks.
8. **Content diffing:** preserve source revisions and show what changed when a glossary, transcript, or teacher handout is re-ingested.
9. **Accessibility by design:** WCAG 2.2 AA targets, non-color gender cues, transcripts/captions, reduced motion, keyboard support, and screen-reader labels.
10. **Offline-first personal use:** Lessons 1–2, progress, review queue, images, and permitted audio should work without a permanent backend connection.

## Explicit exclusions from the first demo

- No unverified extraction from later lessons.
- No fake native audio and no mislabeled workbook/coursebook tracks.
- No AI pronunciation score presented as authoritative before an evaluation design and benchmark exist.
- No generic chatbot standing in for a structured conversation tutor.
- No full-course ingestion UI.
- No production multi-user account system.
- No reuse of failed Cursor implementation artifacts as foundations.

## Alpha definition of done

The Lesson 1–2 demo is complete only when:

- coverage is reconciled against each official source and teacher extra;
- every published content object passes schema and provenance validation;
- every canonical noun, verb, phrase, grammar item, dialogue, exercise, visual, and audio segment is linked appropriately;
- vocabulary and sentence audio are correctly attributed and mapped, with an explicit fallback policy;
- all canonical screens and responsive states match the approved design specification;
- recognition, recall, listening, speaking/repetition, quiz, weak-item tagging, and focused review flows work;
- accessibility, content QA, unit, integration, and end-to-end acceptance gates pass;
- known limitations are visible rather than hidden behind invented data.
