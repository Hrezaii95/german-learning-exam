import {describe,it,expect} from 'vitest';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {studyUnits} from '../../apps/web/lib/study/course-lessons';
import {loadWordCards,wordCardForPath} from '../../apps/web/lib/content/word-cards';
import {loadBook,loadBookAnswers,loadDictionary,loadStudySpeech} from '../../apps/web/lib/study/catalog';
import {lookupEntries} from '../../apps/web/lib/study/lookup';
import {travelVerbs,travelPeople,travelModes,travelParts,travelSentence,travelMeaning,travelSaveId,travelSpeech} from '../../apps/web/lib/study/travel-sheet';
import {parseHubSearchParams} from '../../apps/web/lib/content/hub-query';
import {isSafeNavigationPath} from '../../apps/web/lib/content/navigation-context';
describe('Lesson 10 travel and separable verbs',()=>{
 const unit=studyUnits.find(u=>u.number===10)!;
 it('covers every source entry with family grouping and accepts both taxi plurals',()=>{
  expect(readFileSync(resolve('../research/lesson-expansion/lesson-10-vocabulary.tsv'),'utf8').trim().split(/\r?\n/).slice(1)).toHaveLength(87);
  expect(unit.words).toHaveLength(87);expect(loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(10))).toHaveLength(86);
  for(const word of unit.words!){const c=wordCardForPath(`/vocabulary/${word.id}`)!;expect(c,word.de).toBeDefined();expect(c.studyTags?.lessons).toContain(10);expect(c.rows.some(r=>r.singular.text===word.de),word.de).toBe(true);}
  const taxi=wordCardForPath('/vocabulary/l10-taxi')!;expect(taxi.rows[0]?.plurals.map(p=>p.text)).toEqual(['die Taxen','die Taxis']);expect(taxi.prompts.find(p=>p.question.startsWith('What is the plural'))?.answers).toEqual(['die Taxen','die Taxis']);
  expect(unit.verbs.find(v=>v.verb==='abfahren')?.forms).toEqual(['fahre ab','fährst ab','fährt ab','fahren ab','fahrt ab','fahren ab']);
  for(const q of unit.quiz)expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);
 });
 it('changes word order without losing the conjugated stem or prefix',()=>{
  expect(travelSentence(0,0,'statement')).toBe('Ich komme um acht Uhr an.');
  expect(travelSentence(0,1,'w-question')).toBe('Wann kommst du an?');
  expect(travelSentence(0,5,'yes-no')).toBe('Kommen Sie um acht Uhr an?');
  expect(travelSentence(2,1,'modal')).toBe('Du kannst Anna am Flughafen abholen.');
  expect(travelSentence(8,2,'statement')).toBe('Er fährt um zehn Uhr ab.');
  expect(travelSentence(9,1,'w-question')).toBe('Wann siehst du fern?');
  expect(travelSentence(7,1,'w-question')).toBe('Was kaufst du heute ein?');
  expect(travelMeaning(9,2,'yes-no')).toBe('Does he watch television this evening?');
  for(let v=0;v<travelVerbs.length;v++)for(let p=0;p<travelPeople.length;p++)for(const mode of travelModes){
   const parts=travelParts(v,p,mode.id);expect(parts.at(-1)?.role).toBe(mode.id==='modal'?'infinitive':'prefix');
   expect(parts.findIndex(part=>part.role==='stem')).toBe(mode.id==='yes-no'?0:1);
   expect(travelSentence(v,p,mode.id)).not.toMatch(/undefined|NaN/);expect(travelMeaning(v,p,mode.id)).not.toMatch(/undefined|NaN/);
  }
  expect(()=>travelParts(-1,0,'statement')).toThrow(RangeError);expect(()=>travelMeaning(0,6,'statement')).toThrow(RangeError);
 });
 it('shares dictionary and review identity across all builder combinations',()=>{
  const dictionary=loadDictionary();
  for(let v=0;v<travelVerbs.length;v++)for(let p=0;p<travelPeople.length;p++)for(const mode of travelModes){const found=lookupEntries(dictionary,travelSentence(v,p,mode.id)).entries.find(e=>e.saveId===travelSaveId(v,p,mode.id));expect(found).toBeDefined();expect(found?.studyTags?.lessons).toContain(10);}
  expect(travelSaveId(0,1,'w-question')).toBe('l10-phrase-0');expect(travelSaveId(5,3,'statement')).toBe('l10-phrase-16');
  expect(lookupEntries(dictionary,'fährst').entries.some(e=>e.de==='fahren')).toBe(true);
 });
 it('uses base edition workbook recordings with the correct source transcript numbers',()=>{
  const b=loadBook();expect(b.pages).toHaveLength(178);expect(b.audio).toHaveLength(188);
  expect(b.pages.find(p=>p.id==='coursebook-167')?.lessons).toEqual([10]);expect(b.pages.find(p=>p.id==='coursebook-195')?.lessons).toEqual([10]);expect(b.pages.find(p=>p.id==='workbook-91')?.lessons).toEqual([9,10]);
  const tracks=b.audio.filter(t=>t.lesson===10);expect(tracks).toHaveLength(11);
  expect(tracks.filter(t=>t.kind==='workbook').map(t=>t.transcript?.sourceTrack).sort()).toEqual(['2_26','2_27','2_28','2_29','2_30']);
  const manifest=JSON.parse(readFileSync(resolve('apps/web/generated/interactive-book.json'),'utf8')) as {audio:Array<{lesson:number;kind:string;source:string}>};
  for(const t of manifest.audio.filter(t=>t.lesson===10&&t.kind==='workbook'))expect(t.source).toContain('Momente_A1_1_AB_CD2');
  expect(tracks.filter(t=>t.pageId==='coursebook-68')).toHaveLength(5);
  expect(tracks.find(t=>t.transcript?.sourceTrack==='2_30')?.transcript?.lines[0]?.text).toContain('nicht auf Gleis 5, sondern auf Gleis 15');
 });
 it('keeps model answers labelled and the announcement facts distinct from a writing solution',()=>{
  const a=loadBookAnswers();expect(a).toHaveLength(184);expect(a.find(a=>a.pageId==='coursebook-67'&&a.exercise==='Exercise 7a/b')?.kind).toBe('sample');
  expect(a.find(a=>a.pageId==='coursebook-68'&&a.exercise==='Exercise 10b')?.text).toContain('B48');
  expect(a.filter(a=>a.pageId==='coursebook-68'&&a.exercise.startsWith('Quick test'))).toHaveLength(3);
  expect(a.find(a=>a.pageId==='workbook-69')?.note).toContain('no supplied complete model message');
  expect(a.find(a=>a.pageId==='workbook-66')?.source).toBe('workbook-transcript');
 });
 it('accepts the two-digit lesson in routing and shared hub navigation',()=>{expect(parseHubSearchParams({lesson:'10'},[]).lesson).toBe('10');expect(isSafeNavigationPath('/lessons/10')).toBe(true);});
 it('ships exact speech for all combinations and both taxi plurals',()=>{const speech=loadStudySpeech();for(const text of [...travelSpeech,'die Taxen','die Taxis']){expect(speech[text],text).toBeTruthy();expect(statSync(resolve('apps/web/public'+speech[text])).size).toBeGreaterThan(1000);}});
});
