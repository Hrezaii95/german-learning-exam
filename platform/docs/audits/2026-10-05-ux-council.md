# Lingovo UX council: live audit and shared-shell repair

Date: 2026-10-05. Scope: public Lingovo at https://german-learning-armenia.pages.dev, followed by source changes in the recovered application. The live review was read-only. No deployment or commit was performed by this council member.

## Evidence boundaries

The pre-change home, `/learn/`, `/dashboard/`, `/prepare/c1/`, `/prepare/c1/today/`, `/lessons/01/`, `/saved/`, and `/settings/` were inspected using live rendered desktop screens and accessibility trees at approximately 1363 × 936. The shared browser had Russian selected. No language preference was changed during the live audit. Progress values were not treated as evidence of correctness because other council members shared the origin's storage.

Mobile navigation in the original site was initially identified from source/DOM structure, not from a live mobile viewport. The repaired shared shell was subsequently measured and screenshot-reviewed in an isolated local Chromium context at 320, 390, 768 and 1440px widths, with Armenian, Russian, English and German selected. Market-fit recommendations below are product inferences from the observed experience, not user research or demand validation.

## Prioritized findings

| Priority | Observed evidence | Consequence | Repair and acceptance criterion |
| --- | --- | --- | --- |
| P0 | `/learn/` used a four-item horizontal header; `/dashboard/` and A1 lessons replaced it with a 15-link purple/navy sidebar; C1 placed a second logo, sidebar and toolbar beneath the global header. | Moving between levels felt like entering separate products. | A single `LingovoAppHeader` is shared by public pages, A1 and C1. One brand, one language selector, consistent primary navigation, explicit course context. Check all three surfaces at desktop and phone widths. |
| P0 | Home/catalogue exposed only Armenian/Russian; A1 exposed Armenian/Russian/English; C1 exposed a second independent selector while advertising DE/EN/HY/RU. | English and German users could not reliably retain a usable interface across routes. | Shared `LocaleProvider`/`LanguageSelector`, four options, one persistent preference. Header labels are authored in all four languages. Verify changing language on one route survives navigation to both tracks and a reload. |
| P1 | Russian dashboard, lesson, review and settings screens contained English controls, descriptions and implementation labels such as “hotspot audio”, “notice card”, “exposure recognition”, “0/8 pages” and “Settings & data”. | Learners needed English to operate an interface advertised in another language. | Locale council repairs the catalogue and protected German text. This council supplied three validated batches totaling 1,249 source entries and 3,747 HY/RU/DE translations, covering interface fragments, generated teaching explanations, glossary meanings and example phrases. All contributed keys are now present in the merged locale catalogues; German stimuli remain German. Verify visible interface strings in every locale, not just the selector. |
| P1 | C1 overview repeated several generic “next step” introductions, a book promotion, guided-course CTA, source studio CTA, another book promotion, focus demo, skills, library and goal. | Too many equally weighted entry points made the next task unclear. | C1 council owns a focused next-task workspace and compact context navigation. Retain resources under one disclosure. Learner should see one principal next action before secondary tools. |
| P1 | On the C1 daily task, the answer choices were below a 936px desktop viewport due to duplicated chrome, selection control, headings and large containers. | High navigation overhead displaced the actual exercise. | Remove duplicate shell surfaces, shorten context, and keep the prompt and answer work area together. On mobile the first task should follow directly after concise navigation and session context. |
| P1 | `/dashboard/` was globally labelled “My progress” but functioned as the A1 start/resume page. Actual metrics were collapsed below the large illustrated card; a second lesson list and tool drawer repeated destinations. | The destination's name and hierarchy did not match its purpose. | Global label is explicitly “A1 learning”; local page is Overview. Beginner council simplifies the page. Do not imply combined A1/C1 progress. |
| P1 | `/lessons/01/` repeated the path, large illustration, visual journey, goals and stage list. An empty stage exposed “0 of 0” and “No activities in this stage.” | Orientation content obscured the next exercise and surfaced authoring internals. | Beginner council owns concise next activity plus an expandable outline, learner-facing activity titles and removal of empty stages. Verify a beginner can identify the next task without interpreting a content schema. |
| P1 | `/saved/` with no items displayed zero statistics, search/type/due filters and a disabled “Review 0 items” before a large empty state; it suggested arbitrary Lesson 4. | The first-use screen emphasized unavailable actions. | `SavedReview` now begins with a concise empty state and actions to vocabulary or Lesson 1. No zero-state filters/statistics; a scoped-empty collection is distinguished from an entirely empty collection. Existing recall sessions and ratings remain unchanged. |
| P2 | Backup/reset controls appeared on both Saved Review and Settings. | Data administration competed with learning. | Keep the actual backup/reset interface in Settings; Saved Vocabulary links to “Data & backup”. |
| P2 | Legacy mobile DOM used a different bottom-tab set from desktop/global navigation. Desktop global links were about 21px high and lacked current-page semantics. | Navigation learned on one viewport did not transfer; targets were small. | One responsive primary navigation with 44px minimum targets, current-page/location semantics, a mobile disclosure, Escape dismissal and focus restoration. Context Resources uses a native disclosure and preserves all prior destinations. |
| P2 | Shared controls mixed green, purple, cobalt, multiple radius styles and decorative morphology chips. | Visual language reinforced the appearance of assembled subsystems. | Unify learning tokens and controls using navy/cobalt/ivory/red. Remove the morphology strip and duplicate navigation from the rendered shell. No legacy infographic was copied or recreated. |

