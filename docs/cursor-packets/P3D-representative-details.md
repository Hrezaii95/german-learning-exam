# P3D — Representative vocabulary, verb, and Q&A details

Implement with Cursor `grok-4.5` High, `fast=false`. Do not commit, claim approval, generate media, or promote review content.

## Read first

- `plans/CURSOR-FINAL-HANDOFF.md`
- `docs/05-screen-and-interaction-spec.md`
- `docs/09-audio-and-pronunciation.md`
- `docs/10-infographic-and-visual-system.md`
- `docs/18-requirement-traceability.md` VOC/VER/PQA/AUD/UX rows
- current canonical bundle, learner indexes/search, web projection/routes/components/tests
- `media/manifests/alpha-tts-manifest.json` and `media/qa/alpha-tts-technical-audit.json` read-only for gap/status detection only

## Write only

- `platform/apps/web/**`
- `platform/tests/web/**`
- `research/cursor-execution/P3D-worker-report.md`

## Canonical representatives

1. Vocabulary: `lex:architekt` plus published person-form relation to `lex:architektin`. This deliberately differs from the provided `Ingenieur` mockup.
2. Verb: `verb:sein`.
3. Q&A: `qa:profession-casual-main` with its published question and answer patterns.

Do not display teacher-review plurals (`Architekten`, `Architektinnen`) as published facts. The core published lexemes currently have empty plural arrays. Render an explicit “Plural awaiting content approval” gap. Do not link or reveal assertion values or review records.

All matching TTS files currently have `reviewStatus=candidate-needs-listening-review`. Do not copy them into the web public artifact or serve their paths. Render a fully accessible disabled/unavailable pronunciation control with exact explanation: technical candidate exists; qualified listening approval pending. Build the shared audio-control contract/state API so an approved manifest can activate it later without redesign, but do not fake playback.

## Learner-safe detail artifact

Build a deterministic projection from the validated bundle/public learner index containing only the three representatives and fields needed to render:

- canonical ID/kind/display text;
- published status;
- lesson memberships/source priority;
- vocabulary lemma, meaning, article, gender, published singular/plurals, safe person-form relation;
- verb infinitive, meaning, full published present paradigm;
- Q&A intent/register and published pattern realizations;
- media availability state only (`approved`, `pending-review`, `missing`) and safe asset ID if approved; never path/hash/source assertion/value.

Runtime validate exact shape/kinds/statuses/relationships, deterministic bytes, and recursive absence of review/private/source/audio paths/secrets. Fail closed.

## Routes

- `/vocabulary/lex%3Aarchitekt`
- `/verbs/verb%3Asein`
- `/phrases/qa%3Aprofession-casual-main`

Canonical raw-colon aliases redirect once to encoded paths. Wrong kind, unknown, alternate/unapproved representatives, review IDs, malformed/double encoding, extra segments return 404. Update learner search to link exactly these implemented canonical details; other detail results remain non-links.

## Vocabulary UX

- canonical `der Architekt` and linked `die Architektin` with German `lang` boundaries;
- semantic M/F token, text label and shape—never color alone;
- responsive person-form infographic showing shared stem `Architekt` and feminine `-in` operation, explicitly sourced from the published pair relation;
- published plural gap state, not guessed values;
- English meaning;
- lesson/source-priority chips;
- pronunciation pending-review control;
- Add to Review action may be a truthful disabled “available after learner-state UI” until P4;
- desktop/tablet/mobile layout and keyboard order.

## Verb UX

- `sein` / “to be”;
- all seven published present forms with accessible person labels;
- irregular paradigm visual using morphology/irregular tokens, never gender colors;
- ending/stem legend that states this paradigm is irregular and must be learned as forms—do not invent etymology/rules;
- pronunciation pending-review control;
- optional self-check interaction using only the published person/form pairs: reveal or deterministic select/typed check may give correctness feedback but must not persist or claim mastery yet;
- responsive and keyboard accessible.

## Q&A UX

- informal register;
- published question `Was bist du von Beruf?` and the three published answer patterns exactly as canonical data;
- model and guided-choice sections driven by data;
- construction field that compares only against authoritative fixed patterns/ellipsis-safe normalization; do not claim a filled profession sentence is accepted unless published;
- conversation progression preview with later levels honestly marked pending P4;
- recording control disabled with “Speaking practice arrives with recorder phase”; do not fake microphone behavior here;
- pending-review audio control for the question;
- responsive dialogue layout.

## Back context and navigation

- Hub/search/lesson entry context roundtrips through each detail.
- Back link must be allowlisted and restore safe query/filter context.
- Search/hub cards link only these representatives.
- No external redirect, raw attacker text, source/assertion/private values in context.

## Tests

- exact artifact representative ID set = 3 and exact canonical-data field equality;
- review plural/TTS paths/status data do not leak except safe `pending-review` enum;
- deterministic artifact mandatory on disk;
- route canonical/raw alias/wrong kind/unknown/review/malformed tests;
- rendered semantic tokens and non-color labels;
- seven `sein` forms exact;
- Q&A patterns exact;
- disabled media/recorder/review controls honest and non-focus behavior where appropriate;
- safe Back context and malicious nav;
- responsive semantic structure, one main, lang boundaries, keyboard controls;
- prior SSG 2+23, hubs, search, and 404 gates.

Run:

```powershell
cd platform
npm run check
npm run build:web
npm run audit:prod
npm run smoke:web-routes
```

Write exact report and remaining human/content/media gaps. Stop if any required value would require German invention or review-status promotion.
