# C1 / TestDaF audit and correction checklist

Audited 2026-10-05 against `https://german-learning-armenia.pages.dev/prepare/c1/` and its learner flows, then corrected in the recovered repository. Public-preview observations below describe the version before these changes. The audit did not submit learner answers or change interface language. Source changes are not a deployment.

## Findings and implemented corrections

| Priority / item | Observed evidence | Implemented correction | Acceptance evidence / remaining limit |
| --- | --- | --- | --- |
| P0 — Refreshable C1 routes | Opening the first course task produced `/course?activity=course-lesen-1-1a`; directly loading that URL returned the A1 not-found shell. Today and Studio also stripped `/prepare/c1`. | `src/lib/navigation.ts` now owns C1 paths and history updates. Course, Studio, Book, Today, guided lessons, resource selection and cheat sheets use it. Unrelated query values, assignment hashes and host router history state survive. Export/share links keep the C1 prefix. Back/forward listeners restore selected tasks. | Navigation tests cover canonical task/page paths, consumed start flag, scope/query/hash retention, deployment base paths and host state. Real-browser QA verified course selection, Next activity, browser Back, and Course/Today/Studio refreshes with retained query state. Hosted deployment refresh remains a release check. |
| P0 — Full source material and one answer | The first word-completion task exposed instructions but omitted the required word table; learners had to leave for PDF page 9. It offered both a per-anchor answer and a full draft. | The original page image is embedded beside one authoritative response field; extracted text remains available. Responses retain the book's numbering. Existing per-anchor drafts are read into the single response without deleting their stored data. | Component tests verify original PDF 9 image mapping, one response, persistence and legacy retention. Browser QA loaded the original image at 1666 × 1178 pixels, found exactly one response field, and retained its entered draft after reload. These remain source-based self-study tasks, not reconstructed item-by-item digital exam controls. |
| P0 — Incomplete material cannot appear completed | Extracted instructions alone did not establish a complete usable task. | Missing page mappings or image-delivery failures show an incomplete-material message. Self-comparison is disabled until source pages, a response, and a linked solution are available. Missing solutions are named explicitly. | Tests exercise missing page and failed image delivery. Publisher source scans are authoritative; no question/answer match is inferred from proximity. |
| P1 — One application shell | Outer Lingovo header plus C1 logo/sidebar/toolbar exposed two language selectors, separate navigation systems and a learner/teacher toggle. | `C1Workspace.tsx` uses `LingovoAppHeader`; `C1App embedded` removes the inner logo, sidebar, locale selector and role toolbar. Compact Overview / Today / Book course / Notebook navigation and one More study tools menu retain source/book/teacher access. | Browser QA selected English through the sole shared selector. The task page fits 390px and 320px without horizontal overflow. Contextual navigation now occupies 107px at both widths; the duplicate home disclosure is gone. Root owns the wider all-locale visual matrix. |
| P1 — All four interface languages | The workspace claimed DE/EN/HY/RU, but the selectors omitted German; review filters and dynamic lesson counts leaked English in Russian mode. | The wrapper accepts the shared four-locale value directly. Standalone C1 selector also includes German. New copy has Armenian/Russian translations; German/English remain native dictionary inputs. Review types and dynamic counts use translatable labels. Stale visible Wortweg branding is replaced with Lingovo. | Locale tests cover DE/EN/HY/RU acceptance and important task/recording/review labels. Static AST audit found no missing literal `t` / `translate` / `bi` English keys in C1's dictionary. This is not a claim that every dynamic or publisher-source string has been translated. German source material remains German. |
| P1 — A specific next step | Landing exposed Today, book course, guided path, studio, demo task and source catalogue with competing actions. | C1 home recommends one unfinished or next source-book activity. The most recently edited unfinished task takes precedence. Previously reviewed content with an outdated source revision remains eligible for renewed study. Resource and skill navigation remain secondary. | A direct task URL carries the exact activity ID. The recommendation is based on local work, not an inferred proficiency score or exam-readiness diagnosis. |
| P1 — Course work continues across surfaces | Course groups had their own local answers but were absent from notebook listings and main progress counts. | Notebook lists source-course responses and notes with exact resume links. Progress has a separate source-course group counter. A self-reviewed course activity contributes once to the daily goal. Optional timestamps are parsed compatibly with existing backups. | Component and real-browser tests write a response, self-review it, and observe it in Notebook with the exact resume link, source-course progress (1 / 236) and daily goal (1 / 3). Completion and self-comparison are not test scores. |
| P1 — Writing model meets its own task | The argumentative practice task requested 100–150 words but its model contained about 61. | The model is now 120 words with a position, examples, counterargument and conclusion. | Word-count test enforces the stated practice range. It remains explicitly a short practice target, not an official argumentative TestDaF task-length rule. |
| P1 — Missing audio is honest and actionable | `listening-details` had no recording, despite its listening framing. | Missing-audio cards/player state that the activity is transcript practice. Teacher facilitation switches to text work. These completions remain in activity totals but do not count as listening-skill evidence. A primary **Practise with original audio** action opens a verified separate original source activity. | Tests verify transcript-only completions do not raise listening progress, and the source link is exact. No recording was fabricated or falsely matched to the demo text. Original-audio destination is detailed below. |
| P1 — Speaking survives navigation | The recorder said recordings existed only until leaving the lesson. | Each task's latest recording is stored as a Blob in IndexedDB, with an explicit saved/saving/failure state and download action. Ending the component during capture stops and saves the recording. Unsaved/running recordings have a leave warning; download remains usable if storage fails. | An isolated Chromium test with a synthetic mic runs the real React recorder, MediaRecorder and IndexedDB. All five checks passed with zero page errors; details below. Physical microphones, Safari/mobile codecs and browser storage eviction have not been verified. |
| P2 — Readable transcripts and source roles | Catalogue cards exposed long transcripts and extraction artifacts such as `pas -` followed by `siert`; visible copy still referenced Wortweg. | The catalogue invites listening first rather than exposing the transcript. Display text conservatively joins extraction line-break hyphens; immutable original text and source revision remain separate. | Cleanup test preserves meaningful hyphens such as `E-Busse` and `Software-` followed by capitalized `Roboter`. This does not assert editorial correction of publisher wording, timing alignment or sentence-level media verification. |

