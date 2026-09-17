import type {DictionaryEntry,SavedItem} from "./types";
import {tagsForLesson,type StudyTags,type StudyConcept} from "./scope";
import {courseChapters} from "./lesson-four";

/** Stable links also recover tags from backups created before study selection. */
export function savedStudyTags(item:SavedItem,dictionary:DictionaryEntry[]=[]):StudyTags{
  if(item.studyTags)return item.studyTags;
  const entry=dictionary.find(e=>e.id===item.id.replace(/^card-/,"")||e.href===item.href);
  if(entry?.studyTags)return entry.studyTags;
  const explicit=item.lesson??Number(item.href.match(/^\/lessons\/(\d+)/)?.[1]);
  if(explicit)return tagsForLesson(explicit);
  const page=item.href.match(/page=(coursebook|workbook)-(\d+)/);
  if(page){const n=Number(page[2]);const chapter=[...courseChapters].reverse().find(c=>n>=(page[1]==="coursebook"?c.kb:c.ab));return tagsForLesson(chapter?.number??1);}
  const sheet=item.href.match(/^\/cheat-sheets(?:\/([^#?]+))?/);
  if(sheet){
    const concepts:Record<string,StudyConcept[]>={countries:["countries","grammar"],home:["home","grammar"],people:["people","grammar"],numbers:["numbers"],verbs:["verbs","grammar"],conversation:["conversation","classroom"],questions:["questions","grammar"]};
    const name=sheet[1]??"countries";
    return {lessons:name==="home"?[4]:name==="countries"?[1,3]:[1,2,3,4],concepts:concepts[name]??["everyday"],source:"study-extra"};
  }
  return {lessons:[],concepts:[item.kind==="concept"?"grammar":"everyday"],source:"study-extra"};
}
