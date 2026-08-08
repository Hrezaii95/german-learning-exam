/* German Learning OS — Alpha App */
(function () {
  'use strict';

  const STORAGE_KEY = 'german-learning-os';
  let state = loadState();
  let currentPage = 'dashboard';
  let quizState = { mode: 'match', score: 0, total: 0, current: null };
  let flashcardIndex = 0;
  let flashcardFlipped = false;
  let selectedVerb = 'sein';
  let berufeFilter = '';

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { weak: [], stats: { quizzes: 0, correct: 0 } };
    } catch { return { weak: [], stats: { quizzes: 0, correct: 0 } }; }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function isWeak(id) {
    return state.weak.includes(id);
  }

  function toggleWeak(id) {
    const idx = state.weak.indexOf(id);
    if (idx >= 0) state.weak.splice(idx, 1);
    else state.weak.push(id);
    saveState();
    render();
  }

  let currentAudio = null;

  /* Speech + real audio */
  let deVoice = null;
  function pickDeVoice() {
    if (deVoice) return deVoice;
    const voices = window.speechSynthesis?.getVoices() || [];
    deVoice = voices.find(v => v.lang === 'de-DE')
      || voices.find(v => v.lang.startsWith('de'))
      || voices.find(v => /german|deutsch/i.test(v.name));
    return deVoice;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => { deVoice = null; pickDeVoice(); };
  }

  function speak(text, lang = 'de-DE') {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.9;
    const voice = pickDeVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  function playAudioFile(relPath, fallbackText) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    window.speechSynthesis?.cancel();
    const base = window.AUDIO_BASE || '../audio';
    const url = base + '/' + relPath.replace(/^\//, '');
    const audio = new Audio(encodeURI(url).replace(/#/g, '%23'));
    currentAudio = audio;
    audio.onerror = () => { currentAudio = null; if (fallbackText) speak(fallbackText); };
    audio.play().catch(() => { if (fallbackText) speak(fallbackText); });
  }

  function playSmart(audioPath, fallbackText) {
    if (audioPath) playAudioFile(audioPath, fallbackText);
    else speak(fallbackText);
  }

  /* Gender color HTML */
  function colorizeNoun(text) {
    if (!text) return '';
    return text.split(' / ').map(part => {
      part = part.trim();
      if (part.startsWith('der ')) return `<span class="der">${part}</span>`;
      if (part.startsWith('die ')) {
        const word = part.slice(4);
        if (word.endsWith('innen') || word.endsWith('männer') || word.endsWith('frauen') || word.endsWith('leute')) {
          return `<span class="plural">${part}</span>`;
        }
        if (word.endsWith('en') && !word.endsWith('chen') && !word.endsWith('lein') && word.length > 4) {
          const plWords = ['Ärzte','Köche','Sekretäre','Architekten','Fotografen','Ingenieure','Polizisten','Soldaten','Chirurgen','Tierärzte','Zahnärzte','Journalisten','Detektive','Geheimagenten','Konditoren','Flugzeugpiloten','Rechtsanwälte','Installateure','Briefträger','Postboten','Feuerwehrmänner','Putzmänner','Geschäftsleute','Friseure','Tankwarte'];
          if (plWords.some(w => word.includes(w) || word === w)) return `<span class="plural">${part}</span>`;
        }
        return `<span class="die">${part}</span>`;
      }
      if (part.startsWith('das ')) return `<span class="das">${part}</span>`;
      return part;
    }).join(' <span style="color:#999">/</span> ');
  }

    function decodeSpeakAttr(raw) {
    try { return decodeURIComponent(String(raw ?? '')); } catch (e) { return String(raw ?? ''); }
  }
  function safeDecodeSpeakText(text) {
    return (text || '').replace(/<[^>]+>/g, '').split(' / ')[0].trim();
  }

  /** Only exact per-string MP3 maps — never dialogue/exercise tracks on list rows */
  function lookupWordAudio(de) {
    const key = safeDecodeSpeakText(de).toLowerCase();
    return window.WORD_AUDIO?.[key] || null;
  }

  function playBtn(text, audioPath) {
    const clean = safeDecodeSpeakText(text);
    const wordMp3 = audioPath || lookupWordAudio(clean);
    const encoded = encodeURIComponent(clean);
    const audioAttr = wordMp3 ? ` data-audio="${wordMp3}" data-audio-exact="true"` : '';
    const icon = wordMp3 ? '🎧' : '🔊';
    const title = wordMp3 ? 'Play (word audio)' : 'Play (speak German)';
    return `<button class="btn-icon" data-speak="${encoded}"${audioAttr} title="${title}">${icon}</button>`;
  }

  function dialoguePlayBtn(relPath, label) {
    const lbl = label || 'Play dialogue';
    return `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();App.playDialogue('${relPath.replace(/'/g, "\\'")}')">🎧 ${lbl}</button>`;
  }

  function weakBtn(id) {
    const marked = isWeak(id);
    return `<button class="btn-weak ${marked ? 'marked' : ''}" onclick="event.stopPropagation();App.toggleWeak('${id}')">${marked ? '★ Weak' : '☆ Mark'}</button>`;
  }

  function getL1Sections() {
    return window.CONTENT?.lesson1Sections || APP_DATA.lesson1.sections;
  }

  function getL2Sections() {
    return window.CONTENT?.lesson2Sections || [];
  }

  function getVerbs() {
    return window.CONTENT?.verbs || APP_DATA.verbs.verbs;
  }

  function renderLessonSections(sections, prefix, title, subtitle) {
    let html = `<div class="page-header"><h2>${title}</h2><p>${subtitle}</p></div>`;
    sections.forEach(sec => {
      html += `<div class="vocab-section"><h3>${sec.name}</h3><div class="vocab-list">`;
      sec.items.forEach((item, i) => {
        const id = `${prefix}-${sec.id}-${i}`;
        const deHtml = item.article || item.de.startsWith('der ') || item.de.startsWith('die ') || item.de.startsWith('das ')
          ? colorizeNoun(item.de) : item.de;
        html += `<div class="vocab-item">
          <span class="de">${deHtml}${item.plural ? `<br><small class="plural">${item.plural}</small>` : ''}</span>
          <span class="en">${item.en}</span>
          <div class="vocab-actions">${playBtn(item.de)} ${weakBtn(id)}</div>
        </div>`;
      });
      html += `</div></div>`;
    });
    return html;
  }
  function navigate(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page)?.classList.add('active');
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page);
    });
    document.querySelector('.sidebar')?.classList.remove('open');
    render();
  }

  /* Render functions */
  function renderDashboard() {
    const l1 = getL1Sections().reduce((s, sec) => s + sec.items.length, 0);
    const l2 = getL2Sections().reduce((s, sec) => s + sec.items.length, 0);
    const berufeCount = BERUFE_DATA.professions.length;
    const verbCount = getVerbs().length;
    const weakCount = state.weak.length;
    const src = window.CONTENT?.source || {};

    return `
      <div class="page-header"><h2>Guten Morgen! 👋</h2><p>Ready to study? Pick a section below.</p></div>
      <div class="continue-card">
        <div>
          <h3>Continue: ${CONTENT.lesson2?.title?.de || 'Berufe (Professions)'}</h3>
          <p>Lesson 2 · ${berufeCount} professions · ${l2} L2 items</p>
          <button class="btn" onclick="App.navigate('lesson2')">Start Lesson 2 →</button>
        </div>
      </div>
      <div class="card-grid">
        <div class="card stat-card"><div class="stat-value">${l1}</div><div class="stat-label">Lesson 1</div></div>
        <div class="card stat-card"><div class="stat-value">${l2 || berufeCount}</div><div class="stat-label">Lesson 2 / Berufe</div></div>
        <div class="card stat-card"><div class="stat-value">${verbCount}</div><div class="stat-label">Verbs</div></div>
        <div class="card stat-card"><div class="stat-value">${weakCount}</div><div class="stat-label">Marked Weak</div></div>
      </div>
      <p style="font-size:11px;color:var(--text-secondary);margin-bottom:12px">Data: L1 ${src.lesson1 || '?'} · L2 ${src.lesson2 || '?'} · Berufe ${src.berufe || '?'}</p>
      <div class="card" style="margin-top:16px">
        <h3 style="margin-bottom:12px">🎧 Book Audio (Momente AB)</h3>
        <div class="vocab-list" style="margin-bottom:12px">
          <div class="vocab-item" style="cursor:pointer" onclick="App.playTrack('l1-greetings',0)"><span>L1 Greetings dialogue</span><span>🎧 real</span></div>
          <div class="vocab-item" style="cursor:pointer" onclick="App.playTrack('l1-dialogue',0)"><span>L1 Names & origins</span><span>🎧 real</span></div>
          <div class="vocab-item" style="cursor:pointer" onclick="App.playTrack('l2-berufe-6a',0)"><span>L2 Berufe vocab 6a</span><span>🎧 real</span></div>
          <div class="vocab-item" style="cursor:pointer" onclick="App.playBerufeDialogue()"><span>L2 Berufe dialogue</span><span>🎧 real</span></div>
          <div class="vocab-item" style="cursor:pointer" onclick="App.playTrack('berufe-fokus-m1')"><span>Fokus Beruf Modul 1</span><span>🎧 real</span></div>
          <div class="vocab-item" style="cursor:pointer" onclick="App.playTrack('berufe-fokus-m2a')"><span>Fokus Beruf Modul 2</span><span>🎧 real</span></div>
        </div>
        <p style="font-size:12px;color:var(--text-secondary)">${window.AUDIO_STATS ? AUDIO_STATS.wiredTracks + ' priority MP3s · ' + (AUDIO_STATS.totalPackFiles || 387) + ' in pack · rest = TTS' : 'TTS fallback for unmapped items'}</p>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="margin-bottom:12px">Today's Plan</h3>
        <div class="vocab-list">
          <div class="vocab-item" style="cursor:pointer" onclick="App.navigate('lesson1')"><span>📖 Lesson 1 — Greetings & Basics</span><span style="color:var(--text-secondary)">~15 min</span></div>
          <div class="vocab-item" style="cursor:pointer" onclick="App.navigate('lesson2')"><span>📗 Lesson 2 — Berufe & Personal Info</span><span style="color:var(--text-secondary)">~20 min</span></div>
          <div class="vocab-item" style="cursor:pointer" onclick="App.navigate('berufe')"><span>👔 Berufe — All 48 Professions</span><span style="color:var(--text-secondary)">~15 min</span></div>
          <div class="vocab-item" style="cursor:pointer" onclick="App.navigate('verbs')"><span>📝 Verb Conjugation (sein, heißen…)</span><span style="color:var(--text-secondary)">~10 min</span></div>
          <div class="vocab-item" style="cursor:pointer" onclick="App.navigate('quiz')"><span>❓ Quiz Practice</span><span style="color:var(--text-secondary)">~15 min</span></div>
        </div>
      </div>
    `;
  }

  function renderLesson1() {
    const l1 = window.CONTENT?.lesson1;
    const title = l1?.title?.de || 'Lesson 1 — Greetings & Basics';
    const sub = `${l1?.cefr || 'A1'} · ${getL1Sections().length} sections · ${window.CONTENT?.source?.lesson1 || 'inline'}`;
    return renderLessonSections(getL1Sections(), 'l1', title, sub);
  }

  function renderLesson2() {
    const l2 = window.CONTENT?.lesson2;
    if (!l2) return `<div class="page-header"><h2>Lesson 2</h2><p class="empty-state">Loading extracted content… refresh if this persists.</p></div>`;
    const title = l2.title?.de || 'Was macht ihr beruflich?';
    const mc = l2.meta?.itemCounts || {};
    const sub = `${l2.cefr || 'A1'} · ${mc.vocabulary || 0} vocab · ${mc.phrases || 0} phrases · ${mc.grammar || 0} grammar · ${mc.dialogues || 0} dialogues`;
    let html = renderLessonSections(getL2Sections(), 'l2', title, sub);
    if (l2.dialogues?.length) {
      html += `<div class="vocab-section"><h3>Dialogues</h3>`;
      l2.dialogues.forEach(d => {
        const entry = d.audio && window.AUDIO_MAP?.[d.audio];
        const audioPath = entry ? (Array.isArray(entry) ? entry[0] : entry) : null;
        html += `<div class="card" style="margin-bottom:12px"><h4 style="margin-bottom:6px">${d.title}</h4>
          <p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">${d.source || ''}</p>`;
        if (audioPath) html += dialoguePlayBtn(audioPath, 'Play dialogue');
        html += `<div class="vocab-list" style="margin-top:12px">`;
        (d.lines || []).forEach(line => {
          html += `<div class="vocab-item"><span class="de"><strong>${line.speaker}:</strong> ${line.de}</span><span class="en">${line.en}</span></div>`;
        });
        html += `</div></div>`;
      });
      html += `</div>`;
    }
    html += `<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="App.navigate('berufe')">→ All 48 Berufe</button>
      <button class="btn btn-secondary" onclick="App.playBerufeDialogue()">🎧 L2 Berufe audio</button>
    </div>`;
    return html;
  }

  function renderBerufe() {
    const filtered = BERUFE_DATA.professions.filter(p =>
      !berufeFilter || p.en.toLowerCase().includes(berufeFilter.toLowerCase()) ||
      p.mascSg.toLowerCase().includes(berufeFilter.toLowerCase())
    );
    let html = `<div class="page-header"><h2>Berufe — Professions</h2><p>${BERUFE_DATA.professions.length} jobs · Lesson 2</p></div>
      <input class="search-bar" placeholder="Search professions…" value="${berufeFilter}" oninput="App.setBerufeFilter(this.value)">
      <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="App.navigate('flashcards')">🃏 Flashcards</button>
        <button class="btn btn-secondary" onclick="App.speakAllBerufe()">🎧 Play L2 Audio Tracks</button>
      </div>
      <div class="berufe-grid">`;
    filtered.forEach(p => {
      const id = `beruf-${p.id}`;
      html += `<div class="beruf-card" onclick="App.showBerufDetail(${p.id})">
        <div class="emoji">${p.emoji}</div>
        <div class="en-label">${p.en}</div>
        <div class="de-forms">${colorizeNoun(p.mascSg)}<br>${colorizeNoun(p.femSg)}</div>
        <div style="margin-top:8px;display:flex;gap:4px;justify-content:center;align-items:center" onclick="event.stopPropagation()">
          ${playBtn(p.mascSg)} ${weakBtn(id)}
        </div>
      </div>`;
    });
    html += `</div>`;
    return html;
  }

  function renderVerbs() {
    const verbs = getVerbs();
    if (!verbs.find(v => v.infinitive === selectedVerb)) selectedVerb = verbs[0]?.infinitive || 'sein';
    let html = `<div class="page-header"><h2>Verb Conjugation</h2><p>${verbs.map(v => v.infinitive).join(' · ')}</p></div>
      <div class="verb-tabs">`;
    verbs.forEach(v => {
      html += `<button class="verb-tab ${v.infinitive === selectedVerb ? 'active' : ''}" onclick="App.selectVerb('${v.infinitive}')">${v.infinitive}</button>`;
    });
    html += `</div>`;
    const verb = verbs.find(v => v.infinitive === selectedVerb);
    if (verb) {
      html += `<div class="card"><h3 style="margin-bottom:4px">${verb.infinitive} <span style="color:var(--text-secondary);font-weight:400">(${verb.en})</span></h3>
        <table class="conj-table"><thead><tr><th>Pronoun</th><th>Form</th><th>English</th><th></th></tr></thead><tbody>`;
      verb.conjugations.forEach(c => {
        const full = `${c.pronoun} ${c.form}`;
        html += `<tr class="${c.highlight ? 'highlight' : ''}">
          <td>${c.pronoun}</td><td class="form">${c.form}</td><td>${c.en}</td>
          <td>${playBtn(full)}</td></tr>`;
      });
      html += `</tbody></table></div>`;
    }
    return html;
  }

  function renderQuiz() {
    return `<div class="page-header"><h2>Quiz</h2><p>Test yourself before the exam</p></div>
      <div class="quiz-modes">
        <button class="quiz-mode-btn ${quizState.mode === 'match' ? 'active' : ''}" onclick="App.setQuizMode('match')">EN ↔ DE Match</button>
        <button class="quiz-mode-btn ${quizState.mode === 'article' ? 'active' : ''}" onclick="App.setQuizMode('article')">Article Picker</button>
        <button class="quiz-mode-btn ${quizState.mode === 'conjugation' ? 'active' : ''}" onclick="App.setQuizMode('conjugation')">Conjugation</button>
        <button class="quiz-mode-btn ${quizState.mode === 'berufe' ? 'active' : ''}" onclick="App.setQuizMode('berufe')">Berufe</button>
      </div>
      <div class="card quiz-card" id="quiz-area">${renderQuizQuestion()}</div>
      <div class="quiz-score">Score: ${quizState.score} / ${quizState.total}</div>`;
  }

  function renderQuizQuestion() {
    if (!quizState.current) generateQuizQuestion();
    const q = quizState.current;
    if (!q) return '<p>Loading…</p>';
    let html = `<div class="quiz-question">${q.question}</div><div class="quiz-options">`;
    q.options.forEach((opt, i) => {
      html += `<div class="quiz-option" onclick="App.answerQuiz(${i})">${opt}</div>`;
    });
    html += `</div><div style="margin-top:16px"><button class="btn btn-secondary" onclick="App.nextQuiz()">Skip →</button></div>`;
    return html;
  }

  function generateQuizQuestion() {
    const mode = quizState.mode;
    if (mode === 'match') {
      const allItems = [];
      APP_DATA.lesson1.sections.forEach(s => s.items.forEach((item, i) => allItems.push({ ...item, id: `l1-${s.id}-${i}` })));
      const item = allItems[Math.floor(Math.random() * allItems.length)];
      const correct = item.de;
      const wrong = allItems.filter(x => x.de !== correct).sort(() => Math.random() - 0.5).slice(0, 3).map(x => x.de);
      const options = [correct, ...wrong].sort(() => Math.random() - 0.5);
      quizState.current = { question: `What is "<strong>${item.en}</strong>" in German?`, options, correct: options.indexOf(correct), answer: correct };
    } else if (mode === 'article') {
      const profs = BERUFE_DATA.professions;
      const p = profs[Math.floor(Math.random() * profs.length)];
      const forms = [{ text: p.mascSg, article: 'der' }, { text: p.femSg, article: 'die' }];
      const chosen = forms[Math.floor(Math.random() * forms.length)];
      const noun = chosen.text.replace(/^(der|die|das)\s+/, '');
      const articles = ['der', 'die', 'das'].sort(() => Math.random() - 0.5);
      quizState.current = {
        question: `What is the correct article for <strong>${noun}</strong>? (${p.en})`,
        options: articles,
        correct: articles.indexOf(chosen.article),
        answer: chosen.article
      };
    } else if (mode === 'conjugation') {
      const verbs = APP_DATA.verbs.verbs;
      const verb = verbs[Math.floor(Math.random() * verbs.length)];
      const conj = verb.conjugations[Math.floor(Math.random() * verb.conjugations.length)];
      const wrong = verb.conjugations.filter(c => c.form !== conj.form).map(c => c.form);
      const options = [conj.form, ...wrong.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
      quizState.current = {
        question: `Conjugate <strong>${verb.infinitive}</strong> for "<strong>${conj.pronoun}</strong>":`,
        options,
        correct: options.indexOf(conj.form),
        answer: conj.form
      };
    } else if (mode === 'berufe') {
      const profs = BERUFE_DATA.professions;
      const p = profs[Math.floor(Math.random() * profs.length)];
      const forms = [p.mascSg, p.femSg, p.mascPl, p.femPl];
      const correct = forms[Math.floor(Math.random() * forms.length)];
      const wrong = profs.filter(x => x.id !== p.id).sort(() => Math.random() - 0.5).slice(0, 3).map(x => x.mascSg);
      const options = [correct, ...wrong].sort(() => Math.random() - 0.5);
      quizState.current = {
        question: `What is "<strong>${p.en}</strong>" in German?`,
        options: options.map(o => o.replace(/^(der|die|das)\s+/, (m, a) => m)),
        correct: options.indexOf(correct),
        answer: correct
      };
    }
  }

  function answerQuiz(index) {
    const q = quizState.current;
    if (!q) return;
    quizState.total++;
    const opts = document.querySelectorAll('.quiz-option');
    opts.forEach((el, i) => {
      if (i === q.correct) el.classList.add('correct');
      else if (i === index) el.classList.add('wrong');
      el.style.pointerEvents = 'none';
    });
    if (index === q.correct) {
      quizState.score++;
      state.stats.correct++;
    } else {
      speak(q.answer);
    }
    state.stats.quizzes++;
    saveState();
    setTimeout(() => nextQuiz(), 1200);
  }

  function nextQuiz() {
    quizState.current = null;
    const area = document.getElementById('quiz-area');
    if (area) area.innerHTML = renderQuizQuestion();
    const scoreEl = document.querySelector('.quiz-score');
    if (scoreEl) scoreEl.textContent = `Score: ${quizState.score} / ${quizState.total}`;
  }

  function renderFlashcards() {
    const profs = BERUFE_DATA.professions;
    const p = profs[flashcardIndex % profs.length];
    const id = `beruf-${p.id}`;
    const front = flashcardFlipped ? `
      <div class="emoji">${p.emoji}</div>
      <div class="front-text">${colorizeNoun(p.mascSg)}</div>
      <div class="back-text">${colorizeNoun(p.femSg)}</div>
      <div class="back-text" style="margin-top:8px">${colorizeNoun(p.mascPl)} · ${colorizeNoun(p.femPl)}</div>
    ` : `
      <div class="emoji">${p.emoji}</div>
      <div class="front-text">${p.en}</div>
      <div class="back-text">Tap to flip</div>
    `;
    return `<div class="page-header"><h2>Flashcards — Berufe</h2><p>${flashcardIndex + 1} / ${profs.length}</p></div>
      <div class="flashcard-container">
        <div class="flashcard" onclick="App.flipCard()">${front}</div>
        <div class="flashcard-nav">
          <button class="btn btn-secondary" onclick="App.prevCard()">← Prev</button>
          ${playBtn(p.mascSg)}
          ${weakBtn(id)}
          <button class="btn btn-secondary" onclick="App.nextCard()">Next →</button>
        </div>
      </div>`;
  }

  function renderReview() {
    if (state.weak.length === 0) {
      return `<div class="page-header"><h2>Review — Weak Items</h2><p>Items you marked for extra practice</p></div>
        <div class="empty-state"><p>No weak items yet. Mark items with ☆ during study.</p></div>`;
    }
    let html = `<div class="page-header"><h2>Review — Weak Items</h2><p>${state.weak.length} items marked</p></div><div class="weak-list">`;
    state.weak.forEach(id => {
      let label = id;
      if (id.startsWith('beruf-')) {
        const p = BERUFE_DATA.professions.find(x => `beruf-${x.id}` === id);
        if (p) label = `${p.emoji} ${p.en} — ${p.mascSg}`;
      } else if (id.startsWith('l1-')) {
        APP_DATA.lesson1.sections.forEach(s => s.items.forEach((item, i) => {
          if (`l1-${s.id}-${i}` === id) label = `${item.de} — ${item.en}`;
        }));
      }
      html += `<div class="weak-item"><span>${label}</span>
        <button class="btn btn-sm btn-secondary" onclick="App.toggleWeak('${id}')">Remove</button></div>`;
    });
    html += `</div>`;
    return html;
  }

  function showBerufDetail(id) {
    const p = BERUFE_DATA.professions.find(x => x.id === id);
    if (!p) return;
    const modal = document.getElementById('modal');
    modal.innerHTML = `<div class="modal">
      <button class="modal-close" onclick="App.closeModal()">✕</button>
      <div style="text-align:center"><div style="font-size:48px">${p.emoji}</div>
      <h3>${p.en}</h3></div>
      <div style="margin:16px 0;line-height:2">
        <div><strong>Masc. sg:</strong> ${colorizeNoun(p.mascSg)} ${playBtn(p.mascSg)}</div>
        <div><strong>Masc. pl:</strong> ${colorizeNoun(p.mascPl)}</div>
        <div><strong>Fem. sg:</strong> ${colorizeNoun(p.femSg)} ${playBtn(p.femSg)}</div>
        <div><strong>Fem. pl:</strong> ${colorizeNoun(p.femPl)}</div>
      </div>
      ${weakBtn(`beruf-${p.id}`)}
    </div>`;
    modal.classList.add('open');
  }

  function closeModal() {
    document.getElementById('modal').classList.remove('open');
  }

  function speakAllBerufe() {
    const tracks = [...(window.AUDIO_MAP?.['l2-berufe-6a'] || []), ...(window.AUDIO_MAP?.['l2-berufe-6b'] || [])];
    if (!tracks.length) return;
    let i = 0;
    function next() {
      if (i >= tracks.length) return;
      const audio = new Audio(encodeURI((window.AUDIO_BASE || '../audio') + '/' + tracks[i]).replace(/#/g, '%23'));
      currentAudio = audio;
      audio.onended = () => { i++; setTimeout(next, 400); };
      audio.onerror = () => { i++; next(); };
      audio.play().catch(() => { i++; next(); });
    }
    next();
  }

  function playTrack(key, index) {
    const entry = window.AUDIO_MAP?.[key];
    if (!entry) return;
    playAudioFile(Array.isArray(entry) ? entry[index || 0] : entry);
  }

  function playBerufeDialogue() {
    const p = window.AUDIO_MAP?.['l2-berufe-dialogue'];
    if (p) playDialogue(p);
  }

  function playDialogue(relPath) {
    if (!relPath) return;
    playAudioFile(relPath, '');
  }

  function applyAudioMapFromExtracted(ext) {
    const p = ext.priority_for_alpha;
    if (!p || !p.length) return;
    window.AUDIO_BASE = '../audio';
    /* Dialogue / listen sections only — not wired to vocab list rows */
    window.AUDIO_MAP = {
      'l1-greetings': p.slice(0, 4),
      'l1-dialogue': p.slice(4, 6),
      'l2-berufe-6a': p.slice(6, 10),
      'l2-berufe-6b': p.slice(10, 14),
      'l2-berufe-dialogue': p[14],
      'berufe-fokus-m1': p[15],
      'berufe-fokus-m2a': p[16],
      'berufe-fokus-m2b': p[17]
    };
    window.WORD_AUDIO = window.WORD_AUDIO || {};
    window.AUDIO_STATS = {
      totalPackFiles: ext.total_files || 387,
      wiredTracks: p.length,
      wiredSections: 8,
      source: 'content/extracted/audio-map.json',
      ttsFallback: 'Unmapped items use browser TTS (de-DE)'
    };
  }

  async function loadExternalMaps() {
    try {
      const r = await fetch('../content/extracted/audio-map.json');
      if (r.ok) applyAudioMapFromExtracted(await r.json());
    } catch { /* use inlined audio-map.js */ }
    try {
      const b = await fetch('../content/extracted/berufe.json');
      if (b.ok) window.BERUFE_DATA = await b.json();
    } catch { /* keep berufe-data.js */ }
    try {
      const l2 = await fetch('../content/extracted/lesson2.json');
      if (l2.ok) window.LESSON2_DATA = await l2.json();
    } catch { /* not yet */ }
  }

  function render() {
    const main = document.getElementById('main-content');
    if (!main) return;
    const pages = {
      dashboard: renderDashboard,
      vocabulary: () => window.HubRenderer?.renderVocabulary() || '<p>Loading hubs…</p>',
      'phrases-qa': () => window.HubRenderer?.renderPhrasesQA() || '<p>Loading hubs…</p>',
      grammar: () => window.HubRenderer?.renderGrammar() || '<p>Loading hubs…</p>',
      lesson1: renderLesson1,
      lesson2: renderLesson2,
      berufe: renderBerufe,
      verbs: renderVerbs,
      quiz: renderQuiz,
      flashcards: renderFlashcards,
      review: renderReview
    };
    main.innerHTML = (pages[currentPage] || renderDashboard)();
    window.HubRenderer?.bindHubEvents(main);
  }

  /* Public API */
  window.App = {
    navigate, speak, toggleWeak, render,
    colorizeNoun, playBtn, weakBtn,
    setBerufeFilter(v) { berufeFilter = v; render(); },
    selectVerb(v) { selectedVerb = v; render(); },
    setQuizMode(m) { quizState.mode = m; quizState.current = null; render(); },
    answerQuiz, nextQuiz,
    flipCard() { flashcardFlipped = !flashcardFlipped; render(); },
    prevCard() { flashcardIndex = Math.max(0, flashcardIndex - 1); flashcardFlipped = false; render(); },
    nextCard() { flashcardIndex++; flashcardFlipped = false; render(); },
    showBerufDetail, closeModal, speakAllBerufe, playTrack, playBerufeDialogue, playDialogue, playSmart,
    toggleSidebar() { document.querySelector('.sidebar').classList.toggle('open'); }
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-speak]');
    if (btn) {
      e.stopPropagation();
      const text = decodeSpeakAttr(btn.dataset.speak);
      if (btn.dataset.audio && btn.dataset.audioExact === 'true') {
        playSmart(btn.dataset.audio, text);
      } else {
        speak(text);
      }
    }
  });

  document.addEventListener('DOMContentLoaded', async () => {
    await loadExternalMaps();
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.page));
    });
    navigate('dashboard');
  });

})();