## Verified original-audio continuation

The transcript-only preparation remains available, but its next learner action is now:

`/prepare/c1/studio?section=testdaf.mock-exam-1.audio.transcript.002`

- Publisher section label: **Hören 1, Hörtext / Track 2**.
- Collection: **Modellprüfung 1**.
- Source content begins with Sandra and Julius discussing Julius's difficulty before visiting Professor Kruse. This is a separate original activity, not a recording of the demo announcement.
- Source-course binding: `testdaf.mock-exam-1.audio.reference.002`.
- Original source task: `mock1-hören-1`, PDF page **98**, linked through declared object IDs `obj-007`, `obj-002`, `obj-003`, `obj-004`, `obj-006`.
- Audio URL: `/c1/media/2b456f4ad36c00b68b7e9a2e8d4c5091d908d65458ed13587bc84357f0eca02e.mp3`.
- Restored audio file: **6,625,224 bytes**; computed SHA-256 exactly matches `2b456f4ad36c00b68b7e9a2e8d4c5091d908d65458ed13587bc84357f0eca02e`.
- Resolved original transcript: **2,929 characters**; computed SHA-256 matches its declared revision `f3eac18dceea20e72d018619d8d11f64b7e1130b31d2968fbbc07f275ddd1212`. Its separate transcript-document source is `sha256:ecaf7cd56febaf2700d63652d4a76419150631f7e8e64edc7a2345313674a962`, page 1. Display-only line-break cleanup does not change that retained original.
- During the public read-only audit, the same source audio played with browser `readyState=4`, duration **165.6306 seconds**, and no media error.

The action says the source task is separate. It does not reuse the demo's questions as a quiz for this recording. Studio provides the actual recording, its source transcript, linked book page, notes and self-comparison tools. Integrated application QA followed this exact action, refreshed Studio, played the restored MP3 (`readyState=4`, duration 165.6306 seconds, no media error), and revealed the corresponding transcript beginning with “Hallo Julius”.

## Verification commands and results

Run from `platform/`:

```sh
npm run test -w @lingovo/c1
npm run build -w @lingovo/c1
npm run typecheck -w @german-learning/web
npm run test:recordings -w @lingovo/c1
```

The package test suite currently contains **17 passing tests** in `tests/navigation.test.ts` and `tests/task.test.tsx`. C1 TypeScript build and web typecheck passed. `git diff --check` passed. The root Vitest include list does not include package-local tests; use the package command explicitly.

`tests/recordings.browser.mjs` builds an in-memory isolated React harness, serves it on a temporary local port, and launches Chromium in the same process. It does not start Next or touch `.next`. It uses `--use-fake-device-for-media-stream` and `--use-fake-ui-for-media-stream`; no physical microphone or real learner audio is involved. Set `C1_CHROMIUM_PATH` when the Chromium executable is not `/tmp/chromium` or the default Playwright installation.

