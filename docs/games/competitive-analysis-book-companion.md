# Competitive analysis: a gamified companion to the coursebook

**Positioning.** Duolingo and similar apps each teach their own general curriculum. Wortwerk is the gamified **companion to the book the learner is already using** (Momente today, any book later). It serves self-learners and students in a class with a teacher. Content follows the learner's position in the book: **by lesson, by topic tag, up to a lesson, or up to a page**. Cheat sheets, games and review all draw from that same scope.

Research date: 2026-10-22. Sources are listed at the end. Where a source was a third-party blog, it is marked as such.

---

## 1. The landscape

| Product | What it is | Mechanics worth noting | Weak spot for our audience |
|---|---|---|---|
| **Duolingo** | its own general curriculum, path-based | streaks; **friend streaks** with up to 5 friends (Duolingo reports learners with a shared streak are **22% more likely** to do their daily lesson); weekly **leagues** (top XP earners promoted, opt-out available); **Duolingo Score**; Max: AI **Video Call** and story-like **Adventures**; **Energy** replaced Hearts in 2025 (a 25-unit bar spent per question, refilled with gems or a subscription) | does not follow a coursebook; Energy drew heavy criticism ("drains free learning"); **Duolingo for Schools is being retired**: no new classes since April 2026, shutting down **31 July 2027**, with no announced replacement |
| **Hueber interaktiv** (Momente's own digital edition) | the digital book | audio, films, **65+ animated clips per volume** covering all grammar, picture dictionary and phrases; **120+ interactive extra exercises**; whiteboard tools; offline app | the sources describe no spaced repetition, game loop, streaks or cross-lesson review: it is a digital book, not a practice engine |
| **phase6** | vocabulary trainer tied to school books | **1,400+ book-aligned word collections** (Klett, Cornelsen, …), **ordered by the book's lessons**; recommended by Cornelsen; paid packs | vocabulary only; Hueber is named as a partner but Momente packs could not be confirmed |
| **Quizlet (+ Live)** | user-made flashcard sets | **Quizlet Live**: a class game from any set, Teams or Individual mode, join by code or QR | sets are only as good as whoever made them; no book structure; mostly matching terms |
| **Blooket / Gimkit / Kahoot** | live classroom quiz games | many game modes (Blooket: Tower Defense, Factory, Café; Gimkit: Classic, Team, power-ups); **import from Quizlet** | built for one review lesson, not long-term memory; light on teaching value (third-party reviews) |
| **Busuu** | general curriculum | **community feedback** on written and spoken answers; **AI Speaking Practice** (2024); placement test; study plan; certificates | general curriculum; feedback quality varies |
| **Memrise** | general curriculum | memory techniques; native-speaker video clips; AI chat (premium) | general curriculum; many features behind the paywall (user reviews) |
| **LingQ** | reading and listening | **import your own content** (articles, videos, e-books) and turn it into lessons | no gamified grammar; heavy reading focus |

**The opening.** No product combines all four of these:
1. **Book-aligned scope**: phase6 does this, but for vocabulary only.
2. **Games for every skill**: Duolingo does this, but on its own curriculum.
3. **Visual cheat sheets**: nobody does this in a gamified way.
4. **Teacher and class tools**: the gap left by Duolingo for Schools.

Wortwerk can be the one that does.

---

## 2. What we already have that they don't
- **Book alignment built into the data.** The study scope already supports *one lesson, several lessons, or up to lesson N*, plus 21 topic tags and the sources `course / teacher-extra / study-extra` (`apps/web/lib/study/scope.ts`).
- **Teacher extras as content.** The teacher's own words (e.g. 48 professions in Lesson 2) are labelled "Teacher extra" in the data.
- **Illustrated cheat sheets** with gender and plural patterns, an interactive book with audio, and source rights to Momente (ADR-015/016, conditional on attribution).
- **An offline-ready app shell**: `manifest.webmanifest`, `sw.js`, the offline runtime.

---

## 3. Gap analysis: what we lack and what to adopt

| # | Feature | Seen in | We have it? | Decision | How we adopt it |
|---|---|---|---|---|---|
| 1 | **"Where I am in the book" as the main setting**, down to page level | phase6 (lesson level only) | lesson level yes; **page level only for L1–2** | **Adopt: core** | a *book position* (lesson + page) drives every game and review; add page refs to every item for L3–12 (§4) |
| 2 | Lesson-ordered vocabulary for the book | phase6 | yes | keep | n/a |
| 3 | **Teacher classes and assignments** | Duolingo for Schools (ending), Quizlet | no (deferred in `docs/02`) | **Adopt: needs owner approval** | Class mode (§5), starting with assignments by link that need no backend |
| 4 | Teacher progress dashboard | Duolingo for Schools | no | adopt (phase B) | needs a backend (§6) |
| 5 | **Live class game** (projector + phones) | Quizlet Live, Kahoot, Gimkit | no | adopt (phase B) | Four Corners / Blitz on the projector, students join with a code |
| 6 | Accounts and sync across devices | all of them | no (local browser storage only) | **adopt: needs owner approval** | optional sign-in; offline-first stays the default |
| 7 | **Friend / class streaks** | Duolingo (+22% completion) | no | adopt | a class streak and friend streaks (phase B); a *team goal* rather than a ranking |
| 8 | Public leagues | Duolingo | no | **do not adopt publicly** | an optional class leaderboard the teacher can switch on, off by default; otherwise team goals and a personal ghost |
| 9 | Hearts / Energy | Duolingo | no | **do not adopt** | strikes only in Blitz and Boss rounds; learning is never blocked |
| 10 | Placement test | Busuu, Duolingo | no | adopt, in book form | "Where are you in the book?" plus an optional 12-question check |
| 11 | Progress score | Duolingo Score | partly (mastery dimensions) | adopt | "Book progress: L5 p.62 · 78% mastered up to here" plus a readiness meter per skill |
| 12 | AI conversation | Duolingo Max, Busuu, Memrise | no (deferred) | **later, after review** | role-play limited to the lesson's own dialogues and learned vocabulary; needs a backend and owner approval; no pronunciation score until gate G5 |
| 13 | Feedback on writing and speaking | Busuu (community) | no | adopt via the teacher | students submit Message Reply or Picture Talk work; the teacher reviews it in Class mode |
| 14 | Import own content | LingQ, Quizlet, phase6 user sets | teacher-extra data only | adopt | a CSV / paste importer for teacher and personal word lists, tagged by lesson |
| 15 | Short grammar clips | Hueber interaktiv | no (cheat sheets instead) | **link, don't copy** | deep links to the matching Hueber interaktiv page where the learner owns it; our cheat sheets stay the summary |
| 16 | Duels / head-to-head | Duolingo, Gimkit | no | phase B | asynchronous "beat my score" challenge links with no backend; live duels later |
| 17 | Push reminders | all of them | no | adopt | local notification in the installed app; real web push needs a backend |
| 18 | Exam simulation | Busuu (certificates), test-prep apps | planned | keep | Goethe/telc-style sections per level pack |

---

## 4. Fluid, book-aligned scope (the core change)

### 4.1 The scope picker
The scope picker is one control used everywhere: Daily Run, any game, maps, cheat sheets and review. It offers:

| Mode | Example | Includes |
|---|---|---|
| **Up to my position** (default) | "Up to Lesson 5, page 62" | every item from earlier lessons, plus items in Lesson 5 up to page 62 |
| **This lesson** | "Lesson 5" | Lesson 5 only |
| **Pick lessons** | "Lessons 2, 4, 5" | those lessons |
| **Up to a lesson** | "Lessons 1–6" | through lesson 6 |
| **Topics (tags)** | "Food + Numbers" | items with those tags, still inside the book position unless "beyond my position" is ticked |
| **Teacher assignment** | "Homework: L5 vocab + dative" | exactly the assignment's scope |
| **Smart sets** | "My tricky words", "Due today", "Teacher extras" | from the learner's own history |

Scopes **combine**: "Lessons 1–5 × topic Food × source Course + Teacher extra". Changing the scope instantly re-filters the content; progress is stored per item, so nothing is lost.

### 4.2 The page rule (so "up to page" is never ambiguous)
1. An item in an **earlier lesson** is in scope.
2. An item in the **current lesson** is in scope if its `bookRef.page ≤ position.page`.
3. An item in the current lesson with **no page ref** is in scope only once the lesson is marked done, or if the learner turns on "include the whole current lesson".
4. Teacher extras use the lesson and page the teacher attached to them.

**Data gap:** page refs exist only for Lessons 1–2 (`content/published/lesson-0{1,2}.json`) and the interactive book (`generated/interactive-book.json`). Lessons 3–12 need `bookRef {lesson, page, exercise?}` on every item, which is a content task rather than code. Until then, rule 3 keeps the feature honest.

### 4.3 The book position moves with the learner
- The learner sets it once ("I'm on page 62").
- It **advances automatically** when they open a later page in the interactive book or finish a lesson's book activities, after a one-tap confirmation ("Move to page 64?").
- In a class, the teacher's position becomes the default; the learner can still study ahead or behind.

### 4.4 The lesson loop (synced to the book)
| Moment | What the app offers |
|---|---|
| **Before class** | "Preview next lesson": 5 minutes of the next lesson's key words, with pictures and audio |
| **After class** | "Practise today's pages": a Daily Run limited to the newest pages |
| **End of lesson** | **Lesson boss**: mixed skills, unlocks the lesson badge and its cheat-sheet "mastered" stamp |
| **Every day** | Daily Run over everything up to the current position, weighted to due and tricky items |
| **Before the exam** | Exam simulation over the whole book so far, with a readiness meter |

### 4.5 Cheat sheets inside the game
- Every result, wrong answer and map token links to its **cheat-sheet card**.
- Each cheat sheet has **"Play this sheet"**, which uses the sheet's current filters as the game scope.
- A printable sheet of the current scope is available ("Everything up to p.62").

---

## 5. Class mode (new pillar; needs owner approval)

| Feature | Description | Needs a backend? |
|---|---|---|
| **Assignment links** | the teacher builds a scope (lessons, pages, tags, skills, number of items, due date) and shares a link or QR code; it opens as a task on the student's Today screen | **no**: the scope is encoded in the URL |
| **Completion receipts** | the student finishes and shares back a short result code (score per skill, signed) that the teacher pastes into a sheet | no (works in phase A) |
| **Teacher extras** | the teacher adds words or sentences through a CSV or form, tagged to a lesson and page; they appear as "Teacher extra" | no, if shared as a pack file; yes if it should sync automatically |
| **Class position** | the teacher sets "the class is on L5 p.62"; students' default scope follows it | yes |
| **Dashboard** | progress per student × skill × lesson; a class heat map of tricky words; who is behind | yes |
| **Live class game** | a projector screen plus phones joining by code; Four Corners, Blitz or Quiz; team mode | yes (real time) |
| **Feedback inbox** | Message Reply and Picture Talk submissions with teacher comments | yes |
| **Class streak / team goal** | "Class goal: 2,000 words this week", shared progress, no individual ranking unless the teacher switches it on | yes |
| **Privacy** | teacher-owned classes, minimal data, GDPR-ready, deletable; no ads; suitable for minors | n/a |

---

## 6. Platform implications
- **Phase A (no backend, fits today's static site):**
  - the scope picker and book position, and page refs in the data;
  - the lesson loop, and "Play this sheet";
  - assignment links and completion receipts;
  - the CSV importer for teacher and personal extras;
  - asynchronous challenge links.
- **Phase B (backend):** accounts and sync, class position, dashboard, live game, feedback inbox, class and friend streaks, web push, and later AI role-play. The repo has an unused Cloudflare worker stub (`apps/web/worker/index.ts`), so Cloudflare (Workers + D1 + Durable Objects for real-time) is the natural fit; Supabase is the main alternative. **Choosing a backend is the owner's decision.**
- **Spec change needed:** `docs/02-product-requirements.md` §"Explicitly deferred" lists the teacher portal, multi-user sync, social leaderboards and open-ended conversation. Adopting §5 and Phase B requires the owner's approval, recorded under `scope_overrides` in `config/claude-codex-operating-model.yaml` (CLAUDE.md rule).

---

## Sources
- Duolingo Energy: [Duoplanet guide](https://duoplanet.com/duolingo-energy-system/), [Class Central](https://www.classcentral.com/report/duolingo-breaks-hearts-for-energy/), [Android Authority](https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/)
- Duolingo for Schools sunset: [Duolingo Help Center: Important information](https://duolingoschools.zendesk.com/hc/en-us/articles/44824545841805-Important-information-regarding-Duolingo-for-Schools), [Learning Call (third-party)](https://learningcall.com/duolingos-ai-first-reversal-and-the-end-of-duolingo-for-schools/)
- Duolingo friend streaks and social: [Duolingo blog: Friend Streak](https://blog.duolingo.com/friend-streak/), [Duolingo blog: friends features](https://blog.duolingo.com/friends-social-features/), [Duolingo 101](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo)
- Duolingo Max / Video Call / Adventures: [Duolingo blog: Max](https://blog.duolingo.com/duolingo-max), [TechRadar](https://www.techradar.com/computing/artificial-intelligence/you-can-now-chat-and-play-games-with-duolingos-ai-characters-to-learn-spanish-or-french)
- Hueber Momente interactive version: [Momente A1.1 brochure](https://hueber.de/media/36/MOMENTE_A1-1_Onlinebroschuere.pdf), [Hueber DaF programme 2023](https://www.hueber.de/media/36/Hueber_Programm_DaF_2023.pdf)
- phase6: [App Store listing](https://apps.apple.com/app/id441493173), [phase6 teacher flyer](https://www.phase-6.de/system/galleries/download/2023_03_phase6_Lehrkraefte_Produktfaltblatt_AEA_im_UMA-Plus.pdf)
- Quizlet Live / Blooket / Gimkit: [Educators Technology](https://www.educatorstechnology.com/2023/05/what-is-quizlet-live-and-how-to-use-it.html), [Teachfloor comparison](https://www.teachfloor.com/blog/blooket-vs-gimkit-vs-kahoot--vs-quizizz)
- Busuu: [Busuu Speaking Practice press release](https://www.businesswire.com/news/home/20240627194750/en/Busuu-Launches-AI-powered-%E2%80%98Speaking-Practice%E2%80%99-to-Boost-Real-World-Conversation-Skills), [Test Prep Insight review](https://testprepinsight.com/reviews/busuu-review/)
- Memrise / Busuu reviews: [Capterra](https://www.capterra.com/p/234180/Memrise/reviews/), [G2](https://www.g2.com/compare/busuu-vs-memrise)
- LingQ import: [FluentU review](https://www.fluentu.com/blog/lingq-review/)
