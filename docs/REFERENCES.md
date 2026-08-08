# References

## Internal primary evidence

- `resources/project-context/conversation/Interactive-Course-Creation.json` — original 77-message product conversation.
- `resources/original/coursebook/A1-KB-momente.pdf` — Momente coursebook; Alpha uses printed pages 10–18.
- `resources/original/workbook/Momente A1.1 AB_7.pdf` — Momente A1.1 workbook; Alpha uses printed pages 6–13.
- `resources/original/glossaries/Momente_A1_1_KB_Glossar_Deutsch_Englisch.pdf` — Priority-1 inventory and English meanings; Lessons 1–2 span PDF pages 1–4.
- `resources/original/glossaries/Momente_A1_1_KB_Glossar_Deutsch_Spanisch.pdf` — secondary translation cross-check.
- `resources/original/transcripts/Momente_AB_A1_1_Transskriptionen_2.pdf` — workbook audio transcript and track/exercise evidence.
- `resources/original/audio/Audio-20260730T043413Z-1-001/` — mixed 387-track source archive; only verified German Lesson 1–2 tracks ship.
- `resources/original/learner-notes/Lesson 1_260730_050234.txt` — learner coverage checklist.
- `resources/original/learner-notes/Notes_260730_040559.txt` — 48-row professions forms/meaning table.
- `resources/original/teacher-materials/IMG-20260723-WA0001.jpg` — required professions handout and visual reference.
- `resources/project-context/ui-reference/file_000000002cac8246b09d9ffdc8b9d45b.png` — refined product visual direction.
- `samples/german-learning-ui-samples/` — approved functional vocabulary/Q&A/verb interaction baseline.

Publisher materials are owned for personal study. The hosted UI uses original generated visual assets and does not claim permission to redistribute the books or their illustrations.

## Learning and language framework

- [Council of Europe — CEFR Companion Volume (2020)](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions) — action-oriented language learning framework and updated descriptors.
- [CEFR Companion Volume PDF](https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2020/16809ea0d4) — primary reference document.

The product’s exact lesson scope comes from Momente, not from an invented generic CEFR word list.

## Accessibility

- [W3C Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/) — normative accessibility target; W3C Recommendation dated 2024-12-12.

## Review scheduling

- [Open Spaced Repetition — FSRS reference repository](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler) — Difficulty/Stability/Retrievability model and implementation links.
- [Open Spaced Repetition organization](https://github.com/open-spaced-repetition) — maintained TypeScript/Rust implementations and benchmarks.

FSRS is an implementation candidate wrapped behind an app interface; it does not define language mastery by itself.

## Speech and pronunciation

- [Microsoft — Language and voice support for Azure Speech](https://learn.microsoft.com/en-us/azure/ai-services/Speech-Service/language-support) — de-DE voice and pronunciation-assessment support.
- [Microsoft — Use pronunciation assessment](https://learn.microsoft.com/en-us/azure/ai-services/Speech-Service/how-to-pronunciation-assessment) — assessment modes and output concepts.
- [Microsoft — Azure Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/) — recheck current free tier and paid rates before production migration.
- [edge-tts repository](https://github.com/rany2/edge-tts) — current no-key prototype generator; unofficial and not the production service authority.
- [MDN — `speechSynthesis`](https://developer.mozilla.org/en-US/docs/Web/API/Window/speechSynthesis) — browser API reference; device voice variability is why it is fallback-only.
- [Piper repository](https://github.com/rhasspy/piper) — offline TTS alternative; each voice model’s quality/license must be reviewed separately.

## Reference freshness

External service availability, versions and pricing are time-sensitive. The links above were checked on 2026-08-02. Revalidate before provider migration or release claims.
