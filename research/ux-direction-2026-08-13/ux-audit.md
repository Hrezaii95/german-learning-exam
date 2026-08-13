# German Learning OS Lessons 1–2 Alpha — UX audit

Date: 2026-08-13  
Scope: direction audit only; no rebrand, application changes, route expansion, audio-rights change, or publication change.

## Executive finding

The Alpha already owns a credible visual language, but it applies that language unevenly. Lesson overviews and activity pages feel like a designed learning product because they combine a dark-indigo shell, warm canvas, hero media, staged journeys, instructional visuals, audio and practice. Dashboard, directory, hub, search, practice, review and settings pages mostly expose data through the same generic panel/form grammar. The gap is not brand identity; it is information hierarchy, object-specific card anatomy and the distribution of visual teaching objects.

The approved functional sample demonstrates the missing compositional layer: `.os-welcome`, `.os-stat-grid`, `.os-dashboard-grid`, `.os-continue`, `.os-hub-cards`, `.os-hub-toolbar`, `.os-vocab-grid`, `.os-verb-layout`, `.os-grammar-layout`, `.os-review-summary` and `.os-game-tabs` give each workflow a recognizable silhouette. The production Alpha instead relies heavily on `.panel`, `.meta-row`, `.meta-chip`, `.card-grid`, `.hub-shortcut` and `.hub-card` across unlike jobs. Production is more semantically careful and should remain the authority; the sample is the quality/composition benchmark, not code to transplant.

## Surface gap audit

| Priority | Surface and exact implementation evidence | Gap from the approved quality bar | Direction requirement |
|---|---|---|---|
| P0 | Dashboard: `DashboardView`, `LessonCard` in `components/lessons/LessonViews.tsx`; `LearnerDashboard` in `components/learner-state/LearnerDashboard.tsx`; classes `.page-header`, `.panel`, `.metrics`, `.metric`, `.badge-grid`, `.hub-shortcuts`, `.hub-shortcut` | Continue and mission are two text panels; metrics are bare numbers; badges are another repeated card grid; the six hubs share one anatomy and the non-informative cue “Open.” There is no first-viewport daily narrative or visual indication of what differs among hubs. | One dominant Continue action, one legible mission, compact evidence, distinct hub affordances, and a visual bridge to the designed lesson system. Do not turn every module into an equal card. |
| P0 | Six hubs and directory: `HubDirectoryView`, `HubListView`, `HubFilters`, `HubRecordCard`, `ListeningGroupCard`, `ConceptTopicCard` in `components/hubs/HubViews.tsx`; classes `.hub-filters`, `.hub-filter-grid`, `.hub-input`, `.hub-state-note`, `.hub-card`, `.hub-results`, `.hub-shortcut` | Hub identity changes mainly through text. `HubRecordCard` exposes label plus generic metadata but no vocabulary gender cue, audio state, mastery/due state or object-specific preview. The visible dashed `.placeholder-banner.hub-state-note` advertises missing implementation. `/hubs` reads as sitemap rows. | Give each hub a stable icon and object-specific card anatomy. Vocabulary must pair gender color with shape and label; verbs must expose rule class; listening needs duration/audio; grammar needs rule preview; phrases need register/turn structure. Move unavailable learner-state controls to contextual disabled/empty states or omit them—never a developer-facing banner. |
| P0 | Activity screen: `ActivityScreen` in `components/lessons/ActivityAndBrowser.tsx`; `.journey-status`, `.journey-actions`, `.activity-practice`, `.activity-content-grid`, `.instructional-visual`, `.rich-visual` | This is the production reference quality, but the page becomes long and internally repetitive. “Validated prompt,” “Published learning set,” “Stage, skills, evidence,” publication flags and `gameId: state` under “Practice readiness” expose internal implementation vocabulary. Multiple panels compete with the actual practice. | Preserve hero/infographic/practice quality; establish a learn → try → feedback → next sequence. Translate learner-relevant state and move provenance, publication flags and raw eligibility IDs out of learner view. Every option must remove or hide the leaks. |
| P1 | Detail pages: `VocabularyDetail`, `VerbDetail`, `QaDetail`, `GrammarDetail` in `components/details/DetailViews.tsx`; classes `.detail-page`, `.detail-form-pair`, `.gender-badge`, `.person-form-infographic`, `.noun-system`, `.verb-paradigm`, `.qa-dialogue`, `.grammar-rule-card` | Structural teaching components are strong, but vocabulary detail richness is inconsistent: 8 of 9 current vocabulary details have no illustration. Separate panels for forms, morphology, plural, audio and controls create a document stack rather than one teachable object. Dashed placeholders are over-visible. | Define one image policy for all vocabulary details; preserve German as HTML. Consolidate related form/audio/morphology into a dominant detail composition and keep Related/Practise reachable. Missing media must be honest without becoming the page’s visual headline. |
| P1 | Search: `SearchView`, `SearchResultCard` in `components/search/SearchViews.tsx`; `.hub-filters`, `.search-groups`, `.hub-card`, `.meta-chip` | Correctly grouped, but results are visually the same text cards used in hubs and show little match context. “Detail view next phase” is roadmap language. | Show canonical German first, a concise meaning/match excerpt, type icon, lesson and relevant semantic cue. Replace roadmap copy with a neutral unavailable state or omit the dead action. |
| P1 | Practice: `GameSelector` in `components/games/GameSelector.tsx`; `.game-selector__list`, `.game-selector__card`, `.game-selector__card--unavailable` | A flat list of text cards makes seven modes hard to compare; learner-facing copy (“Representative prompts,” “typed learner events”) describes implementation rather than benefit. | Group by learning action (recognise, build, recall, speak), show time/input/output, and label availability in learner language. |
| P1 | Review: `ReviewSetup`, `ReviewSession` in `components/review/ReviewViews.tsx`; `.hub-filter-grid`, `.qa-guided__option`, `.review-session`, `.game-panel` | Mission construction is a raw form followed by a summary panel. The useful due/new/selected model has little visual hierarchy. Session pages improve once the game begins. | Lead with the recommended mission; put customization behind “Adjust mission.” Use a progress meter and content mix; preserve deterministic logic and publication rules. |
| P1 | Settings: `SettingsView` in `components/learner-state/SettingsView.tsx`; `.hub-filter-grid`, `.hub-field`, `.hub-input`, `.detail-actions`, `.detail-feedback` | Technically clear but visually undifferentiated; preferences and destructive data actions share nearly the same emphasis. “IANA timezone” and “JSON” assume technical literacy. | Group Study, Audio, Accessibility and Data. Use plain-language labels, separate the danger zone, retain explicit confirmations and visible saved/error states. |

