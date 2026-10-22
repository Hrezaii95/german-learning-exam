import type { AnswerSpec } from "../../../content/src/types/common.js";
import type { ContentPack, DifficultyProfile, LanguageProfile, PackAudio, PackDrill, PackItem, PackPrompt, PackQuestion } from "../../../content/src/types/packs.js";
import type { GeneratedTask, GradeResult, RandomSource, TaskAnswer, TaskFormat, TaskQuestion, TaskTemplate } from "../tasks.js";
import type { Mechanic } from "../capabilities.js";
import { gradeTextAnswer } from "../normalization.js";
import { shuffle } from "../random.js";
import { chooseDistractors } from "../distractors.js";

type Definition = { id:string; skill:string; mechanic:Mechanic; dimension:string; instruction:string; requires(item:PackItem):boolean };
const definitions:readonly Definition[] = [
  ...(["sort","gap","order","transform","errorHunt","build"] as const).map(kind => ({
    id:`drill.${kind}`,skill:"grammar",mechanic:(kind==="transform"?"gap":kind==="errorHunt"?"hotspot":kind) as Mechanic,
    dimension:kind==="order"?"order":"form",instruction:kind==="sort"?"Choose a group.":kind==="order"?"Arrange the tiles.":kind==="build"?"Build the form.":kind==="errorHunt"?"Find the part to change.":"Complete the task.",
    requires:(item:PackItem)=>item.type==="drill"&&item.drillType===kind&&supportsAnswer(item),
  })),
  {id:"build.form",skill:"vocabulary",mechanic:"build",dimension:"plural",instruction:"Build the form.",requires:i=>i.type==="lexeme"&&!!i.forms?.plural?.length},
  {id:"order.sentence",skill:"grammar",mechanic:"order",dimension:"order",instruction:"Arrange the sentence.",requires:i=>i.type==="sentence"&&(i.tokens?.length??0)>1},
  {id:"listen.dictation",skill:"listening",mechanic:"listen",dimension:"listening",instruction:"Listen, then type what you hear.",requires:i=>!!i.audio&&(i.type==="lexeme"||i.type==="sentence")},
  {id:"listen.minimal-pairs",skill:"listening",mechanic:"listen",dimension:"listening",instruction:"Listen, then choose the word.",requires:i=>i.type==="lexeme"&&!!i.audio&&i.tags.includes("minimal-pair")},
  {id:"listen.dialogue",skill:"listening",mechanic:"listen",dimension:"listening",instruction:"Listen, then answer the question.",requires:i=>i.type==="dialogue"&&i.turns.length>0&&i.turns.every(t=>!!t.audio)&&!!i.questions?.some(supportsQuestion)},
  {id:"listen.speed",skill:"listening",mechanic:"listen",dimension:"listening",instruction:"Listen at your chosen speed, then type what you hear.",requires:i=>!!i.audio&&(i.type==="lexeme"||i.type==="sentence")},
];

