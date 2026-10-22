# Vocab game ideas for the plurals cheat sheet

Source content: `/cheat-sheets/plurals/`, which is `SubjectInfographic` in "all nouns" mode, backed by `loadSubjectVocabulary()` and `lib/study/plural-patterns.ts`.

Goal: help learners pick up **meaning, pronunciation, gender and plural patterns** for the same nouns the sheet shows, using the same illustrations, article colours and audio.

## What the content gives us (live data, 2026-10-22)

The gender × plural grid currently holds **660 gendered nouns** (277 der · 254 die · 129 das) and **572 taught plural forms**. Every noun has a line illustration, an English meaning, singular audio and, for most, plural audio.

| Plural change | der | die | das | Teaching signal |
|---|---:|---:|---:|---|
| -s | 17 | 8 | 22 | loanwords: Auto, Büro, Café |
| -e | 59 | 0 | 38 | Tisch → Tische, Brief → Briefe |
| -(e)n | 26 | **138** | 3 | most feminine nouns: Lampe → Lampen |
| — (unchanged) | **75** | 0 | 13 | -er/-el/-en nouns: Lehrer, Schlüssel, Zimmer |
| -er | 0 | 0 | 9 | Kind → Kinder, Bild → Bilder |
| Umlaut only | 10 | 3 | 0 | Apfel → Äpfel, Mutter → Mütter |
| Umlaut + -e | 39 | 4 | 0 | Stuhl → Stühle, Stadt → Städte |
| Umlaut + -er | 8 | 0 | 13 | Buch → Bücher, Haus → Häuser, Mann → Männer |
| -in → -innen | 0 | **74** | 0 | Lehrerin → Lehrerinnen |
| Other | 3 | 5 | 4 | learn the exact pair |

The grid is not random. Strong tendencies such as "die → -(e)n", "-in → -innen" and "der + -er/-el/-en → unchanged" are learnable, and the games should make learners *notice* them. The sheet's honesty rule still applies: these describe the taught pairs, not rules that predict every noun.

## Gamification principles applied

These are the well-established principles the five ideas draw on, mapped to what the repo's own spec (`docs/10-review-and-gamification.md`) already commits to:

