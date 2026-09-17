import {describe,it,expect} from "vitest";
import {studyUnits} from "../../apps/web/lib/study/course-lessons";
import {wordCardForPath} from "../../apps/web/lib/content/word-cards";
import {loadBook,loadBookAnswers,loadDictionary} from "../../apps/web/lib/study/catalog";
import {lookupEntries} from "../../apps/web/lib/study/lookup";
import {officeSentence,officeModels,phoneSteps} from "../../apps/web/lib/study/office-sheet";
import {matchesStudyScope,tagsForLesson} from "../../apps/web/lib/study/scope";
describe("Lesson 6 and Module 2 integration",()=>{
 const unit=studyUnits.find(u=>u.number===6)!;
 it("covers all 74 glossary and exercise entries with stable reachable cards",()=>{
  expect(unit.words).toHaveLength(74);
  for(const word of unit.words!){const card=wordCardForPath(`/vocabulary/${word.id}`);expect(card,word.de).toBeDefined();expect(card?.studyTags?.lessons).toContain(6);expect(card?.rows.some(r=>r.singular.text===word.de),word.de).toBe(true);}
  expect(wordCardForPath('/vocabulary/l6-sehen')?.id).toBe(wordCardForPath('/vocabulary/l5-sehen')?.id);
 });
 it("includes both complete modules and every partner-activity page",()=>{
  const book=loadBook();expect(book.pages).toHaveLength(102);
  for(const n of [155,156,157,158,159,160,161])expect(book.pages.find(p=>p.id===`coursebook-${n}`)?.section).toContain('Partner activities');
  expect(book.pages.find(p=>p.id==='coursebook-45')?.section).toBe('Module 2 · Grammar');
  expect(book.pages.find(p=>p.id==='coursebook-46')?.section).toBe('Module 2 · Communication');
  const shared=book.pages.find(p=>p.id==='coursebook-159')!;
  for(const n of [3,4])expect(matchesStudyScope({...tagsForLesson(shared.lesson),lessons:shared.lessons!},{mode:'one',lessons:[n],concepts:[],source:'all'})).toBe(true);
  expect(book.pages.find(p=>p.id==='workbook-35')?.lines.some(l=>l.text==='Hilfe! Ich brauche einen')).toBe(true);
  expect(book.pages.find(p=>p.id==='workbook-8')?.lines.some(l=>l.text.startsWith('10 Woher'))).toBe(true);
  expect(book.audio.filter(a=>a.kind==='coursebook'&&a.lesson===1&&a.exercise===7).every(a=>a.pageId==='coursebook-13')).toBe(true);
  expect(loadBookAnswers().filter(a=>a.pageId==='coursebook-22'&&a.exercise.startsWith('Exercise 8'))).toHaveLength(0);
  for(const page of book.pages)for(const line of page.lines)expect(line.text).not.toMatch(/[\x00-\x08\u0180-\u02af]/);
 });
 it("maps all nine lesson recordings and twenty Module 2 recordings without disc-offset collisions",()=>{
  const tracks=loadBook().audio.filter(a=>a.lesson===6);expect(tracks).toHaveLength(29);expect(tracks.filter(a=>a.id.includes('-l6-'))).toHaveLength(9);
  expect(tracks.find(a=>a.kind==='workbook'&&a.exercise===13)?.transcript?.sourceTrack).toBe('1_47');
  const order=tracks.find(a=>a.id.includes('-m2-track62-'))!;expect(order.pageId).toBe('workbook-43');expect(order.transcript?.sourcePages).toEqual([9,10]);expect(order.transcript?.lines.at(-1)?.text).toContain('Frau Hofert');
  const song=tracks.find(a=>a.id.includes('coursebook-m2-track59-'))!;expect(song.transcript?.sourceTitle).toContain('song text');expect(song.pageId).toBe('coursebook-44');
 });
 it("keeps official keys and model answers distinct and exposes irregular verbs",()=>{
  const answers=loadBookAnswers();expect(answers).toHaveLength(100);expect(answers.filter(a=>a.pageId==='workbook-40'&&a.kind==='sample')).toHaveLength(1);expect(answers.find(a=>a.pageId==='workbook-43')?.text).toContain('15 rote Notizbücher');
  const dictionary=loadDictionary();for(const text of ['brauchst','telefoniert','reagierst','die Passwörter'])expect(lookupEntries(dictionary,text).entries.length,text).toBeGreaterThan(0);
  for(const q of unit.quiz)expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);
 });
 it("changes only the required article and forms true plurals",()=>{
  expect(officeSentence(0,'identify',false,false)).toBe('Das ist ein Kalender.');expect(officeSentence(0,'need',false,false)).toBe('Ich brauche einen Kalender.');expect(officeSentence(0,'need',true,false)).toBe('Ich brauche keinen Kalender.');
  expect(officeSentence(1,'have',true,false)).toBe('Ich habe kein Tablet.');expect(officeSentence(2,'find',true,true)).toBe('Ich suche keine Mäuse.');expect(officeSentence(4,'have',false,true)).toBe('Ich habe Passwörter.');
  for(let i=0;i<officeModels.length;i++)expect(officeSentence(i,'identify',false,true)).toMatch(/^Das sind /);
  expect(phoneSteps).toHaveLength(7);
 });
});
