/* Load extracted lesson JSON ? prefers content/extracted/ over inlined fallbacks */
(function () {
  'use strict';

  const FIXES = [
    [/hei\?e/g, 'hei?e'], [/hei\?en/g, 'hei?en'], [/hei\?t/g, 'hei?t'],
    [/\?sterreich/g, '?sterreich'], [/T\?rkei/g, 'T?rkei'], [/Tsch\?s/g, 'Tsch?s'],
    [/M\?nchen/g, 'M?nchen'], [/Gro\?/g, 'Gro?'], [/Stra\?e/g, 'Stra?e'],
    [/\?rzt/g, '?rzt'], [/f\?r/g, 'f?r'], [/Sch\?ler/g, 'Sch?ler'],
    [/Verk\?ufer/g, 'Verk?ufer'], [/h\?ren/g, 'h?ren'], [/Gro\?mutter/g, 'Gro?mutter'],
    [/Nummer\?/g, 'Nummer?'], [/ \? /g, ' ? '], [/ \?$/, ' ?']
  ];

  function fixEncoding(val) {
    if (typeof val === 'string') {
      let s = val;
      FIXES.forEach(([re, rep]) => { s = s.replace(re, rep); });
      return s;
    }
    if (Array.isArray(val)) return val.map(fixEncoding);
    if (val && typeof val === 'object') {
      const o = {};
      for (const k of Object.keys(val)) o[k] = fixEncoding(val[k]);
      return o;
    }
    return val;
  }

  function titleCase(s) {
    return (s || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function groupBy(arr, key) {
    const m = {};
    (arr || []).forEach(item => {
      const k = item[key] || 'other';
      (m[k] = m[k] || []).push(item);
    });
    return m;
  }

  function buildSections(lesson) {
    const sections = [];
    const vocab = groupBy(lesson.vocabulary, 'category');
    Object.keys(vocab).sort().forEach(cat => {
      sections.push({
        id: `vocab-${cat}`,
        name: `Vocabulary ? ${titleCase(cat)}`,
        items: vocab[cat].map(v => ({
          de: v.de,
          en: v.en,
          article: v.article,
          plural: v.plural
        }))
      });
    });
    const phrases = groupBy(lesson.phrases, 'category');
    Object.keys(phrases).sort().forEach(cat => {
      sections.push({
        id: `phrases-${cat}`,
        name: `Phrases ? ${titleCase(cat)}`,
        items: phrases[cat].map(p => ({ de: p.de, en: p.en }))
      });
    });
    (lesson.grammar || []).forEach(g => {
      if (g.items) {
        sections.push({ id: g.id, name: g.topic, items: g.items.map(i => ({ de: i.de, en: i.en })) });
      } else {
        const items = [];
        if (g.rule) items.push({ de: g.rule, en: g.topic });
        if (g.example) items.push({ de: g.example, en: 'Example' });
        (g.examples || []).forEach(ex => items.push({ de: ex, en: 'Example' }));
        if (g.table && typeof g.table === 'object') {
          Object.entries(g.table).forEach(([k, v]) => {
            if (typeof v === 'string') items.push({ de: `${k}: ${v}`, en: g.topic });
            else if (typeof v === 'object') Object.entries(v).forEach(([p, f]) => items.push({ de: `${p} ${f}`, en: k }));
          });
        }
        sections.push({ id: g.id, name: g.topic, items });
      }
    });
    return sections;
  }

  function mergeVerbs(l1Fallback, lesson1, lesson2) {
    const map = new Map();
    (l1Fallback?.verbs || []).forEach(v => map.set(v.infinitive, v));
    (lesson2?.verbs || []).forEach(v => {
      const conj = (v.conjugations || []).map(c => ({
        pronoun: c.pronoun.replace('sie/Sie', 'Sie'),
        form: c.form,
        en: '',
        highlight: /er|sie|es/.test(c.pronoun) && !c.pronoun.includes('Sie')
      }));
      map.set(v.infinitive, { infinitive: v.infinitive, en: v.en, conjugations: conj, lesson: 2 });
    });
  (lesson1?.verbs || []).forEach(v => {
      if (!map.has(v.infinitive)) {
        const fb = l1Fallback?.verbs?.find(x => x.infinitive === v.infinitive || x.infinitive.replace('?','?') === v.infinitive);
        if (fb) map.set(v.infinitive, fb);
      }
    });
    return Array.from(map.values());
  }

  window.CONTENT = {
    lesson1: null,
    lesson2: null,
    berufe: null,
    verbs: null,
    lesson1Sections: null,
    lesson2Sections: null,
    source: { lesson1: 'inline', lesson2: 'none', berufe: 'inline' }
  };

  window.HUBS = { vocab: null, phrases: null, grammar: null };

  window.loadExtractedContent = async function () {
    async function fetchJson(path) {
      const r = await fetch(path);
      if (!r.ok) return null;
      const text = await r.text();
      return fixEncoding(JSON.parse(text));
    }

    const [l1, l2, berufe] = await Promise.all([
      fetchJson('../content/extracted/lesson1.json'),
      fetchJson('../content/extracted/lesson2.json'),
      fetchJson('../content/extracted/berufe.json')
    ]);

    if (l1) {
      window.CONTENT.lesson1 = l1;
      window.CONTENT.lesson1Sections = buildSections(l1);
      window.CONTENT.source.lesson1 = 'extracted';
    } else if (window.APP_DATA?.lesson1) {
      window.CONTENT.lesson1Sections = window.APP_DATA.lesson1.sections;
      window.CONTENT.source.lesson1 = 'inline';
    }

    if (l2) {
      window.CONTENT.lesson2 = l2;
      window.CONTENT.lesson2Sections = buildSections(l2);
      window.CONTENT.source.lesson2 = 'extracted';
    }

    if (berufe) {
      window.CONTENT.berufe = berufe;
      window.BERUFE_DATA = berufe;
      window.CONTENT.source.berufe = 'extracted';
    }

    window.CONTENT.verbs = mergeVerbs(
      window.APP_DATA?.verbs,
      l1,
      l2
    );

    const [vocabHub, phrasesHub, grammarHub] = await Promise.all([
      fetchJson('../content/extracted/vocab-hub.json'),
      fetchJson('../content/extracted/phrases-qa-hub.json'),
      fetchJson('../content/extracted/grammar-hub.json')
    ]);
    if (vocabHub) {
      window.HUBS.vocab = vocabHub;
      const berufeTopic = vocabHub.topics?.find(t => t.id === 'berufe');
      if (berufeTopic?.professions?.length) {
        window.BERUFE_DATA = { professions: berufeTopic.professions.map(p => ({
          id: p.id, en: p.english, emoji: '??',
          mascSg: p.mascSg, mascPl: p.mascPl, femSg: p.femSg, femPl: p.femPl
        })) };
        window.CONTENT.source.berufe = 'vocab-hub';
      }
    }
    if (phrasesHub) window.HUBS.phrases = phrasesHub;
    if (grammarHub) {
      window.HUBS.grammar = grammarHub;
      if (grammarHub.verbs?.length) {
        window.CONTENT.verbs = mergeVerbs(window.APP_DATA?.verbs, l1, { verbs: grammarHub.verbs });
      }
    }
  };
})();
