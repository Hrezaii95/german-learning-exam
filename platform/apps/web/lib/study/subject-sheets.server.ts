import type {WordCard} from "../content/word-card-types";
import {loadWordCards} from "../content/word-cards";
import {loadDictionary,loadCountrySpeech,loadHomeSpeech} from "./catalog";
import {countries} from "./countries";
import {homeWords} from "./home";
import {legacyWordCardIds,savedWordCard} from "./saved-word-card";
import type {DictionaryEntry} from "./types";
import {subjectSheets,type SubjectSheet,type SubjectVocabularyItem} from "./subject-sheets";
import {wordStudyTags} from "./tags";

/** Preserve every canonical source row and only explicitly authored dictionary words. */
function buildSubjectVocabulary(cards:readonly WordCard[],extras:readonly DictionaryEntry[]=[]):SubjectVocabularyItem[]{
  const items:SubjectVocabularyItem[]=[];
  const seen=new Set<string>();
  for(const card of cards){
    const studyTags=wordStudyTags(card);
    const savedItem=savedWordCard({...card,studyTags});
    card.rows.forEach((row,index)=>{
      const id=`${card.id}-${index}`;
      if(seen.has(id))return;
      seen.add(id);
      const item:SubjectVocabularyItem={
        id,legacyIds:legacyWordCardIds(card).map(id=>`${id}-${index}`),cardId:card.id,de:row.singular.text,meaning:row.meaning,
        category:card.category,tone:row.singular.tone,audio:row.singular.audio,
        plurals:row.plurals.map(form=>({...form})),href:card.path,studyTags,savedItem,
        examples:card.examples.slice(0,2).map(example=>({...example})),
        patterns:[...card.pattern],
        note:[...new Set([row.usage,card.tip,card.note].filter(Boolean))].join("\n\n"),
      };
      items.push(item);
    });
  }
  const canonicalIds=new Set(cards.map(card=>card.id));
  const speech:Record<string,string>=extras.length?{...loadCountrySpeech(),...loadHomeSpeech()}:{};
  for(const entry of extras){
    if(entry.kind!=="word"||canonicalIds.has(entry.id))continue;
    // Escape every non-ASCII identifier character, including literal underscores,
    // so source IDs remain distinct and exact-row return links stay valid.
    const sourceId=entry.id.replace(/[^a-zA-Z0-9:-]/gu,character=>`_${character.codePointAt(0)!.toString(16)}_`);
    const id=`${/^[a-zA-Z]/u.test(sourceId)?sourceId:`dictionary-${sourceId}`}-0`;
    if(seen.has(id))continue;
    seen.add(id);
    const country=countries.find(country=>entry.id===`country-${country.id}`);
    const home=homeWords.find(word=>entry.id===`home-${word.id}`);
    const category=country?"Country":entry.id.startsWith("language-")?"Language":home?"Noun":entry.studyTags?.concepts.includes("verbs")?"Verb":"Word";
    const primary=entry.displayForms?.find(form=>form.text===entry.de);
    // Country/language display colours are not an article: never invent das.
    const tone=(category==="Country"||category==="Language")&&!/^(?:der|die|das) /u.test(entry.de)?"plain":primary?.tone??"plain";
    const studyTags=entry.studyTags??{lessons:[],concepts:["everyday" as const],source:"study-extra" as const};
    const plurals=(entry.displayForms??[]).filter((form,index,forms)=>
      form.tone==="plural"&&form.text!==entry.de&&forms.findIndex(other=>other.text===form.text)===index,
    ).map(form=>({...form,audio:speech[form.text]??null}));
    items.push({
      id,cardId:entry.id,de:entry.de,meaning:entry.en,category,tone,audio:entry.audio,
      plurals,href:entry.href,studyTags,
      savedItem:{id:entry.saveId??entry.id,title:entry.de,meaning:entry.en,kind:"word",href:entry.href,studyTags,audio:entry.audio},
      examples:entry.example&&entry.translation?[{de:entry.example,en:entry.translation,audio:speech[entry.example]??null}]:[],
      patterns:[...new Set([entry.de,...entry.forms])],
      note:home?.cue??country?.note??"",
    });
  }
  return items;
}

function distributeSubjectVocabulary(items:readonly SubjectVocabularyItem[]):SubjectSheet[]{
  const sheets:SubjectSheet[]=subjectSheets.map(subject=>({...subject,items:[]}));
  const bySubject=new Map(sheets.map(sheet=>[sheet.id,sheet]));
  for(const item of items)for(const concept of new Set(item.studyTags.concepts))bySubject.get(concept)?.items.push(item);
  return sheets;
}

export function buildSubjectSheets(cards:readonly WordCard[],extras:readonly DictionaryEntry[]=[]):SubjectSheet[]{
  return distributeSubjectVocabulary(buildSubjectVocabulary(cards,extras));
}

let vocabulary:SubjectVocabularyItem[]|undefined;
export function loadSubjectVocabulary():SubjectVocabularyItem[]{
  return vocabulary??=buildSubjectVocabulary(loadWordCards().cards,loadDictionary());
}

let cached:SubjectSheet[]|undefined;
export function loadSubjectSheets():SubjectSheet[]{
  return cached??=distributeSubjectVocabulary(loadSubjectVocabulary());
}
