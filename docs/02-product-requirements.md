# Product Requirements — Lessons 1–2 Alpha

Requirement keywords use MUST, SHOULD and MAY in their ordinary engineering sense. Each MUST is a release gate unless explicitly deferred in `15-roadmap-and-backlog.md`.

## Learning and scope

- **LRN-001** The product MUST implement the loop `See → Hear → Notice → Repeat → Recall → Use → Feedback → Review → Master` for every canonical concept type.
- **LRN-002** The learner MUST be able to follow Lesson 1 then Lesson 2, enter either lesson directly, or enter a learned concept through a global hub.
- **LRN-003** Lesson progress MUST be multidimensional: exposure, recognition, recall, listening, production and review stability.
- **LRN-004** Page views and multiple-choice recognition MUST NOT alone mark an item mastered.
- **LRN-005** Alpha MUST contain only verified Lesson 1, Lesson 2 and explicitly attached teacher/personal enrichment.
- **LRN-006** Extra vocabulary, grammar, verbs, phrases, Q&A, dialogues and assignments MUST attach to any lesson without changing the schema.

## Lessons

- **LES-001** The dashboard MUST expose Continue, Today’s Mission, Lessons 1–2, review due, weak skills, recent items and hub shortcuts.
- **LES-002** Each lesson MUST have Overview, Learn, Listen, Practise, Check and Review stages plus a two-minute visual summary.
- **LES-003** A lesson overview MUST show objectives, content counts by source priority, estimated time, progress by skill and required teacher extras.
- **LES-004** Lesson activities MUST be resumeable at a stable activity ID.
- **LES-005** Every hub item MUST link back to all source lessons and relevant lesson activity.

## Vocabulary

- **VOC-001** Every noun MUST expose lemma, article, gender, singular, plural form/pattern, English meaning, pronunciation, audio, example, source, lesson and review status.
- **VOC-002** Profession entries MUST support masculine and feminine person forms and their independent plurals without pretending every pair follows one rule.
- **VOC-003** Morphology MUST mark stem changes, umlauts, suffixes and irregular plurals using the shared infographic code.
- **VOC-004** Vocabulary MUST support image→German, German→meaning, audio→word, article choice, plural formation, typing and spoken-repeat card templates.
- **VOC-005** The 48 teacher professions MUST be filterable as `Teacher extra · Lesson 2` and grouped by semantic category.

## Verbs and grammar

- **VER-001** Every taught verb MUST expose infinitive, meanings/uses, separability/reflexivity where applicable, present conjugation, pronunciation, examples, patterns, source links and review cards.
- **VER-002** Regular endings, spelling adjustments and irregular stems/forms MUST use distinct non-gender semantic tokens.
- **VER-003** Alpha MUST include `sein`, `heißen`, `kommen`, `lernen`, `wohnen`, `leben`, `haben`, `arbeiten`, `machen` and `studieren` where supported by Lessons 1–2.
- **GRM-001** Grammar pages MUST teach through a visual model, noticed contrast, examples, guided manipulation, recall and contextual use.
- **GRM-002** Alpha MUST cover W-questions and statement word order, pronouns, singular/plural present conjugation, `du/Sie`, `aus` with article-bearing countries, negation with `nicht`, `als/bei/in`, and person-form `-in`.

## Phrases, Q&A and conversation

- **PQA-001** Phrases and Q&A MUST be first-class objects, not strings embedded only in lessons.
- **PQA-002** A Q&A object MUST support register, intent, question audio, multiple accepted answer patterns, slot substitutions, grammar links and conversation use.
- **PQA-003** Alpha MUST support greetings/farewells, name, origin, wellbeing, identity, age, residence, relationship/family status and occupation patterns supported by Lessons 1–2.
- **PQA-004** Conversation practice MUST progress from model dialogue to guided choice, slot substitution, word-order construction, spoken rehearsal and independent role-play prompt.

## Audio, listening and speaking

- **AUD-001** Every core word, canonical form and model sentence MUST have a reviewed de-DE audio asset or an explicit gap state.
- **AUD-002** Audio MUST begin promptly after a learner gesture, support repeat, normal and study speed, preserve pitch and show playback/error state.
- **AUD-003** The platform MUST distinguish publisher/source audio from generated pronunciation audio in metadata and UI detail.
- **AUD-004** Workbook listening activities MUST use only track mappings verified by filename, transcript heading and exercise reference.
- **AUD-005** Speaking practice MUST support microphone permission, recording, stop, playback, retry and safe track cleanup on navigation/unmount.
- **AUD-006** Alpha MUST NOT label recording as AI pronunciation scoring. Future assessment outputs require a separate validated feature flag.

## Hubs, review and games

- **HUB-001** Global hubs MUST exist for Vocabulary, Verbs, Grammar, Phrases & Q&A, Listening and Concepts.
- **HUB-002** Hubs MUST default to learned/unlocked content and allow scope filters for lesson, priority, category, mastery, tag and due status.
- **HUB-003** Learners MUST be able to mark Favorite, Difficult, Confusing, Teacher, Exam and add a personal note.
- **REV-001** A review mission MUST mix due/weak items across recognition, recall, listening and production rather than show only flashcards.
- **REV-002** Review scheduling MUST persist event history and expose a scheduler contract compatible with FSRS; Alpha MAY use conservative default parameters.
- **REV-003** Games MUST include flashcards, picture/word match, article sort, audio match, word order, verb builder and word puzzle when content supports them.
- **REV-004** XP, streak and badges MUST reward meaningful attempts and consistency; they MUST NOT override mastery evidence.

## Data, provenance and authoring

- **DAT-001** All teachable objects MUST use stable canonical IDs and typed relationships.
- **DAT-002** Every published field MUST retain source assertion(s), page/exercise/track location, extraction method, confidence and validation state.
- **DAT-003** The system MUST detect duplicate canonical concepts while preserving multiple source links.
- **DAT-004** A scope firewall MUST reject Lesson 3+ and A1.2 content from the Alpha bundle unless explicitly attached as an approved enrichment.
- **DAT-005** Content and media manifests MUST validate in CI before build.

## UX, accessibility and operation

- **UX-001** The platform MUST work at 360px mobile, tablet and desktop widths without horizontal page overflow.
- **UX-002** Primary journeys MUST be keyboard operable, screen-reader labeled, reduced-motion aware and compliant with the WCAG 2.2 AA target.
- **UX-003** Meaning MUST NOT rely on color alone.
- **UX-004** Core Lessons 1–2 content, generated audio, permitted source audio and local progress SHOULD work offline after first load.
- **UX-005** Search MUST return typed results with lesson, source priority, mastery and matched field.
- **UX-006** The product MUST preserve an obvious path back after entering a deep concept from a lesson, hub, review or search.

## Explicitly deferred

- authoritative pronunciation scoring;
- open-ended generative conversation;
- teacher portal and source-upload UI;
- multi-user sync, social leaderboards and certificates;
- automatic whole-book publishing.
