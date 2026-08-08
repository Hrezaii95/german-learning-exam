/* Hub views ? Vocabulary, Phrases & Q&A, Grammar (loads from content/extracted/*-hub.json) */
(function () {
  'use strict';

  let vocabTopic = null;
  let phraseTopic = null;
  let grammarTopic = null;

  function hubs() {
    return window.HUBS || {};
  }

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function playBtn(text) {
    const clean = String(text).replace(/<[^>]+>/g, '').split(' / ')[0].trim();
    const encoded = encodeURIComponent(clean);
    return `<button class="btn-icon" data-speak="${encoded}" title="Play (TTS)">??</button>`;
  }

  function subTabs(items, activeId, attr, labelFn) {
    return `<div class="hub-sub-tabs">${items.map(t => {
      const id = t.id;
      const label = labelFn(t);
      return `<button class="hub-sub-tab ${id === activeId ? 'active' : ''}" data-${attr}="${esc(id)}">${esc(label)}</button>`;
    }).join('')}</div>`;
  }

  function renderVocabEntries(topic) {
    if (topic.id === 'berufe' && topic.professions) {
      return `<div class="berufe-grid">${topic.professions.map(p => {
        const id = `beruf-${p.id}`;
        const deHtml = window.App?.colorizeNoun
          ? window.App.colorizeNoun(p.mascSg) + '<br>' + window.App.colorizeNoun(p.femSg)
          : esc(p.mascSg) + '<br>' + esc(p.femSg);
        const weak = window.App?.weakBtn ? window.App.weakBtn(id) : '';
        const audioPath = window.BERUFE_AUDIO?.[p.id];
        const btn = window.App?.playBtn ? window.App.playBtn(p.mascSg, audioPath) : playBtn(p.mascSg);
        return `<div class="beruf-card" onclick="App.showBerufDetail(${p.id})">
          <div class="en-label">${esc(p.english)}</div>
          <div class="de-forms">${deHtml}</div>
          <div style="margin-top:8px;display:flex;gap:4px;justify-content:center" onclick="event.stopPropagation()">${btn} ${weak}</div>
        </div>`;
      }).join('')}</div>`;
    }

    if (topic.id === 'alphabet') {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ????'.split('');
      return `<div class="hub-alpha-grid">${letters.map(l =>
        `<div class="hub-alpha-card" data-speak="${encodeURIComponent(l)}">${esc(l)}</div>`
      ).join('')}</div>`;
    }

    const entries = topic.entries || [];
    return `<div class="phrase-list">${entries.map(e => {
      const de = e.german || e.de || '';
      const en = e.english || e.en || '';
      const deHtml = (e.article || /^der |^die |^das /.test(de)) && window.App?.colorizeNoun
        ? window.App.colorizeNoun(de) : esc(de);
      return `<div class="phrase-row">
        <div class="phrase-de">${deHtml}</div>
        <div class="phrase-en">${esc(en)}</div>
        ${playBtn(de)}
      </div>`;
    }).join('')}</div>`;
  }

  function renderVocabulary() {
    const hub = hubs().vocab;
    if (!hub?.topics?.length) {
      return `<div class="page-header"><h2>Vocabulary</h2><p class="empty-state">Loading hub?</p></div>`;
    }
    const topics = hub.topics;
    if (!vocabTopic || !topics.find(t => t.id === vocabTopic)) vocabTopic = topics[0].id;
    const topic = topics.find(t => t.id === vocabTopic);
    const count = topic.id === 'berufe'
      ? (topic.professions?.length || 0)
      : (topic.entries?.length || 0);

    let html = `<div class="page-header"><h2>Vocabulary</h2><p>${topics.length} topics ï¿½ ${hub.level || 'A1'}</p></div>`;
    html += subTabs(topics, vocabTopic, 'vocab-topic', t => t.title?.en || t.id);
    html += `<h3 class="hub-topic-title">${esc(topic.title?.de || topic.id)} <span class="hub-count">${count} items</span></h3>`;
    html += `<div class="hub-content">${renderVocabEntries(topic)}</div>`;
    return html;
  }

  function renderQaBlock(qa) {
    let qText = '';
    if (qa.question?.informal || qa.question?.formal) {
      qText = [qa.question.informal, qa.question.formal].filter(Boolean).join(' ï¿½ ');
    } else if (qa.question?.de) {
      qText = qa.question.de;
    }

    let answers = '';
    (qa.answers || []).forEach(a => {
      if (a.pattern) answers += `<div class="qa-pattern"><strong>${esc(a.pattern)}</strong></div>`;
      if (a.variants?.length) {
        answers += `<div class="qa-variants">${a.variants.map(v => `<span class="tag">${esc(v)}</span>`).join(' ')}</div>`;
      }
      (a.examples || []).forEach(ex => {
        answers += `<div class="phrase-row qa-example">
          <div class="phrase-de">${esc(ex)}</div>
          ${playBtn(ex)}
        </div>`;
      });
    });

    return `<div class="qa-block">
      <div class="qa-question">${esc(qText)} ${playBtn(qText.split(' ï¿½ ')[0])}</div>
      ${answers}
    </div>`;
  }

  function renderPhrasesQA() {
    const hub = hubs().phrases;
    if (!hub?.topics?.length) {
      return `<div class="page-header"><h2>Phrases &amp; Q&amp;A</h2><p class="empty-state">Loading hub?</p></div>`;
    }
    const topics = hub.topics;
    if (!phraseTopic || !topics.find(t => t.id === phraseTopic)) phraseTopic = topics[0].id;
    const topic = topics.find(t => t.id === phraseTopic);

    let html = `<div class="page-header"><h2>Phrases &amp; Q&amp;A</h2><p>${topics.length} topics ï¿½ ${hub.level || 'A1'}</p></div>`;
    html += subTabs(topics, phraseTopic, 'phrase-topic', t => t.title?.en || t.id);

    const phrases = topic.phrases || [];
    if (phrases.length) {
      html += `<h3 class="hub-topic-title">Phrases</h3><div class="phrase-list">`;
      phrases.forEach(p => {
        const tag = p.formality || p.category || '';
        html += `<div class="phrase-row">
          <div class="phrase-de">${esc(p.de)}${tag ? ` <span class="tag">${esc(tag)}</span>` : ''}</div>
          <div class="phrase-en">${esc(p.en)}</div>
          ${playBtn(p.de)}
        </div>`;
      });
      html += `</div>`;
    }

    const qa = topic.qa_pairs || [];
    if (qa.length) {
      html += `<h3 class="hub-topic-title">Q&amp;A Patterns</h3>`;
      qa.forEach(block => { html += renderQaBlock(block); });
    }

    return html;
  }

  function renderGrammarTopic(topic) {
    let html = '';
    if (topic.rule) {
      html += `<div class="card grammar-rule"><strong>Rule:</strong> ${esc(topic.rule)}</div>`;
    }
    if (topic.example) {
      html += `<div class="phrase-row"><div class="phrase-de">${esc(topic.example)}</div>${playBtn(topic.example)}</div>`;
    }
    if (topic.examples?.length) {
      topic.examples.forEach(ex => {
        html += `<div class="phrase-row"><div class="phrase-de">${esc(ex)}</div>${playBtn(ex)}</div>`;
      });
    }
    if (topic.items?.length) {
      html += `<table class="conj-table"><thead><tr><th>German</th><th>English</th><th></th></tr></thead><tbody>`;
      topic.items.forEach(item => {
        html += `<tr><td class="form">${esc(item.de)}</td><td>${esc(item.en)}</td><td>${playBtn(item.de)}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
    if (topic.table && typeof topic.table === 'object') {
      Object.entries(topic.table).forEach(([verb, forms]) => {
        html += `<h4 class="hub-verb-label">${esc(verb)}</h4>`;
        if (typeof forms === 'string') {
          html += `<div class="phrase-row"><div class="phrase-de">${esc(forms)}</div>${playBtn(forms)}</div>`;
        } else {
          html += `<table class="conj-table"><tbody>`;
          Object.entries(forms).forEach(([pronoun, form]) => {
            const full = `${pronoun} ${form}`;
            html += `<tr><td>${esc(pronoun)}</td><td class="form">${esc(form)}</td><td>${playBtn(full)}</td></tr>`;
          });
          html += `</tbody></table>`;
        }
      });
    }
    return html || `<p class="empty-state">No content for this topic.</p>`;
  }

  function renderVerbTables(verbs) {
    if (!verbs?.length) return '';
    let html = `<h3 class="hub-topic-title">Verb Conjugation</h3>`;
    verbs.forEach(v => {
      html += `<div class="card" style="margin-bottom:16px"><h4 style="margin-bottom:8px">${esc(v.infinitive)} <span style="color:var(--text-secondary);font-weight:400">(${esc(v.english)})</span></h4>`;
      if (v.conjugations?.length) {
        html += `<table class="conj-table"><thead><tr><th>Pronoun</th><th>Form</th><th></th></tr></thead><tbody>`;
        v.conjugations.forEach(c => {
          const full = `${c.pronoun} ${c.form}`;
          html += `<tr><td>${esc(c.pronoun)}</td><td class="form">${esc(c.form)}</td><td>${playBtn(full)}</td></tr>`;
        });
        html += `</tbody></table>`;
      } else if (window.APP_DATA?.verbs?.verbs) {
        const fb = window.APP_DATA.verbs.verbs.find(x => x.infinitive === v.infinitive || x.infinitive.replace('?', 'ss') === v.infinitive);
        if (fb?.conjugations) {
          html += `<table class="conj-table"><thead><tr><th>Pronoun</th><th>Form</th><th></th></tr></thead><tbody>`;
          fb.conjugations.forEach(c => {
            const full = `${c.pronoun} ${c.form}`;
            html += `<tr><td>${esc(c.pronoun)}</td><td class="form">${esc(c.form)}</td><td>${playBtn(full)}</td></tr>`;
          });
          html += `</tbody></table>`;
        } else {
          html += `<p style="color:var(--text-secondary);font-size:13px">See inline verb data for full conjugation.</p>`;
        }
      }
      if (v.note) html += `<p style="font-size:12px;color:var(--text-secondary);margin-top:8px">${esc(v.note)}</p>`;
      html += `</div>`;
    });
    return html;
  }

  function renderGrammar() {
    const hub = hubs().grammar;
    if (!hub?.topics?.length) {
      return `<div class="page-header"><h2>Grammar</h2><p class="empty-state">Loading hub?</p></div>`;
    }
    const topics = hub.topics;
    if (!grammarTopic || !topics.find(t => t.id === grammarTopic)) grammarTopic = topics[0].id;
    const topic = topics.find(t => t.id === grammarTopic);

    let html = `<div class="page-header"><h2>Grammar</h2><p>${topics.length} topics ï¿½ ${(hub.verbs || []).length} verbs ï¿½ ${hub.level || 'A1'}</p></div>`;
    html += subTabs(topics, grammarTopic, 'grammar-topic', t => t.title?.en || t.id);
    html += `<h3 class="hub-topic-title">${esc(topic.title?.de || topic.id)}</h3>`;
    html += `<div class="hub-content">${renderGrammarTopic(topic)}</div>`;
    if (grammarTopic === topics[0].id) {
      html += renderVerbTables(hub.verbs);
    }
    return html;
  }

  function bindHubEvents(root) {
    root.querySelectorAll('[data-vocab-topic]').forEach(btn => {
      btn.addEventListener('click', () => {
        vocabTopic = btn.dataset.vocabTopic;
        window.App?.render();
      });
    });
    root.querySelectorAll('[data-phrase-topic]').forEach(btn => {
      btn.addEventListener('click', () => {
        phraseTopic = btn.dataset.phraseTopic;
        window.App?.render();
      });
    });
    root.querySelectorAll('[data-grammar-topic]').forEach(btn => {
      btn.addEventListener('click', () => {
        grammarTopic = btn.dataset.grammarTopic;
        window.App?.render();
      });
    });
    root.querySelectorAll('.hub-alpha-card[data-speak]').forEach(card => {
      card.addEventListener('click', () => {
        let text; try { text = decodeURIComponent(card.dataset.speak); } catch (e) { text = card.dataset.speak; }
        window.App?.speak(text);
      });
    });
  }

  window.HubRenderer = {
    renderVocabulary,
    renderPhrasesQA,
    renderGrammar,
    bindHubEvents,
    resetTopics() { vocabTopic = phraseTopic = grammarTopic = null; }
  };
})();
