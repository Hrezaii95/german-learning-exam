# GLOS Infographic Design System

> Visual rules extracted from GPT mockup (Jul 30, 2026), `IMG-20260723-WA0001.jpg` Berufe chart, and `openspec/specs/infographics-system/spec.md`.
> Static previews: `design/infographics/*.html` served at `http://localhost:3456/design/infographics/?`

---

## 1. Design intent

German Learning OS infographics are **visual-first learning surfaces** ? not text walls. Every noun, verb, and grammar topic opens on a card or grid that a learner can scan in under 10 seconds, then drill into audio, examples, and practice.

**Mockup maturity bar:** large illustration, gender-coded typography, pill metadata, tabbed detail, memory tip callout, purple audio chrome, waveform listen panel, and Berufe grid with per-cell gender labels.

---

## 2. Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display / headwords | **Poppins** | 700?800 | `der Ingenieur`, section titles, conjugation forms |
| Body / UI | **Inter** | 400?600 | translations, tabs, buttons, table body |

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">
```

Or import via `tokens.css` (includes `@import` for Google Fonts).

---

## 3. Color tokens

### App chrome (distinct from gender plural)

| Token | Hex | Usage |
|-------|-----|-------|
| `--glos-sidebar-bg` | `#1e1b4b` | Sidebar, table headers |
| `--glos-accent` | `#6366f1` | Primary buttons, active nav, progress, waveform |
| `--glos-content-bg` | `#f4f6fb` | Page background |
| `--glos-surface` | `#ffffff` | Cards |

> **Note:** App accent purple (`#6366f1`) and plural article purple (`#a855f7`) are intentionally different hues so chrome never competes with `die ?` plural forms.

### Gender / article (immutable ? never reassign)

| Article | Token | Hex | Example |
|---------|-------|-----|---------|
| **der** (masc.) | `--glos-der` | `#3b82f6` | der Ingenieur |
| **die** (fem. sg.) | `--glos-die` | `#ef4444` | die Ingenieurin |
| **das** (neuter) | `--glos-das` | `#22c55e` | das Krankenhaus |
| **plural** | `--glos-plural` | `#a855f7` | die Ingenieure |

Each gender has matching `--glos-*-bg` and `--glos-*-border` for pills and cell accents.

### Semantic accents

| Token | Usage |
|-------|-------|
| `--glos-memory-tip-bg` / `--glos-memory-tip-border` | Yellow mnemonic callout |
| `--glos-irregular-bg` | Highlight irregular verb forms (sein: bist, ist, sind, seid) |
| `--glos-streak` | Lightning gradient for study streak (see `web/assets/icons/streak.png`) |

---

## 4. Vocabulary card anatomy

Reference: `vocab-card-ingenieur.html`

```
���������������������������������������������������������Ŀ
�  [illustration]     der Ingenieur          ??           �
�                     engineer                            �
�                     [der] NOUN (masculine)              �
�                     Plural: die Ingenieure              �
���������������������������������������������������������Ĵ
�  Details | Examples | Grammar | Related | Quiz          �
���������������������������������������������������������Ĵ
�  Example                                                �
�  Mein Bruder ist Ingenieur.                    ??       �
�  My brother is an engineer.                             �
�                                                         �
�  �� Memory Tip ������������������������������������Ŀ   �
�  � ?? Ingenieur sounds like "engineer" ? same root! �   �
�  ����������������������������������������������������   �
�                                                         �
�  [? Play]  [Slow] [Repeat] [Record]                     �
�  ????�????  waveform (accent purple)                    �
�  [?? mic]                                               �
���������������������������������������������������������Ĵ
�  Berufe � A1 � Lesson 2        [+ Add to Review]        �
�����������������������������������������������������������
```

### Rules

1. **Headword:** article in gender color + lemma in `--glos-text-primary`; Poppins 800.
2. **English gloss:** `--glos-text-secondary`, directly under headword.
3. **POS pill:** `pill--der|die|das|plural` ? uppercase label, tinted background, 1px border.
4. **Plural line:** prefix "Plural:" in secondary text; plural form in `--glos-plural`.
5. **Illustration:** min 160?160, right column or top on mobile; vector/SVG preferred.
6. **Example block:** left accent bar `--glos-accent`; DE bold + EN muted; speaker icon per line.
7. **Memory tip:** yellow panel, lightbulb icon, title "Memory Tip", max 2 lines.
8. **Audio row:** primary Play (filled purple), secondary Slow / Repeat / Record (outline).
9. **Listen panel:** symmetric purple waveform bars + circular mic button below.
10. **Footer meta:** lesson tags left; "Add to Review" right.

---

## 5. Verb conjugation table

Reference: `verb-sein.html`

