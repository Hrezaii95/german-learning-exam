# Vocabulary cards completion loop

Owner request: 2026-09-03. Executor: Codex. Status: original card batch deployed and verified; owner-requested browse UI restoration implemented and locally verified; deployment verification follows this commit.

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

## Preserve the previous page experience

The owner clarified that page/filter UX and dashboard must match the version before the card integration (`54e83a3`). The vocabulary route again uses the original `HubRoutePage`, filter form, Apply/Clear actions and grid. The hub inventory supplies all 591 grouped families and their complete cards. Existing category names are preserved, and Lesson 3 is added to the existing lesson selector. The original optional professions collection, search, alternatives checkbox and review controls are restored. Card Back navigation preserves hub/search context. Dashboard, shell and global CSS are unchanged from the baseline.

Required evidence: production browser verification of restored filters, grid, card-to-results return, all 48 jobs and all 722 complete card routes; unchanged-file comparison for dashboard/layout; successful Pages deployment. The original human language/listening review boundary is unchanged.

Restoration verification: 12 baseline comparisons passed, preserving the dashboard, shell, global CSS, vocabulary page structure and jobs controls. The existing filter form differs only by the Lesson 3 option and an invisible React key that fixes stale input after clearing filters. Card/hub interaction regression tests passed 17/17. Browser QA passed 48 responsive card checks, original search/apply/clear, return context, Lesson 3, numbers and jobs alternatives. Final preview colors have 5.08:1 or better measured contrast; engineer forms remain on one line at 1440 and 390 px. Final Pages gates passed with 722 complete exported card routes. Evidence: `browse-preservation.json`, `browser-qa.json`, `preview-visual-qa.json` and `coverage.json` in `research/word-cards/`.