## Implemented by this council member

- Added `components/shell/LingovoAppHeader.tsx` and `components/shell/lingovo-shell.css`.
- Replaced A1 desktop/tablet/bottom navigation with the common header plus a compact course bar: Overview, Lessons, Practice, Resources.
- Primary review is scoped to A1 `/review` or C1 `/prepare/c1/review`. Saved vocabulary remains available under Resources at `/saved`.
- Preserved all previous A1 destinations and course-material credits; added no route aliases or new data model.
- Retained one language selector in the common header. Removed the old toolbar language selector and decorative morphology logo strip.
- Added responsive minimum targets, visible keyboard focus, skip-to-main focus behavior, mobile-menu Escape/focus restoration, outside interaction dismissal, and Resources Escape/focus restoration.
- Aligned A1 canvas, text, controls, focus rings, cards and layout with the brand tokens. Compacted the study-selection toolbar while retaining its accessible label, made the activity counter non-wrapping, and removed doubled spacing above the exercise.
- Simplified Saved Vocabulary first-use and filtered-empty states; preserved saved-item identity, due calculations, note edits, rating handlers and session flow.
- Supplied three validated translation batches in `/workspace/scratch/dec864f12c6d/i18n-gaps/`: `batch-3.translated.json` (313 keys / 939 translations), `generated-later-2.translated.json` (300 / 900), and `runtime-final-3.translated.json` (636 / 1,908). The exact input key sets and all three nonempty locale values were checked. A final source check confirmed all contributed keys are present in both the HY/RU catalogue and the German catalogue. Ambiguous glossary meanings were checked against the underlying German dictionary records; German exercise stimuli and letter names were preserved.

## Design system recommendation

Use navy `#01113B` for text/brand, cobalt `#0259CF` for the principal action and focus, ivory `#FEFAEE` for the page, an almost-white surface, and red `#CF1733` sparingly. Use a serif for the brand and a small number of headings; use the same readable sans-serif family for navigation, controls, instructions and answers. Maintain Armenian coverage and mark German examples as German.

Keep a restrained 8px spacing rhythm, 8–12px corners, subtle borders and a centered reading/workspace width. Use a 44px minimum for standalone controls. Do not force each educational concept into a decorative illustration: use selectable text, examples, audio, practice and feedback when those support the actual task. Only show progress backed by learner evidence, and state self-checking separately from checked answers.

The product's strongest testable proposition is clear German practice with Armenian/Russian/English/German support and continuity between reading, answering and review. The observed availability is uneven across A1 and C1; catalogue copy should state what exists and the C1 preview status. It should not imply a complete A1-to-C1 curriculum or exam readiness from a preview workspace. Validate product fit with real first-lesson completion and return-to-review behavior; the visual audit alone cannot establish it.

## Verification completed

