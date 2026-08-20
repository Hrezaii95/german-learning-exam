# TTS capability check

Checked: 2026-08-20 (Asia/Tehran)

## Result

OpenAI text-to-speech is **not reachable from this process**. No non-empty `OPENAI_*` or `AZURE_OPENAI_*` credential variable is present. A safe `openai api models.list` check exits with: `The api_key client option must be set either by passing api_key to the client or by setting the OPENAI_API_KEY environment variable`.

No native Codex audio/TTS generation tool is exposed in this session. Windows `System.Speech` is callable, but its installed voices are English-only (`Microsoft David`, `Microsoft Mark`, and `Microsoft Zira` variants), so it is not a usable German comparison provider.

Available local tools:

- OpenAI CLI / Python SDK: `openai 2.24.0` (installed, unauthenticated)
- Microsoft Edge TTS: `edge-tts 7.2.7`
- FFmpeg: `8.1.2-full_build`
- FFprobe: `8.1.2-full_build`

Outbound HTTPS access to the official OpenAI documentation is working, and the documented `/v1/audio/speech` path and `gpt-4o-mini-tts` model are visible there. That does not provide API authorization.

## What is needed for generation

The process running this task needs a securely supplied, non-empty `OPENAI_API_KEY` with OpenAI API billing/access that permits the Audio Speech endpoint, plus outbound HTTPS access to `api.openai.com`. Once those are present, the 12 MP3s can be rendered through `POST /v1/audio/speech`, then measured with the already-installed `ffprobe`. No key should be committed, written into this folder, pasted into a prompt, or printed in logs.

## Professional verdict

Ship neither provider as **approved A1 pronunciation modelling** today. The current Edge assets may remain explicitly labelled previews, but all 110 are still behind the listening-review gate, and no OpenAI samples were produced in this environment, so claiming either provider wins would be fabricated.

A qualified German listening pass should verify the vowel targets in `Ä/Ö/Ü` (especially rounded front vowels /øː/ and /yː/), `/ç/` in *ich* versus `/x/` in *acht*, clean final obstruent clusters in *Architekt* and *Arzt*, full unstressed `/ɪn/` in the feminine `-in` forms, letter-by-letter `K-f-z` realization and compound stress in *Kfz-Mechatronikerin*, and sentence-level focus, boundary tones, linking, and rhotic quality. The requested list does not actually contain a plural `-innen` token, so it cannot validate the `-innen` ending; add one before using this set as the final phonetic acceptance suite.
