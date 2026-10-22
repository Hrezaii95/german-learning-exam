# Wortwerk mockup brief (for image generation)

The full instructions for rendering the Wortwerk screens with an image model. A short prompt that points here is in [wortwerk-prompts.md](wortwerk-prompts.md). The text below is addressed to the image model.

---

I'm designing "Wortwerk", a German learning game inside an app called "German Learning OS". It trains every skill (vocabulary, grammar, listening, speaking, reading, writing, exam practice) and works for every level from A1 to C2, because the content comes from swappable level packs. It is a companion to the coursebook the learner uses (here: Momente A1): learners choose content by lesson, by topic, up to a lesson, or up to a page, and teachers can assign work to a class. I need a SEPARATE mockup image for every screen below: 80 images in total (64 screens, 6 added screens and 10 dashboard screens).

HOW TO WORK
- Generate ONE image per reply, in the numbered order below. Put the number and name above it, e.g. "07 · Smart reminder".
- After each image, wait for me to type "next". If I type "redo", regenerate the same screen.
- Every image: mobile portrait 1024x1536, flat screenshot, no phone frame, no hands, no perspective.
- Before drawing any game screen, check it against the NO-GIVEAWAY RULE below.

NO-GIVEAWAY RULE (most important; applies to every practice, game, quiz and exam screen)
- Game screens show the QUESTION STATE (before the learner answers) unless the screen name contains "feedback".
- In a question state, the prompt card must not reveal what is being tested:
  - Illustrations on the prompt card are drawn in NEUTRAL ink #203536 only, never in a gender colour.
  - Testing gender: show the bare noun (no der/die/das) and a neutral picture.
  - Testing meaning: show the German word and a speaker only, with NO picture (the picture would be the answer); pictures may appear as the answer options.
  - Testing the plural: no yellow or lavender highlight chips anywhere before the answer.
  - Testing listening: pictures and answer options have no text labels.
  - Testing word order: no slot glows or is marked.
- All answer options look identical: same size, colour, weight and border. No glow, tick, outline or highlight on any option.
- Gender colours may appear on the der/die/das answer targets themselves, and in feedback and reference screens (word detail, maps, cheat sheets, results).
- Highlight chips (yellow ending, lavender umlaut) appear only in feedback and reference screens.

SHARED STYLE (identical on every screen)
- A calm, premium learning app. Warm cream background #F3EFE8. Cards: off-white #FFFDF8, thin warm-grey border #E4DDD2, 16px rounded corners, very soft shadow.
- Text: deep green-black #203536. Bold, tight, modern sans-serif headings (like Inter Display Bold); regular sans-serif body; small-caps eyebrow labels in letter-spaced grey #596660.
- German gender colours always come with the article word, never colour alone: der = blue #245FA7, die = raspberry red #B82E4C, das = green #237149, plural = purple #8C4DAA.
- Skill colours (small icon chips only): Vocabulary teal, Grammar indigo, Listening amber, Speaking coral, Reading slate blue, Writing olive. Muted, never neon.
- Illustrations: simple single-colour outline icons (2px line, rounded caps, no fill, no gradient, no 3D, no faces) inside a soft pale circle.
- Highlights: changed endings sit in a butter-yellow chip #F8E1A1 with an amber underline #B27B19; umlaut vowels sit in a lavender chip #DFD6F2 with a violet underline #8760AF.
- Primary buttons: dark green #345D4C pills with white text. Secondary: off-white pills with a thin border.
- Icons: a small orange flame for the streak, a green spark for XP, a level badge like "A1" or "B2" in a small rounded square.
- Bottom tab bar on every screen: dark indigo #211A3D with five white line icons labelled Today, Journey, Practice, Review, Me. Highlight the relevant tab with a lavender pill.
- Mood: editorial, uncluttered, generous white space, like a printed study sheet that became interactive. No mascots, no confetti, no neon, no dark mode, no leaderboards, no shop, no gems.
- Spell all German text EXACTLY as written, including ä, ö, ü, ß.

SCREENS

