import type {DictionaryEntry,SavedItem} from "./types";
import {tagsForLesson,type StudyTags} from "./scope";
import {sheetTags} from "./sheet-scope";
import type {SheetId} from "./sheet-topics";
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
    const name=sheet[1]??"countries";
    if(name in sheetTags)return {...sheetTags[name as SheetId],source:"study-extra",sources:["study-extra"]};
  }
  return {lessons:[],concepts:[item.kind==="concept"?"grammar":"everyday"],source:"study-extra"};
}
