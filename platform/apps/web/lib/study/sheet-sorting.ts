import type {StudyScope,StudySource} from "./scope";
import type {SubjectVocabularyItem} from "./subject-sheets";

export type SheetSort="german"|"meaning"|"lesson"|"source"|"original";
export type SheetSortDirection="asc"|"desc";
const SORTS:readonly SheetSort[]=["german","meaning","lesson","source","original"];
const SOURCES:readonly StudySource[]=["course","teacher-extra","study-extra"];

export function normalizeSheetSort(value:unknown):SheetSort|undefined{
  return typeof value==="string"&&SORTS.includes(value as SheetSort)?value as SheetSort:undefined;
}

export function normalizeSheetSortDirection(value:unknown):SheetSortDirection|undefined{
  return value==="asc"||value==="desc"?value:undefined;
}

type LessonOptions={lessons?:readonly number[];source?:StudyScope["source"]};

/** Checkbox selection order must not change a word's lesson after reloading. */
export function sheetItemLesson(item:SubjectVocabularyItem,options:LessonOptions={}):number|undefined{
  const sourceLessons=options.source&&options.source!=="all"?(item.studyTags.sourceLessons?.[options.source]??item.studyTags.lessons):item.studyTags.lessons;
  const available=[...new Set(sourceLessons)].filter(lesson=>Number.isInteger(lesson)&&lesson>0).sort((a,b)=>a-b);
  const selected=options.lessons?[...options.lessons].sort((a,b)=>a-b):[];
  return selected.find(lesson=>available.includes(lesson))??available[0];
}

/** A merged course/extra row sorts with its first available source category. */
export function sheetItemSource(item:SubjectVocabularyItem,source:StudyScope["source"]="all"):StudySource{
  const sources=item.studyTags.sources??[item.studyTags.source];
  if(source!=="all"&&sources.includes(source))return source;
  return SOURCES.find(candidate=>sources.includes(candidate))??item.studyTags.source;
}

function germanKey(text:string):string{
  return text.normalize("NFC").trim().replace(/^(?:der|die|das)\s+/i,"");
}

function compareGerman(a:SubjectVocabularyItem,b:SubjectVocabularyItem):number{
  return germanKey(a.de).localeCompare(germanKey(b.de),"de")||a.de.localeCompare(b.de,"de");
}

/** Sort only word rows; grouping priority is independent of this order. */
export function sortSheetItems(items:readonly SubjectVocabularyItem[],browse:{sort?:SheetSort;direction?:SheetSortDirection}={},options:LessonOptions&{catalogue?:readonly SubjectVocabularyItem[]}={}):SubjectVocabularyItem[]{
  const sort=normalizeSheetSort(browse.sort)??"german";
  const direction=browse.direction==="desc"?-1:1;
  const original=new Map((options.catalogue??items).map((item,index)=>[item.id,index]));
  const indexed=items.map((item,index)=>({item,index,lesson:sort==="lesson"?sheetItemLesson(item,options):undefined,source:sort==="source"?SOURCES.indexOf(sheetItemSource(item,options.source)):0}));
  return indexed.sort((a,b)=>{
    let compared=0;
    switch(sort){
      case "german":compared=compareGerman(a.item,b.item);break;
      case "meaning":compared=a.item.meaning.localeCompare(b.item.meaning,"en");break;
      case "lesson":
        // Unassigned vocabulary remains last in either direction.
        if(a.lesson===undefined||b.lesson===undefined){
          if(a.lesson!==b.lesson)return a.lesson===undefined?1:-1;
        }else compared=a.lesson-b.lesson;
        break;
      case "source":compared=a.source-b.source;break;
      case "original":compared=(original.get(a.item.id)??original.size+a.index)-(original.get(b.item.id)??original.size+b.index);break;
    }
    return compared*direction||compareGerman(a.item,b.item)||a.index-b.index;
  }).map(entry=>entry.item);
}
