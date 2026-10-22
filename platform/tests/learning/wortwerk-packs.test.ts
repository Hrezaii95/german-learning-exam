import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ContentPack, LanguageProfile } from '../../packages/content/src/types/packs.js';
import { validatePack, validateLanguageProfile, validateDifficultyProfile } from '../../packages/content/src/validation/packs.js';
import { buildCapabilityIndex } from '../../packages/wortwerk/src/capabilities.js';
import { loadPackRegistry } from '../../packages/wortwerk/src/loader.server.js';
import { registerOverlayPacks, getOverlayPacks, clearOverlayPacks } from '../../packages/wortwerk/src/registry.js';
import { validatePacks } from '../../packages/wortwerk/scripts/validate-packs.js';
import { runA1Migration } from '../../packages/wortwerk/scripts/migrate-a1.js';
import { gradeTextAnswer } from '../../packages/wortwerk/src/normalization.js';

const read = (path: string): unknown => JSON.parse(readFileSync(resolve(path), 'utf8'));
const profile = read('tests/fixtures/languages/xx.json') as LanguageProfile;
function pack(): ContentPack {
  return { ...(read('tests/fixtures/packs/de-b2-sample/pack.json') as ContentPack), items: read('tests/fixtures/packs/de-b2-sample/items/all.json') as ContentPack['items'] };
}

