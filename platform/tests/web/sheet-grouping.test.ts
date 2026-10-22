import {describe,expect,it} from "vitest";
import {classifyPluralPair} from "../../apps/web/lib/study/plural-patterns";
import {DEFAULT_GROUP_ORDER,getActiveGroupOrder,groupSheetItems,normalizeGroupOrder,type SheetGrouping} from "../../apps/web/lib/study/sheet-grouping";
import {studyConcepts} from "../../apps/web/lib/study/scope";
import type {SubjectVocabularyItem} from "../../apps/web/lib/study/subject-sheets";
import {loadSubjectVocabulary} from "../../apps/web/lib/study/subject-sheets.server";

const vocabulary=loadSubjectVocabulary();
function permutationsOf(values:SheetGrouping[]):SheetGrouping[][]{
  return values.length?values.flatMap((value,index)=>permutationsOf(values.filter((_,position)=>position!==index)).map(rest=>[value,...rest])):[[]];
}
const permutations=permutationsOf([...DEFAULT_GROUP_ORDER]);

function leaves(items:SubjectVocabularyItem[],order:readonly SheetGrouping[]):SubjectVocabularyItem[]{
  const [dimension,...rest]=order;
  return dimension?groupSheetItems(items,dimension).flatMap(group=>leaves(group.items,rest)):items;
}

