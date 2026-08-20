# OpenAI vs current Edge TTS comparison index

OpenAI generation status: **blocked — 0 of 12 generated**. Expected OpenAI filenames are shown for deterministic reruns; they do not exist yet. Edge matches use strict, case-sensitive `spokenText` equality against `platform/apps/web/public/audio/tts-de-de-v1/manifest.json`.

| # | Exact text | OpenAI comparison clip | Current Edge clip |
|---:|---|---|---|
| 1 | Ä Ö Ü ß | `media/generated/tts-comparison-openai-v1/sample-01-umlauts.mp3` — not generated | `platform/apps/web/public/audio/tts-de-de-v1/tts-9b5ae83759130817.mp3` |
| 2 | achtundachtzig | `media/generated/tts-comparison-openai-v1/sample-02-achtundachtzig.mp3` — not generated | `platform/apps/web/public/audio/tts-de-de-v1/tts-d4ab17bbe9dabe57.mp3` |
| 3 | Ich heiße Anna. | `media/generated/tts-comparison-openai-v1/sample-03-ich-heisse-anna.mp3` — not generated | No exact `spokenText` match |
| 4 | Wie heißen Sie? | `media/generated/tts-comparison-openai-v1/sample-04-wie-heissen-sie.mp3` — not generated | `platform/apps/web/public/audio/tts-de-de-v1/tts-e77cf338c3f6f281.mp3` |
| 5 | Ich komme aus Deutschland. | `media/generated/tts-comparison-openai-v1/sample-05-deutschland.mp3` — not generated | No exact `spokenText` match |
| 6 | der Architekt | `media/generated/tts-comparison-openai-v1/sample-06-architekt.mp3` — not generated | `platform/apps/web/public/audio/tts-de-de-v1/tts-62dc09ce76149784.mp3` |
| 7 | die Architektin | `media/generated/tts-comparison-openai-v1/sample-07-architektin.mp3` — not generated | `platform/apps/web/public/audio/tts-de-de-v1/tts-bab366a7e6e4166e.mp3` |
| 8 | der Arzt | `media/generated/tts-comparison-openai-v1/sample-08-arzt.mp3` — not generated | `platform/apps/web/public/audio/tts-de-de-v1/tts-2128ffb48d81a189.mp3` |
| 9 | die Ärztin | `media/generated/tts-comparison-openai-v1/sample-09-aerztin.mp3` — not generated | `platform/apps/web/public/audio/tts-de-de-v1/tts-74ee8a36e7b01cfb.mp3` |
| 10 | die Kfz-Mechatronikerin | `media/generated/tts-comparison-openai-v1/sample-10-kfz-mechatronikerin.mp3` — not generated | `platform/apps/web/public/audio/tts-de-de-v1/tts-7597a282753212ec.mp3` |
| 11 | Guten Morgen. Wie geht es Ihnen? | `media/generated/tts-comparison-openai-v1/sample-11-guten-morgen.mp3` — not generated | No exact `spokenText` match |
| 12 | Ich arbeite bei einer Firma in Österreich. | `media/generated/tts-comparison-openai-v1/sample-12-firma-oesterreich.mp3` — not generated | No exact `spokenText` match |

## Listening verdict

No valid A/B verdict is possible until the OpenAI side exists and both sets receive a qualified German listening review. Keep Edge as a clearly labelled preview only; do not promote either provider to approved pronunciation modelling on the basis of this blocked run.
