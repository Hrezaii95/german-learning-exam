import {describe,it,expect} from "vitest";
import {defaultStudyScope,parseStudyScope,selectedLessons,matchesStudyScope,numericLessons,tagsForLesson,LAST_AVAILABLE_LESSON} from "../../apps/web/lib/study/scope";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {wordStudyTags} from "../../apps/web/lib/study/tags";
import {parseStudy,emptyStudy} from "../../apps/web/lib/study/storage";

describe("shared study selection contract",()=>{
  it("selects one, several, and every lesson through an endpoint",()=>{
    expect(selectedLessons({...defaultStudyScope(),mode:"one",lessons:[3]})).toEqual([3]);
    expect(selectedLessons({...defaultStudyScope(),mode:"multiple",lessons:[1,3]})).toEqual([1,3]);
    expect(selectedLessons({...defaultStudyScope(),mode:"through",lessons:[3]})).toEqual([1,2,3]);
    expect(selectedLessons(defaultStudyScope())).toHaveLength(LAST_AVAILABLE_LESSON);
  });
  it("keeps an empty multiple selection empty",()=>{
    const scope={...defaultStudyScope(),mode:"multiple" as const};
    expect(parseStudyScope(JSON.stringify(scope))).toEqual(scope);
    expect(matchesStudyScope(tagsForLesson(1),scope)).toBe(false);
  });
  it("combines lesson, concept and source filters without admitting unrelated material",()=>{
    const scope={...defaultStudyScope(),mode:"multiple" as const,lessons:[2,3],concepts:["people" as const],source:"teacher-extra" as const};
    expect(matchesStudyScope({lessons:[2],concepts:["people"],source:"teacher-extra"},scope)).toBe(true);
    expect(matchesStudyScope({lessons:[4],concepts:["people"],source:"teacher-extra"},scope)).toBe(false);
    expect(matchesStudyScope({lessons:[2],concepts:["numbers"],source:"teacher-extra"},scope)).toBe(false);
    expect(matchesStudyScope(tagsForLesson(2),scope)).toBe(false);
  });
  it("normalizes old lesson labels and rejects malformed stored selections",()=>{
    expect(numericLessons(["1–3","4","lesson:02","Teacher notes"])).toEqual([1,2,3,4]);
    expect(numericLessons(["Module 2"])).toEqual([4,5,6]);
    expect(numericLessons(["1-3"])).toEqual([1,2,3]);
    for(const raw of ['null','{}','{"mode":"all","lessons":[99],"concepts":[],"source":"all"}'])expect(()=>parseStudyScope(raw)).toThrow();
  });
  it("gives every actual word family a lesson and concept, including legacy ranges",()=>{
    const cards=loadWordCards().cards;
    for(const card of cards){
      const tags=wordStudyTags(card);
      expect(tags.lessons.length,card.id).toBeGreaterThan(0);
      expect(tags.concepts.length,card.id).toBeGreaterThan(0);
      if(card.lessons.includes("1-3"))expect(tags.lessons,card.id).toEqual(expect.arrayContaining([1,2,3]));
    }
  });
  it("keeps every teacher-linked profession tagged to Lesson 2, without losing course overlap",()=>{
    for(const card of loadWordCards().cards.filter(c=>c.teacherRows.length)){
      const tags=wordStudyTags(card);
      expect(tags.lessons).toContain(2);expect(tags.sources).toContain("teacher-extra");
      if(numericLessons(card.lessons).length)expect(tags.sources).toContain("course");
    }
  });
  it("preserves Lesson 6 and source/concept membership when restoring a saved review backup",()=>{
    const item={id:"six",title:"der Termin",meaning:"appointment",kind:"word" as const,href:"/lessons/06",lesson:6,studyTags:tagsForLesson(6)};
    expect(parseStudy(JSON.stringify({...emptyStudy(),saved:{six:item}})).saved.six).toMatchObject(item);
  });
  it("drops invalid tag payloads without trusting imported source labels",()=>{
    const item={id:"bad",title:"x",meaning:"x",kind:"word",href:"/saved",studyTags:{lessons:[99],concepts:["injected"],source:"teacher-extra"}};
    expect(parseStudy(JSON.stringify({...emptyStudy(),saved:{bad:item}})).saved.bad?.studyTags).toBeUndefined();
  });
});
