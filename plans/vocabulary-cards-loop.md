# Vocabulary cards completion loop

Owner request: 2026-09-03. Executor: Codex. Status: implementation and local release checks complete; deployment verification follows this commit.

Input: `study-guides/lessons-01-03/01-vocabulary.pdf` and its exact builder data `research/lesson-03-study-pack/vocabulary.json`.

Approved format: `study-guides/card-sample/engineer.html`.

Loop: inventory → aggregate → complete content → project website → audit → fix missing or incorrect items → verify exported website.

Completion criteria:
- Every one of the 543 vocabulary IDs maps to exactly one card; 101 numbers and 30 spelling items are covered.
- All 48 teacher job rows, including alternatives and gender counterparts, map into the same catalogue.
- Every card has meaning, all supplied forms or explicit source usage restrictions, a useful pattern, translated use example, recall prompts and provenance.
- Existing vocabulary links and job links display the shared card. Search/filter controls reach the complete catalogue.
- Audio has exact-text binding and honest generated-preview status; existing accepted illustration assets are reused.
- Automated coverage, interaction, responsive rendering and release gates pass; remaining source limitations are reported explicitly.

Pre-existing dirty sample submodule is outside this work. Human language/listening review remains open.

## Verified before push

- 591 complete cards; 543 PDF vocabulary IDs covered exactly once, 101 numbers, 30 spelling cards, all 48 teacher job rows.
- 989 displayed forms and every example bound to exact-text preview audio; 1,560 unique deployed utterances.
- 722 canonical/legacy routes verified in the production export; zero missing forms or examples.
- Full check passed (774 tests plus the 435-test web run); the added Windows export regression and card tests passed 20/20, and final lint passed.
- Browser QA passed 48 responsive checks across 1440, 820, 390 and 360 px, search and filters, recall/reveal and sampled playback with zero failed requests.
- Windows Next 16.3 segment filenames normalized to the browser protocol, preserving payloads; Linux exports remain unchanged.
- Pages smoke, vocabulary coverage, audio hashes, attribution, learner language and offline gates passed.
- Live destination: https://hrezaii95.github.io/german-learning-exam/vocabulary/
