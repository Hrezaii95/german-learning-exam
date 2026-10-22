# Design and Infographic System

Updated: 2026-10-22. This is the prepared Lane 1 reference contract, implemented across the L1-1–L1-8 candidate. L1-9 print/CSS/icon consolidation is prepared with focused checks; final rendered/PDF acceptance remains pending below. It supersedes the old violet-brand direction and preserves ADR-017’s approved raster detail heroes; it does not certify a merged or deployed release.

## Reference surfaces

The illustrated subject sheets are the reference: warm paper and canvas, ink text, fine borders, restrained action green and article-colored line drawings. Studio panels, hub cards, tool drawers and evidence strips use the same paper/border language without card shadows. Contextual lesson scenes and instructional diagrams retain their teaching content. Vocabulary grids, thumbnails, dropdowns and cheat sheets share the line-art renderer. Word-detail/card views retain the approved mapped raster hero, with its source path, alternative text and responsive sizing; cards without a mapped image use the shared line-art fallback.

UI colors come from the shared tokens in `platform/apps/web/app/globals.css`. Do not introduce another decorative palette. Actual color vocabulary, selected object paint and country flags represent content rather than article categories.

## Palette and tone vocabulary

| Role | Token | Contract value |
|---|---|---|
| Masculine singular | `--tone-masc` | `#245fa7` |
| Feminine singular | `--tone-fem` | `#b82e4c` |
| Neuter singular | `--tone-neut` | `#237149` |
| Plural | `--tone-plural` | `#8c4daa` |
| Plain entry | `--tone-plain` | `#3d5d55` |
| Main text | `--ink` | `#203536` |
| Supporting text | `--ink-muted` | `#596660` |
| Paper | `--paper` | `#fffdf8` |
| Workspace | `--canvas` | `#f3efe8` |
| Border | `--line` | `#e4ddd2` |
| Action | `--action` | `#345d4c` |
| Keyboard focus | `--focus-ring` | `#345d4c` |
| Added ending fill / line | `--chip-ending-bg` / `--chip-ending-line` | `#f8e1a1` / `#b27b19` |
| Umlaut change fill / line | `--chip-umlaut-bg` / `--chip-umlaut-line` | `#dfd6f2` / `#8760af` |

Presentation tones are `male`, `female`, `neuter`, `plural`, `plain`. The `articleTone()` boundary maps published `masculine` and `feminine` schema values to those presentation values; source schema keys are preserved. Existing `--gender-*` and ink aliases resolve to the contract tones rather than establishing a second palette.

Article, word forms, labels and shapes repeat the meaning of color. Gender badges show `der`/square, `die`/circle and `das`/diamond with the gender label; plural entries show `die` and an explicit plural caption where applicable. Ordinary selection, navigation and decoration use action/ink. A purple border is not a generic selected state. Morphology and feedback cues also retain text, symbols and explanations.

## Type and spacing

Use self-hosted InterVariable with the existing diacritic-capable system fallbacks in `--font`. The shared study stylesheet no longer uses Georgia. German teaching text uses real umlauts and ß; matching aliases must not alter displayed spelling.

| Role | Token or rule | Size / weight |
|---|---|---|
| Eyebrow | `--text-eyebrow` | 11px / 750; tracked uppercase |
| App title | `--text-page` | `clamp(1.75rem, 3vw, 2.5rem)` |
| Reference-sheet title | `--text-sheet-title` | `clamp(2.1rem, 4.5vw, 3.6rem)` |
| Section heading | `--text-section` | 1.3rem |
| Vocabulary entry | `--text-entry` | 1rem / 650 |
| Body | `--text-body` | 1rem |
| UI label | `--text-ui` | 0.875rem |
| Supporting metadata | `--text-meta` | 0.77rem |

There are two screen h1 scales, with one ink color. Print uses its own readable point sizes. Relationships and selected word forms can have deliberate emphasis inside a diagram without creating another page-title scale.

Spacing follows the 4px base: 4, 8, 12, 16, 24, 32 and 48px. Shared surface radius is 16px; smaller surfaces/controls use the reference metrics below. Reading and catalogue widths remain separate (`--content-max-reading` and `--content-max-browse`). Use borders for nested content instead of stacking shadows.

## Shared entry and dropdown

`VocabularyEntry` is the shared illustrated/plural disclosure button. `WordDropdown` is the shared open word card. The two layouts share identity, meanings, source qualifiers, exact forms, article tones, illustrations, audio, save state, source tags, examples, patterns and full-card navigation. An explicit variant changes layout without replacing the interaction contract.

`HighlightedPlural` marks only observed ending and umlaut changes. Missing forms are described honestly. A number, letter, plural-only entry or plain word is not forced into a singular noun template. The parent retains stable anchors, selected/expanded state and keyboard focus; compatibility component exports remain supported.

## Buttons and filter chips

Existing class APIs remain usable: `.btn`, `.btn-primary`, `.btn-secondary`, `.study-primary`, `.study-secondary`, save/audio/icon controls and the word-card module variants. They share the reference tokens.

| Control | Metrics and treatment |
|---|---|
| Button | `--control-radius: 9px`, `--control-height: 44px`, `--control-padding: 11px 16px`, `--control-weight: 650`; paper, line and action colors |
| Primary action | Action fill and paper text; the same size and radius as secondary actions |
| Secondary / audio / icon action | Paper fill, line border and action ink; compact icon layouts retain the accessible name |
| Filter chip | `--chip-radius: 7px`, `--chip-height: 40px`, 8px 12px padding; count span where available |
| Pressed filter/state | `aria-pressed`, action tint/border and inset underline; color alone is insufficient |