/** Formatting and authored grammar cues never become answer-state CSS. */
function plain(prompt:PackPrompt):string {
  if(typeof prompt==="string")return prompt;
  return [prompt.instruction,...(prompt.stem?[prompt.stem]:[])].map(part=>part.tokens.map(token=>token.type==="gap"?"____":token.text).join("")).join(" ");
}
function authoredChoices(prompt:PackPrompt):Array<{id:string;text:string}> {
  return typeof prompt==="string"?[]:(prompt.choices??[]).map(choice=>({id:choice.id,text:choice.label.tokens.map(token=>token.type==="gap"?"____":token.text).join("")}));
}
function supportsAnswer(item:PackDrill):boolean {
  if(item.drillType==="sort"&&item.answer.type!=="choice")return false;
  if((item.drillType==="order"||item.drillType==="build")&&item.answer.type==="choice")return false;
  if(item.answer.type==="choice")return item.answer.correctIds.length===1&&[...(item.buckets??[]).map(b=>b.id),...authoredChoices(item.prompt).map(c=>c.id)].includes(item.answer.correctIds[0]!);
  if(item.answer.type==="order")return item.answer.correctOrder.length>1;
  if(item.answer.type==="tokens")return (item.answer.acceptedTokenSets[0]?.length??0)>0;
  return item.answer.accepted.some(Boolean);
}
function supportsQuestion(question:PackQuestion):boolean {
  if(question.answer.type==="choice"){const correctId=question.answer.correctIds[0];return (question.choices?.length??0)>1&&question.answer.correctIds.length===1&&!!question.choices?.some(choice=>choice.id===correctId);}
  return question.answer.type==="exact"&&question.answer.accepted.some(Boolean);
}
function answers(spec:AnswerSpec,choices:Array<{id:string;text:string}>):string[] {
  if(spec.type==="exact")return spec.accepted;
  if(spec.type==="tokens")return spec.acceptedTokenSets.map(tokens=>tokens.join(" "));
  if(spec.type==="order")return [spec.correctOrder.map(id=>choices.find(c=>c.id===id)?.text??id).join(" ")];
  return spec.correctIds.flatMap(id=>choices.filter(c=>c.id===id).map(c=>c.text));
}
function neutralAudio(audio:PackAudio):PackAudio{return {src:audio.src,review:audio.review};}
function redact(text:string,hidden:readonly string[]):string {
  return hidden.filter(value=>value.trim().length>1).sort((a,b)=>b.length-a.length).reduce((result,value)=>result.split(value).join("____"),text);
}
function choiceQuestion(question:TaskQuestion,options:Array<{text?:string;image?:string;correct:boolean}>,random:RandomSource):string[]|null {
  const keys=options.map(option=>(option.image??option.text??"").normalize("NFC").trim().toLocaleLowerCase());
  if(options.length<2||new Set(keys).size!==keys.length||options.filter(option=>option.correct).length!==1)return null;
  const values=shuffle(options,random);
  question.input="choice";
  question.options=values.map((choice,index)=>({id:`o${index+1}`,...(choice.text!==undefined?{text:choice.text}:{}),...(choice.image?{image:choice.image}:{})}));
  return values.flatMap((choice,index)=>choice.correct?[question.options[index]!.id]:[]);
}
function sequenceQuestion(question:TaskQuestion,values:readonly string[],random:RandomSource):string[] {
  const shuffled=shuffle(values.map((text,index)=>({text,original:index})),random);
  question.input="sequence";
  question.tokens=shuffled.map((value,index)=>({id:`t${index+1}`,text:value.text}));
  return values.map((_,index)=>question.tokens![shuffled.findIndex(value=>value.original===index)]!.id);
}

