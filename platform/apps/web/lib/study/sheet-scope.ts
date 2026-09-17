import type {StudyTags} from "./scope";
import type {SheetId} from "./sheet-topics";
import type {DictionaryEntry} from "./types";
import type {HomeWord} from "./home";
import {countryName,type Country} from "./countries";
export const sheetTags:Record<SheetId,StudyTags>={
  countries:{lessons:[1,3],concepts:["countries","grammar"],source:"course",sources:["course","study-extra"]},
  home:{lessons:[2,3,4,5,6],concepts:["home","objects","grammar","descriptions"],source:"course",sources:["course","study-extra"]},
  people:{lessons:[2,3,6,7,8,9],concepts:["people","grammar"],source:"course",sources:["course","teacher-extra"]},
  verbs:{lessons:[1,2,3,4,5,6,7,8,9],concepts:["verbs","grammar","questions"],source:"course"},
  numbers:{lessons:[1,2,3,4,5,6,7,8,9],concepts:["numbers"],source:"course"},
  conversation:{lessons:[1,2,3,4,5,6,7,8,9],concepts:["conversation","introductions","classroom"],source:"course"},
  questions:{lessons:[1,2,3,4,5,6,7,8,9],concepts:["questions","grammar"],source:"course",sources:["course","study-extra"]},
  objects:{lessons:[5],concepts:["objects","colours-materials","grammar","classroom"],source:"course"},
  office:{lessons:[6],concepts:["office","objects","grammar","conversation","verbs"],source:"course"},
  food:{lessons:[9],concepts:["food","verbs","grammar","questions","conversation"],source:"course"},
  time:{lessons:[8],concepts:["time","verbs","grammar","questions","conversation"],source:"course"},
  hobbies:{lessons:[7],concepts:["hobbies","verbs","grammar","conversation","questions"],source:"course"},
};
export function countryStudyTags(country:Country,dictionary:DictionaryEntry[]=[]):StudyTags{
  const found=dictionary.find(e=>e.de===countryName(country));
  return {lessons:found?.studyTags?.lessons??[1,3],concepts:["countries","grammar"],source:country.extra||(!found&&country.id==="IR")?"study-extra":"course"};
}
export function homeStudyTags(word:HomeWord,dictionary:DictionaryEntry[]=[]):StudyTags{
  const found=dictionary.find(e=>e.de===word.de);
  const lessons=[...new Set(word.book.flatMap(ref=>[...ref.matchAll(/L(\d+)/g)].map(m=>Number(m[1]))))];
  return {lessons:[...new Set([...lessons,...(found?.studyTags?.lessons??[])])].length?[...new Set([...lessons,...(found?.studyTags?.lessons??[])])]:[4],concepts:["home",...(word.area==="Objects"?["objects" as const]:[])],source:lessons.length||found?.studyTags?"course":"study-extra"};
}