Sheet-jump links, metadata chips, study chips and food category controls use this vocabulary rather than unrelated pill styles. Source and status labels remain learner-facing. Keyboard focus is a separate signal from pressed/selected state.

## One vocabulary illustration system

`SubjectVocabularyVisual` is the common renderer. Its existing required props (`de`, `category`, `cardId`, `subject`) remain compatible; optional class/drawing/fallback props support existing callers. The renderer imports pure path data from `lib/study/food-illustrations.ts`, `hobby-illustrations.ts`, `home-illustrations.ts` and `object-illustrations.ts`, with the existing semantic/refined registries. It does not import interactive workshop components or their CSS.

The normal drawing uses `currentColor`, rounded 2.6-unit strokes and a disc filled at 5.5% opacity. A wrapper supplies the article tone. Word-family previews, profession pattern thumbnails, dropdowns and unmapped-image fallbacks use the same system. Approved raster images remain on word-detail/card heroes, including the existing responsive detail-image branches. Removing those heroes or their raster assets requires a future owner decision under ADR-017. Food, Hobby, Home, Office and Object compatibility wrappers keep their public exports and class hooks.

A concrete drawing requires a registered semantic match. Unknown word cards use a subject symbol; existing subject-sheet callers retain their neutral source-glyph fallback. Home's established house fallback remains guarded. Number/alphabet glyphs preserve their actual source identifiers. Do not invent a person/object from an unrelated subject name.

`colour-swatches.ts` is the single actual-color palette, re-exported by `object-sheet.ts` for compatibility. A selected red book remains red, a selected round/eckig shape retains that geometry, and country flags retain their meaning. These are content cues. Lane 2 can render question art inside an ink-colored wrapper for its no-giveaway rule without changing this API.

## One single-line audio control

`LineAudio` supplies the shared speaker/playing icon and Listen/Stop action. MeaningPlate and PronunciationControl reuse it, preserving their semantic audio elements, accessible labels and published-preview gating. Optional DOM-reference, repeat, state and error-policy hooks retain exact-source retry and the pronunciation speed/Repeat controls. Default line speech still supports the existing device-speech fallback; an exact published preview may require its supplied recording and show a retry error instead.

Playback uses the shared speed preference and stops other app audio/speech. Error, missing-media and unavailable-device states are explicit. A synthesized preview is labeled as synthesized and is not an independently reviewed human pronunciation model.

`WorkbookAudioTracks` shares the long-recording transport between workbook panels and the listening hub. All 15 approved workbook tracks remain scrubbable exercise recordings; book, listening and review-audio transports retain scrubbing where needed. No single-line workbook catalogue entries were found for replacement. Shared audio-button reuse does not replace the source-media rights or listening-review gates.

## Focus, wrapping and responsive behavior

Focusable app controls use a 3px `var(--focus-ring)` outline with a 3px outline offset. Dark navigation targets also use a 6px `var(--nav-ink)` halo so the focus ring remains distinguishable against the dark surface. Selection outlines, article-tone borders, input-error indicators and grammatical highlights retain their distinct state meanings.

German text uses `lang="de"`, `overflow-wrap: break-word`, `word-break: normal` and `hyphens: auto` in the reference text rules. Avoid `overflow-wrap:anywhere` for German words. Give grid/flex children room to shrink and reflow rather than clipping text or splitting arbitrary letters.

The release review must cover 320px and 360px mobile, tablet and desktop, keyboard journeys and 200% zoom. L1-9 consolidates per-sheet CSS and reference breakpoints at 420, 480, 580, 760, 800, 1000, 1050 and 1280px. Food, travel, past, journeys and objects Learning/app twins share their app stylesheet; hobbies/time share `app/cheat-sheets/hobby-time.css`. The shared `components/media/Icon.tsx` uses `currentColor`, is decorative by default, and supports an optional accessible label. Its required `name` is arrow, back, close, chevron, external, check, star or plus; optional size/class, chevron direction and filled-star state preserve the existing action meaning. Mobile tab labels stay centered on one line. These are prepared changes, not final rendered acceptance.

## Live-page print contract — prepared L1-9

Print represents the live rendered teaching state, including current filters, vocabulary entries, selected diagrams and recall state. It must not regenerate a separate unfiltered summary or reveal hidden recall answers. Hide shell, chooser and jump navigation, transient word dropdowns and interactive controls, preserve readable text/diagrams and allow natural page flow; there is no fixed page-count guarantee.

L1-9 imports `components/study/StudyPrint.css` from the app layout, removes all 15 duplicate print-summary functions and their ten print-only component/style files, and removes the obsolete Objects PDF link while retaining the protected asset itself. The existing study-scope summary prints read-only; `.study-print-selection` describes the effective local vocabulary lesson/tags/source/search/group selection. Source attribution remains a visible print footer. Directory content tiles, Office and verb teaching, and a rendered original book page are covered by the shared rules; book contents, page controls and audio players are hidden. An open overview dialog becomes static print content; its backdrop is hidden. The unused legacy chooser/list modules and object overview are removed; topic handoffs and the shared catalogue retain the interaction coverage. Final PDF rendering, page flow and readability remain release checks after integration. See [the completion matrix](17-current-state-and-completion-matrix.md).

## Instructional visuals and accessibility

Keep the teaching relationship in selectable text as well as art. An arrow denotes a transformation; an added-ending capsule identifies actual added letters; an umlaut marker identifies the observed vowel change. A relation is not a claim of grammatical derivation.

Semantic controls, names, color/shape/text redundancy, reduced motion and text alternatives remain required. Motion should explain state, respect `prefers-reduced-motion`, and offer pause/replay for teaching sequences. Listening tasks can defer transcript disclosure until appropriate, but their text equivalent must remain available. WCAG 2.2 AA is the review target; token adoption and focused tests alone do not certify every route.