describe("infographic grouping priority",()=>{
  it("defaults to the existing gender/plural grouping and only enables requested dimensions",()=>{
    expect(DEFAULT_GROUP_ORDER).toEqual(["lesson","subject","gender","plural"]);
    expect(getActiveGroupOrder({})).toEqual(["gender"]);
    expect(getActiveGroupOrder({view:"plurals"})).toEqual(["gender","plural"]);
    expect(getActiveGroupOrder({subjects:true,gender:false})).toEqual(["subject"]);
    expect(getActiveGroupOrder({lessons:true,subjects:true,gender:false})).toEqual(["lesson","subject"]);
    expect(getActiveGroupOrder({subjects:false,gender:false,view:"illustrated"})).toEqual([]);
  });

  it.each(permutations.map(order=>({order})))("accepts all permutations and preserves their enabled relative order: $order",({order})=>{
    expect(normalizeGroupOrder(order)).toEqual(order);
    for(const lessons of [false,true])for(const subjects of [false,true])for(const gender of [false,true])for(const plural of [false,true]){
      const active=getActiveGroupOrder({lessons,subjects,gender,view:plural?"plurals":"illustrated",groupOrder:order});
      const enabled=new Set<SheetGrouping>([...(lessons?["lesson" as const]:[]),...(subjects?["subject" as const]:[]),...(gender?["gender" as const]:[]),...(plural?["plural" as const]:[])]);
      expect(active).toEqual(order.filter(dimension=>enabled.has(dimension)));
      expect(leaves(vocabulary,active).map(item=>item.id).sort()).toEqual(vocabulary.map(item=>item.id).sort());
    }
  });

  it.each([undefined,null,"subject,gender,plural",[],["subject"],["subject","gender"],["subject","subject","plural"],["subject","gender","bogus"],["subject","gender","plural","gender"],[1,2,3]])("rejects malformed order %j",value=>{
    expect(normalizeGroupOrder(value)).toBeUndefined();
  });

  it.each(["lesson","subject","gender","plural"] as const)("retains every catalogue row once when grouped by %s",dimension=>{
    const groups=groupSheetItems(vocabulary,dimension);
    const ids=groups.flatMap(group=>group.items.map(item=>item.id));
    expect(vocabulary).toHaveLength(1338);
    expect(ids).toHaveLength(vocabulary.length);
    expect(new Set(ids)).toEqual(new Set(vocabulary.map(item=>item.id)));
    expect(groups.every(group=>group.items.length>0)).toBe(true);
    expect(groupSheetItems([...vocabulary,vocabulary[0]!],dimension).flatMap(group=>group.items)).toHaveLength(vocabulary.length);
    expect(groupSheetItems([],dimension)).toEqual([]);
  });

  it("upgrades the six previous three-dimension orders without changing their relative priority",()=>{
    const legacy=permutationsOf(["subject","gender","plural"]);
    for(const order of legacy){
      expect(normalizeGroupOrder(order)).toEqual(["lesson",...order]);
      expect(getActiveGroupOrder({subjects:true,view:"plurals",groupOrder:order})).toEqual(order);
      expect(getActiveGroupOrder({lessons:true,subjects:true,view:"plurals",groupOrder:order})).toEqual(["lesson",...order]);
    }
  });

  it("uses the first matching selected lesson for a real multi-lesson word and otherwise the earliest",()=>{
    const word=vocabulary.find(item=>new Set(item.studyTags.lessons).size>1)!;
    expect(word).toBeDefined();
    const lessons=[...word.studyTags.lessons].sort((a,b)=>a-b);
    expect(groupSheetItems([word],"lesson")[0]).toMatchObject({id:`lesson-${lessons[0]}`,lesson:lessons[0]});
    expect(groupSheetItems([word],"lesson",[],{lessons:[lessons.at(-1)!]})).toMatchObject([{id:`lesson-${lessons.at(-1)}`,items:[{id:word.id}]}]);
    expect(groupSheetItems([word],"lesson",[],{lessons:[99]})[0]!.lesson).toBe(lessons[0]);
    expect(groupSheetItems([word],"lesson",[],{lessons:[...lessons].reverse()})[0]!.lesson).toBe(lessons[0]);
  });

  it("uses source-specific lessons with the same fallback as the study filter",()=>{
    const base=vocabulary[0]!;
    const word:SubjectVocabularyItem={...base,studyTags:{...base.studyTags,lessons:[2,4,6],sourceLessons:{course:[2,4],"teacher-extra":[6]}}};
    expect(groupSheetItems([word],"lesson",[],{source:"all",lessons:[4]})[0]!.lesson).toBe(4);
    expect(groupSheetItems([word],"lesson",[],{source:"course",lessons:[6,4]})[0]!.lesson).toBe(4);
    expect(groupSheetItems([word],"lesson",[],{source:"teacher-extra",lessons:[2,6]})[0]!.lesson).toBe(6);
    expect(groupSheetItems([word],"lesson",[],{source:"study-extra"})[0]!.lesson).toBe(2);
    const unassigned={...word,studyTags:{...word.studyTags,sourceLessons:{course:[]}}};
    expect(groupSheetItems([unassigned],"lesson",[],{source:"course"})).toMatchObject([{id:"no-lesson",label:"Additional vocabulary",items:[{id:word.id}]}]);
  });

  it("keeps vocabulary without lessons in an additional group and orders numbered lessons numerically",()=>{
    const base=vocabulary[0]!;
    const words=[12,2,0].map(lesson=>({...base,id:`lesson-fixture-${lesson}`,studyTags:{...base.studyTags,lessons:lesson?[lesson]:[]}}));
    expect(groupSheetItems(words,"lesson").map(group=>group.id)).toEqual(["lesson-2","lesson-12","no-lesson"]);
    expect(groupSheetItems(words,"lesson").flatMap(group=>group.items).map(item=>item.id).sort()).toEqual(words.map(item=>item.id).sort());
  });

  it("assigns a multi-tag real word to the first matching selected subject",()=>{
    const book=vocabulary.find(item=>item.cardId==="W466")!;
    expect(book.studyTags.concepts).toContain("objects");
    expect(book.studyTags.concepts).toContain("classroom");
    expect(groupSheetItems([book],"subject",["classroom","objects"])).toMatchObject([{id:"classroom",items:[{id:book.id}]}]);
    expect(groupSheetItems([book],"subject",["objects","classroom"])).toMatchObject([{id:"objects",items:[{id:book.id}]}]);
    const canonical=studyConcepts.find(subject=>book.studyTags.concepts.includes(subject.id))!.id;
    expect(groupSheetItems([book],"subject")[0]!.id).toBe(canonical);
    expect(groupSheetItems([{...book,studyTags:{...book.studyTags,concepts:[]}}],"subject")).toMatchObject([{id:"other",label:"Other subjects",items:[{id:book.id}]}]);
  });

  it("retains missing forms, existing plurals and every article-free word type",()=>{
    const groups=groupSheetItems(vocabulary,"plural");
    expect(groups.find(group=>group.id==="not-taught")!.items.every(item=>!item.plurals.length)).toBe(true);
    expect(groups.find(group=>group.id==="already-plural")!.items.every(item=>item.tone==="plural")).toBe(true);
    expect(groups.find(group=>group.id==="verbs")!.items.every(item=>item.category==="Verb")).toBe(true);
    expect(groups.find(group=>group.id==="names")!.items.some(item=>item.de==="Deutschland")).toBe(true);
    expect(groups.find(group=>group.id==="letters")!.items.length).toBeGreaterThan(0);
    expect(groups.find(group=>group.id==="numbers")!.items.length).toBeGreaterThan(0);
    expect(groups.find(group=>group.id==="expressions")!.items.length).toBeGreaterThan(0);
  });

  it("assigns a word with multiple plural patterns once and preserves both supplied forms",()=>{
    const base=vocabulary.find(item=>item.tone==="neuter")!;
    const word:SubjectVocabularyItem={...base,id:"variant-word",de:"das Wort",plurals:[{text:"die Wörter",label:"Plural",tone:"plural",audio:null},{text:"die Worte",label:"Plural",tone:"plural",audio:null}]};
    expect(word.plurals.map(form=>classifyPluralPair(word.de,form.text))).toEqual(["umlaut-er","e"]);
    const groups=groupSheetItems([word],"plural");
    expect(groups.map(group=>group.id)).toEqual(["e"]);
    expect(groups[0]!.items[0]!.plurals.map(form=>form.text)).toEqual(["die Wörter","die Worte"]);
  });
});
