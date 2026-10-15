import {describe,it,expect} from "vitest";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {objectVocabulary} from "../../apps/web/lib/study/object-vocabulary";

const cards=loadWordCards().cards.filter(card=>card.studyTags?.lessons.includes(5));
describe("everyday objects infographic vocabulary",()=>{
  it("includes the complete Lesson 5 object collection, retaining merged word-card identities",()=>{
    const words=objectVocabulary(cards);
    expect(words).toHaveLength(28);
    expect(new Set(words.map(word=>word.de)).size).toBe(28);
    expect(words.filter(word=>word.tone==="male")).toHaveLength(7);
    expect(words.filter(word=>word.tone==="female")).toHaveLength(11);
    expect(words.filter(word=>word.tone==="neuter")).toHaveLength(10);
    for(const word of words){expect(cards).toContain(word.card);expect(word.card.rows).toContain(word.row);expect(word.card.path).toMatch(/^\/vocabulary\//);}
  });
  it("preserves unchanged and umlaut plurals without making plural English glosses plural-only",()=>{
    const words=objectVocabulary(cards),find=(de:string)=>words.find(word=>word.de===de)!;
    expect(find("das Buch").plural).toBe("die Bücher");
    expect(find("das Taschentuch").plural).toBe("die Taschentücher");
    expect(find("das Streichholz").plural).toBe("die Streichhölzer");
    expect(find("der Schlüssel").plural).toBe("die Schlüssel");
    expect(find("der Kugelschreiber").plural).toBe("die Kugelschreiber");
    expect(find("die Brille").tone).toBe("female");
    expect(find("die Sonnenbrille").tone).toBe("female");
    expect(find("der Regen").plural).toBeNull();
    expect(find("die Sonne").plural).toBeNull();
  });
  it("uses only cards actually supplied and excludes materials, colours and grammar entries",()=>{
    expect(objectVocabulary([])).toEqual([]);
    const words=objectVocabulary(cards);
    for(const de of ["das Holz","das Papier","die Farbe","ein / eine"])expect(words.some(word=>word.de===de)).toBe(false);
    const onlyBook=cards.filter(card=>card.rows.some(row=>row.singular.text==="das Buch"));
    expect(objectVocabulary(onlyBook).map(word=>word.de)).toEqual(["das Buch"]);
  });
});
