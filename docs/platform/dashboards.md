# Dashboards: student, teacher and admin

Status: approved (ADR-018). Implemented by **Lane 3**. The visual style follows the reference design (`docs/audit/ux-design-consistency-audit.md` §1). The game screens they link to belong to Lane 2.

**Design principle:** each role sees the few things it needs to act on today, then the detail on demand. Every number links to the screen where the person can do something about it.

---

## 1. Student (`/dashboard/`)
The student dashboard is the signed-in version of Wortwerk's *Today* screen plus the account layer. The game owns the Today content; Lane 3 adds the panels marked **(L3)**.

| Panel | Content | Action |
|---|---|---|
| **Today** (L2 component, embedded) | streak, daily goal ring, run preview, next milestone, Quick review | Start Daily Run / Quick review |
| **Assignments (L3)** | open assignments from the student's classes: title, teacher, due date, progress, overdue badge | Continue → `/play/run?scope=<assignment scope>&assignment=<id>` |
| **My book (L3)** | the book position "Momente A1 · Lektion 5 · Seite 62"; the class position, if different ("Your class is on p. 64") | Change position; Follow class |
| **Progress** | words secured up to the position, the skills radar, 1-week recall, this week vs last week | Open Progress (L2) |
| **Classes (L3)** | joined classes with the teacher's name | Join with a code; Leave class |
| **Account (L3)** | display name, sign-in methods (password now; email and Google later), sync status, devices | Change password, Export my data, Delete account, Sign out |

**Empty states:**
- No class: "Learning on your own? Great. Have a class code? Join here."
- No progress: "Start with 1 minute today."

**Privacy note** shown on the Classes panel: "Your teacher sees your progress in their class assignments and lessons."

---

## 2. Teacher (`/teacher/`)

### 2.1 Classes home
A card per class showing:
- the name and the book;
- the class position (L/p);
- students active this week as "12 / 15";
- open assignments with their average completion;
- a ⚠ count of students behind.

Actions: **New class** and **Join codes**.

### 2.2 Class overview (`/teacher/class/?id=`)
| Panel | Content | Action |
|---|---|---|
| **Class position** | "Lektion 5 · Seite 62" | Move class to… (students who follow the class get the new default scope) |
| **This week** | active students, runs completed, average minutes, class streak / team goal progress | n/a |
| **Assignments** | a list with due date, completion % and average score; overdue highlighted | New assignment, Open results |
| **Skills heat map** | students (rows) × skills (Meaning, Gender, Plural, Listening, Grammar, Reading, Writing, Speaking), with cells showing secured % up to the class position, colour-blind-safe with numbers in each cell | Click a cell → student detail filtered to that skill |
| **Tricky words** | the class's 10 most-missed items with the miss rate and a link to the cheat-sheet card | **Assign these** (creates an assignment with this word set) |
| **Needs attention** | students inactive 7+ days, students below 50% on the current lesson, students with overdue work | Open student, nudge (a later feature) |
| **Roster** | names, join date, last active | Remove from class, regenerate the join code |
| **Class settings** | the book, the leaderboard switch (**off by default**), archive the class | n/a |

### 2.3 Assignment builder (`/teacher/assign/?class=`)
1. **Scope:** use the same scope picker as the game: up to a lesson or page, specific lessons, topics, sources, "tricky words of this class".
2. **Skills:** checkboxes.
3. **Size:** number of items or minutes.
4. **Due date.**
5. **Preview:** a sample of 5 generated tasks, shown with the no-giveaway rule.

Result: the assignment appears on every member's dashboard. A share link and QR code are offered for students who are not signed in; they fall back to the Class mode A result code.

### 2.4 Assignment results (`/teacher/assignment/?id=`)
- Per-student completion and per-skill scores.
- The most-missed items for this assignment.
- Export as CSV.

### 2.5 Student detail (`/teacher/student/?class=&id=`)
- Per-lesson progress up to the class position.
- Per-dimension segments for the student's tricky words.
- Recent activity (7/30 days).
- Assignment history.
- Later: writing and speaking submissions with a comment box (the feedback inbox).

### 2.6 Teacher extras (`/teacher/extras/?class=`)
- Paste or upload a CSV with the columns German, English, Lesson, Page, Tags, Gender?, Plural?.
- Validate it and preview it as cards; duplicates and umlaut problems are flagged.
- **Publish to class.** Extras are served as an overlay content pack (CONTRACTS §5) and are labelled "Teacher extra" everywhere.

### 2.7 Live class game (later, Durable Objects)
Launch Four Corners or Blitz on the projector; students join with a code; team mode; it uses the class's current scope.

---

## 3. Admin (`/admin/`)
| Section | Content | Actions |
|---|---|---|
| **Overview** | total users by role, weekly active users, active classes, sync errors in the last 24 h, the deployed version (git SHA) | n/a |
| **Users** | search by name or username, filter by role, status and demo flag | create a user, change role, disable or enable, reset password (sets must-change), delete (with confirmation), view audit trail |
| **Classes** | all classes with their teacher, size and last activity | transfer to another teacher, archive |
| **Content packs** | each pack with level, item count and **German review status** (Pending review / Reviewed) | enable in production; mark Reviewed (owner or a qualified reviewer only; the action is logged with the reviewer's name) |
| **Feature flags** | `email_login`, `google_login`, `class_leaderboard`, `live_game`, `bonus_rounds` | toggle (logged) |
| **Data requests** | export or deletion requests and their status | run export, confirm deletion |
| **Audit log** | a filterable list of security-relevant actions | export CSV |
| **System** | D1 size, error rate (Workers analytics), last migration, last seed run | n/a |

Admins can't see a student's personal notes. Admin actions on a user are logged and shown to that user in their account history.

---

## 4. Navigation by role
- **Signed out:** the current app, plus a **Sign in** button in the shell (Lane 1 adds the slot per CONTRACTS §2; Lane 3 supplies the component).
- **Student:** the shell gains **Dashboard**.
- **Teacher:** **Dashboard** + **Teaching**.
- **Admin:** **Dashboard** + **Teaching** (if also a teacher) + **Admin**.
- On mobile these items live in the "Menu" tab, so the 5 bottom tabs don't change.

## 5. API surface (Lane 3), JSON, all under `/api`
- **Auth:** `auth/login`, `auth/logout`, `auth/me`, `auth/password/change`, and the reserved email/google routes.
- **Sync:** `sync/push`, `sync/pull`.
- **Student:** `me/dashboard`, `me/classes`, `me/assignments`, `me/position`, `me/export`, `me/delete`.
- **Teacher:**
  - `teacher/classes`, `teacher/class?id=`, `teacher/class/position`;
  - `teacher/assignments` (CRUD), `teacher/assignment?id=` (results);
  - `teacher/student?class=&id=`, `teacher/extras`.
- **Admin:** `admin/users` (CRUD), `admin/classes`, `admin/packs`, `admin/flags`, `admin/audit`, `admin/system`.
- **Guards:** every route checks role and ownership on the server. Lists are paginated, and inputs are validated with a shared schema.
