# P5 rapid audio deployment report

Date: 2026-08-13  
Scope: Lessons 1–2, representative vocabulary/verb/Q&A, and a compact extra-professions preview wave

## Outcome

The audio lane now has two deliberately separate deliverables:

1. **15 owner-approved publisher workbook tracks**, packaged byte-for-byte for immediate web integration under `media/generated/source-workbook-approved-v1/`.
2. **54 high-value generated German TTS clips**, technically verified and mapped to learner surfaces, but still blocked from learner publication until the required human German listening passes are recorded.

No other publisher audio is approved or packaged. No source-workbook MP3 outside the exact 15-track Lesson 1–2 set is included.

## Owner redistribution decision

The project owner explicitly approved public redistribution on 2026-08-13 for the exact 15 mapped `Momente_A1_1_AB_CD1` tracks listed below. The manifest records the required field:

> `rightsBasis`: Explicit project-owner approval for public redistribution, recorded 2026-08-13, limited to the exact 15 mapped Lesson 1-2 workbook tracks in this manifest.

This authorization is not inferred for CD2, Coursebook CD2, Czech/Slovak localized packs, later lessons, transcripts, or any other publisher resource.

## Exact approved workbook package

| Lesson | Workbook exercise | Files | Count | Purpose | Fastest learner-surface mapping |
|---|---|---|---:|---|---|
| 1 | AB 3 | `1_01`–`1_04` | 4 | names and spelling | Lesson 1 — Alphabet, listen and spell |
| 1 | AB 9a | `1_05` | 1 | sentence melody model | Lesson 1 — Workbook listening |
| 1 | AB 9b | `1_06` | 1 | sentence melody comparison | Lesson 1 — Workbook listening |
| 2 | AB 6a | `1_07`–`1_10` | 4 | telephone-number discrimination | Lesson 2 — Workbook listening + Numbers 0–100 |
| 2 | AB 6b | `1_11`–`1_14` | 4 | telephone-number transcription | Lesson 2 — Workbook listening + Numbers 0–100 |
| 2 | AB 12 | `1_15` | 1 | profession word stress and repetition | Lesson 2 — Workbook listening + Core professions |

The per-track manifest contains the exact canonical activity routes, filename, source audio ID, purpose, bytes, SHA-256, codec, sample rate, channels, measured duration, source-map duration, provenance evidence, and owner-approval state.

### Web-consumable paths

- Packaged source: `media/generated/source-workbook-approved-v1/<filename>.mp3`
- Intended public-relative path: `audio/source-workbook-approved-v1/<filename>.mp3`
- Manifest: `media/manifests/workbook-audio-rights-projections.json`

The packaged files preserve the original SHA-256 values. They are MP3, 44.1 kHz, stereo. Total measured duration is **330.540 seconds**.

## Generated TTS preview wave

The selected preview queue is intentionally small enough for a rapid human review while covering the most visible product surfaces:

| Group | Clips | Coverage |
|---|---:|---|
| Lesson 1 | 13 | greetings, farewells, name/origin/wellbeing questions and a model answer |
| Lesson 2 core | 7 | `Beruf`, `Job`, `Alter`, `Wohnort`, casual/formal profession Q&A, profession model sentence |
| `sein` | 7 | infinitive and the learner-facing present paradigm forms |
| `arbeiten` | 7 | infinitive and six present-person forms |
| Profession forms | 20 | Architekt/in, Ingenieur/in, Arzt/Ärztin plurals, Polizist/in plurals, Feuerwehrmann/-frau plurals, Bäcker/in plurals |
| **Total** | **54** | representative lesson, detail, hub, conversation and extra-profession surfaces |

All 54 clips use `de-DE-KatjaNeural` at `+4%`. They are MP3, 24 kHz, mono, total **104.688 seconds**. Every asset has an exact hash, duration, codec and page/card mapping in `media/manifests/rapid-preview-tts-candidates.json`.

The generated files are **not pronunciation-approved**. Their status remains `pending-human-listening-review`, and the projection explicitly sets `copyBytesToDeployableBundle: false`. A technical pass cannot establish German stress, naturalness, final sounds, umlauts, `ch`, `r`, feminine endings, or connected-speech suitability.

## Source-audio reference use

The approved workbook tracks should be used as source authority for their original exercises and as a human comparison reference for generated candidates:

- AB 9a/9b: sentence melody and connected-speech comparison;
- AB 12: profession stress and repetition benchmark;
- AB 3: names and spelling rhythm;
- AB 6a/6b: natural number grouping and telephone-number pacing.

Do not mechanically cut publisher dialogue into isolated lexeme clips or infer transcripts from audio alone. Generated lexemes and sentences retain their own IDs, checksums and listening-review records.

## Technical verification

`node media/qa/generate-rapid-audio-projections.mjs` performed deterministic projection/package generation and checked every selected file with `ffprobe`.

- 54 generated candidates checked;
- 15 approved workbook tracks checked;
- 69 total `ffprobe` checks;
- exact manifest/disk set match for the 15-track workbook package;
- packaged/source/private-reference hashes match;
- public-relative paths are traversal-safe and contain no private/resource/secrets paths;
- no unapproved publisher file exists in the approved package;
- zero technical failures.

`node tools/audit-alpha-tts.mjs` was also rerun against the full 327-clip TTS corpus: 327 manifest rows, 327 disk files, zero technical failures. The full corpus remains pending human listening review.

Evidence: `media/qa/rapid-audio-deployment-audit.json` and `media/qa/alpha-tts-technical-audit.json`.

## Fast web integration contract

1. Copy only `media/generated/source-workbook-approved-v1/` into the web public bundle at `audio/source-workbook-approved-v1/`.
2. Read only `projections.publicDeployable.assets` from the workbook manifest; never expose `privateReferenceAuthority` in a client bundle.
3. Bind each track to its exact `pageAndActivityMappings` route. Render the exercise label and purpose alongside the player.
4. Resolve the public-relative path through the existing GitHub Pages base-path helper; do not hard-code a leading root slash.
5. Provide normal play, pitch-preserving study speed, repeat, loading/error state, and one-player-at-a-time behavior.
6. Label these as original workbook audio. Do not label them as generated pronunciation.
7. Keep the 54 TTS candidates out of the deployable bundle until the two required human listening passes approve each clip. Their manifest already provides the future public-relative path and exact page/card mapping.

## Remaining audio gates

- Record a qualified German accuracy/form pass and naturalness/consistency pass for generated TTS.
- Record any per-track qualified-German workbook listening observations separately; owner redistribution approval is already established.
- Integrate the 15 approved files and run browser playback tests at normal/study speed on desktop and mobile.
- Confirm static export contains exactly the intended 15 publisher MP3s and no other source media.
