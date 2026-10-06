# Lingovo: council audit and repair checklist

Audit started 5 October 2026. This report describes the changes from the previous
public preview, not a certification of language proficiency or market fit.

## Scope and council

Six GPT-6 Astra agents, each at maximum reasoning effort, reviewed from the
perspectives of a professional language teacher, an A1 beginner, a C1 learner,
a UI/UX designer, a product/market reviewer, and a localization specialist. Findings were checked
against the source and rendered application, assigned to an owner, implemented,
and tested together. The entry screens were rebuilt around actual learning
tasks; repeated legacy illustrations were removed from the primary journey.

The available product consists of A1 foundations and C1/advanced TestDaF
practice. A2, B1 and B2 courses are not currently available. German source texts
and examples stay in German when the interface language changes.

## Repair checklist

`Implemented` means source changes exist. `Verified` means the relevant automated
or browser check has passed. The final release evidence below records the full
integrated result.

| # | Priority | Problem found | Repair and acceptance criterion | State |
|---|---|---|---|---|
| 1 | P0 | English and German were excluded from parts of the app. | One HY/RU/EN/DE language selector across entry, A1 and C1; selection survives route changes and reload. | Implemented; browser route matrix verified |
| 2 | P0 | Competing language selectors and duplicated navigation made the two apps feel unrelated. | Shared brand, navigation, skip link and language control; scoped A1/C1 review destination. | Implemented; behavior tests verified |
| 3 | P0 | C1 history updates could strip `/prepare/c1` and lead to broken routes. | Centralized embedded navigation preserves base path, query, hash and host router state. | Implemented; C1 navigation tests verified |
| 4 | P0 | C1 book tasks displayed instructions without the original exercise material. | Show original source pages with the task; unavailable pages cannot produce false completion. | Implemented; C1 tests verified |
| 5 | P0 | C1 activities had duplicate answer fields and disconnected saved work. | One saved response per activity group, legacy draft recovery, notebook and daily-goal integration. | Implemented; C1 tests verified |
| 6 | P0 | First-lesson mistakes were not consistently saved or reviewable. | Persist legitimate activity/concept attempts, retain them after reload and link review to the originating task. | Implemented; evidence tests verified |
| 7 | P0 | Hinted corrections could look like independent success. | Preserve helped/unhelped distinctions; only an unaided correct retry clears the pending mistake. | Implemented; evidence tests verified |
| 8 | P0 | The first checkpoint tested greetings while claiming six outcomes. | Authored questions cover greeting context, register/name, verb form, origin, wellbeing and spelling. | Implemented; content tests verified |
| 9 | P0 | Pronunciation controls exposed answers during retrieval. | Retrieval tasks hide answer-bearing models; opening support counts as help. | Implemented; activity tests verified |
| 10 | P0 | A speaking activity was only a word-order exercise. | Actual optional microphone capture, playback and a speaking self-review task, without invented pronunciation scoring. | Verified: synthetic microphone capture, recording-player creation and self-review browser flow |
| 11 | P1 | Wrong answers received generic feedback. | Explain the question's actual distinction and offer a targeted retry in the chosen interface language. | Implemented; activity tests verified |
| 12 | P1 | The heißen/sein lesson reused unrelated arbeiten material. | Relevant personal-name/register examples and contextual questions replace the misleading presentation. | Implemented; content tests verified |
| 13 | P1 | Beginners saw a 65-minute plan, 12 activities and many destinations immediately. | Show one short next activity; keep the complete lesson outline and resources behind deliberate disclosure. | Implemented; rendered review verified |
| 14 | P1 | Start did not move the learner into the task; disabled completion controls added confusion. | Start focuses the exercise; completion follows actual task work and presents a next step. | Implemented; behavior tests verified |
| 15 | P1 | Dashboard illustrations and card grids buried the learning action. | Task-first continue/review dashboard with an optional text lesson list. | Implemented; dashboard tests and rendered review verified |
| 16 | P1 | Progress mixed completion, objective answers and self-ratings. | Display separate counts and avoid proficiency or exam-score claims. | Implemented; evidence/dashboard tests verified |
| 17 | P1 | Empty saved vocabulary showed zero-count filters and an unrelated lesson destination. | Useful empty state, current learning/review links, backup under Settings. | Verified: empty-state and rendered browser checks |
| 18 | P1 | C1 home overloaded learners with competing study tools. | A single next/resume recommendation; secondary tools remain accessible. | Implemented; rendered review verified |
| 19 | P1 | A C1 listening demo had no audio but counted as listening. | Label it transcript preparation, exclude it from listening evidence, and offer a clearly separate verified original-audio activity. | Implemented; C1 tests and asset hashes verified |
| 20 | P1 | A 100–150-word writing brief had a 61-word model. | A 120-word model demonstrates a reason, example, counterargument and conclusion. | Implemented; C1 test verified |
| 21 | P1 | C1 recordings disappeared on navigation. | Per-task IndexedDB recordings, navigation persistence and download fallback if storage fails. | Implemented; five synthetic-microphone browser checks verified |
| 22 | P1 | Source transcripts contained broken line-wrap hyphens. | Conservative display cleanup; original source text and checksums remain unchanged. | Implemented; C1 tests verified |
| 23 | P1 | English teaching prose remained inside other interface languages. | Translate static UI, conditional text, accessibility labels, dynamic templates and data-driven teaching prose. | Verified: 7,367 translated keys per HY/RU/DE locale; 19,097 runtime values covered |
| 24 | P1 | The catalogue implied placement and a continuous A1–C1 curriculum. | Honest two-track course choice, clear advanced-entry guidance and explicit available scope. | Implemented; four-language entry screens verified |
| 25 | P1 | Planned commercial features displaced the actual learning value. | Remove speculative plans and unsupported conversion claims from the entry journey. | Implemented; rendered review verified |
| 26 | P1 | Mobile navigation needed consistent focus, Escape handling and usable targets. | Shared responsive menu, focus restoration, accessible resource disclosure, touch targets and wrapping for long translated exercise text. | Verified: 16 shell and 16 activity locale/viewport cases; 320px navigation and Armenian exercise overflow fixed |
| 27 | P1 | Mutable upstream C1 assets no longer matched the pinned manifest. | Restore all 568 files from the existing immutable preview and verify every declared hash. | Verified: 568 assets |
| 28 | P2 | Interface-language changes did not consistently update document language/title. | Keep document language and visible translated title aligned; repair late Next metadata overwrites with one shared title owner. | Verified: all 44 production route/locale title checks |
| 29 | P2 | Tests encoded duplicated menus, legacy imagery and misleading metrics. | Replace obsolete assertions with resume, real review, scoped progress and accessibility behavior checks. | Verified: 1,065 platform tests and 17 C1 tests pass |
| 30 | P2 | There was no consolidated audit trail. | This checklist, teacher/C1/UX reports, reproducible tests, browser evidence and a source commit accompany the preview. | Verified: consolidated checklist, specialist reports and reproducible browser checker |
| 31 | P0 | In German interface mode, literal meaning translations could reveal the answer. | Scoped German definitions and communicative-purpose cues replace literal answers; exposed cues are recorded as assisted practice. | Verified: 9 new cue tests, 55 definitions and 14 Q&A contexts |
| 32 | P1 | The number-100 card split the letters “und” inside hundert and rejected hundert as an answer. | Limit units-und-tens decomposition to 21–99; accept both hundert and einhundert without a redundant combined-answer prompt. | Verified: generator, recall regression and complete word-card/audio inventory |
| 33 | P1 | Vocabulary searches ignored translated Armenian/Russian meanings. | Index localized titles and meanings alongside the original German/English search text while preserving lesson/category filters. | Verified: 7 localized vocabulary-search tests |
| 34 | P1 | German vocabulary-card titles could expose recall answers; revealed answers could be reported as remembered. | Hide German answer titles during recall, use semantic definitions or the just-studied form cue, and distinguish correct-after-help feedback. | Verified: German recall and helped-feedback regressions |
| 35 | P1 | Ambiguous source glosses produced “I am a road” for a construction worker and split boarding into the preposition “in”. | Correct the English source meanings, generated examples and shared vocabulary projections; protect both with regression checks. | Verified: source, regenerated dictionary/card data and regression checks |

