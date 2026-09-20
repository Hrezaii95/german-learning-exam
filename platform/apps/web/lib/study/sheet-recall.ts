import { countryFrom, countryGroups, countryName, countryOriginMeaning, spokenLanguage, type Country } from "./countries";
import type { HomeWord } from "./home";
import { countryStudyTags } from "./sheet-scope";
import type { DictionaryEntry, SavedItem } from "./types";
import type {WordCard} from "../content/word-card-types";
import {sheetQuizzes} from "./sheet-topics";
import {savedWordCard} from "./saved-word-card";
import {wordStudyTags} from "./tags";

export type RecallQuestion = { id:string; prompt:string; options:string[]; answers:string[]; answerText:string; explanation:string; item:SavedItem };

export function savedCountry(country:Country,dictionary:DictionaryEntry[]=[],speech:Record<string,string>={}):SavedItem {
  const title=`Ich komme ${countryFrom(country)}.`;
  return {id:`country-${country.id}`,title,meaning:`${countryOriginMeaning(country)} ${countryGroups[country.group].label}. Language examples: ${country.languages.join(", ")}.`,kind:"concept",href:`/cheat-sheets#country-${country.id}`,studyTags:countryStudyTags(country,dictionary),audio:speech[title]??null};
}

export function countryRecallQuestions(countries:Country[],dictionary:DictionaryEntry[]=[],speech:Record<string,string>={}):RecallQuestion[] {
  const anchors=["IR","CH","US","NL","DE","PL","TR","MV"];
  const selected=[...countries].sort((a,b)=>(anchors.includes(a.id)?anchors.indexOf(a.id):anchors.length)-(anchors.includes(b.id)?anchors.indexOf(b.id):anchors.length)).slice(0,8);
  const questions:RecallQuestion[]=selected.map(country=>({
    id:`country-origin-${country.id}`,prompt:`${countryName(country)}: Ich komme …`,
    options:country.id==="IR"?["aus der Iran","aus dem Iran","aus Iran","aus den Iran"]:[...new Set([`aus der ${country.name}`,`aus ${country.name}`,`aus den ${country.dative??country.name}`,`aus dem ${country.name}`])],
    answers:[countryFrom(country),...(country.id==="IR"?["aus Iran"]:[])],answerText:`Ich komme ${countryFrom(country)}.`,
    explanation:`${countryGroups[country.group].label} → ${countryGroups[country.group].from}. ${country.note??"No article needs to be added."}`,item:savedCountry(country,dictionary,speech),
  }));
  for(const country of countries.filter(country=>["IR","AT"].includes(country.id))){
    const language=spokenLanguage(country.languages[0]!);
    questions.push({id:`country-language-${country.id}`,prompt:`${country.name}: Ich spreche …`,options:[language,country.id==="IR"?"Iranisch":"Österreichisch","Spanisch"],answers:[language],answerText:`Ich spreche ${language}.`,explanation:country.note??"Use the language name, normally without an article.",item:savedCountry(country,dictionary,speech)});
  }
  return questions;
}

