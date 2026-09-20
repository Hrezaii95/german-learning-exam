import {conversationFrames,spellingLetters,sheetQuizzes} from "./sheet-topics";
import type {WordCard} from "../content/word-card-types";
import type {StudyTags} from "./scope";
import type {RecallQuestion} from "./sheet-recall";
import {savedWordCard} from "./saved-word-card";

export type ConversationFrame=typeof conversationFrames[number];
export type SpeakerRole="ask"|"answer";
export function conversationTags(id:string):StudyTags{
  const lesson=["languages","family"].includes(id)?3:["home","work","age"].includes(id)?2:1;
  return {lessons:[lesson],concepts:["conversation","introductions","questions"],source:"course"};
}
export function conversationLines(frame:ConversationFrame,formal:boolean){return {question:formal?frame.formal:frame.casual,answer:formal&&frame.formalAnswer?frame.formalAnswer:frame.answer};}
export function conversationBookmark(id:string,formal:boolean,role:SpeakerRole){return `#conversation-${id}-${formal?"formal":"casual"}-${role}`;}
export function readConversationBookmark(hash:string){const match=hash.match(/^#conversation-([a-z]+)-(formal|casual)-(ask|answer)$/);if(!match||!conversationFrames.some(frame=>frame.id===match[1]))return null;return {id:match[1]!,formal:match[2]==="formal",role:match[3] as SpeakerRole};}

export function spellingName(raw:string):{letters:string[];error:string}{
  const chars=[...raw.normalize("NFC")].filter(char=>!/[\s'’\-‐‑–—]/u.test(char));
  if(!chars.length)return {letters:[],error:"Type a name to hear its letters."};
  if(chars.length>32)return {letters:[],error:"Use up to 32 letters for one spelling practice."};
  const unsupported=chars.filter(char=>!/[A-Za-zÄÖÜäöüßẞ]/u.test(char));
  if(unsupported.length)return {letters:[],error:`This sound board covers A–Z, Ä, Ö, Ü and ß. Check: ${[...new Set(unsupported)].join(" ")}.`};
  return {letters:chars.map(char=>/[ßẞ]/u.test(char)?"ß":char.toLocaleUpperCase("de-DE")),error:""};
}
export function spellingCard(letter:string,cards:WordCard[]){return cards.find(card=>card.category==="Alphabet"&&card.visual===letter);}
export function spellingUtterance(letters:string[],cards:WordCard[]){return letters.map(letter=>spellingCard(letter,cards)?.rows[0]?.singular.text.split(" / ")[0]??(letter==="ß"?"Eszett":letter)).join(", ");}

export function conversationRecallQuestions(cards:WordCard[],allCards:WordCard[]):RecallQuestion[]{
  return cards.slice(0,8).flatMap((card,index)=>{
    const row=card.rows[0];if(!row)return [];
    const correct=row.singular.text;
    const candidates=[...allCards.filter(other=>other.category===card.category),...allCards];
    const options=[...new Set([correct,...candidates.flatMap(other=>other.rows.map(row=>row.singular.text))])].slice(0,4);
    options.push(...options.splice(0,index%options.length));
    return [{id:`conversation-card-${card.id}`,prompt:`Say it in German: ${row.meaning||card.title}`,options,answers:[correct],answerText:correct,explanation:card.tip||row.usage,item:savedWordCard(card)}];
  });
}
export const spellingAlphabet=spellingLetters.map(letter=>letter.de);
export const conversationTeachingSpeech=sheetQuizzes.conversation.map(quiz=>quiz.answer);
