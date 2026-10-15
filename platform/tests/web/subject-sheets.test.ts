import {describe,expect,it} from "vitest";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {studyConcepts} from "../../apps/web/lib/study/scope";
import {subjectSheetHref,subjectSheets,subjectVocabularyGroups} from "../../apps/web/lib/study/subject-sheets";
import {buildSubjectSheets,loadSubjectSheets} from "../../apps/web/lib/study/subject-sheets.server";

const cards=loadWordCards().cards;
const card=(id:string)=>cards.find(candidate=>candidate.id===id)!;

describe("canonical subject vocabulary sheets",()=>{
  it("provides a populated route for every canonical subject without adding unrelated cards",()=>{
    const sheets=loadSubjectSheets();
    expect(sheets.map(sheet=>sheet.id)).toEqual(studyConcepts.map(subject=>subject.id));
    expect(subjectSheets.map(sheet=>sheet.id)).toEqual(studyConcepts.map(subject=>subject.id));
    for(const sheet of sheets){
      expect(subjectSheetHref(sheet.id)).toBe(`/cheat-sheets/subjects/${sheet.id}`);
      expect(sheet.items.length,sheet.id).toBeGreaterThan(0);
      expect(new Set(sheet.items.map(item=>item.id)).size,sheet.id).toBe(sheet.items.length);
      for(const item of sheet.items){
        expect(item.studyTags.concepts,sheet.id).toContain(sheet.id);
        expect(cards.some(source=>source.id===item.cardId),item.id).toBe(true);
        expect(item.examples.length,item.id).toBeLessThanOrEqual(2);
      }
    }
  });

  it("resolves merged cards by canonical tags and keeps one row when the input repeats a card",()=>{
    const book={...card("W466"),studyTags:{lessons:[1],concepts:["verbs" as const],source:"course" as const}};
    const sheets=buildSubjectSheets([book,book]);
    const objects=sheets.find(sheet=>sheet.id==="objects")!.items;
    expect(objects).toHaveLength(1);
    expect(sheets.find(sheet=>sheet.id==="verbs")!.items).toEqual([]);
    expect(objects[0]).toMatchObject({
      id:"W466-0",cardId:"W466",de:"das Buch",meaning:"book",category:"Noun",tone:"neuter",href:"/vocabulary/w466",
      audio:"/audio/word-cards-v1/word-fa8e985dfea42293.mp3",
      plurals:[{text:"die Bücher",tone:"plural",audio:"/audio/word-cards-v1/word-d8c6c53fbde9ea79.mp3"}],
      savedItem:{id:"card-W466",title:"das Buch",href:"/vocabulary/w466"},
      examples:[{de:"Das Buch ist interessant.",en:"The book is interesting."},{de:"Das ist ein Buch.",en:"This is a book."}],
      patterns:["das Buch","die Bücher"],
    });
    expect(objects[0]!.studyTags.concepts).toContain("classroom");
    expect(objects[0]!.savedItem.studyTags?.concepts).toContain("objects");
    expect(objects[0]!.note).toContain("Buch → Bücher: notice ü and -er.");
  });

  it("places every real row in its own article lane while sharing the full family save identity",()=>{
    const people=buildSubjectSheets([card("W120")]).find(sheet=>sheet.id==="people")!.items;
    expect(people.map(item=>[item.id,item.de,item.tone,item.savedItem.id])).toEqual([
      ["W120-0","der Paketzusteller","male","card-W120"],
      ["W120-1","die Paketzustellerin","female","card-W120"],
    ]);
    expect(people.every(item=>item.savedItem.title==="der Paketzusteller / die Paketzustellerin")).toBe(true);
    const food=buildSubjectSheets([card("l9-ketchup")]).find(sheet=>sheet.id==="food")!.items;
    expect(subjectVocabularyGroups(food).map(group=>[group.id,group.items.map(item=>item.de)])).toEqual([
      ["male",["der Ketchup"]],["neuter",["das Ketchup"]],
    ]);
    expect(food[1]!.note).toContain("Both articles are accepted; learn both forms.");
    expect(food[1]!.note).toContain("examples and English explanations are study aids.");
    expect(food[1]!.plurals).toEqual([]);
  });

  it("keeps article-free names, numbers, letters and verbs out of article lanes",()=>{
    const sheets=buildSubjectSheets([card("W051"),card("W218"),card("A01"),card("N021"),card("l5-weiss"),card("W001"),cards.find(source=>source.category==="Verb")!,cards.find(source=>source.category==="Greeting")!]);
    const uniqueItems=[...new Map(sheets.flatMap(sheet=>sheet.items).map(item=>[item.id,item])).values()];
    const groups=subjectVocabularyGroups(uniqueItems);
    expect(groups.every(group=>group.tone==="plain")).toBe(true);
    expect(groups.find(group=>group.id==="names")!.items.map(item=>item.de)).toEqual(["Deutsch","Deutschland"]);
    expect(groups.find(group=>group.id==="numbers")!.items.map(item=>item.de)).toEqual(["einundzwanzig"]);
    expect(groups.find(group=>group.id==="letters")!.items.map(item=>item.de)).toEqual(["a"]);
    expect(groups.find(group=>group.id==="descriptions")!.items.map(item=>item.de)).toEqual(["weiß"]);
    expect(groups.find(group=>group.id==="sentence-words")!.items.map(item=>item.de)).toEqual(["wie"]);
    expect(groups.find(group=>group.id==="verbs")!.items).toHaveLength(1);
    expect(groups.find(group=>group.id==="expressions")!.items).toHaveLength(1);
    expect(subjectVocabularyGroups([])).toEqual([]);
  });

  it("keeps plural-taught nouns distinct from feminine nouns and does not invent missing plurals",()=>{
    const sheets=buildSubjectSheets([card("W186"),card("l5-brille"),card("l5-regen")]);
    const people=sheets.find(sheet=>sheet.id==="people")!.items;
    expect(subjectVocabularyGroups(people)).toMatchObject([{id:"plural",tone:"plural",items:[{de:"die Eltern"}]}]);
    const objects=sheets.find(sheet=>sheet.id==="objects")!.items;
    expect(objects.find(item=>item.de==="die Brille")!.tone).toBe("female");
    expect(objects.find(item=>item.de==="der Regen")!.plurals).toEqual([]);
  });
});
