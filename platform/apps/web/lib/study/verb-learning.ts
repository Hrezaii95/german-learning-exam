import {studyUnits} from "./course-lessons";
import {verbModels,verbPersons,spokenVerb,grammarPatterns,sheetQuizzes} from "./sheet-topics";
import type {WordCard} from "../content/word-card-types";
import {wordStudyTags} from "./tags";
import {savedWordCard} from "./saved-word-card";
import type {RecallQuestion} from "./sheet-recall";
import type {StudyTags} from "./scope";

export type LearningVerb={verb:string;meaning:string;forms:readonly string[];tip:string};
export const learningVerbs:LearningVerb[]=[...new Map([...verbModels,...studyUnits.flatMap(unit=>unit.verbs)].map(model=>[model.verb,model])).values()];
export function modelCard(model:LearningVerb,cards:WordCard[]){return cards.find(card=>card.rows.some(row=>row.singular.text===model.verb));}
export function selectedVerbs(cards:WordCard[]){return learningVerbs.filter(model=>modelCard(model,cards));}
export function modelTags(model:LearningVerb,cards:WordCard[]):StudyTags{
  const card=modelCard(model,cards);
  return card?wordStudyTags(card):{lessons:studyUnits.filter(unit=>unit.verbs.some(verb=>verb.verb===model.verb)).map(unit=>unit.number),concepts:["verbs"],source:"course"};
}

/** Explain a published form; never generate a conjugation by applying these rules. */
export function verbAnatomy(model:LearningVerb,person:number){
  const form=model.forms[person];
  if(form===undefined)throw new RangeError("Choose one of the six published persons.");
  const [finite="",...tail]=form.split(" ");
  const rest=tail.join(" ");
  const reflexive=model.verb.startsWith("sich ");
  const separable=!!rest&&!reflexive&&model.verb.startsWith(rest);
  const baseVerb=reflexive?model.verb.slice(5):separable?model.verb.slice(rest.length):model.verb;
  const baseStem=baseVerb.replace(/(?:en|n)$/u,"");
  if(model.verb==="sein")return {form,stem:finite,ending:"",rest,baseStem:"",whole:true,changed:false,restLabel:"",note:"sein uses its own forms. Learn the complete word; a regular stem-and-ending recipe does not explain it."};
  let ending:string=(["e","st","t","en","t","en"] as const)[person]!;
  if(model.verb==="möchten")ending=(["e","est","e","en","et","en"] as const)[person]!;
  if(person===1&&/[sßxz]$/u.test(baseStem))ending="t";
  if((person===3||person===5)&&!finite.endsWith("en")&&finite.endsWith("n"))ending="n";
  let suffix=finite.endsWith(ending)?ending:"";
  let stem=suffix?finite.slice(0,-suffix.length):finite;
  if(stem===`${baseStem}e`&&[1,2,4].includes(person)){stem=baseStem;suffix=`e${suffix}`;}
  const changed=stem!==baseStem;
  const note=changed?`The stem changes here: ${baseStem} → ${stem}. Keep this published form with its person.`:suffix.startsWith("e")&&[1,2,4].includes(person)?"The ending includes a linking e to make this form easier to say.":person===1&&ending==="t"?"After a stem ending in a sibilant, du uses -t here, without an extra s.":suffix?"Keep the stem; the ending follows the person.":"This form has no separate ending. Learn it together with its person.";
  return {form,stem,ending:suffix,rest,baseStem,whole:false,changed,restLabel:reflexive?"Reflexive pronoun":separable?"Separable prefix":"Following words",note};
}

export function verbRecallQuestions(cards:WordCard[]):RecallQuestion[]{
  const models=selectedVerbs(cards);
  const targets=["sprechen","wohnen","haben","wohnen","arbeiten","kein","leben","sein"];
  const covered=new Set<string>();
  const questions:RecallQuestion[]=sheetQuizzes.verbs.flatMap((quiz,index)=>{
    const card=cards.find(card=>card.rows.some(row=>row.singular.text.split(/\s*\/\s*/u).includes(targets[index]!)));
    if(!card)return [];
    covered.add(card.id);
    return [{id:`verb-pattern-${index}`,prompt:quiz.q,options:quiz.options,answers:[quiz.answer],answerText:verbRecallSpeech[index]!,explanation:quiz.why,item:{id:`sheet-quiz-verbs-${index}`,title:`${quiz.q} → ${quiz.answer}`,meaning:quiz.why,kind:"concept" as const,href:"/cheat-sheets/verbs#sheet-practice",studyTags:wordStudyTags(card)}}];
  });
  models.filter(model=>!covered.has(modelCard(model,cards)!.id)).forEach((model,index)=>{
    const person=index%6,card=modelCard(model,cards)!;
    const correct=model.forms[person]!;
    const options=[...new Set([correct,...model.forms.filter(form=>form!==correct)])].slice(0,4);
    // Keep the correct answer from always occupying the first position.
    options.push(...options.splice(0,index%options.length));
    questions.push({id:`verb-recall-${model.verb}-${person}`,prompt:`${model.verb} · ${verbPersons[person]} …`,options,answers:[correct],answerText:spokenVerb(person,correct),explanation:model.tip,item:{...savedWordCard(card),studyTags:wordStudyTags(card)}});
  });
  return questions.slice(0,8);
}
export const verbRecallSpeech=["Du sprichst Deutsch.","Ihr wohnt in Berlin.","Er hat zwei Kinder.","Wohnst du in Berlin?","Du arbeitest als Lehrer.","Ich habe keine Kinder.","Wir leben zusammen.","Sie sind Ärztin."];
export const verbTeachingSpeech=[...new Set([...learningVerbs.flatMap(model=>model.forms.map((form,index)=>spokenVerb(index,form))),...grammarPatterns.map(pattern=>pattern.de),...verbRecallSpeech])];