A · Getting started
01 · Welcome: heading "Learn German one day at a time", three skill chips, buttons "I'm new" and "Find my level".
02 · Placement check: "Question 4 / 12", a sentence "Ich ___ gestern ins Kino gegangen." with four identical corner answers "habe", "bin", "war", "wurde", and a small level estimate "Currently: A2".
03 · Goals: heading "What's your goal?", option cards "Pass an exam" (selected) with a date picker "Goethe A1 · 14 Nov", "Minutes per day" choices "5 · 10 · 20", and a toggle "One gentle reminder a day".
04 · Level packs: heading "Your packs", cards "A1 · Momente" (active, 214 / 660 words), "A2 · Alltag", "B1 · Unterwegs", "B2 · Beruf und Gesellschaft", each with a level badge and progress, plus a card "More packs coming".

B · Today (daily habit)
05 · Today home: flame "🔥 12 days", a 7-dot week row, a goal ring "Daily Run 0 / 1", an exam card "Goethe A1 in 23 days · readiness 64%", a word of the day "die Brille → die Brillen" with a speaker, and a "Next milestone" card "die × -(e)n · 9 / 12 secured · 3 more to complete this pattern", a run preview card "Your run today · 6 min · 5 new · 8 reviews · 3 tricky plurals", a big button "Start Daily Run", and a secondary button "Quick review · 1 min (keeps your streak)".
06 · Streak and freezes: a month calendar, "2 freezes saved", "Longest streak: 31 days", and the note "Earn a freeze every 7 days in a row".
07 · Reminder: a time "19:30", a button "Add daily reminder to my calendar", a note "Phone notifications come later", and a preview of a future notification "Remember the plural of Buch? Your review is ready." (no answer in it).
08 · Snack mode: a compact card "1-minute snack", 5 dots for progress, and one Four Corners card showing only the word "der Tisch" and a speaker icon (no picture), with corners "table", "chair", "door", "window" styled identically.
09 · Done for today: a calm card "Done for today ✓", "You remembered 18 words and finished 2 listening tasks.", buttons "Keep going (optional)" and "See you tomorrow".

C · Journey and progress
10 · CEFR journey: a vertical path of level nodes "A1 · A2 · B1 · B2 · C1 · C2" with A1 in progress. Units on A1: "Kennenlernen ✓", "Familie ✓", "Wohnen (current)", "Essen (locked)", and a can-do card "I can describe my flat."
11 · Skill hub: six skill tiles "Vocabulary", "Grammar", "Listening", "Speaking", "Reading", "Writing", each with a small level bar and "next game" text.
12 · Map, A1 pack: heading "Gender × plural", a 3-column grid "der / die / das" × rows "-e", "-(e)n", "—", "Umlaut + -e", with round noun tokens; each token has four tiny arc segments around it (Meaning, Gender, Plural, Listening), some filled, and a few tokens carry a small grey "due" dot.
13 · Map, B2 pack (the same component with other data): heading "Collocations", rows "treffen", "stellen", "nehmen" × columns "Arbeit", "Alltag", with tokens such as "eine Entscheidung treffen", "eine Frage stellen", "Rücksicht nehmen".
14 · Word detail: "der Stuhl → die Stühle" (ü lavender, e yellow), singular and plural speaker buttons, four segments "Meaning ✓ secured · Gender ✓ secured · Plural ○ learning · Listening ✓ secured", the note "Plural: secure it by recalling it on one more day", and "Next review: in 4 days".
15 · Weekly recap: "Your week in German", big numbers "312 words reviewed", "48 min listened", "6 / 7 days", a best moment "First C-level word: die Nachhaltigkeit", and a "Share card" button.
16 · Skills radar: a six-axis radar chart (Vocabulary, Grammar, Listening, Speaking, Reading, Writing) and the note "Separate skills, not one score".
17 · Collection: a grid of illustrated word cards with small rarity labels "common", "uncommon", "rare", "legendary" (rarity shown by border style, not by bright colours), and "142 / 660 collected".
18 · Badges and titles: round outline badges "Umlaut Master", "Dativ Detective", "7-day streak", "First dictation", with earned ones coloured and the rest grey with progress.

