# Owner actions — the only things blocking Alpha completion

Written 2026-08-20 by Claude Code ORCH. Every item here needs a person; none can
be closed by an agent. Each states exactly what to do and what it unblocks.

## 1. Provide an OpenAI credential to the Codex environment

**Unblocks:** 45 missing plural pronunciation clips, and the GPT-vs-edge-tts
voice comparison you asked for.

Codex checked this machine on 2026-08-20: `edge-tts 7.2.7`, the OpenAI CLI,
ffmpeg and ffprobe are installed, but **no `OPENAI_API_KEY` is present**, so the
Audio Speech API cannot be called. 0 of 12 comparison samples were generated.

Set `OPENAI_API_KEY` (with Audio Speech access) in the environment Codex runs in
— **directly in that environment, never pasted into a chat**. Then the job is one
run: the exact text list is already prepared at
`research/tts-plural-job-spec.json` (45 clips, each speaking `die <plural>`,
because the German nominative plural takes *die* regardless of singular gender).

Nothing was generated in edge-tts as a substitute. You asked for GPT voices, and
quietly shipping 45 clips in a voice you had rejected would have been a
substitution dressed up as progress.

## 2. Perform the German listening review

**Unblocks:** gate G5, and with it register rows P5-01, P5-03 and eventually
P6-04.

Go to **https://hrezaii95.github.io/german-learning-exam/review-audio/** — all
110 published clips on one page, with the exact spoken text, a player, and
filters for the phonetic classes most likely to be wrong (`connected-speech` 81,
`r-sound` 72, `profession-form` 26, `ich/ach` 22, umlaut 17, feminine `-in` 15,
final-obstruent 14).

Mark Approve / Needs re-record / Reject, add notes, then **Export**. The file
binds each verdict to that clip's sha256, so an approval cannot silently carry
over to regenerated audio. Hand me that file and I will encode the verdicts.

The same gate now also covers the **63 app-authored example sentences** (see
item 4). Three were self-flagged as stilted — `Mein Alter ist 30 Jahre.`,
`Mein Familienstand ist verheiratet.`, `Meine Herkunft ist Eritrea.` — each
idiomatic-but-noun-free alternative is noted in the record.

Scope note: 110 clips are published to the app; the canonical manifest holds 354.
Reviewing these 110 reviews what a learner actually hears.

## 3. Rule on ADR-013 — the derived `verb:leben` gloss

`docs/DECISIONS.md` ADR-013. The glossary has no standalone `leben` headword; the
English "to live" was derived from its p.3 entries *zusammen|leben — to live
together* and *Lebt ihr zusammen? — Do you live together?*. The German side
(infinitive and full paradigm) is coursebook-sourced and unaffected.

**Accept** and it stays published (Lesson 2 shows ten verbs). **Reject** and it
reverts to review-blocked — a one-line change to the gloss table plus a rebuild,
leaving nine.

## 4. Decide whether the app may author German

63 of the example sentences were written by GPT at your instruction, not taken
from a source. They are stored with an `app-authored` origin that is
*structurally unable* to carry a source citation, and each says on the page:
"We wrote this sentence for the app. A German speaker still needs to check it."
The 6 glossary-quoted ones cite their page instead.

If you want authored German out of the product, say so and I will remove all 63;
the 6 sourced ones remain. If you want it kept, it still needs item 2's review.

## 5. Two classification questions the sources cannot settle

- **`Und Ihnen?`** is published **German-only**. The token *Ihnen* appears
  nowhere in the English glossary, while its informal twin *Und dir?* has a
  published gloss. Borrowing that gloss across would have been invention.
  Recorded as `gap:meaning-und-ihnen`. Do you want an English gloss added?
- **`Text`** is encoded as core because `docs/11` lists it, but the glossary
  prints *der Text, -e* in italics — its own marking for words outside the
  learning vocabulary. Recorded as `gap:classification-text`. Which authority
  wins?

Either answer becomes a decision row in `docs/DECISIONS.md`, in the ADR-013 mould.

## What is already done

83 lexemes across 119 detail routes; 69/69 vocabulary illustrations; 69/69 lemma
audio; 69 examples; 15 workbook listening tracks published under ADR-015/016 with
the `/references` credit that licenses them; offline-first verified live
in-browser; 7 WCAG defects fixed and guarded; 768 tests and 38 end-to-end
journeys green; seven scripted gates green.

Register rows P5-01, P5-03, P6-01 and P6-04 are deliberately left **pending** —
their gates are human, and an executing session must not ratify its own work.
