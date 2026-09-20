import {describe,it,expect} from "vitest";
import {existsSync} from "node:fs";
import {resolve} from "node:path";
import {travelVerbs,travelPeople,travelModes,announcementModels,travelSaveId} from "../../apps/web/lib/study/travel-sheet";
import {travelBookmark,readTravelBookmark,travelRouteSteps,travelAnnouncementChoices,travelAnnouncementSaveId} from "../../apps/web/lib/study/travel-learning";
import {loadStudySpeech,loadCollectionSpeech} from "../../apps/web/lib/study/catalog";
describe("travel context and listening",()=>{
 it("restores each valid verb, person, sentence type and recording",()=>{
  for(let verb=0;verb<travelVerbs.length;verb++)for(let person=0;person<travelPeople.length;person++)for(const {id:mode} of travelModes)for(let announcement=0;announcement<announcementModels.length;announcement++){const state={verb,person,mode,announcement};expect(readTravelBookmark(travelBookmark(state,"listening"))).toEqual({...state,section:"listening"});}
  expect(readTravelBookmark("#travel-bracket-99-0-modal-0")).toBeNull();expect(readTravelBookmark("#travel-listening-0-0-modal-99")).toBeNull();
 });
 it("connects the three journey scenes to the matching separable verbs",()=>{
  expect(travelRouteSteps.map(step=>travelVerbs[step.verb]!.verb)).toEqual(["einsteigen","umsteigen","aussteigen"]);
  expect(travelAnnouncementSaveId(0)).toBe("l10-announcement-0");expect(travelAnnouncementSaveId(6)).toBe(travelSaveId(0,0,"statement"));expect(travelAnnouncementSaveId(7)).toBe(travelSaveId(5,3,"statement"));
 });
 it("has one correct listening choice and a real clip for every announcement",()=>{
  const speech={...loadCollectionSpeech(),...loadStudySpeech()};for(const [index,model] of announcementModels.entries()){const choices=travelAnnouncementChoices(index);expect(new Set(choices).size).toBe(3);expect(choices.filter(choice=>choice===model.answer)).toHaveLength(1);expect(existsSync(resolve("apps/web/public",speech[model.de]!.slice(1))),model.de).toBe(true);}
  expect(announcementModels.some(model=>model.question.includes("When"))).toBe(true);expect(announcementModels.some(model=>model.question.includes("Where"))).toBe(true);
 });
});