D · Vocabulary games
19 · Four Corners, meaning: progress "3 / 20", combo "×3"; a centre card showing ONLY the word "der Stuhl" and a speaker icon (no picture), mid-drag with a faint motion trail; the four corners are identical neutral picture tiles in neutral ink: a chair, a table, a door, a lamp, with no labels.
20 · Gender corners: a centre card with the bare word "Lampe" (no article) and a lamp outline in NEUTRAL dark ink; corners "der" (blue), "die" (raspberry red), "das" (green), "plural" (purple), all the same size with nothing highlighted.
21 · Memory match: a 3×4 grid of face-down and face-up cards pairing German words and pictures ("der Apfel" ↔ apple, "das Buch" ↔ book), "Pairs 4 / 6".
22 · Word Forge: the prompt "das Buch → plural?" with a book outline in neutral ink; a tray with the learner's own partial build "die B u ch _ _" (two empty slots at the end, nothing highlighted); shelves "Umlaut" (ä, ö, ü) and "Ending" (-e, -n, -en, -er, -s, none) in plain neutral chips; button "Check".
23 · Collocation corners (B2 badge): the centre card "eine Entscheidung ___"; four identical neutral corners "treffen", "machen", "tun", "geben".

E · Grammar games
24 · Case Sort: the sentence "Ich sehe ___ Mann." with two buckets "Akkusativ" and "Dativ" and an unsorted pile of neutral cards "den", "dem"; a small closed "Hint" button (the hint text is not visible).
25 · Preposition Lanes: two lanes "Wohin? (+ Akk)" and "Wo? (+ Dat)"; sentence cards "Ich lege das Buch auf den Tisch." and "Das Buch liegt auf dem Tisch.".
26 · Satzbau (word order): the start "Ich bleibe zu Hause," then four empty, identical slots, and shuffled neutral tiles "habe", "weil", "keine Zeit", "ich" below; no slot is highlighted.
27 · Verb Forge: the prompt "du + arbeiten"; the stem tile "arbeit" with one empty ending slot; plain neutral ending chips "-e", "-st", "-est", "-et", "-en".
28 · Transform (B2 badge): "Ich habe keine Zeit. Ich reise nicht." → a target frame "Wenn ich Zeit ___, ___ ich reisen." with answer chips "hätte", "würde", "habe", "werde".
29 · Error Hunt: the instruction "Tap the mistake" and the sentence "Gestern ich bin ins Kino gegangen." in plain text, with every word as an identical tappable chip and nothing marked.
30 · Ending Snap: "mit dem neu__ Auto" with four identical neutral ending chips "-e", "-en", "-er", "-es" below and the gap empty.

F · Listening games
31 · Hear & Pick: a large speaker card with no text and a "0.75×" toggle; four identical unlabelled corner tiles in neutral ink showing one apple, three apples, one chair, three chairs.
32 · Dictation: a speaker card, a text field "die Äpf", helper keys "ä ö ü ß", button "Check".
33 · Minimal pairs: "Which one did you hear?", two identical cards "die Mutter" and "die Mütter" in plain text with no highlight, and a replay button.
34 · Dialogue Detective: a short transcript-hidden audio player "Bahnhofsdurchsage · 0:18", questions "Gleis?" with choices "3 · 7 · 13" and "Abfahrt?" with "8:15 · 8:50 · 18:15".
35 · Speed Ladder: one sentence card, three steps "0.8× ✓", "1× ✓", "1.2×" (current), and a waveform.

G · Speaking games
36 · Echo: the target "die Äpfel", a big record button with a pulsing ring, waveform rows "Model" and "You", buttons "✓ Close" and "↻ Again", a tiny label "Preview voice".
37 · Answer Back: an audio question bubble "Wie heißen Sie?", an 8-second countdown ring, a record button, and after it "Model answers: Ich heiße … · Mein Name ist …".
38 · Picture Talk: an outline illustration of a kitchen, a checklist "Who? ✓ · Where? ✓ · What are they doing? ○", a record button and "Self-check".

H · Reading games
39 · Quick Read: a short text "Liebe Anna, am Samstag mache ich eine Party…" and statements with "Richtig / Falsch / Steht nicht im Text" buttons.
40 · Tap-to-Learn: the same text with one tapped word "Einladung" showing a popover "die Einladung · invitation · + Save to my deck".
41 · Paragraph Order: four blocks of an email with drag handles, two already placed, numbered slots 1–4.

I · Writing games
42 · Message Reply: the prompt "Reply to Anna: say yes, ask what to bring, say when you arrive", a text field with a short German reply, a checklist with two items ticked, and a button "Show model answer".
43 · Sentence Builder → typed: a top row of used tiles, then a text field to type the full sentence "Am Wochenende besuche ich meine Eltern.", with the ending of "besuche" in a yellow chip as feedback.

