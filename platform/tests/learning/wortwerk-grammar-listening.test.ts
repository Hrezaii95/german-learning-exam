import { describe,it,expect } from "vitest";
import type { ContentPack,DifficultyProfile,LanguageProfile,PackDrill,PackItem,PackLexeme } from "../../packages/content/src/types/packs.js";
import { GRAMMAR_LISTENING_TEMPLATES,generateGrammarListeningTask,gradeGrammarListeningTask } from "../../packages/wortwerk/src/templates/grammar-listening.js";
import { seededRng } from "../../packages/wortwerk/src/random.js";
import language from "../../content/languages/de.json";
import toy from "../fixtures/languages/xx.json";
import fixture from "../fixtures/packs/de-b2-sample/pack.json";
import items from "../fixtures/packs/de-b2-sample/items/all.json";
const profile=language as LanguageProfile;
const difficulty:DifficultyProfile={schemaVersion:1,id:"fixture",optionsCount:4,timerSeconds:60,audioSpeedRange:[0.8,1.2],hintsAllowed:true,maxPassageLength:500,distractorCloseness:0.5,typedAnswerRatio:0.5};
const base={unitId:"u1",bookRef:{book:"fixture",lesson:1},source:"course" as const,tags:["fixture"]};
const drill:PackDrill={...base,type:"drill",id:"sort",grammarPoint:"g",drillType:"sort",prompt:"Classify this example",buckets:[{id:"one",label:"Group one"},{id:"two",label:"Group two"}],answer:{type:"choice",correctIds:["one"]}};
function pack(extra:PackItem[]):ContentPack{return {...fixture,items:extra} as ContentPack;}
function generate(templateId:string,item:PackItem,all:PackItem[]=[item],languageProfile=profile){return generateGrammarListeningTask({templateId,item,pack:pack(all),profile:languageProfile,difficulty,random:seededRng("stable")});}
describe("grammar and listening templates",()=>{
 it("exposes honest recognition, reduced-cue and free-recall variants for the format ladder",()=>{
  const recognition=generate("drill.sort",drill)!;
  const reduced=generate("drill.sort.reduced",drill)!;
  const recall=generate("drill.sort.recall",drill)!;
  expect(recognition.format).toBe("recognition");expect(reduced.format).toBe("reduced-cues");
  expect(reduced.question.options).toHaveLength(2);
  expect(recall).toMatchObject({format:"recall",question:{input:"text",options:[]}});
  expect(gradeGrammarListeningTask(recall,"Group one",profile).correct).toBe(true);
  expect(JSON.stringify(recall.question)).not.toContain("Group one");
 });

 it("classifies into shuffled opaque bucket options and grades only submitted IDs",()=>{
  const task=generate("drill.sort",drill)!;
  expect(task).not.toBeNull();expect(task.question.input).toBe("choice");
  expect(task.question.options.map(option=>option.text).sort()).toEqual(["Group one","Group two"]);
  expect(task.question.options.map(option=>option.id).sort()).toEqual(["o1","o2"]);
  expect(gradeGrammarListeningTask(task,task.solution.optionIds!,profile).correct).toBe(true);
  expect(gradeGrammarListeningTask(task,"one",profile).correct).toBe(false);
  expect(gradeGrammarListeningTask(task,[task.solution.optionIds![0]!,task.solution.optionIds![0]!],profile).correct).toBe(false);
 });
 it("declines unresolvable classifications rather than inventing bucket answers",()=>{
  expect(generate("drill.sort",{...drill,answer:{type:"exact",accepted:["unknown"]}})).toBeNull();
  expect(generate("drill.sort",{...drill,answer:{type:"choice",correctIds:["unknown"]}})).toBeNull();
  expect(generate("drill.sort",{...drill,buckets:[{id:"one",label:"Same"},{id:"two",label:"same"}]})).toBeNull();
 });
 it("reuses authored answer variants and profile normalisation for typed gaps",()=>{
  const task=generate("drill.gap",{...drill,drillType:"gap",prompt:"Complete ____",answer:{type:"exact",accepted:["Äpfel","Äpfeln"]},distractors:[]})!;
  expect(task.question.input).toBe("text");
  expect(gradeGrammarListeningTask(task,"Aepfel",profile)).toMatchObject({outcome:"almost",hinted:true});
  expect(gradeGrammarListeningTask(task,"Äpfeln",profile).correct).toBe(true);
 });
 it("redacts answer text and strips all structured morph/gender style from prompts",()=>{
  const task=generate("drill.transform",{...drill,drillType:"transform",prompt:{instruction:{tokens:[{type:"plain",text:"Change the form "},{type:"morph",text:"hidden",tag:"SUFFIX"}]}},answer:{type:"exact",accepted:["hidden"]}})!;
  expect(task.question.text).toBe("Change the form ____");
  expect(JSON.stringify(task.question)).not.toMatch(/hidden|SUFFIX|tone-/u);
 });
 it("builds forms with duplicate characters without making tile identity a correctness cue",()=>{
  const item:PackLexeme={...base,type:"lexeme",id:"form",lemma:"letter",meaning:"fixture meaning",pos:"noun",forms:{plural:["letters"]}};
  const task=generate("build.form",item)!;
  const order=task.solution.order!;
  const t=order.filter(id=>task.question.tokens!.find(token=>token.id===id)?.text==="t");
  const swapped=order.map(id=>id===t[0]?t[1]!:id===t[1]?t[0]!:id);
  expect(gradeGrammarListeningTask(task,swapped,profile).correct).toBe(true);
  expect(gradeGrammarListeningTask(task,order.map(()=>order[0]!),profile).correct).toBe(false);
  expect(task.question.text).toBe("letter");
 });
 it("hides the source sentence and uses identical shuffled tokens, including punctuation",()=>{
  const task=generate("order.sentence",{...base,type:"sentence",id:"sentence",text:"Hello, world!",translation:"A greeting",tokens:["Hello",",","world","!"]})!;
  expect(task.question.text).toBe("A greeting");
  expect(gradeGrammarListeningTask(task,task.solution.order!,profile).correct).toBe(true);
  expect(gradeGrammarListeningTask(task,[...task.solution.order!].reverse(),profile).correct).toBe(false);
 });
 it("does not show unchanged form answers as the Build cue",()=>{
  const task=generate("build.form",{...base,type:"lexeme",id:"form",lemma:"same",meaning:"meaning cue",pos:"noun",forms:{plural:["same"]}})!;
  expect(task.question.text).toBe("meaning cue");
  const cognate=generate("build.form",{...base,type:"lexeme",id:"cognate",lemma:"same",meaning:"same",pos:"noun",forms:{plural:["same"]}})!;
  expect(cognate.question.text).not.toContain("same");
 });
 it("strips listening captions and grades exact source text; speed comes from difficulty",()=>{
  const item:PackLexeme={...base,type:"lexeme",id:"audio",lemma:"Buch",meaning:"book",pos:"noun",audio:{src:"/audio/source.mp3",review:"preview",text:"das Buch"}};
  const task=generate("listen.speed",item)!;
  expect(task.question).toMatchObject({audio:{src:"/audio/source.mp3",review:"preview"},audioRates:[0.8,1,1.2]});
  expect(JSON.stringify(task.question)).not.toContain("Buch");
  expect(task.question.text).toBeUndefined();
  expect(gradeGrammarListeningTask(task,"das Buch",profile).correct).toBe(true);
  expect(gradeGrammarListeningTask(task,"das buch",profile).correct).toBe(false);
 });
 it("uses only explicit minimal-pair groups and no equivalent distractor",()=>{
  const item:PackLexeme={...base,type:"lexeme",id:"first",lemma:"pair",meaning:"meaning",pos:"noun",tags:["minimal-pair","group1"],audio:{src:"/first.mp3",review:"preview"}};
  const wrong:PackLexeme={...item,id:"second",lemma:"pear"};
  const synonym:PackLexeme={...item,id:"same",lemma:"pair"};
  const unrelated:PackLexeme={...item,id:"other",lemma:"other",tags:["minimal-pair","group2"]};
  const task=generate("listen.minimal-pairs",item,[item,wrong,synonym,unrelated])!;
  expect(task.question.options.map(option=>option.text).sort()).toEqual(["pair","pear"]);
  expect(generate("listen.minimal-pairs",item,[item,synonym,unrelated])).toBeNull();
 });
 it("keeps dialogue transcripts feedback-only and uses source turn clips",()=>{
  const task=generate("listen.dialogue",{...base,type:"dialogue",id:"dialogue",turns:[{speaker:"A",text:"Source secret",audio:{src:"/clip.mp3",review:"preview",text:"Source secret"}}],questions:[{id:"q",type:"multipleChoice",prompt:"Which detail?",answer:{type:"choice",correctIds:["a"]},choices:[{id:"a",label:"First detail"},{id:"b",label:"Second detail"}]}]})!;
  expect(JSON.stringify(task.question)).not.toContain("Source secret");
  expect(task.question.audioSequence).toEqual([{src:"/clip.mp3",review:"preview"}]);
  expect(gradeGrammarListeningTask(task,task.solution.optionIds!,profile).correct).toBe(true);
 });
 it("supports the fixture and a toy second language without branching by language or level",()=>{
  const fixturePack=pack(items as PackItem[]);
  let generated=0;
  for(const languageProfile of [profile,toy as LanguageProfile])for(const item of fixturePack.items)for(const template of GRAMMAR_LISTENING_TEMPLATES){
   const task=template.generate(item,fixturePack,languageProfile,difficulty,seededRng(item.id+template.id));
   if(!task)continue;
   generated++;
   expect(task.format,template.id).toBe(template.format);
   const answer=task.solution.optionIds??task.solution.order??task.solution.accepted?.[0]??"";
   expect(template.grade(task,answer,languageProfile).correct,template.id).toBe(true);
   expect(task.question.lang).toBe(languageProfile.locale);
  }
  expect(generated).toBeGreaterThan(20);
 });
 it("balances correct option positions over a thousand seeded tasks",()=>{
  const counts=[0,0];
  for(let seed=0;seed<1000;seed++){
   const task=generateGrammarListeningTask({templateId:"drill.sort",item:drill,pack:pack([drill]),profile,difficulty,random:seededRng(seed)})!;
   const position=task.question.options.findIndex(option=>task.solution.optionIds?.includes(option.id));
   counts[position] = counts[position]!+1;
  }
  expect(counts.every(count=>count>420&&count<580)).toBe(true);
 });
});
