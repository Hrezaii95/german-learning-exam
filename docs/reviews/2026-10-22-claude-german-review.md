# German content review by Claude (2026-10-22)

Requested by the owner, who is at about the middle of A1.1. This is a careful model review, **not** a qualified human German review: nothing here changes a review status to `reviewed`, and generated audio remains preview audio (gate G5).

## Scope
| Content | How it was reviewed |
|---|---|
| A2 pack `de-a2-everyday` (40 items: lexemes, sentences, text, dialogue, grammar, drills, prompts, exam) | Every item read in full |
| A1 pack `de-a1-momente`, Lessons 1–3 (≈ 725 items, the learner's current range) | Every lemma, meaning, example and translation read |
| A1 pack, all 1,330 items | Automated checks: article ↔ gender ↔ colour tone, noun capitalisation, plural form ↔ plural pattern (`e`, `en/n`, `s`, unchanged, umlaut, `innen`, irregular) |

## Result
- **Articles, genders and plurals:** no errors found. All 1,330 plural forms match their pattern; plural-only nouns (Eltern, Geschwister, USA, Niederlande, …) are correctly marked.
- **A2 pack:** the German is correct and natural. Three polish edits applied (below).
- **A1 Lessons 1–3:** the German is correct. Four wrong English example translations fixed at the source (below); several issues that need new audio are listed for follow-up.

## Fixed in this integration
| Where | Before | After |
|---|---|---|
| A2 drill `a2-drill-gap` | Wir ____ morgen *an dem* Ausflug teil. | Wir ____ morgen *am* Ausflug teil. |
| A2 `verschieben` / sentence | Can we postpone the get-together until Monday? | Can we move the get-together to Monday? |
| A2 `sich freuen` meaning | to look forward to | to be glad; *sich freuen auf*: to look forward to |
| A1 Straßenarbeiter example (EN) | I am a road. | I am a road worker. |
| A1 Student example (EN) | I am an university student. | I am a university student. |
| A1 Deutschlehrer example (EN) | I am a german teacher. | I am a German teacher. |
| A1 IT-Trainer example (EN) | I am an it trainer. | I am an IT trainer. |

The A1 fixes are in the generator (`apps/web/scripts/project-word-cards.ts`), so the cards, dictionary and A1 pack all carry them.

## Follow-up (needs new TTS audio, so it goes to the audio lane)
| Item | Issue | Suggested German |
|---|---|---|
| `gar nicht` (W177) | *Ich spreche gar nicht Französisch.* is marked/unidiomatic | *Ich spreche gar kein Französisch.* — or, to keep the headword, *Das verstehe ich gar nicht.* |
| `nach` (W506) | *Nach dem Kurs lerne ich Deutsch.* is odd (the course *is* German) | *Nach dem Kurs gehe ich nach Hause.* |
| `Taxi` | plural shown as *Taxen* first | lead with *Taxis* (both are correct) |

## English-only polish (no audio impact; Lane 1 source data)
- `überall`: "anywhere / everywhere" → "everywhere".
- `in`: "to / into (a destination here)" while the example is a location (*Ich wohne in Berlin*) → "in; into (with a destination)".
- Duplicated glosses produced by joining source rows: `hören`, `suchen`, `finden`, `gehen`, `können`, `also`, `würfeln` (e.g. "to listen / hear / to hear / listen to").
- Professions: some meanings are Title Case ("Electrician (male)") while others are lower case.

## Not yet reviewed line by line
A1 Lessons 4–12 (≈ 600 items) passed the automated checks only. The L1-G2 book page references (`book-refs.draft.json`) are a source-mapping task, not a German-language one; they stay owner-review items.
