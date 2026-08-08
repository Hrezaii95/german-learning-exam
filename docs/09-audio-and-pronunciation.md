# Audio and Pronunciation Specification

Pronunciation quality is the highest-risk product feature. If the audio is slow, robotic, inaccurate, inconsistent or delayed, the platform fails its central learning purpose.

## Audio authority hierarchy

1. Correctly aligned publisher/source audio for its original listening exercise.
2. Reviewed, pre-generated de-DE neural voice for isolated forms and new model sentences.
3. Reviewed local human recording if later supplied.
4. Browser speech synthesis only as a visibly labeled emergency fallback; never as canonical pronunciation.

Source audio is best for natural dialogue/listening. Generated audio is necessary for complete, consistent coverage of isolated lexemes, inflections, teacher extras and new examples.

### Publisher rights gate

Alignment evidence is not redistribution permission. Publisher MP3s and transcripts remain in the private source lane until `redistributionBasis` records an approved use basis. When that field is empty, public builds may ship mapping metadata and generated model pronunciation only; they MUST NOT copy publisher audio into `public/`, a CDN or any deployable bundle.

## Current prototype voice

The approved sample uses pre-generated MP3 files from Microsoft Edge’s `de-DE-KatjaNeural` voice through `edge-tts`, at approximately +4% speaking rate. Every current asset uses that one recorded voice/profile; any future voice change requires a new version and listening review.

Current technical evidence is generated with `node tools/audit-alpha-tts.mjs` and stored at `media/qa/alpha-tts-technical-audit.json`. It independently checks the manifest/file set, hashes, byte sizes, codec, sample rate, channels, duration bounds and review-priority tags. A technical pass is not pronunciation approval: all clips remain candidates until a qualified German listening pass records accuracy, stress, naturalness and pedagogical suitability.

This is free/no-key for prototyping today, but `edge-tts` is an unofficial client and is not a production service contract. The production migration target is official Azure Speech with server-side generation and caching. Azure currently documents de-DE neural voice support and a free F0 neural TTS allowance; pricing and availability must be rechecked before migration.

## Generation contract

Input manifest row:

```yaml
id: aud:tts:lex:koechin:v1
text: "die Köchin"
locale: de-DE
voice: de-DE-KatjaNeural
rate: "+4%"
pitch: "+0Hz"
purpose: lexeme
conceptIds: [lex:koechin]
```

Pipeline:

1. normalize Unicode and punctuation without changing German text;
2. generate lossless/intermediate audio when available;
3. trim excessive leading/trailing silence conservatively;
4. normalize loudness consistently (target documented globally, no clipping);
5. encode web master (MP3 or Opus with compatible fallback);
6. calculate duration and SHA-256;
7. listen at normal and study speed;
8. verify spoken text, stress, endings, umlauts, names and sentence prosody;
9. approve or regenerate;
10. write media manifest.

Manifest inputs, IDs, filenames and audits are deterministic. Because `edge-tts` calls an unofficial remote service, regenerated audio bytes and prosody are not assumed reproducible; existing approved files are retained by checksum. Changing voice/rate creates a new asset version and review queue.

## What gets generated for Lessons 1–2

- canonical vocabulary display forms, including article where pedagogically relevant;
- each profession masculine/feminine singular and plural form;
- each taught verb infinitive and six present forms where the lesson teaches the full paradigm;
- all core phrases and Q&A questions/answer models in casual and formal register;
- representative example sentences;
- alphabet letters/special characters where source audio cannot be licensed/aligned;
- infographic Play All sequences only by composing individual approved clips or a separately reviewed natural sequence.

Avoid generating every mechanically possible sentence. Generate canonical models; use slot composition only where prosody remains acceptable.

## Pronunciation metadata

Every lexical target should support:

- IPA (reviewed; not blindly generated);
- syllable segmentation;
- lexical stress and sentence-focus notes;
- relevant A1 sound targets (`ch`, `r`, umlauts, diphthongs, final devoicing, etc.);
- common learner pitfall;
- normal master audio;
- study-speed policy;
- example audio;
- source/native dialogue appearances.

IPA is a support layer, not the primary beginner interface. The visual first shows syllables and stress; IPA is available in Details.

## Player behavior

- user gesture starts playback with minimal latency;
- prefetch audio for the current activity and likely next activity;
- only one pedagogical clip plays at a time;
- normal speed is 1.0; study speed defaults to 0.8 with pitch preservation;
- repeat restarts immediately;
- UI exposes playing/loading/error states;
- navigation pauses players;
- offline cache distinguishes downloaded/cached/unavailable;
- volume is not normalized by surprising per-clip UI changes.

“Quick” means the asset is local/cached and playback begins promptly; it does not mean unnaturally rushing the spoken German.

## Listening progression

1. sound/contrast (only when relevant);
2. isolated word/form;
3. short phrase;
4. sentence with connected speech;
5. staged dialogue;
6. verified publisher workbook exercise.

Tasks include select, discriminate, order, gap-fill, type and answer. Transcript is initially hidden for listening evidence, optionally revealed after an attempt, then linked word-by-word for study.

## Recording

- request microphone only after an explicit action;
- show recording state and elapsed time;
- stop tracks on stop, error, route change and unmount—including permission-resolution races;
- let learner replay and retry;
- keep recordings local by default and discardable;
- never imply scoring when only recording/playback exists.

## Future pronunciation assessment gate

Azure Speech currently documents German (`de-DE`) pronunciation assessment and word/syllable/phoneme-level outputs including accuracy, fluency, completeness and optional prosody. That capability is a candidate, not automatic authority.

Before enabling scores:

1. create a German A1 benchmark set with correct and deliberately varied learner recordings;
2. define which scores are trustworthy for isolated words vs sentences vs open speech;
3. compare provider output with human German-teacher ratings;
4. set confidence/uncertainty and retry behavior;
5. document cost, privacy, retention and offline failure;
6. prevent a single attempt from blocking progress;
7. show actionable segment feedback, not a mysterious number.

## Audio QA gate

An asset fails if it has wrong text/form, mis-stress, clipped phonemes, long delay/silence, unnatural rate, inconsistent loudness, audible generation artifact, wrong locale/voice metadata, missing checksum or broken concept link.
