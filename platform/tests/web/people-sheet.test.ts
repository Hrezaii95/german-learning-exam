import {describe,expect,it} from "vitest";
import {familyPeople,familyConnections,familyStatement,familyMeaning,familySpeechTexts} from "../../apps/web/lib/study/people-family";
import {peopleRecallQuestions} from "../../apps/web/lib/study/sheet-recall";
import {cardsForSheet} from "../../apps/web/lib/study/sheet-cards";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";

describe("family teaching and scoped recall",()=>{
  it("changes relationships with the speaker while preserving the family",()=>{
    const mia=familyPeople.find(person=>person.id==="mia")!;
    expect(familyStatement(mia,"anna")).toBe("Mia ist meine Tochter.");
    expect(familyStatement(mia,"martin")).toBe("Mia ist meine Enkelin.");
    expect(familyMeaning(mia,"martin")).toBe("Mia is my granddaughter.");
    expect(familyStatement(familyPeople.find(person=>person.id==="martin")!,"martin")).toBe("Ich bin Martin.");
    const ids=new Set(familyPeople.map(person=>person.id));
    expect(ids.size).toBe(10);
    for(const link of familyConnections)for(const id of [...link.parents,...link.children])expect(ids.has(id as typeof familyPeople[number]["id"])).toBe(true);
    expect(familyConnections.find(link=>link.parents.includes("anna"))?.children).toEqual(["mia","noah"]);
  });
  it("includes every speaker sentence and relationship form in the speech inventory",()=>{
    for(const person of familyPeople)for(const view of ["anna","martin"] as const){
      expect(familySpeechTexts).toContain(familyStatement(person,view));
      const relation=person.relations[view];
      if(relation){expect(familySpeechTexts).toContain(relation.de);expect(familySpeechTexts).toContain(relation.plural);}
    }
  });
  it("retains the eight pattern checks and offers recall only for matching cards",()=>{
    const cards=cardsForSheet(loadWordCards().cards,"people");
    expect(peopleRecallQuestions(cards)).toHaveLength(8);
    expect(peopleRecallQuestions([])).toEqual([]);
    const aunt=cards.find(card=>card.rows.some(row=>row.singular.text==="die Tante"))!;
    const questions=peopleRecallQuestions([aunt]);
    expect(questions).toHaveLength(1);
    expect(questions[0]?.answerText).toBe("die Tante");
    expect(questions[0]?.item.id).toBe(`card-${aunt.id}`);
    for(const card of cards)for(const question of peopleRecallQuestions([card])){
      expect(question.options).toEqual(expect.arrayContaining(question.answers));
      expect(question.item.studyTags).toBeTruthy();
    }
  });
});
