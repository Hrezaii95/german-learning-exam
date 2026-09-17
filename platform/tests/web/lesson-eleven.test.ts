import {describe,it,expect} from 'vitest';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {studyUnits} from '../../apps/web/lib/study/course-lessons';
import {loadWordCards,wordCardForPath} from '../../apps/web/lib/content/word-cards';
import {loadBook,loadBookAnswers,loadDictionary,loadStudySpeech} from '../../apps/web/lib/study/catalog';
import {lookupEntries} from '../../apps/web/lib/study/lookup';
import {pastActivities,pastPeople,pastModes,pastParts,pastSentence,pastMeaning,pastSaveId,pastSpeech} from '../../apps/web/lib/study/past-sheet';
import {questionWordLessons,questionWords} from '../../apps/web/lib/study/questions';
describe('Lesson 11 source and Perfekt integration',()=>{
 const unit=studyUnits.find(u=>u.number===11)!;
 it('covers the glossary and source activity verbs with correct past forms',()=>{
  expect(readFileSync(resolve('../research/lesson-expansion/lesson-11-vocabulary.tsv'),'utf8').trim().split(/\r?\n/).slice(1)).toHaveLength(82);expect(unit.words).toHaveLength(82);expect(loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(11))).toHaveLength(81);
  for(const w of unit.words!){const c=wordCardForPath(`/vocabulary/${w.id}`)!;expect(c,w.de).toBeDefined();expect(c.studyTags?.lessons).toContain(11);expect(c.rows.some(r=>r.singular.text===w.de)).toBe(true);}
  expect(unit.verbs.filter(v=>v.participle)).toHaveLength(31);expect(unit.verbs.find(v=>v.verb==='einladen')?.forms).toEqual(['lade ein','lädst ein','lädt ein','laden ein','ladet ein','laden ein']);
  const forms=Object.fromEntries(unit.verbs.map(v=>[v.verb,v.participle]));expect(forms).toMatchObject({abwaschen:'abgewaschen',schlafen:'geschlafen',fotografieren:'fotografiert',telefonieren:'telefoniert',arbeiten:'gearbeitet',chatten:'gechattet',backen:'gebacken'});expect(forms.zurückkommen).toBeUndefined();
  for(const q of unit.quiz)expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);
 });
 it('puts haben and the complete participle in the correct positions',()=>{
  expect(pastSentence(0,0,'statement')).toBe('Ich habe gestern gearbeitet.');expect(pastSentence(5,2,'time-first')).toBe('Gestern hat er Kaffee getrunken.');expect(pastSentence(11,5,'question')).toBe('Haben Sie gestern Freunde eingeladen?');expect(pastMeaning(5,2,'question')).toBe('Did he drink coffee yesterday?');
  for(let a=0;a<pastActivities.length;a++)for(let p=0;p<pastPeople.length;p++)for(const m of pastModes){const parts=pastParts(a,p,m.id);expect(parts.at(-1)?.role).toBe('participle');expect(parts.findIndex(x=>x.role==='auxiliary')).toBe(m.id==='question'?0:1);expect(pastSentence(a,p,m.id)).not.toMatch(/undefined|NaN/);expect(pastMeaning(a,p,m.id)).not.toMatch(/undefined|NaN/);}
  expect(()=>pastParts(-1,0,'statement')).toThrow(RangeError);
 });
 it('shares dictionary, phrase and vocabulary-card review information',()=>{
  const dictionary=loadDictionary();for(let a=0;a<pastActivities.length;a++)for(let p=0;p<pastPeople.length;p++)for(const m of pastModes){expect(lookupEntries(dictionary,pastSentence(a,p,m.id)).entries.some(e=>e.saveId===pastSaveId(a,p,m.id))).toBe(true);}
  expect(pastSaveId(0,0,'statement')).toBe('l11-phrase-1');expect(lookupEntries(dictionary,'getrunken').entries.some(e=>e.de==='trinken')).toBe(true);
  const card=wordCardForPath('/vocabulary/l11-telefonieren')!;expect(card.pattern).toContain('hat telefoniert');expect(card.prompts.find(p=>p.question==='What is the past participle of telefonieren?')?.answers).toEqual(['telefoniert']);
 });
 it('maps the shared six recordings to both coursebook pages and the base workbook edition',()=>{
  const b=loadBook();expect(b.pages).toHaveLength(178);expect(b.audio).toHaveLength(188);const tracks=b.audio.filter(t=>t.lesson===11);expect(tracks).toHaveLength(8);
  const a=b.pages.find(p=>p.id==='coursebook-69')!,c=b.pages.find(p=>p.id==='coursebook-70')!;expect(a.audioIds).toHaveLength(6);expect(c.audioIds).toEqual(a.audioIds);
  expect(tracks.filter(t=>t.kind==='workbook').map(t=>t.transcript?.sourceTrack).sort()).toEqual(['2_31','2_32']);expect(tracks.filter(t=>t.kind==='workbook').every(t=>t.pageId==='workbook-73')).toBe(true);
  for(const id of ['coursebook-168','coursebook-169','coursebook-196','coursebook-197'])expect(b.pages.find(p=>p.id===id)?.lessons).toEqual([11]);expect(b.pages.find(p=>p.id==='workbook-92')?.lessons).toEqual([11,12]);
  expect(b.pages.find(p=>p.id==='coursebook-72')?.lines.some(l=>l.text==='Sonntag! Ein super Tag!')).toBe(true);
 });
 it('adds official partner keys without guessing missing workbook solutions',()=>{const a=loadBookAnswers();expect(a).toHaveLength(184);expect(a.filter(a=>a.pageId==='coursebook-72')).toHaveLength(3);expect(a.find(a=>a.pageId==='coursebook-169')?.text).toContain('Ab September');expect(a.filter(a=>a.pageId==='workbook-73')).toHaveLength(0);});
 it('promotes source-covered duration and starting-point questions',()=>{for(const id of ['wie-lange','ab-wann']){const q=questionWords.find(w=>w.id===id)!;expect(q.lesson).toBe(11);expect(questionWordLessons(q)).toContain(11);}});
 it('ships exact speech for every builder sentence and participle model',()=>{const speech=loadStudySpeech();for(const text of [...pastSpeech,...unit.verbs.filter(v=>v.participle).map(v=>`hat ${v.participle}`)]){expect(speech[text],text).toBeTruthy();expect(statSync(resolve('apps/web/public'+speech[text])).size).toBeGreaterThan(1000);}});
});