## Release evidence

The production export builds 1,611 pages. The final platform suite passes 1,065
tests across 103 files; the C1 suite passes another 17 tests. Web type checks and
lint pass. The public release target is https://german-learning-armenia.pages.dev.
The built export passes all 115 production browser assertions: 44 route/language
checks, 44 title checks, 16 responsive checks, four C1 focus checks, four
browser-error checks, one German semantic-cue check and two real muted audio
playback checks. The public endpoint is rechecked after publication.

Source branch: `codex/lingovo-council-fixes`. Reproduce the production check from
`platform/` with `npm run verify:lingovo-preview`; set `LINGOVO_PREVIEW_URL` to the
public endpoint for the same remote checks.
Earlier browser checks covered nine routes
in each of four languages: all returned 200, retained the selected language and
displayed exactly one language control. The 390px pages had no horizontal
overflow or uncaught browser errors. A subsequent 16-case responsive check passed all four languages at 320, 390, 768 and 1440px after fixing narrow German/Russian overflow. A1 learning/review/recording passed 14 browser assertions; C1 source/draft/navigation/audio passed 13.

## What still needs real learners

The market hypothesis is German practice for multilingual learners in Armenia:
understand an example, make an attempt, receive usable feedback, and revisit the
specific mistake. The existing product now supports that loop more directly.
Market fit requires evidence from people using it repeatedly.

Before making a market-fit claim, run a small moderated pilot with beginner and
advanced learners plus a German teacher. Observe whether they can independently
choose the appropriate track, complete one useful task, explain feedback, find
their saved work, and return for a second session. Record task failures and
confusion separately from opinions. Then measure repeat use and willingness to
pay, with explicit consent for any analytics. No new tracking or pricing claim
was added as part of this repair.

## Teaching boundaries and sources

- [Goethe A1 description](https://www.goethe.de/ins/de/de/prf/prf/gzsd1.html)
- [TestDaF proficiency requirements](https://www.testdaf.de/de/teilnehmende/warum-testdaf/das-muessen-sie-koennen/)
- [Digital TestDaF task structure](https://www.testdaf.de/de/teilnehmende/der-digitale-testdaf/aufbau-des-digitalen-testdaf/)

Practice completion does not establish CEFR proficiency. The C1 workspace's
shorter writing tasks are practice scaffolds, not a replacement for official
TestDaF specifications. Speaking self-review does not provide automatic scoring.
Local work remains browser-specific; Settings exposes backup/recovery.