export type GrammarListeningGeneration = {templateId:string;item:PackItem;pack:ContentPack;profile:LanguageProfile;difficulty:DifficultyProfile;random:RandomSource;format?:TaskFormat};
export function generateGrammarListeningTask({templateId,item,pack,profile,difficulty,random,format}:GrammarListeningGeneration):GeneratedTask|null {
  const baseId=templateId.replace(/\.(?:reduced|recall)$/u,"");
  const requestedFormat=format??(templateId.endsWith(".reduced")?"reduced-cues":templateId.endsWith(".recall")?"recall":undefined);
  const definition=definitions.find(template=>template.id===baseId);
  if(!definition||!definition.requires(item))return null;
  const question:TaskQuestion={instruction:definition.instruction,options:[],input:"text",lang:profile.locale,helperKeys:[...profile.helperKeys]};
  let accepted:string[]=[];
  let optionIds:string[]|null|undefined;
  let order:string[]|undefined;
  let pos="";
  let sourceAudio:PackAudio|undefined;
  if(item.type==="drill"){
    const choices=authoredChoices(item.prompt);
    if(item.buckets?.length)choices.push(...item.buckets.map(bucket=>({id:bucket.id,text:bucket.label})));
    accepted=answers(item.answer,choices);
    question.text=redact(plain(item.prompt),accepted);
    if(item.answer.type==="choice"){
      const correctIds=item.answer.correctIds;
      const distinct=[...new Map(choices.map(choice=>[choice.id,choice])).values()];
      if(distinct.length<2)return null;
      optionIds=choiceQuestion(question,distinct.map(choice=>({text:choice.text,correct:correctIds.includes(choice.id)})),random);
    }else if(definition.mechanic==="order"){
      const tokens=item.answer.type==="order"?item.answer.correctOrder.map(id=>choices.find(choice=>choice.id===id)?.text??id):item.answer.type==="tokens"?item.answer.acceptedTokenSets[0]:accepted[0]?.split(/\s+/u);
      if(!tokens||tokens.length<2)return null;
      order=sequenceQuestion(question,tokens,random);
    }else if(definition.mechanic==="build"){
      if(!accepted[0])return null;
      order=sequenceQuestion(question,Array.from(accepted[0].normalize("NFC")),random);
    }else if(item.distractors?.length){
      const wrong=[...new Set(item.distractors)].filter(value=>!accepted.some(answer=>gradeTextAnswer(value,[answer],profile,pos).outcome!=="incorrect"));
      if(wrong.length)optionIds=choiceQuestion(question,[{text:accepted[0]!,correct:true},...shuffle(wrong,random).slice(0,Math.max(1,difficulty.optionsCount-1)).map(text=>({text,correct:false}))],random);
    }
  }else if(item.type==="lexeme"&&baseId==="build.form"){
    accepted=item.forms?.plural??[];pos=item.pos;
    question.text=redact(accepted.includes(item.lemma)?item.meaning:item.lemma,accepted);
    order=sequenceQuestion(question,Array.from(accepted[0]!.normalize("NFC")),random);
  }else if(item.type==="sentence"&&baseId==="order.sentence"){
    accepted=[item.text];question.text=redact(item.translation,accepted);
    order=sequenceQuestion(question,item.tokens!,random);
  }else if(item.type==="dialogue"){
    const authored=item.questions!.find(supportsQuestion)!;
    const choices=(authored.choices??[]).map(choice=>({id:choice.id,text:choice.label}));
    accepted=answers(authored.answer,choices);
    question.text=redact(plain(authored.prompt),accepted);
    question.audioSequence=item.turns.map(turn=>neutralAudio(turn.audio!));
    if(authored.answer.type==="choice"){
      const correctIds=authored.answer.correctIds;
      optionIds=choiceQuestion(question,choices.map(choice=>({text:choice.text,correct:correctIds.includes(choice.id)})),random);
    }
    sourceAudio=item.turns[0]!.audio;
  }else if(item.type==="lexeme"||item.type==="sentence"){
    if(!item.audio)return null;
    accepted=[item.audio.text??(item.type==="lexeme"?item.lemma:item.text)];
    pos=item.type==="lexeme"?item.pos:"";
    question.audio=neutralAudio(item.audio);sourceAudio=item.audio;
    if(baseId==="listen.speed")question.audioRates=[...new Set([difficulty.audioSpeedRange[0],...(difficulty.audioSpeedRange[0]<=1&&difficulty.audioSpeedRange[1]>=1?[1]:[]),difficulty.audioSpeedRange[1]])];
    if(baseId==="listen.minimal-pairs"&&item.type==="lexeme"){
      const candidates=chooseDistractors(item,pack,profile,candidate=>candidate.type==="lexeme"&&candidate.tags.includes("minimal-pair")&&candidate.tags.some(tag=>tag!=="minimal-pair"&&item.tags.includes(tag))?[candidate.lemma,...(candidate.forms?.singular??[]),...(candidate.audio?.text?[candidate.audio.text]:[])]:[],accepted,1,random);
      if(!candidates.length)return null;
      optionIds=choiceQuestion(question,[{text:accepted[0]!,correct:true},...candidates.map(candidate=>({text:candidate.type==="lexeme"?(candidate.audio?.text??candidate.lemma):"",correct:false}))],random);
    }
  }
  if(optionIds===null||!accepted.length||accepted.some(answer=>!answer.trim()))return null;
  if(requestedFormat==="recall"&&question.input==="choice"){
    question.input="text";question.options=[];optionIds=undefined;
  }else if(requestedFormat==="reduced-cues"){
    if(question.input!=="choice")return null;
    const correct=question.options.find(option=>optionIds?.includes(option.id));
    const wrong=shuffle(question.options.filter(option=>!optionIds?.includes(option.id)),random)[0];
    if(!correct||!wrong)return null;
    optionIds=choiceQuestion(question,[{...correct,correct:true},{...wrong,correct:false}],random);
    if(!optionIds)return null;
  }else if(requestedFormat==="recognition"&&question.input!=="choice")return null;
  const answer=accepted[0]!;
  const explanation=item.type==="drill"?pack.items.find(candidate=>candidate.type==="grammarPoint"&&candidate.id===item.grammarPoint):undefined;
  return {
    id:`${pack.id}:${item.id}:${templateId}`,templateId,itemId:item.id,packId:pack.id,
    skill:definition.skill,mechanic:definition.mechanic,dimension:definition.dimension,
    format:question.input==="choice"?(requestedFormat==="reduced-cues"?"reduced-cues":"recognition"):"recall",testedDimensions:[definition.dimension],
    revealFields:[...new Set([...(item.revealFields??[]),...accepted])],question,
    solution:{pos,accepted:[...accepted],...(optionIds?{optionIds}:{}),...(order?{order}:{})},
    feedback:{answer,summary:explanation?.type==="grammarPoint"?explanation.explanation:"Compare your answer with the source.",...(sourceAudio?{audio:sourceAudio}:{}),...(item.sourceRef?{sourceHref:item.sourceRef.href}:{}),...(item.type==="lexeme"?{meaning:item.meaning,forms:[...(item.forms?.plural??[])]}:{})},
  };
}

