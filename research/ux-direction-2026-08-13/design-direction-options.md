# Design-direction options

These are uplift directions within the existing German Learning OS identity. All retain dark indigo `#1b1633`, warm canvas `#f3efe8`, brand purple `#6946e8`, the immutable gender color + shape + label system, and teal/amber/rose verb-rule semantics. All remain light-only for Alpha, keep interactive German in HTML, preserve rights/publication rules, and target 360, 390, 820 and 1440px.

## Option 1 — Daily Learning Studio

**Thesis.** A calm, guided home base that brings the designed lesson quality to the whole product without making every page illustration-heavy. The memorable detail is a single “today” composition: Continue and the recommended mission share a first-viewport studio board, while hubs become distinct tool drawers. Density is medium; visual richness is selective; the learner always sees the next useful action before evidence or catalog breadth.

### Dashboard treatment

- Use a wide dashboard template at 1440px, with a 7/5 first-row split: dominant Continue card with the relevant existing lesson/activity PNG; compact Today’s mission with due/new mix and one primary action.
- Collapse the four `.metric` boxes into one horizontal evidence strip with labelled values, tiny progress marks and no gamified decoration beyond existing XP/streak facts.
- Present Lessons 1–2 as two visual course cards using existing hero assets and real progress.
- Replace six identical `.hub-shortcut` rows with a 3×2 tool-drawer grid: stable icon, hub name, meaningful count, one-line learner benefit and a type-specific preview. “Open” becomes an arrow/accessible “Open Vocabulary,” etc.
- At 820px, first row becomes one dominant Continue card plus a compact mission below; at 390/360px, mission action can be sticky only while that section is active and must clear bottom nav/safe area.

### Hub card + hub directory treatment

- Directory: six tool-drawer tiles ordered to match navigation; each has stable iconography and type-specific sample, not semantic gender color as decoration.
- Hubs: one sticky/compact toolbar at desktop/tablet; mobile filter button opens a drawer and keeps active-filter count visible.
- Vocabulary cards: 1:1 visual or designed semantic fallback; canonical German, English gloss, gender badge (color + square/circle/diamond or PL stack + label), audio button, mastery/due line.
- Verbs: infinitive, gloss, REG/SPELL/IRR label, two useful forms and audio. Grammar: rule title plus one HTML model. Phrases: question/answer turn preview and register. Listening: exercise purpose, duration, track count and player action. Concepts: relationship mini-map.
- Replace `.hub-state-note` with contextual controls only when backed by data; hide nonfunctional controls. Use useful empty states, never a release-status banner.

### Detail-page treatment and vocabulary image policy

- Build a single top “learning object” composition: media/visual left and German form, meaning, gender, audio and main practice action right; morphology/plural follows immediately as HTML/CSS teaching grammar.
- Reuse the existing illustrated detail image. Produce the missing eight current vocabulary visuals in one consistent, quiet-background 1:1/4:3 system. If a future item lacks an approved image, show a neutral category/tool silhouette and “Illustration not available” in accessible text—never fabricate meaning or use a random stock image.
- Merge related `.detail-form-pair`, `.person-form-infographic`, plural and pronunciation content into fewer bordered regions; keep provenance and learner controls secondary. Maintain Related/Practise exits so no detail page is a dead end.

### Practice, review and settings treatment

- Practice: group modes into Recognise, Build, Recall and Speak; each card shows interaction, estimated time and availability in learner language. Remove “typed learner events” and raw technical status.
- Review: recommended mission first with a visual mix bar; “Adjust mission” reveals size/lesson/difficulty filters. Session uses a stable progress header and one task at a time.
- Settings: four sections—Study, Audio, Accessibility, Data—with plain-language timezone help. Put import/export in Data and isolate Reset in a bordered danger zone.
- Activity cleanup: “Instructions,” the primary interaction, feedback and “Next” form the main sequence. “What you practised” may show learner-readable skills; publication flags, raw game IDs/states and evidence internals are removed from learner view.

### Typography plan

Use **Inter Variable** as a self-hosted WOFF2 subset (Latin + German), with the existing stack as fallback: `InterVariable, "Segoe UI", "Noto Sans", Arial, sans-serif`. Keep body 16px/1.55. Scale: 13px metadata, 14px supporting UI, 16px body, 18px German card term, 22px section heading, 32px page title, 40px dashboard welcome at wide screens. Weight 450 body, 650 controls/card German, 720 headings. German diacritics are included and German remains visually dominant.

### Exact CSS custom-property additions/changes

Keep all locked semantic token values unchanged. Add/change:

