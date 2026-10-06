# Lingovo teaching audit and correction checklist

Audited 2026-10-05 against the authorized public preview and recovered source,
then reviewed again against the corrected implementation and supplied browser
evidence. The public observations below describe the preview before correction.
The initial public audit was read-only; cross-tab language/progress changes were
excluded as audit interference. Subsequent local automated checks exercised
answers, persistence, retries and microphone playback. This report does not
assert deployment, full curriculum coverage, CEFR attainment or market fit.

## Release checklist

| Priority | Evidence from the preview | Required correction and acceptance criterion | State |
| --- | --- | --- | --- |
| P0 | `/lessons/01/` lists six communicative outcomes, but `questionsForCheckpoint()` generated five greeting questions. | Use an authored checkpoint covering greeting context, name/register, contextual verb form, origin, wellbeing, and an honest spelling check. Each outcome must have a matching task. | Implemented. Source review and content-plan tests verify six distinct tasks; spelling remains a checked task without an invented mastery target. |
| P0 | The checkpoint's “Goodbye” question exposed **Auf Wiedersehen** above the options through its pronunciation control. Typed recall did the same. | Hide answer labels before submission; record revealed models as help. Accessible labels must not leak answers. | Implemented. Retrieval behavior test passes; recognition audio remains available only where the German stimulus is already shown. Corrective models and opened support count as help. |
| P0 | `guided-intro-recording` presented four word-order questions and no recording/reflection task. | Provide a real oral attempt/reflection path, clearly marked as self-review, with no pronunciation or proficiency score. | Implemented. Root's integrated browser check uses synthetic microphone input, creates a recording player with a blob URL, and completes self-review without a score; the behavior test requires the reflection steps. Physical microphone and decoded playback testing are not claimed. A1 clips are explicitly page-local. |
| P0 | `/prepare/c1/practice/?lesson=listening-details` said the audio was unavailable. | Connect matching verified audio or call the activity transcript preparation and exclude it from listening evidence. | Implemented. Source and C1 tests distinguish transcript practice from listening; a separate verified original-audio task is linked. See `c1-audit.md` for exact source and media verification. |
| P1 | `PERSISTED_OWNER_BY_ACTIVITY` and `CURRENT_EVENT_OWNERS` admitted only four representative Lesson 2 pairs. Lesson 1 answers produced no persistent objective evidence. | Persist the assessed published concept for each actual activity question. A wrong first-lesson answer must survive reload and become reviewable. Reject unrelated and invented concept/activity pairs. | Implemented and verified through the real activity emitter. Persistence/contract tests and the integrated wrong-answer/reload path pass. The remaining four-pair table affects ordering only, not evidence ownership. |
| P1 | `/review` could only run seven fixed Lesson 2 template cards; it had no usable first-lesson error queue. | Derive retries from real wrong/partial attempts and link to the originating activity. A hinted correction remains due for an unaided retry. Never manufacture generic template cards or mastery. | Implemented and verified. Integrated browser checks cover source retry, reload, unaided clearance and no whole-activity completion from a targeted retry; state tests cover hinted corrections and legacy data. |
| P1 | A1 wrong-answer feedback was the same generic retry message for every item. | Explain the actual distinction and offer a targeted retry in the selected interface language. | Implemented. `a1-wrong-feedback.png` shows the actual contrast between **Auf Wiedersehen** and **Guten Abend**. English and German behavior tests verify corrective content and retained review. This is bounded answer feedback, not free-form language assessment. |
| P1 | `heissen-sein-notice` reused an **arbeiten/sein** illustration and regular-ending infographic while asking only for the infinitive “to be called”. | Teach the name constructions and appropriate person/register with relevant examples; accept both **Ich heiße Anna** and **Ich bin Anna** where applicable. Remove unrelated/repeated decoration. | Implemented and source/content-test verified: the explanation accepts both introductions and tasks practise **heiße**, **heißen**, **bin** and **heißt** in context. The unrelated illustration is absent from this activity view. |
| P1 | C1 `writing-position` asked for 100–150 words but supplied a 61-word model. | The model must meet its own practice brief and demonstrate a developed reason, concrete example, counterargument and conclusion. Retain the distinction from official exam requirements. | Implemented. Source review confirms the 120-word model's developed argument; the C1 word-count test enforces 100–150. The brief explicitly calls this a practice target. |
| P1 | The homepage's level-finding action led to a catalogue with A1 and C1; A2/B1/B2 were planned. | Label course selection honestly, show available scope, and state advanced-course entry assumptions. Do not imply a placement result or continuous curriculum. | Implemented and source verified in all four entry-copy variants: course choice is not placement, C1 assumes comfortable work with B2 texts, and A2/B1/B2 are unavailable. |
| P1 | Home/catalogue exposed HY/RU; A1 exposed HY/RU/EN; C1 had a disabled inner selector while advertising four languages. English implementation labels remained in Armenian/Russian instruction. | One working HY/RU/EN/DE interface control. Keep the German learning stimulus separate from interface prose; localize explanations, prompts, outcomes and feedback. | Shared selector implemented. Supplied responsive evidence records one selector for all four locales; inspected mobile A1/C1 screenshots show the shared shell. Translation completeness is tracked by the language audit, not inferred from English screenshots. |
| P1 | Final source review found that German-mode generic cues translated **Goodbye** to the displayed answer **Auf Wiedersehen**; generic typed cues could reveal their answer too. | Use German definitions in practice prompts, choices and feedback. Never award unaided evidence for copying an exposed answer. | Implemented and verified by nine new tests: 55 published L1/L2 gloss definitions, contextual Q&A cues, real recognition/recall evidence, corrective feedback and assisted fallbacks. Ordinary dictionary translations and German stimuli remain intact. |
| P1 | Later word-card review found the same German-title answer leak and unqualified success feedback after revealing a model. | Hide the answer-bearing title, give a semantic cue or request the just-studied form, and identify success after help. | Implemented and source/test verified in `WordFamilyCard.tsx` and `word-family-cards-ui.test.ts`: revealed answers produce “Correct after help”, not “You remembered it”. This card interaction does not claim pronunciation or proficiency scoring. |
| P1 | The 100 card split the letters **und** inside **hundert** and rejected a standard answer; occupation and boarding glosses were truncated. | Treat 100 as a whole, accept **hundert** and **einhundert**, and retain complete occupation/boarding meanings in every projection. | Implemented. N100 has one prompt accepting both forms. Rechecked generated dictionary W238: **road construction worker / I am a road construction worker.**; `l10-einsteigen`: **to get on / get in**. Word-card regression tests and the regenerated dictionary agree. |

