# Momente A1.1 — Audio index (Alpha)

**Archive root:** `Audio-20260730T043413Z-1-001`  
**Machine map:** `content/extracted/audio-map.json`

## Folder layout (387 MP3)

| Folder | Count | Role |
|--------|------:|------|
| `Audio/Momente_A1_1_AB_CD1` | 62 | DE Arbeitsbuch CD1 (Lektion 1–6, Modul 1–2) |
| `Audio/Momente_A1_1_AB_CD2` | 56 | DE Arbeitsbuch CD2 (L7–12, exams) |
| `Audio/Momente_A1_1_KB_CD2` | 31 | DE Kursbuch CD2 only (L7–L12; no KB CD1 in this zip) |
| `Audio/Momente_A11_AB_CZ_Audios_CD1–4` | 197 | Czech-localized AB |
| `Audio/Momente_A11_AB_SK_Audios_CD2` | 41 | Slovak-localized AB |

## Filename scheme

- **AB (DE):** `{disc}_{track}_AB_Momente_A11_{Lektion}_{Übung}.mp3` — e.g. `1_01_AB_Momente_A11_1_3` = Lektion 1, Übung 3.
- **KB (DE):** `{disc}_{track}_KB_Momente_A11_L{n}_{ref}.mp3` — explicit `L` prefix for Kursbuch.
- **AB (CZ/SK):** `Momente_A11_AB_L{n}_…-{CZ|SK}.mp3`.

## Alpha priority (`priority_for_alpha`)

German AB on `Momente_A1_1_AB_CD1`: Lektion **1** (tracks 01–06, incl. Üb. 3 greetings + 9a/b) and Lektion **2** (07–15, dialogue 6a/b). Plus **Fokus Beruf Modul 1** on same disc.

## Static serve hint

Use `url_hint` from JSON: prefix with your static host, e.g. `/static/audio/Audio/Momente_A1_1_AB_CD1/1_01_….mp3` if the archive root is mounted at `static/audio/`.
