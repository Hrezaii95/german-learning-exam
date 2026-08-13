# P5 rapid audio and accessibility reconciliation

Date: 2026-08-13  
Scope: published Lesson 1–2 routes, 15 owner-approved workbook tracks, existing generated TTS only.

## Result

All 15 workbook tracks are byte-verified, packaged under `audio/source-workbook-approved-v1`, mapped to five published activity routes, and can be used now on those routes. Transcripts for all 15 were manually verified against pages 1–2 of the authoritative local Hueber transcript PDF, but remain an internal projection: the recorded owner decision approves the audio files and does not separately approve public transcript republication.

Generated TTS remains blocked. The repository has technical QA for the rapid candidates, but no artifact recording both required human passes: German text/form accuracy and independent naturalness/consistency listening review.

Machine-readable handoff:

- `media/manifests/rapid-audio-accessibility.json`
- `platform/apps/web/generated/audio/workbook-transcripts-lessons-01-02.json`

## Exact route coverage

| Published activity | Exercise | Tracks | Ready now |
|---|---|---|---|
| Lesson 1 `alphabet-listen-spell` | AB 3 | 1_01–1_04 | yes |
| Lesson 1 `workbook-listening` | AB 9a–9b | 1_05–1_06 | yes |
| Lesson 2 `workbook-listening` | AB 6a, 6b, 12 | 1_07–1_15 | yes |
| Lesson 2 `numbers-0-100` | AB 6a–6b | 1_07–1_14 | yes |
| Lesson 2 `core-professions` | AB 12 | 1_15 | yes |

The manifest contains the full encoded canonical URLs. The same track may correctly appear on the broad workbook activity and its focused practice activity; this is deliberate reuse, not duplication of source identity. "Ready now" in the table refers to source audio, not public transcripts.

## Transcript verification

The older Cursor JSON was not trusted as authority because its extracted text contains PDF-layout and word-join errors. The original file `resources/original/transcripts/Momente_AB_A1_1_Transskriptionen_2.pdf` was rendered and visually checked:

- page 1: tracks 1_01 through 1_12;
- page 2: tracks 1_13 through 1_15.

Names, umlauts, `ß`, spelling hyphens, phone-number grouping, ellipses, and the rise/fall arrows in AB 9 were transcribed from the rendered pages. No guessed correction was introduced.

## Accessibility integration rule

The existing player exposes track labels, playback-rate controls, pitch preservation, repeat, and single-player behavior. Its code intentionally omits captions because transcripts reveal listening answers. That is not a complete accessibility resolution.

After transcript-publication rights are explicitly recorded, use the verified transcript JSON as a text alternative with an explicit learner control. For answer-bearing AB 3 and AB 6 tasks, reveal it after an attempt or immediately through an accessibility path that does not block disabled learners. AB 9 and AB 12 can expose the transcript directly because the text itself is the pronunciation/intonation model. Product and accessibility review must approve the final timing behavior.

## Blockers

1. Public redistribution approval for transcript text is not separately recorded; the transcript JSON must remain internal.
2. The web component does not yet consume the transcript projection.
3. Transcript reveal timing for answer-bearing listening exercises is not yet encoded in product state.
4. Generated TTS has no existing two-human QA evidence; technical validation alone cannot unblock it.

## Evidence

- `media/manifests/workbook-audio-rights-projections.json`: rights scope, hashes, durations, public paths, route projections.
- `media/qa/rapid-audio-deployment-audit.json`: codec/hash checks and explicit pending human gate.
- `platform/apps/web/lib/audio/workbook-audio.ts`: current activity-to-track integration.
- `platform/apps/web/components/audio/WorkbookAudioPanel.tsx`: current playback and caption behavior.
- authoritative transcript PDF cited above: exact transcript text.