## Implemented evidence and review correction

- `platform/apps/web/lib/learner-state/activity-evidence.ts` resolves a question's
  target only when both entities are published and the activity actually teaches
  that target. Existing projected relationships are the source of truth. The
  Lesson 1 checkpoint additionally admits the existing published wellbeing Q&A
  concepts because wellbeing is an explicit lesson outcome.
- `events.ts` uses the same resolver at the persistence boundary. Legacy game and
  conversation mappings retain their stricter renderer checks and remain valid.
- `buildActivityReviewQueue()` in `review.ts` reads the existing event log. It
  groups by originating activity, concept and task family, retaining incorrect
  and partial responses. A correct response after help does not clear a pending
  retry. A later unaided correct response clears that pending item while keeping
  the complete attempt history.
- `/review` now presents these real lesson retries before the existing guided
  card mechanism. Links use the generated activity route, `reviewTarget` and
  `reviewFamily` query parameters, and the practice anchor. The beginner renderer
  restricts the retry to matching questions without completing the whole activity.
  Links do not claim an exact historical question ID that the v1 event schema did
  not store. Saved vocabulary remains a separate route.
- The persistent v1 envelope, content-bundle identity, legacy seven templates and
  their card IDs are unchanged. No migration or reset is needed. Completion,
  exposure, self-review and objective mastery evidence remain different records.
- `german-study-glosses.ts` supplies 55 scoped German definitions and 14 Q&A
  purposes. For example, **Auf Wiedersehen** is matched to **höflicher Gruß beim
  Abschied**, while a formal-name builder asks the learner to ask someone's name
  using **Sie**. Gendered person nouns receive the required masculine/feminine
  form cue. These definitions are used only in practice, not as replacements for
  ordinary German dictionary translations.
- The activity emitter detects a correct matching label identical to its German
  stimulus, or a complete recall answer present in its cue. Such attempts are
  marked assisted. This protects newly introduced or missing definitions from
  producing unaided evidence. Existing historical events are preserved.

## Verification

Run from `platform/`:

```sh
npx vitest run --config vitest.config.ts tests/web/german-activity-cues.test.ts tests/web/activity-content-behavior.test.ts tests/web/lesson-activity-evidence.test.ts
npm run typecheck:web-tests
```

The final focused run passed **26 tests across three files**, including all nine
German-cue tests and a cross-component contract check that every non-null target
in each published practice plan is accepted by the persistence resolver.
`typecheck:web-tests` passed. Focused ESLint over `ActivityInteraction.tsx` and
`german-study-glosses.ts` passed with zero warnings. The earlier state/review
verification passed 20 tests across its three files; this is separate from the
final focused run, not an additional full-suite count. The earlier duplicate-key
warning is absent from the final web-test log reported by root. Subsequently,
root's `/tmp/lingovo-final-tests.log` records **1,063 passing platform tests across
103 files**; the separately invoked C1 package log records **17 passing tests**.
These whole-suite counts include, rather than add to, the applicable focused
checks above. Production build and deployment outcomes belong to the root
release record and are not inferred from unit-test success.

