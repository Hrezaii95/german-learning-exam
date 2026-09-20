import {germanNumber,germanPrice,sheetQuizzes} from "./sheet-topics";
import type {WordCard} from "../content/word-card-types";
import type {RecallQuestion} from "./sheet-recall";
import {savedWordCard} from "./saved-word-card";

export type NumberPart={label:string;digits:string;spoken:string;role:"thousands"|"hundreds"|"units"|"join"|"tens"|"whole"};
/** Spoken chunks stay in German reading order; their concatenation is the whole word. */
export function numberParts(value:number):NumberPart[]{
  germanNumber(value); // Validate the same range as the existing builder.
  if(value===1000000)return [{label:"Million · feminine noun",digits:"1.000.000",spoken:"eine Million",role:"whole"}];
  if(value<20)return [{label:"Foundation word",digits:String(value),spoken:germanNumber(value),role:"whole"}];
  const parts:NumberPart[]=[];
  let rest=value;
  if(rest>=1000){const n=Math.floor(rest/1000);parts.push({label:"Thousands first",digits:`${n.toLocaleString("de-DE")} × 1.000`,spoken:`${n===1?"ein":germanNumber(n)}tausend`,role:"thousands"});rest%=1000;}
  if(rest>=100){const n=Math.floor(rest/100);parts.push({label:"Hundreds next",digits:String(n*100),spoken:`${n===1?"ein":germanNumber(n)}hundert`,role:"hundreds"});rest%=100;}
  if(rest>=20&&rest%10){const n=rest%10;parts.push({label:"Units before tens",digits:String(n),spoken:n===1?"ein":germanNumber(n),role:"units"},{label:"Join",digits:"+",spoken:"und",role:"join"});rest-=n;}
  if(rest)parts.push({label:rest>=20?"Tens last":"Remaining number",digits:String(rest),spoken:germanNumber(rest),role:rest>=20?"tens":"whole"});
  return parts;
}

export function numberedCards(cards:WordCard[]){return cards.flatMap(card=>{const match=card.id.match(/^N(\d{3})$/);return match?[{card,value:Number(match[1])}]:[];});}
export type NumberRange="all"|"foundation"|"teens"|"tens";
export function listeningNumbers(cards:WordCard[],range:NumberRange){
  const anchors=[21,12,16,60,17,70,24,42,0,1,13,30];
  return numberedCards(cards).filter(({value})=>range==="foundation"?value<=12:range==="teens"?value>=13&&value<=19:range==="tens"?value>=20: true)
    .sort((a,b)=>(anchors.includes(a.value)?anchors.indexOf(a.value):100+a.value)-(anchors.includes(b.value)?anchors.indexOf(b.value):100+b.value)).slice(0,8);
}
export function numberRecallQuestions(cards:WordCard[]):RecallQuestion[]{
  const questions:RecallQuestion[]=listeningNumbers(cards,"all").map(({card,value},index)=>{
    const answer=germanNumber(value);
    const others=[value+1,value+10,value-1,value%10*10+Math.floor(value/10)].filter(n=>n>=0&&n<=100&&n!==value);
    const options=[...new Set([answer,...others.map(germanNumber)])].slice(0,4);
    options.push(...options.splice(0,index%options.length));
    return {id:`number-word-${value}`,prompt:`Write ${value} in German.`,options,answers:[answer],answerText:answer,explanation:card.tip,item:savedWordCard(card)};
  });
  if(!questions.length)for(const card of cards){const form=card.rows[0]?.singular.text;const article=form?.match(/^(der|die|das) /)?.[1];if(!form||!article)continue;questions.push({id:`number-noun-${card.id}`,prompt:`___ ${form.slice(article.length+1)}`,options:["der","die","das"],answers:[article],answerText:form,explanation:card.tip,item:savedWordCard(card)});}
  return questions.slice(0,8);
}
export const numberTeachingSpeech=[...sheetQuizzes.numbers.map(quiz=>quiz.answer),...["1,00","0,50","1,01","24,50"].map(price=>germanPrice(price)!)];
