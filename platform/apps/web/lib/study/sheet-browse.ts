import type {NavigationContext} from "../content/navigation-context";
import {studyConcepts,type StudyConcept,type StudySource} from "./scope";
import {normalizeSheetSource} from "./sheet-source";
import {normalizeGroupOrder,type SheetGrouping} from "./sheet-grouping";
import {normalizeSheetSort,normalizeSheetSortDirection,type SheetSort,type SheetSortDirection} from "./sheet-sorting";
import {normalizeTopicLessons} from "./topic-lessons";
export type SheetBrowse={query:string;category:string;saved:boolean;page:number;view?:"illustrated"|"plurals";gender?:boolean;subjects?:boolean;lessons?:boolean;groupOrder?:SheetGrouping[];sort?:SheetSort;direction?:SheetSortDirection;tags?:StudyConcept[];lessonFilter?:number[];sourceFilter?:StudySource};
export const initialSheetBrowse:SheetBrowse={query:"",category:"all",saved:false,page:1};
const STUDY_CONCEPT_IDS=new Set<string>(studyConcepts.map(subject=>subject.id));
/** An explicit empty list means all tags; invalid lists never become partial filters. */
export function normalizeSheetTags(value:unknown):StudyConcept[]|undefined{
  if(!Array.isArray(value))return undefined;
  const tags=[...value];
  if(!tags.every((tag):tag is StudyConcept=>typeof tag==="string"&&STUDY_CONCEPT_IDS.has(tag)))return undefined;
  return [...new Set(tags)];
}
export function readSheetBrowse(params:URLSearchParams):SheetBrowse{
  const page=Number(params.get("page"));
  const view=params.get("view");
  const gender=params.get("gender");
  const subjects=params.get("subjects");
  const lessons=params.get("lessons");
  const sort=normalizeSheetSort(params.get("sort"));
  const direction=normalizeSheetSortDirection(params.get("direction"));
  const sourceFilter=normalizeSheetSource(params.get("source"));
  const rawOrder=params.get("order");
  const groupOrder=rawOrder===null?undefined:normalizeGroupOrder(rawOrder.split(","));
  const rawTags=params.get("tags");
  const tags=rawTags===null?undefined:normalizeSheetTags(rawTags===""?[]:rawTags.split(","));
  const lessonFilter=normalizeTopicLessons(params.get("lesson"));
  return {query:(params.get("q")??"").slice(0,120),category:(params.get("category")??"all").slice(0,80),saved:params.get("saved")==="1",page:Number.isInteger(page)&&page>0&&page<=500?page:1,...(view==="plurals"||view==="illustrated"?{view}:{}),...(gender==="0"||gender==="1"?{gender:gender==="1"}:{}),...(subjects==="0"||subjects==="1"?{subjects:subjects==="1"}:{}),...(lessons==="0"||lessons==="1"?{lessons:lessons==="1"}:{}),...(groupOrder?{groupOrder}:{}),...(sort?{sort}:{}),...(direction?{direction}:{}),...(tags!==undefined?{tags}:{}),...(lessonFilter?{lessonFilter}:{}),...(sourceFilter?{sourceFilter}:{})};
}
export function sheetBrowseQuery(browse:SheetBrowse){
  const params=new URLSearchParams();
  if(browse.query)params.set("q",browse.query);
  if(browse.category!=="all")params.set("category",browse.category);
  if(browse.saved)params.set("saved","1");
  if(browse.page>1)params.set("page",String(browse.page));
  if(browse.view)params.set("view",browse.view);
  if(typeof browse.gender==="boolean")params.set("gender",browse.gender?"1":"0");
  if(typeof browse.subjects==="boolean")params.set("subjects",browse.subjects?"1":"0");
  if(typeof browse.lessons==="boolean")params.set("lessons",browse.lessons?"1":"0");
  const groupOrder=normalizeGroupOrder(browse.groupOrder);
  if(groupOrder)params.set("order",groupOrder.join(","));
  const sort=normalizeSheetSort(browse.sort);
  const direction=normalizeSheetSortDirection(browse.direction);
  if(sort)params.set("sort",sort);
  if(direction)params.set("direction",direction);
  const tags=normalizeSheetTags(browse.tags);
  if(tags!==undefined)params.set("tags",tags.join(","));
  const lessonFilter=normalizeTopicLessons(browse.lessonFilter);
  if(lessonFilter)params.set("lesson",lessonFilter.join(","));
  const sourceFilter=normalizeSheetSource(browse.sourceFilter);
  if(sourceFilter)params.set("source",sourceFilter);
  return params.size?`?${params}`:"";
}
export function sheetNavigationContext(returnPath:string,browse:SheetBrowse,resultId?:string):NavigationContext{
  const sort=normalizeSheetSort(browse.sort);
  const direction=normalizeSheetSortDirection(browse.direction);
  const tags=normalizeSheetTags(browse.tags);
  const groupOrder=normalizeGroupOrder(browse.groupOrder);
  const lessonFilter=normalizeTopicLessons(browse.lessonFilter);
  const sourceFilter=normalizeSheetSource(browse.sourceFilter);
  return {entryContext:"hub",returnPath,q:browse.query,category:browse.category,page:browse.page,onlySaved:browse.saved,...(browse.view?{sheetView:browse.view}:{}),...(typeof browse.gender==="boolean"?{sheetGender:browse.gender}:{}),...(typeof browse.subjects==="boolean"?{sheetSubjects:browse.subjects}:{}),...(typeof browse.lessons==="boolean"?{sheetLessons:browse.lessons}:{}),...(groupOrder?{sheetGroupOrder:groupOrder}:{}),...(sort?{sheetSort:sort}:{}),...(direction?{sheetDirection:direction}:{}),...(tags!==undefined?{sheetTags:tags}:{}),...(lessonFilter?{sheetLessonFilter:lessonFilter}:{}),...(sourceFilter?{sheetSource:sourceFilter}:{}),...(resultId?{resultId}:{})};
}
