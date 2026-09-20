import {questionQuiz,questionWords,questionBuilders,questionWordLessons,type QuestionWord} from "./questions";
import type {StudyTags} from "./scope";
import type {RecallQuestion} from "./sheet-recall";
export const questionTags=(word:QuestionWord):StudyTags=>({lessons:questionWordLessons(word),concepts:["questions","grammar"],source:word.lesson?"course":"study-extra"});
export const builderTags=(lesson:number):StudyTags=>({lessons:[lesson],concepts:["questions","grammar"],source:"course"});
export function builderReply(answer:string,yesNo:boolean){return yesNo?`Ja, ${answer[0]!.toLocaleLowerCase("de")}${answer.slice(1)}`:answer;}

export function questionRecallQuestions(matches:(tags:StudyTags)=>boolean):RecallQuestion[]{
  const words=questionWords.filter(word=>matches(questionTags(word)));
  const covered=new Set<string>();
  const targets=["wie","woher","wo",null,"wie-viele",null,null,"wie-viel"];
  const spoken=["Wie heißt du?","Woher kommst du?","Wo wohnst du?","Wohnst du in Berlin?","Wie viele Kinder hast du?","Wo wohnen Sie?","Doch, ich komme aus dem Iran.","Wie viel kostet der Stuhl?"];
  const questions:RecallQuestion[]=questionQuiz.flatMap((quiz,index)=>{
    const id=targets[index],word=words.find(word=>word.id===id);
    const tags=word?questionTags(word):builderTags(index===6?3:2);
    if(id?!word:!matches(tags))return [];
    if(word)covered.add(word.id);
    return [{id:`question-pattern-${index}`,prompt:quiz.q,options:quiz.options,answers:[quiz.answer],answerText:spoken[index]!,explanation:quiz.why,item:{id:`question-quiz-${index}`,title:`${quiz.q} → ${quiz.answer}`,meaning:quiz.why,kind:"concept" as const,href:"/cheat-sheets/questions#question-practice",studyTags:tags}}];
  });
  for(const word of words.filter(word=>!covered.has(word.id))){
    const correct=word.word.replace(/\?$/u,"");
    const options=[...new Set([correct,...questionWords.filter(other=>other.id!==word.id).map(other=>other.word.replace(/\?$/u,""))])].slice(0,4);
    options.push(...options.splice(0,questions.length%options.length));
    questions.push({id:`question-word-${word.id}`,prompt:`Which question phrase asks: ${word.meaning}`,options,answers:[correct],answerText:word.question,explanation:`${word.cue} Example answer: ${word.answer}`,item:{id:`question-${word.id}`,title:word.question,meaning:`${word.translation} — ${word.cue}`,kind:"concept",href:`/cheat-sheets/questions#question-${word.id}`,studyTags:questionTags(word)}});
  }
  return questions.slice(0,8);
}
export const questionReplySpeech=questionBuilders.map(builder=>builderReply(builder.answer,true));