## System-level findings

### 1. The tokens are sound; the hierarchy is under-specified

`app/globals.css` already locks the right foundation in `:root`: `--canvas`, `--surface`, `--nav`, `--brand`, the four `--gender-*` values and three `--rule-*` values. It also provides a 4px spacing scale, 18/12px radii, focus color, light-only `color-scheme`, and responsive shell patterns. The missing layer is role-based surface, typography, elevation, status and density tokens. As a result, `.panel` is asked to represent a mission, form, teaching model, detail region and warning with one treatment.

### 2. Semantic color is implemented but not propagated

`GenderBadge` and `.gender-badge--shape-square/.circle/.diamond` correctly duplicate color with shape and label; `.noun-system` and `.visual-cue` also carry semantics well. `HubRecordCard`, search results and most review/practice selectors drop those cues even when the object type makes them useful. The fix is propagation, never decorative recoloring: masculine blue remains square + M/der; feminine pink remains circle + F/die; neuter green remains diamond + N/das; plural purple remains stacked/PL/die.

### 3. The page-width model suppresses dashboard and hub composition

`--content-max: 52rem` and `.shell-main { width: min(100%, calc(var(--content-max) + 4rem)); }` support reading pages, but constrain dashboard, directory and browsing surfaces that need comparative scanning at 1440px. Detail/activity reading width should remain controlled; dashboard and hub templates need a wider mode with internal reading-width limits.

### 4. Responsive foundations are good but only coarse

The 1100px rail, 700–1099px top nav and sub-700px bottom nav match the IA. Card grids mostly collapse at 699px, but the requested targets need explicit checks: 360 and 390 for text wrapping/sticky actions/safe areas, 820 for balanced two-column decisions, and 1440 for useful—not empty—workspace. At 200% zoom, grids must reflow rather than squeeze metadata.

### 5. Accessibility is a strength to preserve

Global `:focus-visible`, 44px minimum controls, reduced-motion handling, `lang="de"`, real headings, audio labels and structured infographic equivalents are the correct base. Direction work must add contrast-tested soft semantic backgrounds, never remove outlines, never use icons/color alone, and retain honest missing-media states. No option should introduce dark mode in Alpha; it would multiply contrast and semantic-color validation with little learning benefit.

## Content-language cleanup required in every direction

Replace or remove learner-visible implementation terms:

- “Stage, skills, evidence” → a compact “What you practised” summary containing only learner-relevant skills; move publication/provenance data out of learner view.
- “Practice readiness” plus `gameId: state` → “More practice” with named available activities only; omit unavailable internal templates.
- “Validated prompt” → “Instructions” only when it adds information beyond the interactive task.
- “Published learning set” / “published sources” / “canonical hub” → “Words and patterns,” “related material,” or no eyebrow.
- “Representative prompts,” “typed learner events,” “IANA timezone,” “JSON export” → plain-language benefit labels, with technical detail in expandable help where genuinely necessary.
- “Detail view next phase” and the dashed hub capability banner → omit, or use a neutral learner action/empty state.

## Acceptance bar shared by all directions

- Immutable brand and semantic meanings; color always duplicated by shape/label where semantic.
- German interactive text remains selectable HTML; imagery never carries required spelling, answers or controls.
- Stable layouts at 360, 390, 820 and 1440px; 44px touch targets; visible focus; AA contrast; 200% zoom/reflow.
- One obvious primary action per major region and no card-inside-card shadow stacks.
- Rights-gated audio remains gated; review-only content remains unpublished.
- Motion is functional, 120–240ms, pausable where instructional, and removed under `prefers-reduced-motion`.