J · Story and challenges
44 · Story map: "Ankommen in Berlin", chapters as illustrated outline scenes "1 Am Bahnhof ✓", "2 Die WG ✓", "3 Im Supermarkt (new)", "4 Beim Amt (locked: master unit 4)".
45 · Story scene: an outline scene of a supermarket, a dialogue bubble "Kann ich Ihnen helfen?", three identical reply buttons "Ich habe Äpfel gesucht morgen.", "Ja, ich suche Äpfel.", "Nein, ich bin Äpfel." with none highlighted.
46 · Boss battle: "Unit boss · Wohnen", strikes "✕ ○ ○", mixed task icons (vocabulary, grammar, listening), the current card "Wo ist die Lampe?" with lane buckets "auf dem Tisch / auf den Tisch".
47 · Blitz: a 60-second timer bar, strikes "✕ ✕ ○", score "18", a ghost bar "Yesterday: 21", a card "das Kind" with a neutral-ink outline, and four identical neutral corners "-e", "-er", "-s", "-(e)n".
48 · Tagesrätsel: "Tagesrätsel · 22 Oct · Same 6 words for everyone", six neutral cards with bare nouns "Tisch", "Lampe", "Kind", "Apfel", "Lehrerin", "Auto" (no colour, no article), each with three small der/die/das buttons and an empty plural field.
49 · Exam simulation: "Goethe A1 · Hören · Teil 1", a section timer "12:40", question "1 / 6", an audio player and three picture choices.
50 · Readiness report: "Exam readiness 64%", bars per section "Hören 70% · Lesen 72% · Schreiben 51% · Sprechen 48%", and a recommendation card "Focus this week: Schreiben · Message Reply ×3".

K · Rewards and settings
51 · Run results: heading "Daily Run complete", three personal lines "You remembered 8 words from last week", "You fixed die Bücher and die Äpfel", "3 words left to finish 'At home'", a row of tokens whose plural segment just filled, "🔥 13 days", a small gently highlighted card "Bonus round unlocked", and two buttons "Back to map" and "Fix these 2 words · 45 s (optional)".
52 · Pack settings: "Content packs", a list of installed packs with level badges and toggles, "Study scope: Lessons 1–6", a "German review status" label per pack ("Reviewed" or "Pending review"), and a button "Check for new packs".

L · Book companion
53 · Book position: heading "Where are you in Momente A1?", a lesson picker showing "Lektion 5" selected, a page stepper "Seite 62" with − and + buttons, a small book-cover outline, and a button "Save position".
54 · Scope picker (bottom sheet): mode options "Up to my position (L5 · p. 62)" (selected), "This lesson", "Pick lessons", "Up to a lesson", "Topics", "Teacher assignment", "My tricky words"; below them combinable chips "Topics: Food · Numbers" and "Sources: Course · Teacher extra", and a live count "312 items in scope".
55 · Position advance: a small card at the top of the interactive book "You opened page 64. Move your position to p. 64?" with buttons "Move" and "Not now".
56 · Lesson loop on Today: three stacked cards "Before class · Preview Lektion 6 · 5 min", "After class · Practise p. 58–62", "Lesson boss · Lektion 5 (locked until 80% mastered)".
57 · Play this sheet: the top of an illustrated cheat sheet "Food & ordering" with its filters ("Lessons 1–5", "Nouns") and a prominent button "Play this sheet · 48 items".

M · Class mode
58 · Teacher, create assignment: heading "New assignment", fields "Class: A1 Abendkurs", scope chips "Lektion 5 · p. 58–62", "Dativ", skills checkboxes "Vocabulary ✓ Grammar ✓ Listening ✓", "20 items", "Due: Fri 24 Oct", and a large QR code with a "Copy link" button.
59 · Student, assignment on Today: a card "Homework from Frau Weber · due Fri", progress "8 / 20", and a button "Continue".
60 · Completion receipt: "Assignment done", per-skill results "Vocabulary 18/20 · Grammar 7/8 · Listening 5/6", a short result code "K7Q-4M2-WX9" and buttons "Copy code" and "Share".
61 · Teacher dashboard: a table of students × skills with soft colour cells, a "Tricky words this week" list ("der Schlüssel", "die Mütter", "das Café"), and "3 students behind position".
62 · Live class game (projector, landscape 1536x1024 for this one only): a big Four Corners card with the bare noun "Lampe" (no article) and a lamp outline in neutral ink, corners "der / die / das / plural", a join code "Join: 482 913", team bars "Team Blau 12 · Team Grün 10", and a 15-second timer.
63 · Student joins live game: a code entry "482 913", a name field, team choice "Blau / Grün", and a button "Join".
64 · Teacher extras import: a pasted table preview with columns "German · English · Lesson · Page · Tags" and rows like "die Fachärztin · specialist (f) · 2 · 27 · people", validation ticks per row, and a button "Add 48 words as Teacher extra".

