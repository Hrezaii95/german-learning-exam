import {describe,it,expect} from 'vitest';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {studyUnits} from '../../apps/web/lib/study/course-lessons';
import {wordCardForPath} from '../../apps/web/lib/content/word-cards';
import {loadBook,loadBookAnswers,loadDictionary,loadStudySpeech} from '../../apps/web/lib/study/catalog';
import {lookupEntries} from '../../apps/web/lib/study/lookup';
import {foodModels,foodModes,foodSentence,foodMeaning,foodSaveId,foodReply,foodCompounds,foodSpeech} from '../../apps/web/lib/study/food-sheet';

describe('Lesson 9 food and Module 3 source coverage',()=>{
 const unit=studyUnits.find(u=>u.number===9)!;
 it('covers all source entries and preserves both accepted Ketchup articles',()=>{
  expect(readFileSync(resolve('../research/lesson-expansion/lesson-09-vocabulary.tsv'),'utf8').trim().split(/\r?\n/).slice(1)).toHaveLength(100);
  expect(unit.words).toHaveLength(100);
  for(const w of unit.words!){const card=wordCardForPath(`/vocabulary/${w.id}`)!;expect(card,w.de).toBeDefined();expect(card.studyTags?.lessons).toContain(9);expect(card.rows.some(r=>r.singular.text===w.de),w.de).toBe(true);}
  const ketchup=wordCardForPath('/vocabulary/l9-ketchup')!;
  expect(ketchup.rows.map(r=>[r.singular.text,r.singular.tone])).toEqual([['der Ketchup','male'],['das Ketchup','neuter']]);
  expect(ketchup.prompts[0]?.answers).toEqual(['der Ketchup','das Ketchup']);
  expect(wordCardForPath('/vocabulary/l9-essen-noun')?.rows[0]?.singular.text).toBe('das Essen');
  expect(wordCardForPath('/vocabulary/l9-essen')?.rows[0]?.singular.text).toBe('essen');
  expect(unit.verbs.find(v=>v.verb==='nehmen')?.forms).toEqual(['nehme','nimmst','nimmt','nehmen','nehmt','nehmen']);
  for(const q of unit.quiz)expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);
 });
 it('distinguishes general food preferences from countable servings',()=>{
  expect(foodSentence(0,'like',false)).toBe('Ich mag Hamburger.');
  expect(foodSentence(0,'wish',true)).toBe('Ich möchte keinen Hamburger.');
  expect(foodSentence(3,'enjoy',true)).toBe('Ich trinke nicht gern Tee.');
  expect(foodSentence(6,'wish',false)).toBe('Ich möchte ein Stück Schokolade.');
  expect(foodSentence(9,'take',true)).toBe('Ich nehme keine Portion Fleisch.');
  expect(foodSentence(10,'like',true)).toBe('Ich mag keinen Käse.');
  expect(foodSentence(11,'like',true)).toBe('Ich mag keine Pommes frites.');
  const dictionary=loadDictionary();
  for(let i=0;i<foodModels.length;i++)for(const mode of foodModes)for(const negative of [true,false]){
   expect(foodSentence(i,mode.id,negative)).not.toMatch(/undefined|NaN/);
   expect(foodMeaning(i,mode.id,negative)).not.toMatch(/undefined|NaN/);
   const entry=lookupEntries(dictionary,foodSentence(i,mode.id,negative)).entries.find(e=>e.saveId===foodSaveId(i,mode.id,negative));expect(entry).toBeDefined();expect(entry?.studyTags?.lessons).toContain(9);
  }
  expect(foodSaveId(0,'like',false)).toBe('l9-phrase-0');expect(foodSaveId(1,'wish',false)).toBe('l9-phrase-14');
 });
 it('keeps reply polarity and compound head gender correct',()=>{
  expect(foodReply(true,true)).toBe('Ich auch.');expect(foodReply(true,false)).toBe('Ich nicht.');
  expect(foodReply(false,true)).toBe('Ich schon.');expect(foodReply(false,false)).toBe('Ich auch nicht.');
  for(const c of foodCompounds)expect(c.result.split(' ')[0]).toBe(c.right.split(' ')[0]);
  expect(foodCompounds.find(c=>c.result==='das Schinkenbrötchen')?.tone).toBe('neuter');
 });
 it('includes continuous Module 3 pages, partner pages and every exam track',()=>{
  const book=loadBook();expect(book.pages).toHaveLength(165);expect(book.audio).toHaveLength(180);
  for(const id of ['coursebook-165','coursebook-166','workbook-91'])expect(book.pages.find(p=>p.id===id)?.lessons).toContain(9);
  const tracks=book.audio.filter(a=>a.lesson===9);expect(tracks).toHaveLength(27);expect(tracks.filter(a=>a.id.includes('-l9-'))).toHaveLength(6);
  for(let n=17;n<=25;n++){const a=tracks.find(a=>a.kind==='workbook'&&a.transcript?.sourceTrack===`2_${n}`)!;expect(a,`Exam track ${n}`).toBeDefined();expect(a.pageId).toBe(n<19?'workbook-64':'workbook-65');expect(a.transcript?.lines.length).toBeGreaterThan(0);}
 });
 it('maps exercise 10 correctly without misreading a wrapped partner item as exercise 14',()=>{
  const answers=loadBookAnswers();expect(answers).toHaveLength(165);
  expect(answers.find(a=>a.pageId==='coursebook-58'&&a.exercise==='Exercise 10a')?.text).toBeTruthy();
  expect(answers.filter(a=>a.pageId==='coursebook-58'&&a.exercise.startsWith('Quick test'))).toHaveLength(3);
  expect(answers.find(a=>a.pageId==='coursebook-18'&&a.exercise==='Exercise 14')).toBeUndefined();
  expect(answers.find(a=>a.pageId==='coursebook-18'&&a.exercise==='Exercise 8a/b')?.text).toContain('12, 14 falsch');
  expect(answers.find(a=>a.pageId==='workbook-61'&&a.exercise==='Skills test · Exercise 3')?.kind).toBe('sample');
  expect(answers.filter(a=>a.pageId==='workbook-54')).toEqual([]);
 });
 it('ships exact audio for the entire food builder and the alternative article',()=>{
  const speech=loadStudySpeech();for(const text of [...foodSpeech,'das Ketchup']){expect(speech[text],text).toBeTruthy();expect(statSync(resolve('apps/web/public'+speech[text])).size).toBeGreaterThan(1000);}
 });
});
