# Vocabulary media backlog — images and TTS

Generated 2026-08-20 by joining three files already on disk:
`generated/learner-details.json` (69 vocabulary lexemes) × `lib/content/illustrations.ts`
(illustration map) × `public/audio/tts-de-de-v1/manifest.json` (TTS manifest).
Machine-readable: `media-backlog.json`. Regenerate any time — it is a pure join,
not a survey.

## Headline

| | count |
|---|---|
| vocabulary lexemes | 69 |
| have an illustration | 26 |
| **need an illustration** | **43** |
| have TTS | 69 |
| **need TTS** | **0** |

**The TTS backlog is empty.** Every one of the 69 has audio. So there is nothing
to *generate* for coverage — the open question is *quality and provider*, which is
a re-generation decision, not a gap.

## Provider status — read this before planning either pipeline

- **Images by GPT: available now.** Codex's native `image_gen__imagegen` is what
  produced the 12 accepted profession illustrations. This is already GPT image
  generation, not a third-party API.
- **TTS by GPT: blocked.** Codex checked this environment and found **no
  `OPENAI_API_KEY`**, so the OpenAI Audio Speech API cannot be called. `edge-tts`,
  ffmpeg and ffprobe are installed; no native speech tool is exposed to Codex.
  The current 110 published clips are Microsoft `de-DE-KatjaNeural` via edge-tts.
  To switch to GPT TTS, an `OPENAI_API_KEY` with Audio Speech access has to exist
  in the environment Codex runs in. Set it there directly — never paste a key into
  a chat.

## Image batches — 43 items, grouped for style coherence

Batches are the unit of work: one generation run per batch holds a single visual
treatment, which is what stops the hub grid becoming a patchwork.

| batch | n | items |
|---|---|---|
| countries | 8 | Deutschland, Eritrea, Frankreich, Österreich, Schweiz, Spanien, Türkei, USA |
| greetings | 7 | Hallo, Guten Morgen, Guten Tag, Guten Abend, Gute Nacht, Auf Wiedersehen, Tschüs |
| wellbeing | 6 | Super!, Auch super., Sehr gut danke., Gut danke., Es geht., Nicht so gut. |
| work | 7 | Beruf, Job, Stelle, Firma, Ausbildung, Praktikum, Studium |
| profile | 8 | Name, Vorname, Familienname, Alter, Jahr, Kind, Herkunft, Wohnort |
| status | 5 | verheiratet, geschieden, Single, allein, Familienstand |
| people | 2 | Herr, Frau |

## Recommendation: generate ~28, not 43

Not every word earns a picture. The meaning plate is the **permanent** designed
state for items without one (per the chosen direction contract), not a placeholder
to be eliminated — so illustrating an abstract term adds noise rather than meaning.

**Generate (high recognition value, concretely depictable) — 28:**
countries (8), greetings (7 — daypart scenes carry real meaning for these),
wellbeing (6 — gesture/expression states), work (7 — workplace scenes).

**Leave as meaning plates — 15:** `Name`, `Vorname`, `Familienname`, `Alter`,
`Herkunft`, `Familienstand`, `Wohnort`, `Jahr`, `verheiratet`, `geschieden`,
`Single`, `allein`, `Kind`, `Herr`, `Frau`. These are grammatical/administrative
concepts or social categories; a literal illustration would either be arbitrary or
would encode a stereotype (marital status and `Herr`/`Frau` especially — depicting
a person for those risks teaching the picture instead of the word).

Ordering by learner value: **greetings → wellbeing → countries → work.** The first
two appear in Lesson 1 and are the app's most-visited detail pages.

## Constraints any image batch must hold

Carried from the accepted profession batch, which passed review:

- No text, letters or numbers baked into any image — German lives in HTML.
- Gender-neutral depiction where a word has masculine/feminine forms; gender is
  carried by badge, article and label, never by the picture.
- Original artwork; must not imitate the Momente coursebook illustrations.
- Must crop safely to both 1:1 (hub card) and 4:3 (detail page).
- Quiet backgrounds, one consistent treatment per batch and across batches.
- Never ship the raw render: derivatives at 240/480/512/1024 in AVIF/WebP/JPEG,
  ~12–18 KB served. The 12 profession sources were ~2 MB each; served, they are
  12–18 KB.
