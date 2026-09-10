import type {WordCard} from "../content/word-card-types";
import {verbModels,type ExtendedSheetId} from "./sheet-topics";

export function cardsForSheet(cards:WordCard[],sheet:ExtendedSheetId):WordCard[]{
  const inLessons=(card:WordCard)=>card.lessons.some(l=>["1","2","3","4","1–3","Module 1"].includes(l));
  const verbs=new Set(verbModels.map(v=>v.verb));
  return cards.filter(card=>{
    if(!inLessons(card))return false;
    if(sheet==="people")return ["Family","Profession"].includes(card.category)||["W098","W100","W024","W419"].includes(card.id);
    if(sheet==="verbs")return ["Pronoun","Question word","Function word"].includes(card.category)||(card.category==="Verb"&&card.rows.some(r=>verbs.has(r.singular.text)))||card.category==="Adjective / adverb"||card.category==="Adjectives";
    if(sheet==="numbers")return card.category==="Number"||card.rows.some(r=>/^der Euro$|^der Cent$|^der Preis$/.test(r.singular.text));
    return ["Greeting","Alphabet","Interjection"].includes(card.category)||["W061","W062","W063","W535","W536"].includes(card.id);
  });
}