```css
--font: InterVariable, "Segoe UI", "Noto Sans", Arial, sans-serif; /* change */
--font-weight-body: 450;
--font-weight-medium: 600;
--font-weight-strong: 720;
--text-meta: 0.8125rem;
--text-ui: 0.875rem;
--text-body: 1rem;
--text-german-card: 1.125rem;
--text-section: 1.375rem;
--text-page: clamp(2rem, 3vw, 2.5rem);
--content-max-reading: 52rem;
--content-max-browse: 76rem;
--surface-raised: #ffffff;
--surface-tint: #f8f5f0;
--surface-brand-soft: #f0ecff;
--border-soft: #ebe5dc;
--shadow-raised: 0 1px 2px rgba(28,26,36,.06), 0 12px 32px rgba(28,26,36,.07);
--shadow-interactive: 0 10px 24px rgba(47,35,91,.10);
--focus-ring: #4f2fcf;
--motion-fast: 140ms;
--motion-base: 200ms;
--ease-standard: cubic-bezier(.2,.8,.2,1);
--media-card-ratio: 1 / 1;
--media-hero-ratio: 4 / 3;
```

### Motion policy

Use 140–200ms transitions for hover/focus elevation, filter-drawer entry, progress fill and audio state. Use 200–240ms only for a teaching transformation or step change. No autoplay decoration. Instructional motion has replay/pause; reduced-motion removes transforms and animation while preserving state text.

### Estimated new asset counts

| Type | New count | Reuse plan |
|---|---:|---|
| General illustrations | 2 | Reuse the 9 PNGs for lesson/continue/major activity contexts; add only dashboard mission and review-complete scenes. |
| Per-item vocabulary visuals | 8 | Fill the verified 8-of-9 current detail gap; derive 1:1 and 4:3 crops from each master rather than counting crops as new concepts. |
| Infographics | 3 | Reuse the ~7 CSS-drawn visuals and 3 SVGs; add only the highest-frequency missing Lesson 1–2 concepts. |
| Icons | 12 | One coherent SVG set for six hubs plus core actions/states; variants use CSS, not separate assets. |

### Cost and main risk

- Claude engineering: **M**
- Codex asset production: **M**
- Main risk: selective visuals can still feel inconsistent during rollout if the eight vocabulary masters and the new card anatomies do not ship together.

---

## Option 2 — Illustrated Knowledge Atlas

**Thesis.** An illustration-led, exploratory learning atlas closest to the richness of the approved composites. The memorable detail is a living visual map: lesson, hub and detail pages feel like different zoom levels of the same knowledge landscape. Density is medium-low and visual richness is high. This makes concepts memorable and the Alpha feel premium, at the cost of the largest asset and responsive-design burden.

### Dashboard treatment

- Make the first viewport an illustrated “learning landscape”: current lesson scene at center, Continue as the primary action, Today’s mission and recent evidence as anchored callouts.
- Show Lessons 1–2 as large editorial panels using existing hero PNGs, with progress integrated into the image frame.
- Render the six hubs as an HTML/SVG relationship map plus accessible list: Vocabulary, Verbs, Grammar, Phrases, Listening and Concepts are connected by dotted semantic relations; controls and labels remain HTML.
- At 820px the map becomes two rows; at 390/360px it becomes a horizontally paged region with an equivalent vertical list and no tiny desktop diagram.

### Hub card + hub directory treatment

- Directory becomes a visual atlas index with a representative illustration/collage per hub, descriptive count and last-touched state.
- Each hub receives a bespoke but related visual grammar: illustrated vocabulary gallery; verb workshop lanes; grammar prerequisite map; phrase conversation scenes; listening waveform/exercise shelves; concepts as connected maps.
- Card data remains scannable and semantic. Gender uses mandatory badge color + shape + label; verb rule uses REG/SPELL/IRR; illustration backgrounds never borrow semantic colors as arbitrary decoration.
- Filters are a quiet top utility bar so the learning objects—not the form—dominate.

### Detail-page treatment and vocabulary image policy

- Every current vocabulary detail has an approved illustration master, a 1:1 hub crop and a 4:3 detail crop, with alt text and stable lighting/camera system. The existing one is retained if it passes style consistency; eight are produced to complete the current set.
- Detail hero pairs scene with selectable HTML lemma/article/meaning and integrated audio. Below, morphology, plural and Related become an illustrated but structured story: whole → noticed part → change → hear → practise.
- No German teaching text is baked into imagery. Infographic labels, hotspots and alternatives are HTML; missing image state uses a deliberate neutral frame, not stock or generated-on-request media.

### Practice, review and settings treatment

- Practice modes use small contextual scene thumbnails and a clear learning-action taxonomy. Game pages stay focused; decoration retreats after the task starts.
- Review begins with an illustrated mission tray containing due vocab, listening, forms and production. The session itself remains one centered task with restrained backgrounds and a progress path.
- Settings uses a calm utility layout with small category illustrations only in section headers; Data remains visually sober and Reset is isolated.
- Activity developer-language cleanup is absolute: no “validated,” “published,” evidence flags or raw IDs/states. A collapsed “About this activity” can contain stage and learner-readable skill labels only.

