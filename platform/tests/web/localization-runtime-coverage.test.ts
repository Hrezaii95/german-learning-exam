import {describe,expect,it} from 'vitest';
import {loadDictionary} from '../../apps/web/lib/study/catalog';
import {loadWordCards} from '../../apps/web/lib/content/word-cards';
import {familyConnections,familyMeaning,familyPeople} from '../../apps/web/lib/study/people-family';
import {translate,untranslatedSourceFragments} from '../../apps/web/lib/i18n/catalog';
import bookAnswers from '../../apps/web/generated/book-answers.json';

function coverage() {
 const missing=new Map<string,string[]>();
 const add=(value:string|undefined,source:string)=>{
  if(!value||value.startsWith('https://'))return;
  for(const fragment of untranslatedSourceFragments(value)){
   const contexts=missing.get(fragment)??[];
   if(contexts.length<3)contexts.push(source);
   missing.set(fragment,contexts);
  }
 };
 return {add,missing};
}

describe('published runtime localization coverage',()=>{
 it('covers dictionary meanings, examples and every word-card instruction, including template captures',()=>{
  const {add,missing}=coverage();
  for(const entry of loadDictionary()){
   add(entry.en,`dictionary/${entry.id}/meaning`);
   add(entry.translation,`dictionary/${entry.id}/example`);
  }
  for(const card of loadWordCards().cards){
   for(const key of ['title','category','tip','note'] as const)add(card[key],`card/${card.id}/${key}`);
   for(const row of card.rows)for(const key of ['label','meaning','usage'] as const)add(row[key],`card/${card.id}/${key}`);
   for(const example of card.examples)add(example.en,`card/${card.id}/example`);
   for(const prompt of card.prompts){
    add(prompt.question,`card/${card.id}/question`);
    add(prompt.hint,`card/${card.id}/hint`);
   }
  }
  expect([...missing]).toEqual([]);
 });

 it('covers associated image descriptions, source labels, book notes and both family viewpoints',()=>{
  const {add,missing}=coverage();
  for(const card of loadWordCards().cards){
   add(card.image?.alt,`card/${card.id}/image`);
   for(const source of card.sources)add(source,`card/${card.id}/source`);
   for(const priority of card.priorities)add(priority,`card/${card.id}/priority`);
  }
  for(const answer of bookAnswers)add(answer.note,`book/${answer.id}/note`);
  for(const person of familyPeople)for(const view of ['anna','martin'] as const)add(familyMeaning(person,view),`family/${person.id}/${view}`);
  for(const connection of familyConnections)add(connection.text,'family/connections');
  expect([...missing]).toEqual([]);

  expect(translate('Search Vocabulary','de')).toBe('Suche: Wortschatz');
  expect(translate('Gender: Masculine','ru')).not.toContain('Masculine');
  expect(translate('Learn 100 as a whole: hundert / einhundert.','de')).toBe('Lerne 100 als Ganzes: hundert / einhundert.');
  const reference=translate('Teacher jobs handout Notes_260730_040559.txt, row 48','ru');
  expect(reference).toContain('Notes_260730_040559.txt');
  expect(reference).toContain('48');
  expect(reference).not.toContain('Teacher jobs handout');
  expect(translate('© Hueber Verlag.','hy')).toBe('© Hueber Verlag.');
 });
});