describe('Wortwerk pack foundation', () => {
  it('validates a higher-level fixture containing every item type without Alpha publication rules', () => {
    expect(validatePack(pack())).toEqual([]);
    expect(validateLanguageProfile(profile)).toEqual([]);
  });
  it.each([null, [], {}, { items: [null] }, { schemaVersion: 2 }])('rejects malformed input without throwing: %j', value => {
    expect(validatePack(value).length).toBeGreaterThan(0);
  });
  it('reports duplicate NFC headwords and unresolved item references with paths', () => {
    const value = pack();
    const first = value.items[0]!;
    if (first.type !== 'lexeme') throw new Error('fixture');
    first.lemma = 'Büro';
    value.items.push({ ...first, id: 'duplicate', lemma: 'Bu\u0308ro' });
    const exam = value.items.find(item => item.type === 'examTask')!;
    if (exam.type === 'examTask') exam.itemRefs = ['missing'];
    const issues = validatePack(value);
    expect(issues.some(issue => issue.code === 'DUPLICATE_HEADWORD' && issue.path.includes('items'))).toBe(true);
    expect(issues.some(issue => issue.code === 'UNRESOLVED_ITEM')).toBe(true);
  });
  it('rejects malformed nested answers, foreign gender ids and invalid difficulty ranges', () => {
    const value = pack();
    const item = value.items[0]!;
    if (item.type === 'lexeme') item.gender = 'missing';
    const drill = value.items.find(item => item.type === 'drill')!;
    if (drill.type === 'drill') drill.answer = { type: 'exact', accepted: [] };
    expect(validatePack(value, profile).length).toBeGreaterThan(0);
    expect(validateDifficultyProfile({ schemaVersion: 1, id: 'fixture', optionsCount: 4, timerSeconds: -1, audioSpeedRange: [2, 1], hintsAllowed: true, maxPassageLength: 100, distractorCloseness: 0.5, typedAnswerRatio: 2 }).length).toBeGreaterThan(0);
  });
  it('rejects inherited schema names and unresolved choice answers', () => {
    const unknown = pack() as ContentPack & { constructor?: unknown };
    Object.defineProperty(unknown, 'constructor', { value: 'untrusted', enumerable: true });
    expect(validatePack(unknown).some(issue => issue.path.endsWith('.constructor'))).toBe(true);
    const value = pack();
    const text = value.items.find(item => item.type === 'text')!;
    if (text.type === 'text') text.questions = [{ id: 'q1', type: 'multipleChoice', prompt: 'Choose', answer: { type: 'choice', correctIds: ['missing'] } }];
    expect(validatePack(value).some(issue => issue.path.includes('questions'))).toBe(true);
    const drill = value.items.find(item => item.type === 'drill')!;
    if (drill.type === 'drill') drill.answer = { type: 'choice', correctIds: ['missing'] };
    expect(validatePack(value).some(issue => issue.path.includes('.answer') && !issue.path.includes('questions'))).toBe(true);
  });
  it('derives eligible templates and thresholds only from fields, across languages', () => {
    const value = pack();
    const index = buildCapabilityIndex(value);
    expect(index.templates['corners.meaning']?.enabled).toBe(true);
    expect(index.templates['corners.gender']?.itemIds).toHaveLength(8);
    const toy = structuredClone(value);
    toy.id = 'xx-sample'; toy.language = profile.id; toy.cefr = 'C2';
    for (const item of toy.items) if (item.type === 'lexeme') { item.gender = 'left'; item.article = 'la'; }
    const toyDrill = toy.items.find(item => item.type === 'drill' && item.answer.type !== 'choice');
    if (toyDrill?.type === 'drill') toyDrill.prompt = { instruction: { tokens: [{ type: 'gender', text: 'luma', gender: 'left' }] } };
    expect(validatePack(toy, profile)).toEqual([]);
    if (toyDrill?.type === 'drill') toyDrill.prompt = { instruction: { tokens: [{ type: 'gender', text: 'luma', gender: 'unknown' }] } };
    expect(validatePack(toy, profile).some(issue => issue.path.includes('.prompt'))).toBe(true);
    if (toyDrill?.type === 'drill') toyDrill.prompt = { instruction: { tokens: [{ type: 'gender', text: 'luma', gender: 'left' }] } };
    expect(buildCapabilityIndex(toy).templates).toEqual(index.templates);
    value.items = value.items.slice(0, 2);
    expect(buildCapabilityIndex(value).templates['corners.meaning']?.enabled).toBe(false);
  });
  it('does not enable plural or listening games on missing forms/audio', () => {
    const value = pack();
    for (const item of value.items) { delete item.audio; if (item.type === 'lexeme') delete item.forms; }
    const index = buildCapabilityIndex(value);
    expect(index.templates['corners.plural']?.itemIds).toEqual([]);
    expect(index.templates['listen.pick']?.itemIds).toEqual([]);
  });
  it('applies profile normalization while keeping noun case significant', () => {
    expect(gradeTextAnswer('  Søl  ', ['Sø l', 'Søl'], profile, 'noun').outcome).toBe('correct');
    expect(gradeTextAnswer('Soel', ['Søl'], profile, 'noun').outcome).toBe('almost');
    expect(gradeTextAnswer('søl', ['Søl'], profile, 'noun').outcome).not.toBe('correct');
    expect(gradeTextAnswer('GO', ['go'], profile, 'verb').outcome).toBe('correct');
  });
  it('registers overlays atomically and idempotently, without retaining caller mutations', () => {
    clearOverlayPacks();
    const value = pack();
    registerOverlayPacks([value]); registerOverlayPacks([value]);
    expect(getOverlayPacks()).toHaveLength(1);
    value.items.length = 0;
    expect(getOverlayPacks()[0]?.items.length).toBeGreaterThan(0);
    expect(() => registerOverlayPacks([pack(), { id: 'bad' } as ContentPack])).toThrow();
    expect(getOverlayPacks()).toHaveLength(1);
    const output = getOverlayPacks(); output.length = 0;
    expect(getOverlayPacks()).toHaveLength(1);
    clearOverlayPacks();
  });
  it('keeps language and level literals out of production engine code', () => {
    const paths = ['packages/wortwerk', 'apps/web/lib/wortwerk'];
    function sources(path: string): string[] {
      return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sources(join(path, entry.name)) : /\.(?:ts|tsx|mjs)$/u.test(entry.name) ? [join(path, entry.name)] : []);
    }
    const forbidden = /["'](?:A1|A2|B1|B2|C1|C2|der|die|das|Akkusativ|Dativ|Nominativ|Genitiv)["']/u;
    expect(paths.flatMap(sources).filter(path => forbidden.test(readFileSync(path, 'utf8')))).toEqual([]);
  });
  it('rejects unknown CLI arguments before loading content or writing files', () => {
    expect(() => validatePacks(['--unknown'])).toThrow(/Usage/);
    expect(() => runA1Migration(['--unknown'])).toThrow(/Usage/);
  });
  it('auto-discovers packs deterministically, defaults pending packs off and rejects traversal', () => {
    const root = mkdtempSync(join(tmpdir(), 'wortwerk-'));
    try {
      mkdirSync(join(root, 'languages')); mkdirSync(join(root, 'difficulty')); mkdirSync(join(root, 'packs', 'toy'), { recursive: true });
      writeFileSync(join(root, 'languages', 'xx.json'), JSON.stringify(profile));
      writeFileSync(join(root, 'difficulty', 'C2.json'), JSON.stringify({ schemaVersion: 1, id: 'C2', optionsCount: 4, timerSeconds: 0, audioSpeedRange: [0.8, 1.2], hintsAllowed: true, maxPassageLength: 500, distractorCloseness: 0.8, typedAnswerRatio: 0.7 }));
      const value = pack(); value.id = 'toy'; value.language = 'xx'; value.cefr = 'C2'; value.difficulty = 'C2'; delete value.itemFiles;
      for (const item of value.items) if (item.type === 'lexeme') { item.gender = 'left'; item.article = 'la'; }
      writeFileSync(join(root, 'packs', 'toy', 'pack.json'), JSON.stringify(value));
      const registry = loadPackRegistry(root);
      expect(registry.packs.map(entry => entry.pack.id)).toEqual(['toy']);
      expect(registry.packs[0]?.enabledByDefault).toBe(false);
      expect(registry.packs[0]?.capabilities.templates['corners.meaning']?.enabled).toBe(true);
      validatePacks([root, '--write-index']);
      expect(JSON.parse(readFileSync(join(root, 'packs', 'toy', 'capabilities.json'), 'utf8'))).toEqual(registry.packs[0]?.capabilities);
      value.story = 'missing-story.json';
      writeFileSync(join(root, 'packs', 'toy', 'pack.json'), JSON.stringify(value));
      expect(() => loadPackRegistry(root)).toThrow();
      delete value.story;
      value.itemFiles = ['../../secret.json']; delete (value as Partial<ContentPack>).items;
      writeFileSync(join(root, 'packs', 'toy', 'pack.json'), JSON.stringify(value));
      expect(() => loadPackRegistry(root)).toThrow(/path|travers|within/i);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