const homeChecks=[
  {word:"stuhl",prompt:"___ Stuhl",options:["der","das","die"],answer:"der",answerText:"der Stuhl",explanation:"Masculine: der Stuhl → er. Remember the blue chair."},
  {word:"lampe",prompt:"Die Lampe ist schön. ___ ist modern.",options:["Er","Es","Sie"],answer:"Sie",answerText:"Sie ist modern.",explanation:"Die Lampe is feminine, so it becomes sie even though it is an object."},
  {word:"stuhl",prompt:"One chair → several chairs",options:["die Stuhle","die Stühle","die Stuhlen"],answer:"die Stühle",answerText:"die Stühle",explanation:"Stuhl → Stühle adds an umlaut and -e."},
  {word:"bett",prompt:"Das Bett ist groß. ___ ist modern.",options:["Sie","Er","Es"],answer:"Es",answerText:"Es ist modern.",explanation:"Neuter: das Bett → es."},
  {word:"moebel",prompt:"Die Möbel ___ modern.",options:["ist","sind","bist"],answer:"sind",answerText:"Die Möbel sind modern.",explanation:"Furniture is plural in German: die Möbel sind …"},
  {word:"regal",prompt:"Two shelving units",options:["die Regalen","die Regale","die Regals"],answer:"die Regale",answerText:"die Regale",explanation:"Regal → Regale adds -e. Learn the plural with the noun."},
  {word:"schrank",prompt:"The wardrobe is TOO small.",options:["Der Schrank ist sehr klein.","Der Schrank ist zu klein.","Der Schrank ist so klein."],answer:"Der Schrank ist zu klein.",answerText:"Der Schrank ist zu klein.",explanation:"zu = too; sehr = very; so = so. Small is a description; too small is a problem."},
  {word:"zuhause",prompt:"I am at home.",options:["Ich bin zu Hause.","Ich bin das Zuhause.","Ich bin nach Hause."],answer:"Ich bin zu Hause.",answerText:"Ich bin zu Hause.",explanation:"zu Hause means at home. Das Zuhause is the noun meaning home."},
];

export function homeRecallQuestions(words:HomeWord[],savedItem:(word:HomeWord)=>SavedItem):RecallQuestion[] {
  const questions:RecallQuestion[]=homeChecks.flatMap((question,index)=>{
    const word=words.find(word=>word.id===question.word);
    return word?[{id:`home-check-${index}`,prompt:question.prompt,options:question.options,answers:[question.answer],answerText:question.answerText,explanation:question.explanation,item:savedItem(word)}]:[];
  });
  for(const word of words.filter(word=>!homeChecks.some(question=>question.word===word.id))){
    questions.push({id:`home-article-${word.id}`,prompt:`___ ${word.de.replace(/^(der|die|das) /,"")}`,options:["der","die","das"],answers:[word.de.split(" ")[0]!],answerText:word.de,explanation:word.cue,item:savedItem(word)});
  }
  return questions.slice(0,8);
}

export function peopleRecallQuestions(cards:WordCard[]):RecallQuestion[]{
  const targets=[["die Mutter"],["der Bruder"],["die Schwester"],["der Arzt","die Ärztin"],["der Lehrer","die Lehrerin"],["die Eltern"],["die Lehrerin","der Lehrer"],["das Kind"]];
  const spoken=["die Mutter","die Brüder","meine Schwester","die Ärztin","Ich bin Lehrer.","Die Eltern wohnen in Berlin.","die Lehrerinnen","Es ist ein Kind."];
  const covered=new Set<string>();
  const questions:RecallQuestion[]=sheetQuizzes.people.flatMap((question,index)=>{
    const card=cards.find(card=>card.rows.some(row=>targets[index]!.includes(row.singular.text)));
    if(!card)return [];
    covered.add(card.id);
    return [{id:`people-pattern-${index}`,prompt:question.q,options:question.options,answers:[question.answer],answerText:spoken[index]!,explanation:question.why,item:{id:`sheet-quiz-people-${index}`,title:`${question.q} → ${question.answer}`,meaning:question.why,kind:"concept" as const,href:"/cheat-sheets/people#sheet-practice",studyTags:wordStudyTags(card)}}];
  });
  for(const card of cards.filter(card=>!covered.has(card.id))){
    const form=card.rows[0]?.singular;
    if(!form)continue;
    const article=form.text.match(/^(der|die|das) /)?.[1];
    if(!article)continue;
    questions.push({id:`people-word-${card.id}`,prompt:`___ ${form.text.slice(article.length+1)}`,options:["der","die","das"],answers:[article],answerText:form.text,explanation:card.tip||`${card.title}: ${form.text}. Learn the article with the noun.`,item:savedWordCard(card)});
  }
  return questions.slice(0,8);
}
