import type {WordCard} from "../content/word-card-types";
import {loadWordCards} from "../content/word-cards";
import {savedWordCard} from "./saved-word-card";
import {subjectSheets,type SubjectSheet,type SubjectVocabularyItem} from "./subject-sheets";
import {wordStudyTags} from "./tags";

/** Project existing canonical rows only; subject membership comes from shared tags. */
export function buildSubjectSheets(cards:readonly WordCard[]):SubjectSheet[]{
  const sheets:SubjectSheet[]=subjectSheets.map(subject=>({...subject,items:[]}));
  const bySubject=new Map(sheets.map(sheet=>[sheet.id,sheet]));
  const seen=new Set<string>();
  for(const card of cards){
    const studyTags=wordStudyTags(card);
    const savedItem=savedWordCard({...card,studyTags});
    card.rows.forEach((row,index)=>{
      const id=`${card.id}-${index}`;
      if(seen.has(id))return;
      seen.add(id);
      const item:SubjectVocabularyItem={
        id,cardId:card.id,de:row.singular.text,meaning:row.meaning,
        category:card.category,tone:row.singular.tone,audio:row.singular.audio,
        plurals:row.plurals.map(form=>({...form})),href:card.path,studyTags,savedItem,
        examples:card.examples.slice(0,2).map(example=>({...example})),
        patterns:[...card.pattern],
        note:[...new Set([row.usage,card.tip,card.note].filter(Boolean))].join("\n\n"),
      };
      for(const concept of new Set(studyTags.concepts))bySubject.get(concept)?.items.push(item);
    });
  }
  return sheets;
}

let cached:SubjectSheet[]|undefined;
export function loadSubjectSheets():SubjectSheet[]{
  return cached??=buildSubjectSheets(loadWordCards().cards);
}