The isolated recording check passed:

1. A real MediaRecorder captured synthetic microphone audio (WebM/Opus, 22,312-byte recording in this run).
2. IndexedDB returned the same Blob metadata after page reload, and the audio player loaded it.
3. A different task ID did not expose the first task's recording.
4. Leaving during capture stopped and persisted the new recording, which was available on returning.
5. Deliberately unavailable IndexedDB produced the visible failure/download state; the audio download completed and contained nonempty audio data.

No browser page errors occurred in that harness.

## Integrated application browser QA

The repaired application was run in Chromium against an isolated Next development server on 2026-10-05. The server used `.next-c1-functional-qa` so it did not share the root QA build cache. English was selected using the real shared selector. A fresh browser context contained only explicitly synthetic learner work.

All **13 recorded checks passed**, with **zero page exceptions, failed network requests or HTTP errors**. Evidence is in `lingovo-audit-evidence/c1-functional/report.json`, with nine screenshots in the same directory.

| Learner action | Verified result | Screenshot |
| --- | --- | --- |
| Open the first filtered book activity, type an answer, reload | `/prepare/c1/course?skill=lesen&activity=course-lesen-1-1a` retains the route, filter and draft; original page loads; one response field | `01-desktop-source-task.png` |
| Reveal the publisher solution, reflect, self-review, choose Next activity, then browser Back | Saved comparison and draft remain; selected activity restores correctly | Included in `report.json` |
| Navigate to Notebook | Exact draft, self-compared state and `/prepare/c1/course?activity=course-lesen-1-1a` resume link appear | `02-notebook.png` |
| Navigate to Progress | One self-reviewed source group and one daily activity are counted | `03-progress.png` |
| Start Today with `?start=1&skill=lesen`, then reload | Consumed `start` is removed while `/prepare/c1/today?skill=lesen` remains refreshable | `04-today.png` |
| Open transcript practice, follow Practise with original audio, refresh Studio, play and reveal transcript | Exact declared original source, working 165.6306-second audio, matching transcript and retained section query | `05-transcript-practice-continuation.png`, `06-original-audio-studio.png` |
| Use the saved task at 390px and 320px | No horizontal overflow; one locale selector; retained answer; original material accessible | `07-task-390.png`, `07-task-320.png` |
| Return to C1 home | Next source task is recommended and only one More study tools menu remains | `08-mobile-home.png` |

These results validate the integrated source build, not a deployment. Screenshots include the Next development indicator, which is not part of the production interface.

## Remaining limits

- The source course is supported practice with original pages and publisher solutions. It is not a complete native digital-TestDaF simulation and does not generate TestDaF scores.
- The 12 guided lessons and 36 activities include original demonstrations and preliminary source enrichments. Completing them does not establish C1 proficiency or test readiness.
- Writing feedback remains a transparent self-review checklist, model comparison, saved revision and reflection workflow. No individual grammar assessment or examiner evaluation is claimed.
- Speaking stores only the latest recording per task on the current device; recording a new attempt replaces that task's earlier local recording. Important attempts should be downloaded. IndexedDB recordings are not included in the JSON study-state backup and are not synchronized across devices.
- The source scan remains necessary where verified structured fields are unavailable. Individual digital question controls and exact scoring have not been invented.
- English source-task desktop/mobile layout, integrated state continuity, local deep-link refresh and delivery of the sampled original page/audio have passed real-browser QA. Root owns the complete four-language application matrix and hosted deployment verification. This does not claim every source asset or every activity was manually exercised.

## Official basis for exam boundaries

Only official TestDaF information was used for exam-specific distinctions during this audit. The digital exam uses reading, listening, writing and speaking; listening short answers and writing are typed, and speaking responses are recorded. Official sample materials provide solutions/transcripts with audio and video resources.

- [Digital TestDaF structure](https://www.testdaf.de/de/teilnehmende/der-digitale-testdaf/aufbau-des-digitalen-testdaf/)
- [Official digital TestDaF sample tasks](https://www.testdaf.de/de/teilnehmende/der-digitale-testdaf/vorbereitung-auf-den-digitalen-testdaf/beispielaufgaben-zum-digitalen-testdaf/)

Product inference: the defensible learner value is completing supported work from real source materials and retaining that work. File counts, generic exercise completions and attractive presentation are not substitutes for complete tasks or verified learning evidence.
