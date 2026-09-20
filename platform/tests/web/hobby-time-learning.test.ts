import {describe,it,expect} from "vitest";
import {hobbyModels,hobbyPeople,abilityLevels,frequencyWords} from "../../apps/web/lib/study/hobbies-sheet";
import {hobbyBookmark,readHobbyBookmark,hobbyContrasts,frequencyWeekExamples} from "../../apps/web/lib/study/hobby-learning";
import {clockWords,clockHours,clockMinutes,weekDays,timePlaces,planSentence} from "../../apps/web/lib/study/time-sheet";
import {clockBookmark,readClockBookmark,planBookmark,readPlanBookmark,timedPlanSentence,timedPlanSaveId,timeTeachingSpeech,clockListeningQuestion} from "../../apps/web/lib/study/time-learning";
import {loadCollectionSpeech,loadStudySpeech,loadDictionary} from "../../apps/web/lib/study/catalog";
import {existsSync} from "node:fs";
import {resolve} from "node:path";

describe("hobby learning context",()=>{
 it("restores every published choice and rejects invalid references",()=>{
  for(let hobby=0;hobby<hobbyModels.length;hobby++)for(let person=0;person<hobbyPeople.length;person++)for(let level=0;level<abilityLevels.length;level++)for(let frequency=0;frequency<frequencyWords.length;frequency++)for(const question of [true,false]){const state={hobby,person,level,frequency,question};expect(readHobbyBookmark(hobbyBookmark(state,"frequency"))).toEqual({...state,section:"frequency"});}
  expect(readHobbyBookmark("#hobby-ability-99-0-0-0-0")).toBeNull();
  expect(readHobbyBookmark("#hobby-contrast-5-2")).toMatchObject({hobby:5,section:"contrast",contrast:2});expect(readHobbyBookmark("#hobby-contrast-5-3")).toBeNull();
 });
 it("keeps ability, liking and frequency separate without changing the activity",()=>{
  expect(hobbyContrasts(5).map(row=>row.de)).toEqual(["Ich kann gut Rad fahren.","Ich fahre gern Rad.","Ich fahre oft Rad."]);
  expect(frequencyWeekExamples[0]!.every(Boolean)).toBe(true);expect(frequencyWeekExamples[3]!.some(Boolean)).toBe(false);
 });
});
describe("time practice context",()=>{
 it("preserves the exact hour and mode including midnight and rejects invalid minutes",()=>{
  for(const hour of clockHours)for(const minute of clockMinutes)for(const mode of ["everyday","official"] as const){const state={hour,minute,mode};expect(readClockBookmark(clockBookmark(state))).toEqual(state);}
  expect(readClockBookmark("#clock-24-0-official")).toBeNull();expect(readClockBookmark("#clock-15-33-everyday")).toBeNull();
 });
 it("puts the entire day/time phrase in one first-position block",()=>{
  for(let day=0;day<weekDays.length;day++)for(let place=0;place<timePlaces.length;place++)for(const front of [true,false]){const state={day,place,front,withTime:true,hour:15,minute:30};expect(readPlanBookmark(planBookmark(state))).toEqual(state);expect(timedPlanSentence(state)).toContain("um fünfzehn Uhr dreißig");}
  expect(timedPlanSentence({day:0,place:0,front:true,withTime:true,hour:15,minute:30})).toBe("Am Montag um fünfzehn Uhr dreißig gehen wir ins Kino.");
 });
 it("preserves untimed plan identities and distinguishes added times",()=>{
  for(let day=0;day<7;day++)for(let place=0;place<12;place++)for(const front of [true,false]){const state={day,place,front,withTime:false,hour:15,minute:30};expect(timedPlanSentence(state)).toBe(planSentence(day,place,front));expect(timedPlanSaveId(state)).toBe(`l8-plan-${day}-${place}-${front}`);expect(timedPlanSaveId({...state,withTime:true})).not.toBe(timedPlanSaveId(state));}
 });
 it("provides recorded teaching clips and contextual dictionary returns",()=>{
  const speech={...loadCollectionSpeech(),...loadStudySpeech()};for(const line of timeTeachingSpeech){expect(speech[line],line).toBeTruthy();expect(existsSync(resolve("apps/web/public",speech[line]!.slice(1))),line).toBe(true);}
  const dictionary=loadDictionary();expect(dictionary.find(entry=>entry.id==="hobby-5-1-4-true")?.href).toContain("#hobby-ability-5-1-4-1-");expect(dictionary.find(entry=>entry.id==="time-plan-0-true")?.href).toContain("#plan-0-0-1-1-15-30");
 });
 it("never offers two clocks with the same spoken everyday answer",()=>{
  for(let i=0;i<6;i++)for(const mode of ["everyday","official"] as const){const question=clockListeningQuestion(i,mode),spoken=question.options.map(option=>clockWords(option.hour,option.minute,mode));expect(new Set(spoken).size).toBe(3);expect(question.text).toBe(`Es ist ${clockWords(question.answer.hour,question.answer.minute,mode)}.`);}
 });
});
