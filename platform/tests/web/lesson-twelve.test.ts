import {describe,it,expect} from 'vitest';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {studyUnits} from '../../apps/web/lib/study/course-lessons';
import {loadWordCards,wordCardForPath} from '../../apps/web/lib/content/word-cards';
import {loadBook,loadBookAnswers,loadDictionary,loadStudySpeech} from '../../apps/web/lib/study/catalog';
import {lookupEntries} from '../../apps/web/lib/study/lookup';
import {journeyActivities,journeyPeople,journeyParts,journeySentence,journeyMeaning,journeySaveId,journeySpeech,seasons,spokenYear} from '../../apps/web/lib/study/journey-sheet';
import {availableLessons} from '../../apps/web/lib/study/scope';
describe('Lesson 12 and complete A1.1 source integration',()=>{
 const unit=studyUnits.find(u=>u.number===12)!;
 it('covers every glossary entry with cards and twelve selectable lessons',()=>{
  expect(availableLessons()).toEqual([1,2,3,4,5,6,7,8,9,10,11,12]);
  expect(readFileSync(resolve('../research/lesson-expansion/lesson-12-vocabulary.tsv'),'utf8').trim().split(/\r?\n/).slice(1)).toHaveLength(102);expect(unit.words).toHaveLength(102);expect(loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(12))).toHaveLength(102);
  for(const w of unit.words!){const c=wordCardForPath(`/vocabulary/${w.id}`)!;expect(c,w.de).toBeDefined();expect(c.studyTags?.lessons).toContain(12);expect(c.rows.some(r=>r.singular.text===w.de)).toBe(true);}
  for(const q of unit.quiz)expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);
 });
 it('keeps the source auxiliaries and all six background forms',()=>{
  expect(unit.verbs).toHaveLength(32);for(const verb of ['fahren','bleiben','passieren','sein','schwimmen','reiten'])expect(unit.verbs.find(v=>v.verb===verb)?.auxiliary,verb).toBe('sein');for(const verb of ['besuchen','feiern','dauern','abholen','machen'])expect(unit.verbs.find(v=>v.verb===verb)?.auxiliary,verb).toBe('haben');
  expect(unit.verbs.find(v=>v.verb==='sein')?.preterite).toEqual(['war','warst','war','waren','wart','waren']);expect(unit.verbs.find(v=>v.verb==='haben')?.preterite).toEqual(['hatte','hattest','hatte','hatten','hattet','hatten']);
 });
 it('places the selected auxiliary and participle correctly in every sentence',()=>{
  expect(journeySentence(0,0,false)).toBe('Ich bin nach Hamburg gefahren.');expect(journeySentence(14,5,true)).toBe('Haben Sie Anna am Bahnhof abgeholt?');expect(journeyMeaning(1,2,true)).toBe('Did he fly to Austria?');
  for(let a=0;a<journeyActivities.length;a++)for(let p=0;p<journeyPeople.length;p++)for(const q of [false,true]){const parts=journeyParts(a,p,q);expect(parts.at(-1)?.role).toBe('participle');expect(parts.findIndex(x=>x.role==='auxiliary')).toBe(q?0:1);expect(journeySentence(a,p,q)).not.toMatch(/undefined|NaN/);expect(journeyMeaning(a,p,q)).not.toMatch(/undefined|NaN/);}
  expect(()=>journeyParts(-1,0,false)).toThrow(RangeError);
 });
 it('shares dictionary and review identities without collisions',()=>{
  const dictionary=loadDictionary();const identities=new Map<string,string>();for(let a=0;a<journeyActivities.length;a++)for(let p=0;p<journeyPeople.length;p++)for(const q of [false,true]){const sentence=journeySentence(a,p,q),id=journeySaveId(a,p,q);expect(lookupEntries(dictionary,sentence).entries.some(e=>e.saveId===id),sentence).toBe(true);expect(identities.get(id)??sentence).toBe(sentence);identities.set(id,sentence);const index=unit.phrases.findIndex(x=>x.de===sentence);if(index>=0)expect(id).toBe(`l12-phrase-${index}`);}
  expect(lookupEntries(dictionary,'geblieben').entries.some(e=>e.de==='bleiben')).toBe(true);expect(lookupEntries(dictionary,'warst').entries.some(e=>e.de==='sein')).toBe(true);
 });
 it('covers twelve masculine months and the century boundary',()=>{
  expect(new Set(seasons.flatMap(s=>s.months)).size).toBe(12);for(const s of seasons)for(const name of [s.name,...s.months])expect(unit.words?.some(w=>w.de===`der ${name}`),name).toBe(true);
  expect(spokenYear(1900)).toBe('neunzehnhundert');expect(spokenYear(1986)).toBe('neunzehnhundertsechsundachtzig');expect(spokenYear(2000)).toBe('zweitausend');expect(spokenYear(2001)).toBe('zweitausendeins');expect(spokenYear(2021)).toBe('zweitausendeinundzwanzig');for(const n of [1899,2100,2020.5,NaN])expect(()=>spokenYear(n)).toThrow(RangeError);
 });
 it('maps all module recordings and partner tasks to their actual pages',()=>{
  const b=loadBook();expect(b.pages).toHaveLength(202);expect(b.audio).toHaveLength(208);const tracks=b.audio.filter(t=>t.lesson===12);expect(tracks).toHaveLength(20);expect(tracks.filter(t=>t.kind==='workbook').map(t=>t.transcript?.sourceTrack).sort()).toEqual(Array.from({length:17},(_,i)=>`2_${i+33}`));
  expect(b.pages.find(p=>p.id==='workbook-84')?.audioIds).toHaveLength(6);expect(b.pages.find(p=>p.id==='workbook-85')?.audioIds).toHaveLength(0);for(const id of ['coursebook-170','coursebook-171'])expect(b.pages.find(p=>p.id===id)?.lessons).toEqual([12]);expect(b.pages.find(p=>p.id==='coursebook-81')?.section).toBe('Module 4 · Grammar');
 });
 it('includes the key continuation and marks open-ended answers as samples',()=>{
  const answers=loadBookAnswers();expect(answers).toHaveLength(206);const core=answers.filter(a=>['coursebook-73','coursebook-74','coursebook-75','coursebook-76'].includes(a.pageId));expect(core).toHaveLength(10);expect(core.filter(a=>a.sourcePage===4).length).toBeGreaterThanOrEqual(2);expect(answers.filter(a=>['workbook-80','workbook-81'].includes(a.pageId)&&a.source==='workbook-key')).toHaveLength(4);expect(answers.filter(a=>a.pageId==='workbook-77')).toHaveLength(0);
 });
 it('ships real audio for all journey combinations, years and verb forms',()=>{
  const speech=loadStudySpeech();for(const text of [...journeySpeech,...unit.verbs.flatMap(v=>[`${v.auxiliary==='sein'?'ist':'hat'} ${v.participle}`,...(v.preterite?.map((f,i)=>`${["ich","du","er","wir","ihr","sie"][i]} ${f}`)??[])])]){expect(speech[text],text).toBeTruthy();expect(statSync(resolve('apps/web/public'+speech[text])).size).toBeGreaterThan(1000);}
 });
});
