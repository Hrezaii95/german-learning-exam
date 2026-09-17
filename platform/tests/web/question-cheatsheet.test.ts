import {describe,it,expect} from "vitest";
import {readFileSync,statSync} from "node:fs";
import {resolve} from "node:path";
import {questionWords,questionBuilders,questionReplyCases,questionQuiz,questionSpeechTexts} from "../../apps/web/lib/study/questions";
import {loadDictionary} from "../../apps/web/lib/study/catalog";
import {lookupEntries} from "../../apps/web/lib/study/lookup";

describe("question patterns and learning support",()=>{
  it("separates released course patterns from the wider case and time family",()=>{
    expect(questionWords.filter(w=>w.lesson!==null).map(w=>w.id)).toEqual(["wer","was","wie","wo","woher","wie-alt","wie-viel","wie-viele","welche","wie-oft"]);
    for(const id of ["wohin","wann","wie-lange","warum","wen","wem","wessen"])expect(questionWords.find(w=>w.id===id)?.lesson).toBeNull();
    expect(new Set(questionWords.map(w=>w.id)).size).toBe(questionWords.length);
  });
  it("changes conjugation and verb position without changing the requested fact",()=>{
    const home=questionBuilders.find(b=>b.id==="home")!;
    expect(home.w.join(" ")).toBe("Wo wohnst du?");
    expect(home.formal.join(" ")).toBe("Wo wohnen Sie?");
    expect(home.yes.join(" ")).toBe("Wohnst du in Berlin?");
    expect(home.yesFormal.join(" ")).toBe("Wohnen Sie in Berlin?");
    const price=questionBuilders.find(b=>b.id==="price")!;
    expect(price.w[0]).toBe("Wie viel");expect(price.formal).toEqual(price.w);
  });
  it("uses doch to contradict the negative and nein to confirm it",()=>{
    expect(questionReplyCases[0]!.yes).toBe("Ja, ich komme aus dem Iran.");
    expect(questionReplyCases[1]!.yes).toBe("Doch, ich komme aus dem Iran.");
    expect(questionReplyCases[1]!.no).toBe("Nein, ich komme nicht aus dem Iran.");
  });
  it("provides one defensible target and feedback for each quiz prompt",()=>{
    expect(questionQuiz).toHaveLength(8);
    for(const q of questionQuiz){expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);expect(q.why.length).toBeGreaterThan(30);}
    expect(questionQuiz[3]!.q).toContain("verb-first");
  });
  it("makes the new whole-question and reply meanings available in the dictionary",()=>{
    const dictionary=loadDictionary();
    for(const text of ["Wessen Buch ist das?","Wem hilfst du?","Wie lange bleibst du?","Wohnen Sie in Berlin?","Doch, ich komme aus dem Iran."]){expect(lookupEntries(dictionary,text).entries.length,text).toBeGreaterThan(0);}
  });
  it("ships a real exact-text clip for every question and builder combination",()=>{
    const speech={...JSON.parse(readFileSync(resolve("apps/web/generated/study-speech.json"),"utf8")),...JSON.parse(readFileSync(resolve("apps/web/generated/collection-speech.json"),"utf8"))} as Record<string,string>;
    for(const text of questionSpeechTexts()){expect(speech[text],text).toBeTruthy();expect(statSync(resolve(`apps/web/public${speech[text]}`)).size).toBeGreaterThan(1000);}
  });
});
