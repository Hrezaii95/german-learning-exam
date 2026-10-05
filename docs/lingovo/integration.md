# Lingovo combined preview

Armenian is the default interface, Russian is available in the shared selector. The editorial landing uses the delivered illustrations, an actual CSS 3D doorway, reversible scroll progress, and folding learning/C1 skill cards. The shared visual tokens are ivory, navy, cobalt and scarlet. Instructional gender/grammar colors retain their semantic meaning.

## Routes and behavior

| Route | Purpose |
| --- | --- |
| `/` | Lingovo landing and planned subscription disclosure |
| `/learn` | Level chooser: A1 and C1; other levels marked planned |
| `/dashboard` | Existing beginner dashboard and saved state |
| `/lessons/**` | Existing A1 lesson and activity IDs, including old deep links |
| `/prepare/c1` | C1/TestDaF learning workspace |
| `/prepare/c1/course` | Actual source course and exercises |
| `/prepare/c1/studio` | Original audio, source transcripts and practice tools |
| `/prepare/c1/review`, `/prepare/c1/notebook` | C1 review and personal notes |

A1 and C1 data models and local storage remain separate beneath a shared navigation and locale. There is no invented combined score. Moving domains requires export/import where available; keeping the same key does not transfer browser storage across origins. The subscription UI describes a future offer and collects no payments. OpenAI narration remains unconfigured; no alternate TTS provider is introduced.

## Validation

The initial combined build compiled and generated 1,611 static pages. Five existing localization tests passed. Desktop (1440 px) and phone (390 px) browser checks loaded the landing, C1 hub, C1 course and A1 lesson without horizontal overflow or JavaScript exceptions. The first visual review corrected C1 sidebar spacing and dark-card contrast. Export navigation and final Cloudflare preview are verified separately before handoff.

## Deployment

Cloudflare account and active `lingovo.am` zone access were verified. The preview uses `german-learning-armenia`; A1 MP3 media uses `german-learning-audio` so each Pages manifest stays below 20,000 entries. Original C1 recordings stay in the application asset set. Domain DNS is unchanged pending review of the combined preview.
