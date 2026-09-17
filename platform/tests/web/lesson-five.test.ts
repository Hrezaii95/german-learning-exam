import {describe,it,expect} from "vitest";
import {studyUnits} from "../../apps/web/lib/study/course-lessons";
import {loadWordCards,wordCardForPath} from "../../apps/web/lib/content/word-cards";
import {loadBook,loadBookAnswers,loadDictionary} from "../../apps/web/lib/study/catalog";
import {bookTranscript} from "../../apps/web/lib/audio/listening-transcripts";
import {lookupEntries} from "../../apps/web/lib/study/lookup";
import {objectSentences,objectModels} from "../../apps/web/lib/study/object-sheet";
import {buildHubNavigationContext,resolveBackHref} from "../../apps/web/lib/content/navigation-context";
describe("Lesson 5 source integration",()=>{
  const unit=studyUnits.find(u=>u.number===5)!;
  it("publishes all 98 audited glossary and grammar entries without replacing earlier cards",()=>{
    expect(unit.words).toHaveLength(98);
    for(const word of unit.words!){const card=wordCardForPath(`/vocabulary/${word.id}`);expect(card,word.de).toBeDefined();expect(card?.studyTags?.lessons).toContain(5);expect(card?.rows.some(r=>r.singular.text===word.de),word.de).toBe(true);}
    expect(wordCardForPath("/vocabulary/l5-handy")?.id).toBe("W338");
    expect(wordCardForPath("/vocabulary/l5-buch")?.id).toBe("W466");
    const cards=loadWordCards().cards;expect(new Set(cards.map(c=>c.id)).size).toBe(cards.length);
  });
  it("keeps articles, plurals and mass-noun readings source aligned",()=>{
    expect(wordCardForPath("/vocabulary/l5-flasche")?.rows[0]?.singular.tone).toBe("female");
    expect(wordCardForPath("/vocabulary/l5-buch")?.rows[0]?.plurals[0]?.text).toBe("die Bücher");
    for(const de of ["das Holz","das Papier","das Metall","das Plastik","das Glas","der Kunststoff"])expect(unit.words?.find(w=>w.de===de)?.plural).toBe("");
    expect(unit.verbs.find(v=>v.verb==="sehen")?.forms).toEqual(["sehe","siehst","sieht","sehen","seht","sehen"]);
  });
  it("binds ten recordings and the cross-page pronunciation exercise correctly",()=>{
    const tracks=loadBook().audio.filter(a=>a.lesson===5);expect(tracks).toHaveLength(10);
    const bc=tracks.find(t=>t.kind==="workbook"&&t.label.includes("b c"))!;
    expect(bc.pageId).toBe("workbook-33");expect(bookTranscript(bc.id)?.sourceTrack).toBe("1_43");
    const order=tracks.find(t=>t.kind==="workbook"&&t.exercise===16)!;
    expect(bookTranscript(order.id)?.lines.map(l=>l.text).join(" ")).toContain("30 Euro");
    const intro=tracks.find(t=>t.kind==="coursebook"&&t.exercise===1)!;
    expect(bookTranscript(intro.id)?.sourcePages).toEqual([5,6]);
  });
  it("has official keys, separate study quizzes and dictionary support",()=>{
    expect(loadBookAnswers().filter(a=>[33,34,35,36].some(p=>a.pageId===`coursebook-${p}`))).toHaveLength(11);
    expect(unit.quiz).toHaveLength(8);for(const q of unit.quiz)expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);
    const dictionary=loadDictionary();for(const text of ["siehst","Wie schreibt man das?","die Flasche"])expect(lookupEntries(dictionary,text).entries.length,text).toBeGreaterThan(0);
    expect(resolveBackHref(buildHubNavigationContext({hubId:"vocabulary",lesson:"05"}))).toContain("lesson=05");
  });
  it("builds correct gender trails without confusing noun gender and colour",()=>{
    expect(objectSentences(0)[0]).toBe("Das ist ein Tisch.");expect(objectSentences(0)[1]).toBe("Das ist kein Tisch.");
    expect(objectSentences(2)[1]).toBe("Das ist keine Uhr.");expect(objectSentences(1)[3]).toBe("Es ist blau.");
    expect(objectModels[2].pronoun).toBe("sie");
  });
});
