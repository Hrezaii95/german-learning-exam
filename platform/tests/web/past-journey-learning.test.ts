import {describe,it,expect} from "vitest";
import {existsSync} from "node:fs";
import {resolve} from "node:path";
import {loadCollectionSpeech,loadStudySpeech} from "../../apps/web/lib/study/catalog";
import {pastBookmark,readPastBookmark,pastDayEvents,openingInterpretations} from "../../apps/web/lib/study/past-learning";
import {pastActivities,pastPeople,pastModes,openingHours,pastGroups,pastSpeech} from "../../apps/web/lib/study/past-sheet";
import {journeyBookmark,readJourneyBookmark,journeyMonths,journeyStages,yearChunks} from "../../apps/web/lib/study/journey-learning";
import {journeyActivities,journeyPeople,spokenYear,journeySpeech} from "../../apps/web/lib/study/journey-sheet";

describe("yesterday and journey learning context",()=>{
 it("restores all past sentence settings and rejects unavailable choices",()=>{
  for(let activity=0;activity<pastActivities.length;activity++)for(let person=0;person<pastPeople.length;person++)for(const {id:mode} of pastModes)for(let hours=0;hours<openingHours.length;hours++)for(let pattern=0;pattern<pastGroups.length;pattern++){
   const state={activity,person,mode,hours,pattern};expect(readPastBookmark(pastBookmark(state,"hours"))).toEqual({...state,section:"hours"});
  }
  for(const hash of ["#past-lab-99-0-statement-1-0","#past-hours-0-0-statement-3-0","#past-patterns-0-0-statement-1-4"])expect(readPastBookmark(hash)).toBeNull();
 });
 it("keeps the sample day and opening-time explanations tied to their source models",()=>{
  expect(pastDayEvents.map(event=>pastActivities[event.activity].verb)).toEqual(["trinken","arbeiten","lernen","fernsehen"]);
  expect(openingHours.map(hours=>[hours.start,hours.end])).toEqual([[8,8],[8,13],[8,null]]);
  expect(openingInterpretations[2]).toContain("no closing time");
 });
 it("restores trip, month, year and question context across the complete taught set",()=>{
  for(let activity=0;activity<journeyActivities.length;activity++)for(let person=0;person<journeyPeople.length;person++)for(const month of journeyMonths)for(const question of [false,true]){
   const state={activity,person,month,question,year:1986};expect(readJourneyBookmark(journeyBookmark(state,"calendar"))).toEqual({...state,section:"calendar"});
  }
  for(const hash of ["#journey-lab-99-0-0-0-1986","#journey-calendar-0-0-0-12-1986","#journey-years-0-0-0-0-2100"])expect(readJourneyBookmark(hash)).toBeNull();
 });
 it("preserves the exact spoken year and contrasts trip auxiliaries",()=>{
  for(let year=1900;year<=2099;year++)expect(yearChunks(year).join("")).toBe(spokenYear(year));
  expect(journeyStages.map(stage=>journeyActivities[stage.activity].aux)).toEqual(["sein","sein","haben","haben"]);
  expect(()=>yearChunks(1899)).toThrow(RangeError);
 });
 it("resolves recorded pronunciation for the taught sentences, calendar and years",()=>{
  const speech={...loadCollectionSpeech(),...loadStudySpeech()};
  for(const text of [...pastSpeech,...journeySpeech]){
   expect(speech[text],text).toBeTruthy();
   expect(existsSync(resolve("apps/web/public",speech[text]!.slice(1))),text).toBe(true);
  }
 });
});
