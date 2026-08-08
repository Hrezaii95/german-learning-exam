# Original Session Decision Ledger

Source: `resources/project-context/conversation/Interactive-Course-Creation.json`  
Source span: 77 messages, 2026-07-30  
Purpose: preserve the accumulated intent without treating the assistant’s old estimates or unbuilt claims as facts.

## User requirements retained

| Message(s) | Requirement | Current interpretation |
|---|---|---|
| 0–4 | Turn Momente Lessons 1–2 into interactive, visual learning using the owned coursebook | Lessons 1–2 are the production slice; source visuals inspire original layouts but are not copied into a public build |
| 5–8 | Learn every profession from the teacher image; use one gender color system; create verb and verb-meaning infographics; specify every section and dashboard | Teacher professions are a required Lesson 2 enrichment collection; gender and morphology systems are global tokens; vocabulary and verb detail pages follow the approved sample |
| 9–10 | Add phrases and Q&A; priority 1 glossary, priority 2 coursebook, priority 3 teacher material, priority 4 personal additions | Content keeps source priority and provenance while deduplicating into canonical concepts |
| 11–12 | Professional cards, lesson backlinks, difficulty tagging, focused review; listening and pronunciation are primary weaknesses | Every object links to origin lesson and hub; tags feed review; audio is a first-class field and UI action |
| 13–14 | Learn by doing; future AI evaluates speech, explains errors, uses thresholds, and does not award mastery after a lucky attempt | Alpha records and compares speech but does not claim authoritative AI scoring; scoring remains a gated post-Alpha feature with multi-attempt evidence |
| 19–24 | Knowledge base as the product brain; rich objects; no duplicates; IDs; search; cross-links; review states | Canonical normalized content lives separately from presentation and produces lessons, hubs, games, and review cards |
| 31–32 | Alpha must include original infographics and playable pronunciation plus word and sentence audio | A content object is incomplete without an approved visual treatment and audio or an explicit documented exception |
| 47–56 | Complete responsive UX: dashboard, lessons, vocabulary, verbs, grammar, listening, practice, quiz, conversation, review, progress, settings and mobile; concept-first enhancement | Lesson navigation and type-specific hubs coexist; routes and states are fully specified in UX documents |
| 57–64 | Comprehensive repository docs, image references, infographic checklist, ingestion, metadata, agent handbook, audio pipeline, knowledge graph, decisions | This documentation set is the implementation contract and `DECISIONS.md` prevents future agents from erasing intentional choices |
| 61–64 | Full textbook/workbook audio must be reviewed and implemented; Cursor requires explicit steps | Audio mapping must use track + transcript + exercise evidence; Cursor may perform mechanical coding but not decide or generate media |

## Later requirements retained

| Date | Requirement | Decision |
|---|---|---|
| 2026-08-02 | Isolate the failed Cursor demo and restart clean | Failed code is quarantined under `archive/`; no foundation code is reused |
| 2026-08-02 | Build functional samples before committing to the platform | Approved baseline is the three-view vocabulary/Q&A/verb sample |
| 2026-08-02 | Pronunciation must be quick, accurate, natural and consistent | Pre-generated de-DE neural audio is used for core items; browser TTS is not the pronunciation authority |
| 2026-08-02 | Keep generated voice for now because the sample voice was liked | Prototype voice is retained; migration path to official Azure Speech is documented |
| 2026-08-02 | Plan the whole journey, encode the course/workbook/audio and allow extra vocabulary/grammar/phrases/Q&A per lesson | The model supports arbitrary source layers and lesson attachments without schema changes |
| 2026-08-02 | After learning or choosing a lesson, expose everything learned in separate hubs and gamified review | Vocabulary, verbs, grammar, phrases/Q&A, listening and concepts have global hubs filtered by learned/unlocked state |
| 2026-08-02 | Codex owns infographic, image and voice generation; Cursor does implementation legwork | Media manifests are immutable inputs to Cursor; missing media becomes a request, never a fabricated placeholder |

## Old-session ideas that are not Alpha commitments

- “800+ phrases,” “1,500 vocabulary entries,” and whole-A1 coverage were directional estimates, not verified deliverables.
- Authoritative AI pronunciation scoring is not claimed until a provider, benchmark set, error taxonomy, privacy policy, cost model and human review are approved.
- StudyMe.ai is no longer the runtime target. Its activity ideas remain useful, but the standalone responsive platform is authoritative.
- A multi-user teacher portal, production authentication, certificates, social leaderboards and public course publishing are outside Lessons 1–2 Alpha.

## Completeness test

An implementation review must be able to point from every retained requirement above to:

1. a requirement ID in `02-product-requirements.md`;
2. a screen/flow in the UX documents;
3. an entity or event in `07-content-model-and-schemas.md`;
4. an acceptance test in `13-quality-and-acceptance.md`.