ADDED SCREENS (draw these after 64: the feedback reveal that question screens hold back, plus progress moments)
65 · Gender feedback: the "Lampe" card now shows "die Lampe" with the lamp outline turned raspberry red, the "die" corner softly lit with a tick, and a strip "die Lampe → die Lampen" with the "n" in a yellow chip and a speaker playing.
66 · Meaning feedback, wrong answer: the learner chose the table tile; it shows a thin grey cross, the chair tile is outlined in dark green, and the card now shows the chair picture with "der Stuhl = chair · This word comes back in a moment."
67 · Word order feedback: the completed sentence "Ich bleibe zu Hause, weil ich keine Zeit habe." with "habe" underlined and a note "In a weil-clause the verb goes to the end."
68 · You fixed this: a centre card "das Buch → die Bücher" shown as a Forge result (the "ü" lavender, the "er" yellow), a small calm label "You fixed this ✓ (missed 6 cards ago)", and the token's plural segment filling.
69 · Format ladder, free recall: the prompt "der Apfel → plural?", no options, a text field with helper keys "ä ö ü ß", and a tiny progress label "Recall step 3 / 3".
70 · Learning stats (private): "Your learning, on this device only", three numbers "7-day return: 6 / 7 days", "Runs finished: 92%", "Remembered after a week: 81%", and a small line chart.
DASHBOARDS (signed-in; reference screens, so gender colours are allowed)
71 · Sign in: "Sign in to German Learning OS", fields "Username" and "Password", a button "Sign in", greyed buttons "Continue with email" and "Continue with Google" labelled "Coming soon", and a link "Use without an account".
72 · Student dashboard: an embedded Today panel (streak, goal ring, run preview), an "Assignments" card "Homework from Frau Weber · due Fri · 8 / 20", a "My book" card "Momente A1 · Lektion 5 · Seite 62 · Your class is on p. 64 · Follow class", a sync status "Synced ✓", and an account avatar "Anna".
73 · Teacher, classes home: two class cards "A1 Demo-Klasse · Lektion 5 · p. 62 · 12 / 15 active · 2 open assignments · ⚠ 3 behind" and "A1 Abendkurs", and a button "New class".
74 · Teacher, class overview: a "Class position" card, a "This week" strip, a skills heat map (students × Meaning, Gender, Plural, Listening, Grammar, Reading, Writing, Speaking) with a number in every cell and colour-blind-safe shading, a "Tricky words" list with a button "Assign these", and a "Needs attention" list.
75 · Teacher, student detail: "Ben (Demo)", per-lesson progress bars L1–L5, tricky words with their four segments, recent activity for 7 days, and assignment history.
76 · Teacher extras import: a table preview "German · English · Lesson · Page · Tags", validation ticks, and the button "Publish to class".
77 · Admin overview: tiles "Users 5 (1 admin · 1 teacher · 3 students)", "Weekly active 4", "Classes 1", "Sync errors 24 h: 0", "Version a1b2c3d".
78 · Admin users: a searchable table with role chips, status, a "Demo" tag and row actions "Change role · Reset password · Disable"; a confirm dialog for "Reset password for student2?".
79 · Admin content packs: rows "A1 · Momente · 660 items · Reviewed · Enabled", "B2 · Beruf (sample) · Pending review · Disabled", with a "Mark reviewed" action that names the reviewer.
80 · Account and data: display name, sign-in methods "Password ✓ · Email (coming soon) · Google (coming soon)", devices list, buttons "Export my data", "Delete account", "Sign out".

Start with 01.