1. **Retrieval over re-reading.** Each round makes the learner produce or choose a form before it is shown.
2. **Spacing and interleaving.** Words return across days through the existing FSRS scheduler, and genders and patterns are mixed within a round instead of drilled in blocks.
3. **Dual coding.** The illustration, the audio and the article colour always appear together, the same way the cheat sheet shows them.
4. **Immediate, explanatory feedback.** A wrong answer shows the word's cell in the grid and the reason, not just a red ✗.
5. **Generation effect.** Building "Bücher" from "Buch" beats picking it from a list. Use recognition first, then production.
6. **Visible mastery and collection.** Progress is shown as the grid filling in, which is more meaningful than raw XP.
7. **Autonomy, competence, relatedness (self-determination theory).** The learner picks the lesson, subject and pattern scope (the sheet's filters already exist); difficulty adapts; sessions are short.
8. **No shame mechanics.** Per the spec: no leaderboard, no streak-loss punishment, and hints reduce evidence strength without heavy XP penalties. No AI pronunciation score until gate G5 passes.

---

## Idea 1: Grid Quest (the meta-game and progress map)

**What it is:** The gender × plural grid itself becomes the game board. Each noun starts as a faded grey silhouette of its illustration. A noun "lights up" in its article colour when the learner has shown mastery in three ways, across at least two days: **meaning**, **article** and **plural form**.

**Loop:**
- Tap any cell, e.g. *die × -(e)n*, to start a 2-minute round drawn from that cell, or press **Mission** for a mixed round chosen by the scheduler.
- A mastered row earns a **pattern badge** ("Umlaut + -er: 21/21") with a one-line rule card the learner can keep.
- Each noun shows small rings for its three dimensions, so the learner can see *what* they still lack.

**Why it works:** Collection-completion motivation tied to real knowledge, visible mastery per skill (matching the spec's "labelled dimensions, not one score"), and learner autonomy over what to attack next. It also reuses the existing sheet layout almost entirely.

**Build notes:** Reuses `SubjectPluralGrid`, the learner-state store and the FSRS state. Add a mastery overlay class. Rounds are the games below.

## Idea 2: Drei Türen (Three Doors), an article sprint with listening

**What it is:** An illustrated noun card slides in, the word is spoken aloud, and three coloured doors wait at the bottom: **der** (blue), **die** (raspberry red) and **das** (green). Swipe or tap the right door. Get it right and the card flips to show the plural, which is played as audio; the learner then taps the matching ending chip (**-e · -(e)n · -s · -er · — · -innen**).

**Loop:**
- 12 cards per round, interleaved across genders and patterns.
- **Combo meter** for consecutive correct answers. Accuracy matters more than speed: a slow correct answer still counts fully.
- A wrong answer replays the word, shows its grid cell, and puts the card back later in the same round (in-session spacing).
- Short boss rounds use look-alikes from the catalogue that learners mix up: *das Café / der Kaffee*, *der Lehrer / die Lehrerin*, *der Schlüssel* (unchanged) vs *die Flasche* (-n).

**Why it works:** Fast, low-friction retrieval of gender (the hardest thing to learn later), paired with audio so pronunciation is absorbed passively. It gives immediate explanatory feedback and repeats errors.

**Build notes:** Extends the existing `ArticleChoiceGame.tsx` with a second "ending" beat and audio autoplay.

## Idea 3: Plural Forge, a production builder

**What it is:** Shows the singular (e.g. **das Buch**) with its illustration. The learner **builds** the plural by dragging two kinds of piece onto the word:
- **umlaut dots** onto a vowel (a→ä, o→ö, u→ü), shown in the sheet's lavender umlaut chip;
- an **ending chip** (-e, -n, -en, -er, -s, -nen, or "none"), shown in the sheet's yellow ending chip.

The word re-renders live as **die Bücher**. When the learner confirms, the plural audio plays and the word lands in its grid cell with a small animation.

**Loop:**
- Hint ladder (from the spec): ① replay audio → ② show the pattern row's rule → ③ reveal the first changed letter → ④ reveal with explanation.
- **Sentence beat:** a short counting line follows ("Ich habe drei ___"), so the form is used, not just built.
- "Forge streak" for exact builds without hints.

**Why it works:** The generation effect, since producing a form beats recognising it. It mirrors exactly how the cheat sheet highlights the change (yellow ending, lavender umlaut), so the visual memory transfers both ways.

**Build notes:** This is the spec's planned "Plural forge". It builds on `MorphologyPuzzleGame.tsx`, and `PluralDifference` (stem / ending / umlautIndices) in `plural-patterns.ts` already computes the exact pieces.

## Idea 4: Muster-Detektiv (Pattern Detective), an inductive rule discovery game

**What it is:** The learner sees 6 illustrated nouns from one cell, e.g. six *die* nouns with their *-(e)n* plurals. They are asked: **"What's the pattern?"** and choose from three plain-English hypotheses. Then they must **predict** the plural of 3 unseen nouns from the same cell, and finally meet one **exception** from a neighbouring cell.

**Loop:**
- Each case solved adds a "case file" (a rule card) to a notebook that is shown alongside the cheat sheet.
- Cases are ordered by how far the rule reaches: *die → -(e)n* (138), *-in → -innen* (74), *der -er/-el/-en → unchanged* (75), *das 1-syllable → -er/umlaut + -er* and so on.
- Every exception is shown honestly: "This is a tendency, not a law. Learn the pair."

**Why it works:** Discovering a rule yourself makes it stick better than being told it. It gives learners a reasoned strategy for the ~600 nouns instead of 600 isolated facts, and the prediction step is real retrieval practice with feedback.

**Build notes:** Its content comes from `pluralPatterns` plus a new `rules` field per row (short, owner-reviewed German-teacher wording). No new grading engine is needed: it is multiple choice plus Forge-style input.

## Idea 5: Hör-Echo (Hear & Echo), listening pairs and shadowing

**What it is:** An audio-first round. The learner hears one form, e.g. *"die Äpfel"*, and sees two illustrated cards: **one apple** and **several apples**. They tap the one they heard. Then comes the **echo** step: they record themselves saying it, play back their recording next to the model audio, and rate themselves (✓ close / ↻ again).

**Loop:**
- Focus sets for the hardest listening contrasts:
  - **umlaut-only pairs**, where only the vowel changes: *Apfel/Äpfel, Mutter/Mütter, Vater/Väter, Bruder/Brüder, Tochter/Töchter*;
  - **unchanged plurals**, where only the article tells you the number: *der Lehrer / die Lehrer, das Zimmer / die Zimmer, der Schlüssel / die Schlüssel*;
  - **-in / -innen** at natural speed.
- Speed toggle (0.75× / 1×), matching the app's existing slow-audio setting.
- Shadow streak: the number of words echoed today.

**Why it works:** Trains the ear for exactly the differences learners miss (umlaut vowels, the article as the only signal), links sound to image and meaning, and adds speaking practice without a fake accuracy score. Self-rating follows the spec ("recording cycle stores completion/self-rating but no pronunciation accuracy score").

**Build notes:** Extends `AudioMatchGame.tsx` and reuses the existing recorder in `lib/recorder`. Pairs are generated from the "Umlaut only" and "unchanged" grid rows.

---

## Recommended build order

1. **Drei Türen** and **Plural Forge** first. Both extend games that already exist, and together they cover meaning, gender, plural and audio.
2. **Grid Quest** as the wrapper that both feed into. It turns the preferred cheat sheet into the progress screen.
3. **Hör-Echo**, then **Muster-Detektiv**. Muster-Detektiv needs reviewed rule wording before release.

A single "session" could chain all of them: **Detektiv (learn the rule) → Forge (build) → Drei Türen (speed) → Hör-Echo (listen and speak)**, with Grid Quest showing the result.

---

## Prompts for ChatGPT image generation

The colours below are the ones the preferred cheat sheets actually use (`app/cheat-sheets/subjects/subjects.css:46-49` and `plurals.css`), not the brighter global tokens; see the design audit. To get mockups that look like *this* app rather than a generic game, paste the **style block** and **one idea prompt** together in the same message. Each image is a mobile portrait screen (1024 × 1536). Image models often garble long text, so the prompts keep on-screen words few and exact; if letters come out wrong, ask GPT to "regenerate with exactly this spelling: …".

### Style block (paste first, every time)

```
Create a high-fidelity mobile app UI mockup, portrait 1024x1536, shown flat (no phone frame, no hands, no perspective). It is a calm, premium German-learning app called "German Learning OS".

Visual style (follow exactly):
- Background: warm cream paper #F3EFE8. Cards: off-white #FFFDF8 with a 1px warm-grey border #E4DDD2, 16px rounded corners, very soft shadow.
- Text: deep green-black ink #203536. Headings in a bold, tight, modern grotesk sans-serif (like Inter Display Bold); body in a regular sans-serif.
- Grammatical gender colours are the core system: der = blue #245FA7, die = raspberry red #B82E4C, das = green #237149, plural = purple #8C4DAA. Articles and the nouns' line illustrations are drawn in their gender colour.
- EXCEPTION, no giveaways: on a question screen, the picture being asked about is drawn in neutral dark ink #203536, gender questions show the bare noun without its article, and answer options all look identical with no highlight. Colours, articles and highlights appear only after the learner answers.
- Changed plural endings are highlighted with a small butter-yellow chip #F8E1A1 with a 2px amber underline #B27B19; changed umlaut vowels sit in a small lavender chip #DFD6F2 with a 2px violet underline #8760AF.
- Illustrations: simple single-weight outline icons (2px line, rounded caps), one colour each, no fills, no gradients, no 3D, no cartoon faces, inside a soft pale circle.
- Bottom tab bar in dark indigo #211A3D with five white line icons labelled: Book, Lessons, Cheat sheets, My review, Menu. "Cheat sheets" is active with a lavender pill.
- Toggles and primary buttons: dark green #345D4C with white text, pill shaped.
- Overall mood: editorial, uncluttered, generous white space, like a printed study sheet that became interactive. No confetti, no mascots, no neon, no dark mode.
- All German text must be spelled exactly as given, including umlauts (ä, ö, ü).
```

### Prompt 1: Grid Quest

```
Screen: "Grid Quest" progress map.
Top: small caps label "YOUR PLURAL MAP", big heading "Gender × plural", and a slim progress bar reading "214 / 660 nouns mastered".
Main: a 3-column grid with column headers "der" (blue), "die" (raspberry red), "das" (green) and row labels on the left: "-e", "-(e)n", "—", "Umlaut + -er". Each cell holds 3–4 small round noun tokens: mastered tokens show a coloured line illustration plus the word (e.g. "der Tisch", "die Lampe", "das Buch"); unmastered tokens are faded grey silhouettes. Each token has three tiny rings below it (meaning, article, plural), some filled.
One row ("Umlaut + -er") has a small gold-outline badge at the end reading "21/21".
Bottom above the tab bar: a dark green pill button "Start mission · 2 min".
```

### Prompt 2: Drei Türen

```
Screen: "Drei Türen" article sprint, mid-round.
Top: "Round 4 / 12" on the left, a small combo meter "×5" on the right, a thin progress line.
Centre: one large off-white card with a blue line illustration of a chair in a pale circle, the word "Stuhl" below it, and a small speaker button "Listen".
Below the card: three tall rounded door-shaped buttons side by side, filled softly in their colours with white bold labels: "der" (blue #245FA7), "die" (raspberry red #B82E4C), "das" (green #237149). The "der" door glows slightly as if just tapped correctly.
Under the doors: a row of small ending chips "-e", "-(e)n", "-s", "-er", "—", "-innen", with a hint "Now pick the plural ending".
A subtle toast at the top of the card: "der Stuhl → die Stühle" with the "ü" in a lavender chip and "e" in a yellow chip.
```

### Prompt 3: Plural Forge

```
Screen: "Plural Forge", building a plural.
Top: label "BUILD THE PLURAL", heading "das Buch" in green with a green outline book illustration in a pale circle.
Centre: a large word-building tray showing the letters "B ü ch e r" as separate tiles; the "ü" tile is lavender with two dots just snapped on, the "e r" tiles are butter-yellow and being dropped in; a thin article tile "die" in purple sits to the left.
Below the tray, two labelled piece shelves: "Umlaut" with three draggable lavender dot pieces (ä, ö, ü), and "Ending" with yellow chips "-e", "-n", "-en", "-er", "-s", "none".
A hint row with four small numbered circles (hint ladder), the first one used.
Bottom: dark green pill button "Check" and a small sentence preview "Ich habe drei ____."
```

### Prompt 4: Muster-Detektiv

```
Screen: "Muster-Detektiv" pattern discovery.
Top: label "CASE 1 · FEMININE NOUNS", heading "What's the pattern?"
Main: a 2×3 grid of six small cards, each with a raspberry-red line illustration and a pair: "die Lampe → die Lampen", "die Tasche → die Taschen", "die Uhr → die Uhren", "die Wohnung → die Wohnungen", "die Flasche → die Flaschen", "die Tür → die Türen". The added "-n"/"-en" endings sit in yellow chips.
Below: three answer cards (one selected with a dark green outline): "Most die nouns add -(e)n", "All nouns add -s", "die nouns never change".
Bottom: a small case-file notebook icon with "Rule cards: 3" and a pill button "Predict 3 new words".
Tone: a subtle magnifying-glass line icon in the header, still calm and editorial, not cartoonish.
```

### Prompt 5: Hör-Echo

```
Screen: "Hör-Echo" listening and shadowing.
Top: label "LISTEN · CHOOSE · ECHO", a large round speaker button with a soft waveform and a small "0.75×" speed toggle beside it.
Middle: two side-by-side cards: left shows ONE blue outline apple labelled "der Apfel"; right shows THREE blue outline apples labelled "die Äpfel" with the "Ä" in a lavender chip. The right card has a dark green check outline (correct choice).
Below: an "Echo" panel with a big round record button (dark green), two thin waveform rows labelled "Model" and "You", and two pill buttons "✓ Close" and "↻ Again".
Footer note in small grey text: "Only the vowel changes. Listen for ä."
```

### Optional: one overview image of all five

```
Using the same style, create a 1536x1024 landscape overview board showing five mobile screens side by side, titled "Plural games": Grid Quest, Drei Türen, Plural Forge, Muster-Detektiv, Hör-Echo. Each screen is a simplified version of its layout with its title above it. Keep the cream background and the der/die/das colour system consistent across all five.
```
