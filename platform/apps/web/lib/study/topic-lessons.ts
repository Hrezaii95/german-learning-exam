import {A1_LESSON_COUNT} from "./scope";

/** Topic links carry explicit lessons; `lessons` remains the grouping switch. */
export function normalizeTopicLessons(value:unknown):number[]|undefined{
  let values=value;
  if(typeof value==="string"){
    const parts=value.split(",");
    if(!parts.every(lesson=>/^(?:0?[1-9]|1[0-2])$/.test(lesson)))return undefined;
    values=parts.map(Number);
  }
  if(!Array.isArray(values)||!values.length||values.length>A1_LESSON_COUNT||
    !values.every((lesson):lesson is number=>Number.isInteger(lesson)&&lesson>=1&&lesson<=A1_LESSON_COUNT))return undefined;
  return [...new Set(values)].sort((a,b)=>a-b);
}