### Typography plan

Use **Source Sans 3 Variable**, self-hosted and subset for Latin/German, for a slightly more editorial voice while remaining highly legible: `"Source Sans 3 Variable", "Segoe UI", "Noto Sans", Arial, sans-serif`. Body 16px/1.6; metadata 13px; supporting UI 14px; German card term 19px; section 24px; page title 36–44px; editorial dashboard title up to 48px at 1440 only. Weights 400/600/700. Do not add a display serif: it would edge toward rebrand and complicate German rhythm.

### Exact CSS custom-property additions/changes

Keep all locked semantic token values unchanged. Add/change:

```css
--font: "Source Sans 3 Variable", "Segoe UI", "Noto Sans", Arial, sans-serif; /* change */
--font-weight-body: 400;
--font-weight-medium: 600;
--font-weight-strong: 700;
--text-meta: 0.8125rem;
--text-ui: 0.875rem;
--text-body: 1rem;
--text-german-card: 1.1875rem;
--text-section: 1.5rem;
--text-page: clamp(2.25rem, 4vw, 3rem);
--content-max-reading: 52rem;
--content-max-browse: 84rem;
--surface-raised: #ffffff;
--surface-tint: #f8f3eb;
--surface-visual: #f7f4ff;
--surface-map: #eee9df;
--border-soft: #e9e0d4;
--shadow-raised: 0 2px 4px rgba(28,26,36,.06), 0 20px 52px rgba(36,27,72,.09);
--focus-ring: #4f2fcf;
--motion-fast: 160ms;
--motion-base: 220ms;
--motion-teach: 240ms;
--ease-standard: cubic-bezier(.22,.8,.24,1);
--media-card-ratio: 1 / 1;
--media-hero-ratio: 4 / 3;
--map-line: #bbb1cc;
--map-node-size: 3.25rem;
```

### Motion policy

Use 160–240ms spatial transitions for map zoom/selection, relationship highlighting, audio hotspots, progress and teaching transformations. Nothing essential moves on hover alone. Maps and infographics have pause/replay, keyboard-equivalent controls and structured text alternatives. Reduced-motion switches zooms to instant crossfades or no transition.

### Estimated new asset counts

| Type | New count | Reuse plan |
|---|---:|---|
| General illustrations | 6 | Reuse all suitable lesson/activity PNGs; add dashboard atlas, four hub/editorial scenes and review-complete scene. |
| Per-item vocabulary visuals | 8 | Complete all 9 current vocabulary details; define the same master/crop manifest for future items without proposing their publication. |
| Infographics | 8 | Extend existing CSS/SVG families for the most important missing required Lesson 1–2 maps; keep text equivalents. |
| Icons | 24 | Coherent atlas/action/media/state set, preferably delivered as one reviewed SVG sprite plus accessible labels in HTML. |

### Cost and main risk

- Claude engineering: **L**
- Codex asset production: **L**
- Main risk: asset throughput and art-direction consistency can delay the UX, while complex visual maps increase mobile reflow, alt-equivalent and 200% zoom work.

---

## Option 3 — Compact Learning Console

**Thesis.** A lean, high-information workspace for repeat learners, using the existing asset library and CSS instructional grammar rather than commissioning broad new media. The memorable detail is a consistent semantic left edge: every learning object exposes its type, gender/rule/status cue, German term and next action in one scan line. Density is high on desktop, medium on tablet and single-column on mobile; richness comes from typography, rhythm and semantic structure.

### Dashboard treatment

- Replace the welcome hero with a compact command header: Continue, current lesson progress and Today’s review are visible without scrolling at 820 and 1440.
- Use existing lesson PNG as a restrained thumbnail, not a wide hero. Evidence becomes a single four-column strip at 1440, two columns at 820 and a horizontal scroll-free 2×2 block at 360/390.
- Hub directory becomes six distinct rows/cards with icon, meaningful count, last activity/due cue and a direct action. No equal-size decorative tiles and no “Open” labels without context.
- Favor a 12-column browse grid at wide widths and keep reading/detail content at 52rem.

### Hub card + hub directory treatment

- Hub toolbar stays visible and compact at desktop; filters become one mobile sheet trigger with active-filter chips below the title.
- Use dense list/grid switch. List is default for verbs, grammar, phrases and listening; grid is default for vocabulary.
- Every card has a fixed anatomy: 40px semantic/type slot, German + gloss block, one teaching preview, status/audio, chevron. Vocabulary uses mandatory gender color + square/circle/diamond/PL stack + label; verbs use REG/SPELL/IRR; other icons use neutral/brand colors.
- Reuse CSS-drawn teaching components for grammar/form previews. Remove `.hub-state-note`; unsupported controls are absent until real.

