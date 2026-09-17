import {describe,it,expect} from 'vitest';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {studyUnits} from '../../apps/web/lib/study/course-lessons';
import {wordCardForPath} from '../../apps/web/lib/content/word-cards';
import {loadBook,loadBookAnswers,loadDictionary,loadStudySpeech} from '../../apps/web/lib/study/catalog';
import {lookupEntries} from '../../apps/web/lib/study/lookup';
import {clockWords,clockSentence,clockMeaning,clockSaveId,clockHours,clockMinutes,planSentence,timeSpeech} from '../../apps/web/lib/study/time-sheet';
import {questionWords} from '../../apps/web/lib/study/questions';

describe('Lesson 8 time, plans and source coverage',()=>{
 const unit=studyUnits.find(u=>u.number===8)!;
 it('covers all source vocabulary through shared tagged cards',()=>{
  const rows=readFileSync(resolve('../research/lesson-expansion/lesson-08-vocabulary.tsv'),'utf8').trim().split(/\r?\n/).slice(1);
  expect(rows).toHaveLength(74);expect(unit.words).toHaveLength(74);
  for(const w of unit.words!){const card=wordCardForPath(`/vocabulary/${w.id}`)!;expect(card,w.de).toBeDefined();expect(card.studyTags?.lessons).toContain(8);expect(card.rows.some(r=>r.singular.text===w.de),w.de).toBe(true);}
  expect(wordCardForPath('/vocabulary/l8-museum')?.rows[0]?.plurals[0]?.text).toBe('die Museen');
  expect(unit.verbs.find(v=>v.verb==='wissen')?.forms).toEqual(['weiß','weißt','weiß','wissen','wisst','wissen']);
  for(const q of unit.quiz)expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);
 });
 it('reads the book clock variants correctly across midnight and one o’clock',()=>{
  for(const [h,m,expected] of [[15,15,'Viertel nach drei'],[15,25,'fünf vor halb vier'],[15,30,'halb vier'],[15,35,'fünf nach halb vier'],[15,45,'Viertel vor vier'],[23,55,'fünf vor zwölf'],[0,30,'halb eins'],[1,0,'ein Uhr'],[13,15,'Viertel nach eins']] as const)expect(clockWords(h,m,'everyday')).toBe(expected);
  expect(clockWords(1,5,'official')).toBe('ein Uhr fünf');expect(clockWords(15,25,'official')).toBe('fünfzehn Uhr fünfundzwanzig');expect(clockWords(0,0,'official')).toBe('null Uhr');
  expect(()=>clockWords(24,0,'official')).toThrow(RangeError);expect(()=>clockWords(12,7,'everyday')).toThrow(RangeError);
  for(const h of clockHours)for(const m of clockMinutes)for(const mode of ['official','everyday'] as const)expect(clockSentence(h,m,mode)).not.toMatch(/undefined|NaN/);
 });
 it('keeps shared save identity for the same everyday time in morning and afternoon',()=>{
  expect(clockSaveId(15,30,'everyday')).toBe(clockSaveId(3,30,'everyday'));
  expect(clockMeaning(15,30,'everyday')).toBe('It is 03:30 or 15:30, depending on context.');
  const result=lookupEntries(loadDictionary(),'Es ist halb vier.').entries[0]!;
  expect(result.saveId).toBe(clockSaveId(15,30,'everyday'));expect(result.en).toContain('half past three');expect(result.studyTags?.lessons).toContain(8);
  expect(lookupEntries(loadDictionary(),'weiß').entries.some(e=>e.de==='wissen')).toBe(true);
 });
 it('keeps the verb second and chooses the destination article',()=>{
  expect(planSentence(0,0,true)).toBe('Am Montag gehen wir ins Kino.');
  expect(planSentence(5,10,false)).toBe('Wir gehen am Samstag in eine Bar.');
  expect(planSentence(6,11,true)).toBe('Am Sonntag gehen wir in einen Klub.');
  const result=lookupEntries(loadDictionary(),planSentence(6,11,true)).entries[0]!;expect(result.saveId).toBe('l8-plan-6-11-true');
  for(const id of ['wann','wie-spaet'])expect(questionWords.find(w=>w.id===id)?.lesson).toBe(8);
 });
 it('includes partner and extra pages and all original recordings, including the oddly named second dialogue',()=>{
  const book=loadBook();expect(book.pages).toHaveLength(178);
  for(const [kind,start] of [['coursebook',51],['workbook',50]] as const)expect(book.pages.filter(p=>p.kind===kind&&p.section==='Lesson 8').map(p=>p.printedPage)).toEqual([start,start+1,start+2,start+3]);
  for(const id of ['coursebook-163','coursebook-164','workbook-89','workbook-90'])expect(book.pages.find(p=>p.id===id)?.lessons).toContain(8);
  const tracks=book.audio.filter(a=>a.lesson===8);expect(tracks).toHaveLength(14);expect(tracks.filter(a=>a.pageId==='workbook-90')).toHaveLength(7);
  expect(tracks.find(a=>a.kind==='workbook'&&a.transcript?.sourceTrack==='2_05')?.transcript?.lines[1]?.text).toContain('Viertel vor acht.');
  expect(tracks.find(a=>a.kind==='coursebook'&&a.exercise===4)?.pageId).toBe('coursebook-53');
  expect(tracks.find(a=>a.transcript?.sourceTrack==='2_56')?.transcript?.lines).toHaveLength(6);
  expect(book.pages.find(p=>p.id==='coursebook-164')?.lines.map(l=>l.text).join(' ')).toContain('Anna und Maria');
 });
 it('keeps the official key across both PDF pages and distinguishes 4b from 4a',()=>{
  const answers=loadBookAnswers();
  expect(answers.find(a=>a.pageId==='coursebook-52'&&a.exercise==='Exercise 4a')?.text).toBe('Nachmittag, Kino');
  const next=answers.find(a=>a.pageId==='coursebook-53'&&a.exercise==='Exercise 4b')!;expect(next.sourcePage).toBe(3);expect(next.text).toContain('6 die Nacht');
  expect(answers.find(a=>a.pageId==='coursebook-53'&&a.exercise==='Exercise 6a')?.text).toContain('7 fünf vor vier');
  expect(answers.filter(a=>a.pageId==='coursebook-54')).toHaveLength(4);
  expect(answers.find(a=>a.pageId==='workbook-90')?.source).toBe('workbook-transcript');
  expect(answers.filter(a=>a.pageId==='workbook-51')).toEqual([]);
 });
 it('ships file-backed speech for every clock and plan combination',()=>{
  const speech=loadStudySpeech();for(const text of timeSpeech){expect(speech[text],text).toBeTruthy();expect(statSync(resolve('apps/web/public'+speech[text])).size).toBeGreaterThan(1000);}
 });
});
