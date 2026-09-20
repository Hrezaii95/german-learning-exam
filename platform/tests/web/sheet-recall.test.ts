import {describe,expect,it} from "vitest";
import {countries,countryFrom} from "../../apps/web/lib/study/countries";
import {homeWords} from "../../apps/web/lib/study/home";
import {countryRecallQuestions,homeRecallQuestions,savedCountry} from "../../apps/web/lib/study/sheet-recall";
import {countryStudyTags,homeStudyTags} from "../../apps/web/lib/study/sheet-scope";
import {savedStudyTags} from "../../apps/web/lib/study/saved-tags";
import {loadDictionary} from "../../apps/web/lib/study/catalog";
import {defaultStudyScope,matchesStudyScope} from "../../apps/web/lib/study/scope";

const dictionary=loadDictionary();
describe("sheet practice follows the selected content",()=>{
  it("keeps the ten country checks, both Iran answers and the Austria language contrast",()=>{
    const questions=countryRecallQuestions(countries,dictionary);
    expect(questions).toHaveLength(10);
    expect(questions.find(q=>q.id==="country-origin-IR")?.answers).toEqual(["aus dem Iran","aus Iran"]);
    expect(questions.find(q=>q.id==="country-language-AT")?.answers).toEqual(["Deutsch"]);
    expect(new Set(questions.map(q=>q.id)).size).toBe(questions.length);
  });
  it("makes a useful country check for any single visible country, including England",()=>{
    for(const country of countries){
      const questions=countryRecallQuestions([country],dictionary);
      expect(questions[0]?.answers).toContain(countryFrom(country));
      expect(questions[0]?.options).toContain(countryFrom(country));
      for(const question of questions)expect(question.item.id).toBe(`country-${country.id}`);
    }
    expect(countryRecallQuestions([],dictionary)).toEqual([]);
  });
  it("uses the same course/source selection when saved now or restored from an older backup",()=>{
    for(const country of countries){
      const saved=savedCountry(country,dictionary);
      const {studyTags:_,...legacy}=saved;
      expect(savedStudyTags(legacy,dictionary)).toEqual(saved.studyTags);
      const scope={...defaultStudyScope(),mode:"one" as const,lessons:[12],source:"course" as const};
      expect(matchesStudyScope(savedStudyTags(saved,dictionary),scope)).toBe(matchesStudyScope(countryStudyTags(country,dictionary),scope));
    }
  });
  it("preserves eight Home checks and provides article recall for every other selected word",()=>{
    const save=(word:typeof homeWords[number])=>({id:`home-${word.id}`,title:word.de,meaning:word.en,href:`/cheat-sheets/home#home-${word.id}`,kind:"word" as const});
    expect(homeRecallQuestions(homeWords,save)).toHaveLength(8);
    expect(homeRecallQuestions([],save)).toEqual([]);
    for(const word of homeWords){
      const questions=homeRecallQuestions([word],save);
      expect(questions.length).toBeGreaterThan(0);
      for(const question of questions){expect(question.item.id).toBe(`home-${word.id}`);expect(question.options).toEqual(expect.arrayContaining(question.answers));}
      expect(savedStudyTags(save(word),dictionary)).toEqual(homeStudyTags(word,dictionary));
    }
  });
});
