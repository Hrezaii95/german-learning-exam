# German Learning OS — Alpha

**Study URL:** [http://localhost:3456/web/](http://localhost:3456/web/)

---

## START HERE (30 seconds)

```powershell
cd "E:\claude-cursor\side projects\German learning"
npm start
```

Then open **http://localhost:3456/web/** — or in a second terminal:

```powershell
npm run open
```

`npm start` runs `prestart` first, which creates the `audio/` junction if needed so 🎧 book MP3s work.

### Option B — Double-click (TTS only; MP3 blocked)

```
E:\claude-cursor\side projects\German learning\web\index.html
```

Browsers block `file://` access to audio files. Use Option A for real MP3 playback.

---

## First-time setup

| Step | What |
|------|------|
| 1 | [Node.js](https://nodejs.org/) installed (`node -v`) |
| 2 | Audio zip extracted as `Audio-20260730T043413Z-1-001/` (387 MP3s) |
| 3 | `npm start` — auto-links `audio/` → zip folder |

No `npm install` needed — `serve` is fetched via `npx`.

---

## What's included

| Content | Count |
|---------|-------|
| Lesson 1 sections | 12 |
| Lesson 1 phrases/vocab | 47 |
| Lesson 2 extract | vocabulary + phrases from Momente PDF |
| Berufe (professions) | **48** (all from Notes) |
| Verb conjugation tables | 4+ (sein, heißen, kommen, lernen + L2) |
| Quiz modes | 4 (EN↔DE, article, conjugation, Berufe) |
| Flashcards | All 48 professions |
| Real MP3 tracks wired | **18** (`priority_for_alpha` from `content/extracted/audio-map.json`) |
| TTS fallback | All other play buttons |

## Gender colors (mandatory everywhere)

| Article | Color |
|---------|-------|
| **der** | Blue |
| **die** (fem. sg) | Red |
| **das** | Green |
| **die** (plural) | Purple |

## Audio: real MP3 vs TTS

**Real book audio** — 18 priority tracks from `content/extracted/audio-map.json`, served via `/audio/` junction:

| Tracks | Content |
|--------|---------|
| 01–04 | L1 Übung 3 — Greetings dialogue |
| 05–06 | L1 Übung 9a/b — Names & origins |
| 07–10 | L2 Übung 6a — Berufe vocab |
| 11–14 | L2 Übung 6b — Berufe vocab |
| 15 | L2 Übung 12 — Berufe dialogue |
| 31, 61–62 | Fokus Beruf Modul 1 & 2 |

🎧 = real MP3 · 🔊 = TTS fallback. Full index: `content/extracted/AUDIO-INDEX.md` (387 files in pack).

---

## Exam cram plan

### Tonight — 15 minutes (bare minimum)

1. **Dashboard → L1 Greetings audio** (3 min) — listen twice, repeat aloud
2. **Verbs → sein + heißen** (5 min) — *ich bin, du bist, ich heiße*
3. **Quiz → EN↔DE Match** (7 min) — aim for 10+ correct; mark misses ☆ on Review

### 30 minutes — solid prep

1. **Lesson 1 full pass** with 🔊/🎧 (10 min) — star weak items on Review
2. **Berufe → top 15** via grid + flashcards (12 min) — *Arzt, Lehrer, Koch, Polizist, Ingenieur…*
3. **Quiz → Article + Conjugation** (8 min) — gender colors = your cheat sheet

### 60 minutes — full coverage

1. **Lesson 1 complete** + all book audio on Dashboard (15 min)
2. **Berufe all 48** — grid, flashcards, Play L2 Audio Tracks (20 min)
3. **All verbs** conjugation drill (10 min)
4. **Quiz all 4 modes** until 80%+ (10 min)
5. **Review → weak items** only (5 min)

### Exam-day morning (10 min)

Dashboard audio once → Review ☆ items → one Quiz round → done.

---

## Features

- Dark indigo sidebar + light content (mockup-inspired)
- Dashboard with stats + today's plan + book audio shortcuts
- Lesson 1 + Lesson 2 studyable cards (auto-loads `content/extracted/*.json`)
- Berufe grid with gender color coding (der=blue, die=red, plural=purple)
- Verb conjugation tables with audio
- 4 quiz modes + flashcards
- Mark items "weak" for exam focus (localStorage)
- Mobile bottom nav + hamburger sidebar
- Auto-merge from `content/extracted/` when parallel lanes finish

## Gaps (not blocking exam)

- Lesson 2 partner texts not line-parsed (see `content/extracted/EXTRACT-GAPS.md`)
- Individual profession MP3 per word (uses rotating L2 tracks + TTS)
- No conversation builder / STT scoring
- No spaced repetition algorithm

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **Port 3456 in use** | `npx serve . -p 3457` → open `http://localhost:3457/web/` |
| **🎧 silent / 404** | Use `npm start`, not `file://`. Check `audio/` junction exists. |
| **Only 🔊 TTS** | Audio zip missing or junction failed — see manual link below |
| **Blank / broken page** | URL must be `/web/` (not `/`). Hard refresh: Ctrl+Shift+R |
| **Progress reset** | Weak marks live in browser localStorage; clearing site data wipes them |
| **`npm start` hangs** | First run downloads `serve` via npx — wait ~10s, then retry |

### Manual audio junction (Windows)

If `prestart` could not create the link (needs admin on some machines):

```powershell
cd "E:\claude-cursor\side projects\German learning"
cmd /c mklink /J audio "Audio-20260730T043413Z-1-001"
```

Verify: open `http://localhost:3456/audio/Audio/Momente_A1_1_AB_CD1/1_01_AB_Momente_A11_1_3.mp3` — should download/play.

### Verify server is up

```powershell
curl http://localhost:3456/web/ -I
# Expect: HTTP/1.1 200 OK
```

---

## File structure

```
web/
  index.html       ← app entry (open via /web/)
  app.js           ← UI logic
  styles.css
  content-loader.js← merges content/extracted/ JSON
  data.js          ← Lesson 1 + verbs (offline fallback)
  berufe-data.js   ← 48 professions (offline fallback)
  audio-map.js     ← MP3 path mappings
  data/            ← JSON mirrors (optional)
content/extracted/
  lesson1.json lesson2.json berufe.json audio-map.json
scripts/
  ensure-audio.js  ← prestart junction helper
audio/             ← junction → Audio-20260730T043413Z-1-001/
```

## npm scripts

| Command | Action |
|---------|--------|
| `npm start` | Link audio + serve on port 3456 |
| `npm run open` | Open study URL in default browser (Windows) |
| `npm run study` | Same as start (alias) |