- `npx vitest run --config vitest.config.ts tests/web/lingovo-unified-shell-behavior.test.ts tests/web/p3a-web-shell-ui.test.ts` — 9/9 passed.
- Behavior coverage includes one four-language selector, persisted German preference through a course-track change, scoped C1 Review, mobile-menu first focus and Escape restoration, reachability of all former A1 navigation destinations, and Resources Escape restoration.
- Updated prior shell tests to the intentional shared-navigation contract and the beginner council's learner-facing activity-title helper.
- `npx eslint apps/web/components/shell/AppShell.tsx apps/web/components/shell/LingovoAppHeader.tsx apps/web/components/study/SavedReview.tsx --max-warnings=0` — passed.
- `npm run typecheck:web-tests` — passed.
- Source diff whitespace check passed at the shell handoff.
- Initial web typecheck found concurrent cross-council `saveError` and exact-optional-prop integration issues; those were reported and the header's optional track type was fixed. The root agent owns the final integrated typecheck/build.

## Rendered responsive verification

The isolated Chromium matrix used the actual local Next application on `/lessons/01`, with four viewport widths (320, 390, 768, 1440) and all four interface languages. All 16 final combinations had document width equal to viewport width, one language control and a minimum measured contextual navigation/control height of 44px. At 320px the open Resources panel occupied x=12 to x=308 and remained within the viewport. The evidence is recorded in `/workspace/scratch/dec864f12c6d/lingovo-audit-evidence/shell-responsive-qa.json`.

Actual DOM measurements first exposed German and then Russian Resources overflow at 320px. The fix reduced only narrow-screen navigation padding/caret spacing, retained a 44px minimum width and height, and was verified by rerunning the complete matrix. No global overflow clipping was added.

Phone screenshots of the repaired dashboard, lesson, exercise and empty Saved Vocabulary were reviewed, alongside desktop dashboard, catalogue and C1 book-course screenshots. The exercise counter measured 52 × 28.5px with `white-space: nowrap` and displayed “1 / 2” on one line. The first-use Saved Vocabulary had zero filter panels, zero statistics panels, a visible empty state with `/vocabulary` as its primary destination, and no backup/reset panel. Screenshots: `mobile-dashboard-final.png`, `mobile-saved-final.png`, `mobile-activity-final.png`, `mobile-320-de-after.png`, `mobile-320-ru-after.png` in the evidence directory.

C1 council acted on the screenshot review by shortening its contextual navigation and removing its duplicate bottom tools disclosure. Its independently measured phone navigation height fell from 153px to 107px; its 320px and 390px checks reported no overflow. The updated `c1-functional/08-mobile-home.png` was visually reviewed by this council. C1 state correctness and full cross-route locale/functionality coverage remain the responsibilities of the relevant council members and root integration checks.

One local screenshot pass was interrupted by a development Fast Refresh navigation abort after the layout cases. It was not counted as a completed pass. A focused matrix rerun completed successfully and produced the final evidence above. All QA servers started by this council were stopped after verification.

## Final checklist reconciliation

Compared the consolidated `docs/lingovo/council-audit-checklist.md` with this report and the final shared header, A1 shell, Saved Vocabulary, entry-page and C1 skip-target implementations. No implementation mismatch was found in the UX-owned claims: one common language control, A1/C1 review routing, compact contextual navigation, first-use Saved Vocabulary, focus behavior and narrow-screen target sizing remain implemented as described. The 16-case matrix above is this council's own completed evidence; the root agent's production checker and final release evidence are recorded separately in the consolidated checklist.

## Production-build activity overflow follow-up

The broader production diagnostic later found a distinct Armenian greeting-activity overflow at 390px that the earlier lesson-overview matrix did not cover. Actual DOM measurements showed the `.activity-practice` implicit grid column expanding to 373.8px inside a 308px content area, producing a 415px document. The long translated heading plus its 52px counter determined that minimum width; the audio, form and answer choices inherited it.

Three scoped learning-theme rules now give the activity and question grids a `minmax(0, 1fr)` column, allow long translated words to wrap, and remove the fieldset's intrinsic minimum width. No document clipping or language-specific text substitution was used. Applying the exact modified source stylesheet to the current static export passed the greeting activity in all four locales at 320, 390, 768 and 1440px, with no overflowing child nodes. At 390px the grid measured 308px and the document measured 390px. Armenian 320px and 390px screenshots were visually reviewed. Evidence: `/workspace/scratch/dec864f12c6d/lingovo-audit-evidence/activity-overflow-fix/`. This stylesheet-overlay check validates the CSS repair; the root's rebuilt production check remains the release gate.
