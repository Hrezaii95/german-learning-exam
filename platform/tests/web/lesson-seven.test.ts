import {describe,it,expect} from "vitest";
import {readFileSync,statSync} from "node:fs";
import {resolve} from "node:path";
import {studyUnits} from "../../apps/web/lib/study/course-lessons";
import {wordCardForPath,loadWordCards} from "../../apps/web/lib/content/word-cards";
import {loadBook,loadBookAnswers,loadDictionary,loadStudySpeech} from "../../apps/web/lib/study/catalog";
import {lookupEntries} from "../../apps/web/lib/study/lookup";
import {abilitySentence,abilityMeaning,frequencySentence,hobbiesSpeech} from "../../apps/web/lib/study/hobbies-sheet";
import {cardsForSheet} from "../../apps/web/lib/study/sheet-cards";
import {questionWords,questionWordLessons} from "../../apps/web/lib/study/questions";
import {matchesStudyScope} from "../../apps/web/lib/study/scope";
import {wordStudyTags} from "../../apps/web/lib/study/tags";

describe("Lesson 7 source coverage and modal sentence learning",()=>{
 const unit=studyUnits.find(u=>u.number===7)!;
 it("covers every source vocabulary row with an accessible tagged word card",()=>{
  const rows=readFileSync(resolve('../research/lesson-expansion/lesson-07-vocabulary.tsv'),'utf8').trim().split(/\r?\n/).slice(1);
  expect(rows).toHaveLength(94);expect(unit.words).toHaveLength(rows.length);
  for(const row of rows){const de=row.split('\t')[0]!;const word=unit.words!.find(w=>w.de===de)!;expect(word,de).toBeDefined();const card=wordCardForPath(`/vocabulary/${word.id}`)!;expect(card,de).toBeDefined();expect(card.studyTags?.lessons).toContain(7);expect(card.rows.some(r=>r.singular.text===de),de).toBe(true);}
  expect(loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(7)&&c.rows.some(r=>r.singular.text==='kennen'))).toHaveLength(1);
  expect(wordCardForPath('/vocabulary/l7-ja')?.title).toContain('emphasis');
  expect(wordCardForPath('/vocabulary/l7-die-senioren')).toBeUndefined();
  expect(wordCardForPath('/vocabulary/l7-senioren')?.rows[0]?.singular.tone).toBe('plural');
  expect(cardsForSheet(loadWordCards().cards,'people').some(c=>c.aliases.includes('/vocabulary/l7-dj')||c.path==='/vocabulary/l7-dj')).toBe(true);
 });
 it("includes the core pages, both partner roles, bingo continuation and workbook extras",()=>{
  const book=loadBook();expect(book.pages).toHaveLength(130);
  for(const [kind,start] of [['coursebook',47],['workbook',46]] as const)expect(book.pages.filter(p=>p.kind===kind&&p.section==='Lesson 7').map(p=>p.printedPage)).toEqual([start,start+1,start+2,start+3]);
  for(const n of [162,163,194])expect(book.pages.find(p=>p.id===`coursebook-${n}`)?.lessons).toContain(7);
  expect(book.pages.find(p=>p.id==='coursebook-193')?.lessons).toEqual([4,5]);
  for(const n of [86,87,88,89])expect(book.pages.find(p=>p.id===`workbook-${n}`)?.section).toContain('Extra practice');
  expect(book.pages.find(p=>p.id==='workbook-89')?.lessons).toContain(7);
 });
 it("uses disc 2 transcript identifiers and one edition of each recording",()=>{
  const tracks=loadBook().audio.filter(a=>a.lesson===7);expect(tracks).toHaveLength(7);
  expect(tracks.filter(a=>a.kind==='coursebook')).toHaveLength(5);
  const compliments=tracks.find(a=>a.kind==='workbook'&&a.exercise===6)!;
  expect(compliments.pageId).toBe('workbook-48');expect(compliments.transcript?.sourceTrack).toBe('2_01');expect(compliments.transcript?.lines[1]?.text).toBe('Herzlichen Dank!');
  const stress=tracks.find(a=>a.kind==='workbook'&&a.exercise===8)!;
  expect(stress.transcript?.sourceTrack).toBe('2_02');expect(stress.transcript?.lines).toHaveLength(10);
  expect(tracks.find(a=>a.kind==='coursebook'&&a.transcript?.sourceTrack==='2/05')?.transcript?.lines.map(l=>l.text).join(' ')).toContain('Kickboxen');
 });
 it("keeps all three 9b speakers together and provides the linked partner and quick-test keys",()=>{
  const answers=loadBookAnswers(),listening=answers.find(a=>a.pageId==='coursebook-49'&&a.exercise==='Exercise 9b')!;
  for(const text of ['im Seniorenheim','Versicherungskaufmann','ein Start-up'])expect(listening.text).toContain(text);
  expect(answers.filter(a=>a.pageId==='coursebook-47').map(a=>a.exercise)).toEqual(['Exercise 1b']);
  for(const page of [162,194])expect(answers.find(a=>a.pageId===`coursebook-${page}`)?.text).toContain('Partner/in B');
  expect(answers.filter(a=>a.pageId==='coursebook-50')).toHaveLength(3);
  expect(answers.find(a=>a.pageId==='workbook-48')?.text).toBe('1 c · 2 d · 3 a · 4 b');
 });
 it("forms the modal frame and separates ability, enjoyment and frequency",()=>{
  expect(abilitySentence(0,0,0,false)).toBe('Ich kann sehr gut schwimmen.');
  expect(abilitySentence(7,1,4,true)).toBe('Kannst du gar nicht Gitarre spielen?');
  expect(abilitySentence(5,2,1,false)).toBe('Er kann gut Rad fahren.');
  expect(abilitySentence(6,5,2,true)).toBe('Können Sie ein bisschen reiten?');
  expect(abilityMeaning(0,2,3,false)).toBe('He cannot swim very well.');
  expect(frequencySentence(6,2)).toBe('Ich reite manchmal.');
  expect(frequencySentence(5,3)).toBe('Ich fahre nie Rad.');
  expect(unit.verbs.find(v=>v.verb==='lesen')?.forms).toEqual(['lese','liest','liest','lesen','lest','lesen']);
  expect(unit.verbs.find(v=>v.verb==='können')?.forms).toEqual(['kann','kannst','kann','können','könnt','können']);
  for(const q of unit.quiz)expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);
 });
 it("shares saved IDs with the dictionary and includes the new question in Lesson 7",()=>{
  const d=loadDictionary();for(const form of ['könnt','liest','triffst','fährst','mixt'])expect(lookupEntries(d,form).entries.length,form).toBeGreaterThan(0);
  const sentence=lookupEntries(d,'Ich kann sehr gut schwimmen.').entries[0]!;
  expect(sentence.saveId).toBe('l7-ability-0-0-0-false');expect(sentence.studyTags?.lessons).toEqual([7]);
  const frequency=questionWords.find(w=>w.id==='wie-oft')!;expect(frequency.lesson).toBe(7);expect(questionWordLessons(frequency)).toContain(7);
  expect(matchesStudyScope(sentence.studyTags!,{mode:'one',lessons:[6],concepts:[],source:'all'})).toBe(false);
  const teacherCard=loadWordCards().cards.find(c=>c.teacherRows.length>0)!;
  const sharedTags=wordStudyTags({...teacherCard,lessons:[...teacherCard.lessons,'7']});
  expect(matchesStudyScope(sharedTags,{mode:'one',lessons:[7],concepts:[],source:'teacher-extra'})).toBe(false);
  expect(matchesStudyScope(sharedTags,{mode:'one',lessons:[2],concepts:[],source:'teacher-extra'})).toBe(true);
  expect(matchesStudyScope(sharedTags,{mode:'one',lessons:[7],concepts:[],source:'course'})).toBe(true);
 });
 it("has file-backed speech for every practice combination",()=>{
  const speech=loadStudySpeech();for(const text of hobbiesSpeech){expect(speech[text],text).toBeTruthy();expect(statSync(resolve('apps/web/public'+speech[text])).size).toBeGreaterThan(1000);}
 });
});
