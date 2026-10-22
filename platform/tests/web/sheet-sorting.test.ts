import {describe,expect,it} from "vitest";
import {normalizeSheetSort,normalizeSheetSortDirection,sheetItemLesson,sortSheetItems,type SheetSort} from "../../apps/web/lib/study/sheet-sorting";
import type {SubjectVocabularyItem} from "../../apps/web/lib/study/subject-sheets";
import {loadSubjectVocabulary} from "../../apps/web/lib/study/subject-sheets.server";

const vocabulary=loadSubjectVocabulary();
const base=vocabulary[0]!;
const word=(id:string,de:string,meaning:string,lessons:number[]=[],source:SubjectVocabularyItem["studyTags"]["source"]="course"):SubjectVocabularyItem=>({...base,id,de,meaning,studyTags:{lessons,source,sources:[source],concepts:base.studyTags.concepts}});

describe("infographic word sorting",()=>{
  it.each(["german","meaning","lesson","source","original"] as const)("validates %s and retains every catalogue row in either direction",sort=>{
    expect(normalizeSheetSort(sort)).toBe(sort);
    for(const direction of ["asc","desc"] as const){
      const sorted=sortSheetItems(vocabulary,{sort,direction});
      expect(sorted).toHaveLength(1338);
      expect(new Set(sorted.map(item=>item.id))).toEqual(new Set(vocabulary.map(item=>item.id)));
      expect(sorted).not.toBe(vocabulary);
    }
  });

  it.each([undefined,null,"",0,{},"alphabet","GERMAN",["german"]])("rejects invalid sort %j",value=>{
    expect(normalizeSheetSort(value)).toBeUndefined();
  });

  it("validates direction without accepting arbitrary truthy values",()=>{
    expect(normalizeSheetSortDirection("asc")).toBe("asc");
    expect(normalizeSheetSortDirection("desc")).toBe("desc");
    for(const value of [undefined,null,"",0,"ASC",true,"reverse",["asc"]])expect(normalizeSheetSortDirection(value)).toBeUndefined();
  });

  it("sorts German by the word after its article, in both directions, without mutating the input",()=>{
    const words=[word("z","das Zimmer","room"),word("a","der Apfel","apple"),word("b","die Banane","banana")];
    expect(sortSheetItems(words).map(item=>item.id)).toEqual(["a","b","z"]);
    expect(sortSheetItems(words,{sort:"german",direction:"desc"}).map(item=>item.id)).toEqual(["z","b","a"]);
    expect(words.map(item=>item.id)).toEqual(["z","a","b"]);
    const umlauts=[word("u","die Tür","door"),word("o","das Öl","oil"),word("a","der Apfel","apple")];
    expect(sortSheetItems(umlauts).map(item=>item.id)).toEqual(["a","o","u"]);
  });

  it("sorts English meanings and keeps tied groups in German alphabetical order",()=>{
    const words=[word("z","das Zimmer","apple"),word("a","der Apfel","zebra"),word("b","die Banane","apple")];
    expect(sortSheetItems(words,{sort:"meaning"}).map(item=>item.id)).toEqual(["b","z","a"]);
    expect(sortSheetItems(words,{sort:"meaning",direction:"desc"}).map(item=>item.id)).toEqual(["a","b","z"]);
  });

  it("sorts lessons numerically with unassigned vocabulary last in either direction",()=>{
    const words=[word("none","das Auto","car"),word("12","der Zug","train",[12]),word("2","das Buch","book",[2]),word("2a","der Apfel","apple",[2])];
    expect(sortSheetItems(words,{sort:"lesson"}).map(item=>item.id)).toEqual(["2a","2","12","none"]);
    expect(sortSheetItems(words,{sort:"lesson",direction:"desc"}).map(item=>item.id)).toEqual(["12","2a","2","none"]);
  });

  it("uses selected source-aware lessons consistently and ignores selection click order",()=>{
    const item={...word("merged","das Buch","book",[1,2,3,5]),studyTags:{...base.studyTags,lessons:[1,2,3,5],sourceLessons:{course:[1,2,3],"teacher-extra":[5]}}};
    expect(sheetItemLesson(item,{lessons:[5,1]})).toBe(1);
    expect(sheetItemLesson(item,{lessons:[1,5]})).toBe(1);
    expect(sheetItemLesson(item,{lessons:[4,5]})).toBe(5);
    expect(sheetItemLesson(item,{source:"course",lessons:[5,2]})).toBe(2);
    expect(sheetItemLesson(item,{source:"teacher-extra",lessons:[1,5]})).toBe(5);
    expect(sheetItemLesson(item,{source:"study-extra"})).toBe(1);
    expect(sheetItemLesson({...item,studyTags:{...item.studyTags,sourceLessons:{course:[]}}},{source:"course"})).toBeUndefined();
  });

  it("orders source categories and uses German order within each source",()=>{
    const words=[word("study","das Auto","car",[],"study-extra"),word("teacher","die Banane","banana",[],"teacher-extra"),word("course-z","das Zimmer","room"),word("course-a","der Apfel","apple")];
    expect(sortSheetItems(words,{sort:"source"}).map(item=>item.id)).toEqual(["course-a","course-z","teacher","study"]);
    expect(sortSheetItems(words,{sort:"source",direction:"desc"}).map(item=>item.id)).toEqual(["study","teacher","course-a","course-z"]);
    const merged={...words[1]!,studyTags:{...words[1]!.studyTags,sources:["course","teacher-extra"] as const}};
    const mergedWord:SubjectVocabularyItem={...merged,studyTags:{...merged.studyTags,sources:[...merged.studyTags.sources]}};
    expect(sortSheetItems([mergedWord,words[3]!],{sort:"source"}).map(item=>item.id)).toEqual(["course-a","teacher"]);
  });

  it("restores catalogue order after grouping has changed the incoming order",()=>{
    const catalogue=[word("z","das Zimmer","room"),word("a","der Apfel","apple"),word("b","die Banane","banana")];
    expect(sortSheetItems([catalogue[2]!,catalogue[0]!],{sort:"original"},{catalogue}).map(item=>item.id)).toEqual(["z","b"]);
    expect(sortSheetItems([catalogue[2]!,catalogue[0]!],{sort:"original",direction:"desc"},{catalogue}).map(item=>item.id)).toEqual(["b","z"]);
    const unknown=word("unknown","das Auto","car");
    expect(sortSheetItems([unknown,catalogue[0]!],{sort:"original"},{catalogue}).map(item=>item.id)).toEqual(["z","unknown"]);
    expect(sortSheetItems(catalogue,{sort:"original"}).map(item=>item.id)).toEqual(["z","a","b"]);
  });

  it("uses the incoming order as the final stable tie breaker",()=>{
    const words=[word("second","das Buch","book",[2]),word("first","das Buch","book",[2])];
    for(const sort of ["german","meaning","lesson","source","original"] satisfies SheetSort[])for(const direction of ["asc","desc"] as const){
      const expected=sort==="original"&&direction==="desc"?["first","second"]:["second","first"];
      expect(sortSheetItems(words,{sort,direction}).map(item=>item.id)).toEqual(expected);
    }
  });
});