| Element | Rule |
|---------|------|
| Title | Infinitive bold + `(to be)` secondary |
| Subtitle | "Present Tense" or tense name |
| Table header | `--glos-sidebar-bg` background, white text |
| Rows | Alternating white / `--glos-row-alt` |
| Irregular forms | `--glos-irregular-bg` + ? marker (bist, ist, sind, seid for *sein*) |
| Pronoun column | 38% width, `--glos-text-secondary` |
| Form column | Poppins 700 |
| Usage block | Below table ? bullet examples with speaker icons |
| Remember callout | Optional footer: stem + ending pattern |

---

## 6. Grammar explorer

Reference: `grammar-cases.html` (cases table) + sein grid in `verb-sein.html`

### Cases overview table

| Column | Content |
|--------|---------|
| Case | Nominative / Accusative / Dative / Genitive ? each case name uses a distinct gender-adjacent color for scanability |
| Question | Wer? Was? � Wen? Was? � Wem? � Wessen? |
| Example | der Mann ? den Mann ? dem Mann ? des Mannes (articles color-coded) |

### Sein person grid (6-cell)

3?2 grid of pastel cells; each cell: pronoun (small) ? form (Poppins 800) ? English gloss.

Pastel backgrounds rotate: mint, amber, blue, violet, pink, green (see `.ig-grammar-cell:nth-child` in CSS).

### Content flow

`Concept title ? visual (grid/table) ? rule paragraph ? examples ? practice CTA`

---

## 7. Berufe grid cell

Reference: `berufe-grid-sample.html`, teacher chart `IMG-20260723-WA0001.jpg`

```
��������������Ŀ
�   [emoji/    �
�    art 72px] �
�              �
� der Arzt     �  ? gender color on full label
� doctor       �  ? English muted
����������������
```

### Rules

1. **Grid:** `repeat(auto-fill, minmax(140px, 1fr))`, 16px gap.
2. **Hero:** full-width indigo gradient banner "DIE BERUFE" + subtitle.
3. **Cell:** white card, 12px radius, hover shadow; illustration area 72?72 centered.
4. **Labels:** show masc. and/or fem. forms on separate lines when both exist.
5. **Categories (optional section headers):** Healthcare, Public services, Food, Technical, Creative.
6. **Legend footer:** four swatches ? der / die / das / plural.
7. **Play All:** full-width or centered accent button below grid.

Source data: `content/extracted/berufe.json` (48 professions from teacher material).

---

## 8. Waveform listen panel

Used in Practice ? Listen & Repeat and embedded on vocab cards.

| Part | Spec |
|------|------|
| Container | Purple-tinted gradient bg, 20px radius, centered |
| Waveform | 15 bars, 4px wide, gradient `#a78bfa ? #6366f1`, CSS `ig-wave` animation |
| Controls | Slow � Normal � Repeat ? outline pills; Next ? full-width primary |
| Mic | 64px circle, `--glos-accent`, drop shadow |

---

## 9. Streak / lightning accent

Asset: `web/assets/icons/streak.png` (copied from mockup streak icon).

- Gradient: yellow-orange top ? coral-red bottom
- Used in dashboard stat card "Study Streak" beside day count
- Do not use for gender or grammar ? streak/gamification only

---

## 10. Spacing & shape

| Token | Value |
|-------|-------|
| Card radius | 20px (`--glos-radius-xl`) |
| Pill radius | 999px |
| Card shadow | `0 2px 12px rgba(30,27,75,0.08)` |
| Section padding | 24px horizontal, 24?32px vertical |
| Min tap target | 44?44px for audio/mic controls |

---

## 11. File map

| File | Purpose |
|------|---------|
| `tokens.css` | CSS variables + font import |
| `infographic-components.css` | Shared component classes |
| `vocab-card-ingenieur.html` | Showcase noun card |
| `verb-sein.html` | Conjugation table + person grid |
| `grammar-cases.html` | Four cases explorer |
| `berufe-grid-sample.html` | 12-cell profession grid |

### Preview URLs (`npm start` ? port 3456)

- http://localhost:3456/design/infographics/vocab-card-ingenieur.html
- http://localhost:3456/design/infographics/verb-sein.html
- http://localhost:3456/design/infographics/grammar-cases.html
- http://localhost:3456/design/infographics/berufe-grid-sample.html

---

## 12. Integration notes (for app team)

- Import `tokens.css` into `web/styles.css` or load alongside ? **do not** change existing `--der`/`--die`/`--das`/`--plural` values in app without design sign-off.
- Infographic HTML files are **static references**; wire `app.js` to render equivalent DOM using `.ig-*` classes.
- Exam study URLs (`web/exam.html`) are untouched by this design pack.
- All vocabulary strings sourced from `content/extracted/` and glossary ? no invented German.

---

## 13. Invariants (from spec)

1. Gender colors never change across screens.
2. Visual learning is primary ? no text-only lessons.
3. One design language across Jobs, Verbs, Grammar, and Lesson cheat sheets.
4. Plural purple ? app accent purple (hue separation).