export function gradeGrammarListeningTask(task:GeneratedTask,answer:TaskAnswer,profile:LanguageProfile):GradeResult {
  const submitted=Array.isArray(answer)?answer:[answer];
  if(task.question.input==="choice"){
    const correct=submitted.length===(task.solution.optionIds?.length??0)&&new Set(submitted).size===submitted.length&&submitted.every(id=>task.solution.optionIds?.includes(id));
    return {outcome:correct?"correct":"incorrect",correct,hinted:false,normalizedAnswer:submitted.join(",")};
  }
  if(task.question.input==="sequence"){
    const tokens=task.question.tokens??[];
    const valid=submitted.length===tokens.length&&new Set(submitted).size===submitted.length&&submitted.every(id=>tokens.some(token=>token.id===id));
    const values=submitted.map(id=>tokens.find(token=>token.id===id)?.text??"");
    const expected=(task.solution.order??[]).map(id=>tokens.find(token=>token.id===id)?.text??"");
    const correct=valid&&values.every((value,index)=>value===expected[index]);
    const text=values.join(task.mechanic==="build"?"":" ");
    const graded=gradeTextAnswer(text,task.solution.accepted??[],profile,task.solution.pos??"");
    const outcome=correct?"correct":valid?graded.outcome:"incorrect";
    return {outcome,correct:outcome==="correct",hinted:outcome==="almost",normalizedAnswer:graded.normalized};
  }
  const graded=gradeTextAnswer(submitted.join(" "),task.solution.accepted??[],profile,task.solution.pos??"");
  return {outcome:graded.outcome,correct:graded.outcome==="correct",hinted:graded.outcome==="almost",normalizedAnswer:graded.normalized};
}

function sourceHasChoices(item:PackItem):boolean {
  if(item.type==="drill")return item.answer.type==="choice"||!!item.distractors?.length;
  if(item.type==="dialogue")return item.questions?.find(supportsQuestion)?.answer.type==="choice";
  return item.type==="lexeme"&&item.tags.includes("minimal-pair");
}
export const GRAMMAR_LISTENING_TEMPLATES:readonly TaskTemplate[]=definitions.flatMap(definition=>{
  const recallOnly=definition.mechanic==="build"||definition.mechanic==="order"||definition.id==="listen.dictation"||definition.id==="listen.speed";
  const formats:TaskFormat[]=recallOnly?["recall"]:["recognition","reduced-cues","recall"];
  return formats.map(format=>{
    const id=definition.id+(recallOnly||format==="recognition"?"":format==="reduced-cues"?".reduced":".recall");
    return {
      id,skill:definition.skill,mechanic:definition.mechanic,dimension:definition.dimension,format,
      requires:(item:PackItem)=>definition.requires(item)&&(format==="recall"||sourceHasChoices(item)),
      params:(difficulty:DifficultyProfile)=>({optionsCount:format==="recall"?0:format==="reduced-cues"?2:difficulty.optionsCount}),
      generate:(item:PackItem,pack:ContentPack,profile:LanguageProfile,difficulty:DifficultyProfile,random:RandomSource)=>generateGrammarListeningTask({templateId:id,item,pack,profile,difficulty,random,format}),
      grade:gradeGrammarListeningTask,
    };
  });
});
export function getGrammarListeningTemplate(id:string):TaskTemplate|undefined{return GRAMMAR_LISTENING_TEMPLATES.find(template=>template.id===id);}