### Detail-page treatment and vocabulary image policy

- Use an optional 160–220px media slot only when an approved existing illustration exists. Do not create eight images merely to make layouts symmetrical.
- For unillustrated vocabulary items, render a high-quality HTML/CSS “meaning plate”: category icon, gender badge, lemma/article, gloss, audio and morphology preview. It is explicitly a semantic learning object—not a fake illustration—and works at all breakpoints.
- Forms, plural and morphology share one information panel; audio/practice are in a stable action rail on desktop and sticky action bar on mobile. No blank or dashed hero placeholder.

### Practice, review and settings treatment

- Practice is a comparison table/card list grouped by Recognise, Build, Recall and Speak, with duration, input and availability columns that collapse to labelled rows on mobile.
- Review opens directly on the recommended mission summary; filters live in an “Adjust” disclosure. Session progress stays compact and visible.
- Settings uses native-feeling grouped fields, descriptive helper text, clear saved state and a separated danger zone; no decorative assets.
- Activities keep the existing rich instructional components but tighten vertical rhythm. Raw “Stage, skills, evidence,” publication metadata, “Practice readiness” and `gameId: state` disappear; available games become named “More practice” links.

### Typography plan

Use a refined zero-download system stack: `"Segoe UI Variable", "Segoe UI", "Noto Sans", Arial, sans-serif`. This minimizes static-export weight and asset cost. Body 16px/1.5; metadata 13px; UI 14px; German card term 17px; section 21px; page title 30–36px. Weights 400, 600 and 700. Use tabular numerals for evidence/duration and a 72-character reading measure.

### Exact CSS custom-property additions/changes

Keep all locked semantic token values unchanged. Add/change:

```css
--font: "Segoe UI Variable", "Segoe UI", "Noto Sans", Arial, sans-serif; /* change */
--font-weight-body: 400;
--font-weight-medium: 600;
--font-weight-strong: 700;
--text-meta: 0.8125rem;
--text-ui: 0.875rem;
--text-body: 1rem;
--text-german-card: 1.0625rem;
--text-section: 1.3125rem;
--text-page: clamp(1.875rem, 2.6vw, 2.25rem);
--content-max-reading: 52rem;
--content-max-browse: 80rem;
--surface-raised: #ffffff;
--surface-tint: #f6f2ec;
--surface-selected: #f0ecff;
--border-soft: #ebe4da;
--row-height: 4.5rem;
--control-height: 2.75rem;
--shadow-raised: 0 1px 2px rgba(28,26,36,.06);
--focus-ring: #4f2fcf;
--motion-fast: 120ms;
--motion-base: 160ms;
--ease-standard: cubic-bezier(.2,.7,.2,1);
--media-thumb-size: 3rem;
```

### Motion policy

Use 120–160ms state transitions only: row hover/focus, disclosure, filter sheet, progress and audio state. No parallax, map motion or decorative entry animation. Teaching components retain 120–240ms explanatory motion where already useful. Reduced-motion makes all state changes immediate.

### Estimated new asset counts

| Type | New count | Reuse plan |
|---|---:|---|
| General illustrations | 0 | Reuse suitable existing 9 PNGs as thumbnails/context only. |
| Per-item vocabulary visuals | 0 | Use a consistent HTML/CSS meaning plate for the 8 unillustrated current details. |
| Infographics | 0 | Reuse the 3 SVGs and ~7 CSS-drawn components; improve layout/text alternatives in code rather than add files. |
| Icons | 0 | Reuse existing SVGs where suitable and draw the small neutral/semantic icon set as accessible inline CSS/SVG components, not new image assets. |

### Cost and main risk

- Claude engineering: **M**
- Codex asset production: **S**
- Main risk: high density can feel more like a capable study tool than a premium illustrated course, especially for first-time A1 learners; mobile content prioritization must be disciplined.

## Cross-option non-negotiables

1. Gender is always color + stable shape + explicit label/article; brand purple never substitutes for plural purple.
2. German teaching and interaction text stays HTML; image crops may set context but never carry required answers or spelling.
3. `:focus-visible`, 44px targets, AA contrast, 200% zoom and reduced motion survive visual uplift.
4. The 360/390 layouts are designed, not shrunken; 820 receives a deliberate tablet composition; 1440 uses a wider browse mode without widening reading text.
5. No Alpha dark mode. Treat it as possible post-Alpha research only after semantic-color and illustration contrast can be revalidated.
6. No rights-gated audio or review-only publication change.
7. No learner sees publication flags, evidence internals, raw object IDs, game IDs/states, roadmap language or dashed implementation-status banners.
