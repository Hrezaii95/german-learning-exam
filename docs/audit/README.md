# Web app audit: summary (2026-10-22)

Two specialist audits of the live app (`codex/live-alpha`, `platform/apps/web`). Both measure every page against the owner's preferred format: the **all-vocabulary plurals sheet** (`/cheat-sheets/plurals`) and the **subject sheets with gender and plural-pattern grouping** (`/cheat-sheets/subjects/*`).

| Report | Scope |
|---|---|
| [ux-design-consistency-audit.md](ux-design-consistency-audit.md) | Reference design rules, measured inconsistency, page-by-page match rating, P0/P1/P2 fix list |
| [ia-and-codebase-audit.md](ia-and-codebase-audit.md) | Route inventory, duplicated and obsolete pages, unused code, navigation, data consistency, target IA, migration order |

## Headline numbers

- **47 routes.** Design match to the reference: **3 Match** (plurals, subjects, subject detail), **15 Partial**, **29 Divergent**.
- Recommended IA: **keep 36, merge 6, redirect 2, delete 3**.
- **7 different der/die/das colour schemes.** The reference sheet itself uses local colours (`#245fa7 / #b82e4c / #237149 / #8c4daa`), not the global tokens.
- 1,092 hex colour literals (659 distinct), 170 font sizes, 37 breakpoints, ~30 focus-ring styles.
- **12 components** draw the same "vocabulary item" card, in 4 illustration styles; there are 6 audio-player implementations and 2 button systems.
- The same vocabulary is listed on **5 surfaces**: `/vocabulary`, `/cheat-sheets/plurals`, the subject sheets, the word lists inside the topic sheets, and `/collections/professions`.

## Live defects found (fix first, no redesign needed)

1. `/lessons/010/`, `/011/` and `/012/` return **404**. The lesson index pads lesson numbers to three digits; `/lessons/04/` works. *(Verified with curl.)*
2. The preferred sheet shows **duplicate entries** (Bild, Million, Glück, nur, mal, neu, finden, kennen, ein/eine, kein/keine), some with different translations, because Lesson 4 rows are not merged (`lib/content/word-cards.ts:35`).
3. `lex:usa` is tagged feminine instead of plural in the older data source.
4. The preferred sheets are **not in any navigation menu**. `/cheat-sheets` opens the Countries sheet instead of an index.
5. German words break mid-word in narrow grid columns (`overflow-wrap:anywhere` in `subjects.css`). Fix this before the style is copied elsewhere.
6. The internal `/review-audio` QA tool is publicly reachable.

## One combined order of work

| Step | What | Source |
|---|---|---|
| 1 | Fix the live defects above, and add a test that `loadSubjectVocabulary()` has no duplicate headwords | IA §7.1, UX P1-1 |
| 2 | Promote the reference palette to global tokens; **one** article-colour scheme and one gender naming (`male/female/neuter/plural`) | UX P0-1, P0-2 |
| 3 | One navigation config for rail, tablet and mobile, with All vocabulary and Subjects in it; consistent labels and titles | IA §7.2–7.3 |
| 4 | Delete dead code (7 unused modules incl. the professions hub components and CSS) | IA §7.4, UX P2-5 |
| 5 | One cheat-sheet frame (back link, subject switcher, heading, print row). Retire the numbered "Cheat sheet 12/15" chooser. Make `/cheat-sheets` a directory | UX P0-3, IA §7.6 |
| 6 | One `VocabularyEntry` component. Topic sheets link to the matching subject sheet instead of keeping their own word lists | UX P0-4, IA §7.5 |
| 7 | Merge duplicated hubs: `/vocabulary` and `/hubs` to the cheat sheets, `/concepts` to `/grammar`, `/collections/professions` to the people subject, `/review` into `/saved`. Use static redirect stubs that keep the query string and hash, because saved items in users' browsers store the old URLs | IA §7.7–7.8 |
| 8 | One illustration system (line art in the gender colour), one button and chip set, one audio button, one type scale | UX P1-2 … P1-6 |
| 9 | Print from the live page (retire 15 print-summary components), consolidate per-sheet CSS | UX P2-1, P2-2 |
| 10 | Rewrite `docs/04`, `docs/06`, `docs/17` and `docs/21`, which predate the cheat sheets | IA §7.9, UX P2-7 |

Steps 1–4 change no URLs and can ship independently.

## Not verified

Print and PDF output were not tested. The offline precache contents and the `worker/` deploy target are unconfirmed. See §8 of the IA report and the header of the UX report for each auditor's limits.

## Related

Game ideas built on the same plurals sheet: [../games/plural-vocab-game-ideas.md](../games/plural-vocab-game-ideas.md).