The tests exercise:

- a first-lesson incorrect answer saved, reloaded and visible with its original
  activity retry link;
- failure evidence producing zero successful/strong evidence and no fake review
  card or pronunciation assessment;
- hinted corrections remaining queued, unrelated practice not clearing the
  source mistake, and unaided source retries clearing only pending review;
- completion without attempts producing no mastery evidence;
- existing review-card IDs, stored state and guided-review UI remaining usable;
- rejection of unrelated or invented concept/activity relationships;
- German recognition of a real definition, name/origin/profession builder
  purposes, typed recall without an exposed model, and assisted fallback when a
  new cue repeats the answer.

## Final rendered and browser review

Inspected the four supplied images in `lingovo-audit-evidence/`:

- `a1-wrong-feedback.png`: one German phrase, one response, a specific correction,
  a contrast with the mistaken choice, and an attempt-saved notice. Audio belongs
  to the already-visible recognition stimulus.
- `a1-complete.png`: activity completion offers Next activity, Return to lesson
  and Review this activity. It does not label task completion as proficiency.
- `mobile--lessons-01.png`: the beginner sees one approximately five-minute next
  action, activity completion progress, and a disclosed lesson outline. The
  twelve activities are not presented as twelve simultaneous primary choices.
- `mobile--prepare-c1.png`: one next source-book task comes first. The screen says
  supported practice, self-review and no exam scoring; skill tools follow it.

Root's `a1-functional.json` records **14 passing integrated browser checks** and
no uncaught browser errors: start focus; authored answer; useful wrong feedback;
real review entry; persistence on reload; source-task retry; targeted retry
completion; unaided clearance; no whole-activity completion from review; complete
task next action; completion on reload; recording/player creation; honest
speaking self-review; and no uncaught errors. The recording harness uses
Chromium's synthetic media device and asserts that the audio element has a
`blob:` source; it does not establish physical microphone compatibility or
successful decoding/playback. These checks precede the German-cue patch;
the new patch is covered by the focused behavior tests above. A final built-page
German-language walkthrough belongs to root's release verification.

The final documentation check also reviewed the later bounded localization
changes. Generated travel/past/journey examples distinguish **du**, **ihr** and
**Sie** in their lookup keys; runtime samples retained the matching German forms.
Russian case and past-tense agreement and Armenian participles/questions were
reviewed for those arrays. **abholen** was corrected from merely meeting someone
to picking them up in both languages. The runtime glossary translations were
checked against original examples where English concealed register or meaning.
The stale occupation/boarding dictionary entries observed before production
regeneration were then rechecked and are corrected in the current artifact.

No additional blocking pedagogical inconsistency was found in this bounded
review after the German-cue correction. This conclusion covers the inspected
flows and test cases, not every lesson or every learner response. The remaining
limits are explicit: A1 recording is page-local and self-assessed; C1 source work
is supported self-study; short models and completed tasks do not establish CEFR
proficiency or exam readiness; A2/B1/B2 are not a continuous bridge yet. Market
fit requires observed use by real learners and is not established by this audit.

## Pedagogical boundaries and official references

Goethe's A1 descriptor covers simple everyday interaction, self-introduction and
personal questions. That supports assessing communicative outcomes, rather than
using five vocabulary-recognition items as evidence for all six lesson goals.

- [Goethe-Zertifikat A1](https://www.goethe.de/ins/de/de/prf/prf/gzsd1.html)

Digital TestDaF distinguishes an argumentative text of at least 200 words from a
text-and-graphic summary of about 100–150 words. A shorter argument exercise can
be useful scaffolding if it is explicitly identified as practice. TestDaF's
preparation page addresses learners already at B2/C1.

- [Digital TestDaF structure](https://www.testdaf.de/de/teilnehmende/der-digitale-testdaf/aufbau-des-digitalen-testdaf/)
- [Official preparation guidance](https://www.testdaf.de/de/teilnehmende/der-digitale-testdaf/vorbereitung-auf-den-digitalen-testdaf/)

The CEFR's C1 descriptor includes demanding texts, implicit meaning and extended,
structured production. Short demo completion alone is not evidence of that
proficiency. Preserve the C1 workspace's existing honest distinctions: demo
material, practice timings, self-review, and progress that is not an exam score.

- [Council of Europe global scale](https://www.coe.int/en/web/common-european-framework-reference-languages/table-1-%20cefr-3.3-common-reference-levels-global-scale)
