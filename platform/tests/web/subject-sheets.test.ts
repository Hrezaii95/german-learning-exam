import {describe,expect,it} from "vitest";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {loadDictionary,loadHomeSpeech} from "../../apps/web/lib/study/catalog";
import {homeWords} from "../../apps/web/lib/study/home";
import {studyConcepts} from "../../apps/web/lib/study/scope";
import {subjectSheetHref,subjectSheets,subjectVocabularyGroups} from "../../apps/web/lib/study/subject-sheets";
import {buildSubjectSheets,loadSubjectSheets,loadSubjectVocabulary} from "../../apps/web/lib/study/subject-sheets.server";

const cards=loadWordCards().cards;
const card=(id:string)=>cards.find(candidate=>candidate.id===id)!;
const dictionary=loadDictionary();
const extras=dictionary.filter(entry=>entry.kind==="word"&&!cards.some(card=>card.id===entry.id));

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
        expect(cards.some(source=>source.id===item.cardId)||extras.some(source=>source.id===item.cardId),item.id).toBe(true);
        expect(item.examples.length,item.id).toBeLessThanOrEqual(2);
      }
    }
  });

  it("covers every canonical source row and authored dictionary word exactly once",()=>{
    const vocabulary=loadSubjectVocabulary();
    const canonicalIds=cards.flatMap(card=>card.rows.map((_,index)=>`${card.id}-${index}`));
    expect(canonicalIds).toHaveLength(1290);
    expect(extras).toHaveLength(48);
    expect(vocabulary).toHaveLength(canonicalIds.length+extras.length);
    expect(new Set(vocabulary.map(item=>item.id)).size).toBe(vocabulary.length);
    expect(vocabulary.filter(item=>cards.some(card=>card.id===item.cardId)).map(item=>item.id)).toEqual(canonicalIds);
    for(const entry of extras){
      const item=vocabulary.find(item=>item.cardId===entry.id)!;
      expect(item,entry.id).toBeDefined();
      expect(item).toMatchObject({de:entry.de,meaning:entry.en,href:entry.href,savedItem:{id:entry.saveId??entry.id,href:entry.href}});
      expect(item.id,entry.id).toMatch(/^[a-z][a-z0-9:_-]*$/iu);
      expect(item.studyTags.concepts.length,entry.id).toBeGreaterThan(0);
    }
    const sheetIds=new Set(loadSubjectSheets().flatMap(sheet=>sheet.items.map(item=>item.id)));
    expect(sheetIds).toEqual(new Set(vocabulary.map(item=>item.id)));
    expect(loadSubjectVocabulary()).toBe(vocabulary);
  });

  it("restores all thirty Home meanings with exact supplied forms, audio and source tags",()=>{
    const home=loadSubjectSheets().find(sheet=>sheet.id==="home")!.items;
    for(const word of homeWords)expect(home.some(item=>item.de===word.de),word.de).toBe(true);
    const window=home.find(item=>item.cardId==="home-fenster")!;
    expect(window).toMatchObject({de:"das Fenster",tone:"neuter",plurals:[{text:"die Fenster",tone:"plural",audio:loadHomeSpeech()["die Fenster"]}],studyTags:{lessons:[4],concepts:["home"],source:"study-extra"},savedItem:{id:"home-fenster"}});
    expect(home.find(item=>item.cardId==="home-zuhause")!.plurals).toEqual([]);
    expect(home.find(item=>item.cardId==="home-moebelgeschaeft")!.studyTags.source).toBe("course");
  });

  it("keeps authored article-free countries and languages plain and records no invented plural",()=>{
    const countries=loadSubjectSheets().find(sheet=>sheet.id==="countries")!.items;
    expect(countries.find(item=>item.cardId==="country-BR")).toMatchObject({de:"Brasilien",category:"Country",tone:"plain",plurals:[],studyTags:{concepts:["countries","grammar"],source:"study-extra"}});
    expect(countries.find(item=>item.cardId==="language-Persisch")).toMatchObject({de:"Persisch",category:"Language",tone:"plain",plurals:[],studyTags:{concepts:["countries"],source:"study-extra"}});
    expect(countries.find(item=>item.cardId==="country-MV")).toMatchObject({de:"die Malediven",tone:"plural",plurals:[]});
    expect(loadSubjectSheets().find(sheet=>sheet.id==="verbs")!.items.find(item=>item.cardId==="verb-model-vermuten")).toMatchObject({de:"vermuten",tone:"plain",category:"Verb",plurals:[]});
  });

  it("ignores sentence, phrase and repeated dictionary entries while preserving canonical save identities",()=>{
    const word=extras.find(entry=>entry.id==="home-fenster")!;
    const projected=buildSubjectSheets([card("W466")],[dictionary.find(entry=>entry.id==="W466")!,word,word,{...word,id:"not-a-word",kind:"sentence"},{...word,id:"not-a-phrase",kind:"phrase"}]);
    const unique=[...new Map(projected.flatMap(sheet=>sheet.items).map(item=>[item.id,item])).values()];
    expect(unique.map(item=>item.id).sort()).toEqual(["W466-0","home-fenster-0"]);
    expect(unique.find(item=>item.cardId==="W466")!.savedItem.id).toBe("card-W466");
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
