import {describe,it,expect} from "vitest";
import {readFileSync,statSync} from "node:fs";
import {resolve} from "node:path";
import {createHash} from "node:crypto";
import {germanNumber,germanPrice,verbModels,verbPersons,sheetLinks,sheetQuizzes,conversationFrames} from "../../apps/web/lib/study/sheet-topics";
import {cardsForSheet} from "../../apps/web/lib/study/sheet-cards";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import {loadDictionary} from "../../apps/web/lib/study/catalog";
import {lookupEntries} from "../../apps/web/lib/study/lookup";
describe("four connected learning sheets",()=>{
  it("provides six unique navigable sheets",()=>{expect(sheetLinks).toHaveLength(6);expect(new Set(sheetLinks.map(s=>s.href)).size).toBe(6);});
  it("builds German numbers with the correct exceptions and place order",()=>{
    for(const [number,word] of [[0,"null"],[1,"eins"],[16,"sechzehn"],[17,"siebzehn"],[21,"einundzwanzig"],[30,"dreißig"],[60,"sechzig"],[70,"siebzig"],[101,"einhunderteins"],[452,"vierhundertzweiundfünfzig"],[1000,"eintausend"],[21000,"einundzwanzigtausend"],[1000000,"eine Million"]] as const)expect(germanNumber(number)).toBe(word);
    for(const number of [-1,1.5,1000001,NaN,Infinity])expect(()=>germanNumber(number)).toThrow(RangeError);
  });
  it("agrees with the canonical 0–100 vocabulary",()=>{for(const card of loadWordCards().cards.filter(c=>c.category==="Number")){const n=Number(card.id.slice(1));expect(card.rows[0]!.singular.text.split(" / ")).toContain(germanNumber(n));}});
  it("reads prices without losing cents or accepting invalid input",()=>{
    expect(germanPrice("1,00")).toBe("ein Euro");expect(germanPrice("0.01")).toBe("ein Cent");expect(germanPrice("24,50")).toBe("vierundzwanzig Euro fünfzig Cent");expect(germanPrice("1,5")).toBe("ein Euro fünfzig Cent");expect(germanPrice("0")).toBe("null Euro");
    for(const price of ["-1","1,001","10000","2e3","a","","1,2,3"])expect(germanPrice(price)).toBeNull();
  });
  it("has complete verb paradigms and correct irregular forms",()=>{expect(verbModels).toHaveLength(21);expect(verbPersons).toHaveLength(6);for(const v of verbModels)expect(v.forms).toHaveLength(6);expect(verbModels.find(v=>v.verb==="sein")?.forms).toEqual(["bin","bist","ist","sind","seid","sind"]);expect(verbModels.find(v=>v.verb==="sprechen")?.forms[1]).toBe("sprichst");expect(verbModels.find(v=>v.verb==="arbeiten")?.forms[1]).toBe("arbeitest");});
  it("covers all first-four-lesson family entries and preserves source card identities",()=>{const all=loadWordCards().cards,people=cardsForSheet(all,"people");expect(people.filter(c=>c.category==="Family")).toHaveLength(25);expect(people.filter(c=>c.category==="Profession").length).toBeGreaterThanOrEqual(19);for(const s of ["people","verbs","numbers","conversation"] as const){const cards=cardsForSheet(all,s);expect(cards.length).toBeGreaterThan(20);for(const c of cards)expect(all).toContain(c);}});
  it("matches formal wellbeing answers to Ihnen",()=>{const f=conversationFrames.find(f=>f.id==="wellbeing")!;expect(f.formal).toContain("Ihnen");expect(f.formalAnswer).toContain("Ihnen");expect(f.answer).toContain("dir");});
  it("keeps every quiz answer valid and unique",()=>{for(const quiz of Object.values(sheetQuizzes)){expect(quiz).toHaveLength(8);for(const q of quiz){expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);expect(q.why.length).toBeGreaterThan(10);}}});
  it("resolves new full sentences and inflected verbs in the dictionary",()=>{const d=loadDictionary();for(const text of ["Ich arbeite im Moment nicht.","Ich spreche Persisch und ein bisschen Deutsch.","sprichst","arbeitest"])expect(lookupEntries(d,text).entries.length,text).toBeGreaterThan(0);});
  it("ships exact audio with verified manifest hashes",()=>{const mapping=JSON.parse(readFileSync(resolve("apps/web/generated/collection-speech.json"),"utf8")) as Record<string,string>;const texts=JSON.parse(readFileSync(resolve("apps/web/generated/collection-speech-texts.json"),"utf8")) as string[];for(const t of texts){expect(mapping[t],t).toBeTruthy();expect(statSync(resolve("apps/web/public",mapping[t]!.slice(1))).size).toBeGreaterThan(1000);}const manifest=JSON.parse(readFileSync(resolve("../media/manifests/collection-sheet-public-audio-v1.json"),"utf8"));for(const a of manifest.assets){expect(createHash("sha256").update(readFileSync(resolve("apps/web/public",a.publicRelativePath))).digest("hex")).toBe(a.sha256);expect(mapping[a.exactText]).toBe(`/${a.publicRelativePath}`);}});
});
