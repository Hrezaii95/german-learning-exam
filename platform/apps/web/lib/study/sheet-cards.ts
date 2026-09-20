import {wordStudyTags} from "./tags";
import type {WordCard} from "../content/word-card-types";
import {verbModels,type ExtendedSheetId} from "./sheet-topics";
import {studyUnits} from "./course-lessons";
import {LAST_AVAILABLE_LESSON} from "./scope";

export function cardsForSheet(cards:WordCard[],sheet:ExtendedSheetId):WordCard[]{
  const inLessons=(card:WordCard)=>wordStudyTags(card).lessons.some(n=>n>=1&&n<=LAST_AVAILABLE_LESSON);
  const verbs=new Set([...verbModels,...studyUnits.flatMap(u=>u.verbs)].map(v=>v.verb));
  return cards.filter(card=>{
    if(!inLessons(card))return false;
    if(sheet==="people")return wordStudyTags(card).concepts.includes("people")||["W098","W100","W024","W419"].includes(card.id);
    if(sheet==="verbs")return ["Pronoun","Question word","Function word"].includes(card.category)||(card.category==="Verb"&&card.rows.some(r=>verbs.has(r.singular.text)))||card.category==="Adjective / adverb"||card.category==="Adjectives";
    if(sheet==="numbers")return card.category==="Number"||card.rows.some(r=>/^der Euro$|^der Cent$|^der Preis$|^die Million$/.test(r.singular.text));
    return ["Greeting","Alphabet","Interjection"].includes(card.category)||["W061","W062","W063","W535","W536"].includes(card.id)||(wordStudyTags(card).lessons.some(n=>n>=5)&&card.category==="Expression");
  });
}
