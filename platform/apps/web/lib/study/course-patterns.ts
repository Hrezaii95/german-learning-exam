import type {StudyUnit} from "./course-lessons";
import {tagsForLesson,type StudyTags} from "./scope";
import {wordCardSearchKey} from "../content/word-card-types";

export type CoursePatternEntry =
  | {kind:"grammar";key:string;lesson:number;value:StudyUnit["concepts"][number]}
  | {kind:"verbs";key:string;lesson:number;value:StudyUnit["verbs"][number]}
  | {kind:"phrases";key:string;lesson:number;value:StudyUnit["phrases"][number];index:number};

export function coursePatternTags(entry:CoursePatternEntry):StudyTags {
  const tags=tagsForLesson(entry.lesson);
  return {...tags,concepts:[...tags.concepts,entry.kind==="verbs"?"verbs":entry.kind==="phrases"?"conversation":"grammar"]};
}
export function coursePatternText(entry:CoursePatternEntry):string {
  if(entry.kind==="grammar") {const c=entry.value;return `${c.title} ${c.de} ${c.en} ${c.examples.join(" ")}`;}
  if(entry.kind==="verbs") {const v=entry.value;return `${v.verb} ${v.meaning} ${v.forms.join(" ")} ${v.participle??""} ${v.preterite?.join(" ")??""} ${v.tip}`;}
  const p=entry.value;return `${p.de} ${p.en} ${p.note??""}`;
}
export function coursePatternEntries(units:readonly StudyUnit[],section:string,query=""):CoursePatternEntry[] {
  if(!["verbs","phrases","grammar","concepts"].includes(section))return [];
  const entries=units.flatMap<CoursePatternEntry>(unit=>{
    if(section==="verbs") return unit.verbs.map(value=>({kind:"verbs",lesson:unit.number,key:`l${unit.number}-verb-${value.verb}`,value}));
    if(section==="phrases") return unit.phrases.map((value,index)=>({kind:"phrases",lesson:unit.number,key:`l${unit.number}-phrase-${index}`,value,index}));
    return unit.concepts.map(value=>({kind:"grammar",lesson:unit.number,key:value.id,value}));
  });
  const needle=wordCardSearchKey(query.trim());
  return needle?entries.filter(entry=>wordCardSearchKey(coursePatternText(entry)).includes(needle)):entries;
}
