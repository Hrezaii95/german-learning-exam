# Momente A1.1 - Transcripts index

**Source:** `Momente_AB_A1_1_Transskriptionen_2.pdf` (19 pages, pymupdf extract)
**Machine map:** `content/extracted/transcripts.json`
**Raw text:** `content/extracted/_pdf_raw/transskriptionen_full.txt`

## Summary

| Metric | Count |
|--------|------:|
| Transcript entries (CD track clips) | 117 |
| Linked to DE MP3 (`audio-map.json`) | 110 |
| Unlinked | 7 |

## How entries map to audio

Each PDF block starts with a **track id** like `1_07` - the same token used in
German MP3 filenames (`1_07_AB_Momente_A11_2_6a.mp3`). Primary join key:
`track_id` -> `audio.file` / `audio.url_hint`.

Secondary metadata from PDF headers:

- `Lektion N, Uebung X` - standard workbook listening
- `Wiederholung L1-3, Uebung ...` - review module
- `Test L1-3, Uebung ...` - module test
- `Fokus Beruf L1-3, Uebung ...` - Beruf focus audio

Within a clip, optional **subparts** (`a`-`e`) appear in `lines[].subpart`.
Speaker turns use `lines[]` with `{ speaker, text }`; undelimited content stays in `raw_text`.

## Serve path

Use `audio.url_hint` from each entry, e.g.
`/static/audio/Audio/Momente_A1_1_AB_CD1/1_01_AB_Momente_A11_1_3.mp3`.

## Per-lesson coverage

| Lektion | Entries | Audio linked |
|---------|--------:|-------------:|
| 1 | 6 | 6 |
| 2 | 9 | 9 |
| 3 | 3 | 3 |
| 4 | 9 | 9 |
| 5 | 4 | 4 |
| 6 | 3 | 3 |
| 7 | 2 | 2 |
| 8 | 10 | 9 |
| 9 | 6 | 6 |
| 10 | 8 | 8 |
| 11 | 6 | 6 |
| 12 | 3 | 3 |

## Unlinked entries

- `1_2` lesson=None exercise=None
- `1_2` lesson=None exercise=None
- `1_2` lesson=None exercise=None
- `2_4` lesson=8 exercise=14
- `2_5` lesson=None exercise=None
- `2_2` lesson=None exercise=None
- `2_3` lesson=None exercise=None
