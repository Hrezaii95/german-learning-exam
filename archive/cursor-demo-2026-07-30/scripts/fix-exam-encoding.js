const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '..', 'web');
eval(fs.readFileSync(path.join(webDir, 'berufe-data.js'), 'utf8'));

const berufe = window.BERUFE_DATA.professions.map((p) => ({
  en: p.en,
  m: p.mascSg,
  mp: p.mascPl,
  f: p.femSg,
  fp: p.femPl,
}));

let html = fs.readFileSync(path.join(webDir, 'exam.html'), 'utf8');

function replaceBlock(name, newBlock) {
  const start = html.indexOf('const ' + name + ' = ');
  const end = html.indexOf('];', start) + 2;
  html = html.slice(0, start) + newBlock + html.slice(end);
}

const berufeLines = berufe.map(
  (b) =>
    `    {en:${JSON.stringify(b.en)},m:${JSON.stringify(b.m)},mp:${JSON.stringify(b.mp)},f:${JSON.stringify(b.f)},fp:${JSON.stringify(b.fp)}}`
);
replaceBlock('BERUFE', 'const BERUFE = [\n' + berufeLines.join(',\n') + '\n  ];');

const NUMBERS = [
  [0, 'null'], [1, 'eins'], [2, 'zwei'], [3, 'drei'], [4, 'vier'], [5, 'fünf'],
  [6, 'sechs'], [7, 'sieben'], [8, 'acht'], [9, 'neun'], [10, 'zehn'],
  [11, 'elf'], [12, 'zwölf'], [13, 'dreizehn'], [14, 'vierzehn'], [15, 'fünfzehn'],
  [16, 'sechzehn'], [17, 'siebzehn'], [18, 'achtzehn'], [19, 'neunzehn'], [20, 'zwanzig'],
];
const numLines = NUMBERS.map(([n, w]) => `    [${n},${JSON.stringify(w)}]`);
replaceBlock('NUMBERS', 'const NUMBERS = [\n' + numLines.join(',\n') + '\n  ];');

const alphaStart = html.indexOf('const ALPHABET = ');
const alphaEnd = html.indexOf(';', alphaStart) + 1;
html =
  html.slice(0, alphaStart) +
  "const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00c4\u00d6\u00dc\u00df'.split('');" +
  html.slice(alphaEnd);

const countriesStart = html.indexOf('const COUNTRIES = [');
const countriesEnd = html.indexOf('];', countriesStart) + 2;
const COUNTRIES = [
  { de: 'Deutschland', en: 'Germany', art: '' },
  { de: '\u00d6sterreich', en: 'Austria', art: '' },
  { de: 'Spanien', en: 'Spain', art: '' },
  { de: 'Frankreich', en: 'France', art: '' },
  { de: 'Eritrea', en: 'Eritrea', art: '' },
  { de: 'Schweiz', en: 'Switzerland', art: 'die' },
  { de: 'T\u00fcrkei', en: 'Turkey', art: 'die' },
  { de: 'USA', en: 'USA', art: 'die' },
];
const countryLines = COUNTRIES.map(
  (c) => `    { de: ${JSON.stringify(c.de)}, en: ${JSON.stringify(c.en)}, art: ${JSON.stringify(c.art)} }`
);
html =
  html.slice(0, countriesStart) +
  'const COUNTRIES = [\n' +
  countryLines.join(',\n') +
  '\n  ];' +
  html.slice(countriesEnd);

fs.writeFileSync(path.join(webDir, 'exam.html'), html, 'utf8');
console.log('Fixed exam.html with', berufe.length, 'Berufe');
