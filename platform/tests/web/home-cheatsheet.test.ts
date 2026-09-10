import {describe,it,expect} from "vitest";
import {readFileSync,statSync} from "node:fs";
import {resolve} from "node:path";
import {createHash} from "node:crypto";
import {homeWords,homeSpeechTexts,homePronounExample,homeExample} from "../../apps/web/lib/study/home";
import {lessonFourWords} from "../../apps/web/lib/study/lesson-four";
import {loadDictionary} from "../../apps/web/lib/study/catalog";
import {lookupEntries} from "../../apps/web/lib/study/lookup";
const word=(id:string)=>homeWords.find(w=>w.id===id)!;
describe("home and furniture cheat sheet",()=>{
  it("covers the complete reference image and the Lesson 4 furniture family",()=>{
    expect(homeWords).toHaveLength(30);expect(new Set(homeWords.map(w=>w.id)).size).toBe(30);
    expect(homeWords.filter(w=>w.image)).toHaveLength(21);
    for(const id of ["haus","zimmer","tisch","stuhl","bett","schrank","lampe","sofa","teppich","fernseher","fenster","tuer","spiegel","kissen","decke","uhr","computer","regal","pflanze","radio","zuhause"])expect(word(id).image).toBe(true);
    for(const item of lessonFourWords.filter(w=>w.category==="Furniture"))expect(homeWords.some(w=>w.de===item.de),item.de).toBe(true);
  });
  it("keeps source additions distinct from image-only extensions",()=>{
    for(const id of ["sessel","bild","moebel","geschaeft","moebelgeschaeft","hotel","hotelzimmer","wohnort","buch"]){expect(word(id).image).toBe(false);expect(word(id).book.length).toBeGreaterThan(0);}
    for(const id of ["radio","computer","fenster"])expect(word(id).book).toEqual([]);
  });
  it("handles unchanged, umlaut and plural-only forms",()=>{
    expect(word("stuhl").plural).toBe("die Stühle");expect(word("schrank").plural).toBe("die Schränke");expect(word("buch").plural).toBe("die Bücher");expect(word("zimmer").plural).toBe("die Zimmer");expect(word("moebel").plural).toBeNull();expect(word("moebel").tone).toBe("plural");
  });
  it("uses grammatical gender for pronouns and plural verb agreement",()=>{
    expect(homePronounExample(word("stuhl"))).toBe("Er ist schön.");expect(homePronounExample(word("lampe"))).toBe("Sie ist schön.");expect(homePronounExample(word("bett"))).toBe("Es ist schön.");expect(homePronounExample(word("moebel"))).toBe("Sie sind schön.");expect(homeExample(word("moebel"))).toBe("Die Möbel sind schön.");
  });
  it("makes new nouns and plurals available in the in-app dictionary",()=>{
    const dictionary=loadDictionary();for(const w of homeWords){expect(lookupEntries(dictionary,w.de).exact,w.de).toBe(true);if(w.plural)expect(lookupEntries(dictionary,w.plural).exact,w.plural).toBe(true);}
    const entry=lookupEntries(dictionary,"Kissen").entries.find(e=>e.de==="das Kissen")!;expect(entry.displayForms?.[0]?.tone).toBe("neuter");
  });
  it("ships exact audio for every displayed vocabulary form and example",()=>{
    const mapping=JSON.parse(readFileSync(resolve("apps/web/generated/home-speech.json"),"utf8")) as Record<string,string>;
    for(const text of homeSpeechTexts){expect(mapping[text],text).toBeTruthy();expect(statSync(resolve("apps/web/public",mapping[text]!.slice(1))).size).toBeGreaterThan(1000);}
    const manifest=JSON.parse(readFileSync(resolve("../media/manifests/home-sheet-public-audio-v1.json"),"utf8")) as {assets:{publicRelativePath:string;sha256:string;exactText:string}[]};
    for(const asset of manifest.assets){expect(asset.publicRelativePath).toMatch(/^audio\/home-sheet\/[a-f0-9]{20}\.mp3$/);expect(createHash("sha256").update(readFileSync(resolve("apps/web/public",asset.publicRelativePath))).digest("hex")).toBe(asset.sha256);expect(mapping[asset.exactText]).toBe(`/${asset.publicRelativePath}`);}
  });
});
