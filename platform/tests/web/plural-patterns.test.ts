import {describe,expect,it} from "vitest";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import type {WordForm} from "../../apps/web/lib/content/word-card-types";
import {buildPluralMatrix,classifyPluralPair,pluralDifference,pluralGenders,pluralPatterns} from "../../apps/web/lib/study/plural-patterns";
import {buildSubjectSheets,loadSubjectSheets} from "../../apps/web/lib/study/subject-sheets.server";

describe("observed German plural patterns",()=>{
  it.each([
    ["das Auto","die Autos","s"],
    ["das Handy","die Handys","s"],
    ["der Job","die Jobs","s"],
    ["die E-Mail","die E-Mails","s"],
    ["das Problem","die Probleme","e"],
    ["das Formular","die Formulare","e"],
    ["das Regal","die Regale","e"],
    ["der Preis","die Preise","e"],
    ["das Bett","die Betten","en-n"],
    ["die Tasche","die Taschen","en-n"],
    ["die Flasche","die Flaschen","en-n"],
    ["die Jacke","die Jacken","en-n"],
    ["der Spiegel","die Spiegel","unchanged"],
    ["der Sessel","die Sessel","unchanged"],
    ["das Zimmer","die Zimmer","unchanged"],
    ["der Schlüssel","die Schlüssel","unchanged"],
    ["das Bild","die Bilder","er"],
    ["das Kind","die Kinder","er"],
    ["das Mitglied","die Mitglieder","er"],
    ["das Haus","die Häuser","umlaut-er"],
    ["das Buch","die Bücher","umlaut-er"],
    ["der Apfel","die Äpfel","umlaut"],
    ["die Mutter","die Mütter","umlaut"],
    ["der Stuhl","die Stühle","umlaut-e"],
    ["das Gespräch","die Gespräche","e"],
    ["die Ärztin","die Ärztinnen","innen"],
    ["die Lehrerin","die Lehrerinnen","innen"],
    ["das E-Mail","die E-Mails","s"],
    ["der Computer-Kurs","die Computer-Kurse","e"],
  ])("classifies %s → %s from the actual source spellings",(singular,plural,pattern)=>{
    expect(classifyPluralPair(singular,plural)).toBe(pattern);
  });

  it.each([
    ["der Bus","die Busse"],
    ["das Material","die Materialien"],
    ["das Museum","die Museen"],
    ["das Praktikum","die Praktika"],
    ["das Bildlexikon","die Bildlexika"],
    ["die Firma","die Firmen"],
    ["die Praxis","die Praxen"],
    ["der Kaufmann","die Kaufleute"],
    ["die bekannte Persönlichkeit","die bekannten Persönlichkeiten"],
    ["der Gruß","die Grüsse"],
    ["das Auto","die Aütos"],
    ["das Buch",""],
  ])("preserves special changes without forcing %s → %s into an ending rule",(singular,plural)=>{
    expect(classifyPluralPair(singular,plural)).toBe("other");
    expect(pluralDifference(singular,plural)).toBeNull();
  });

  it("highlights only added endings and newly changed umlaut letters",()=>{
    expect(pluralDifference("das Buch","die Bücher")).toEqual({singular:"Buch",plural:"Bücher",stem:"Büch",ending:"er",umlautIndices:[1]});
    expect(pluralDifference("der Apfel","die Äpfel")).toEqual({singular:"Apfel",plural:"Äpfel",stem:"Äpfel",ending:"",umlautIndices:[0]});
    expect(pluralDifference("der Schlüssel","die Schlüssel")).toEqual({singular:"Schlüssel",plural:"Schlüssel",stem:"Schlüssel",ending:"",umlautIndices:[]});
    expect(pluralDifference("die Ärztin","die Ärztinnen")).toEqual({singular:"Ärztin",plural:"Ärztinnen",stem:"Ärztin",ending:"nen",umlautIndices:[]});
    expect(pluralDifference("das Gespräch","die Gespräche")).toEqual({singular:"Gespräch",plural:"Gespräche",stem:"Gespräch",ending:"e",umlautIndices:[]});
    expect(classifyPluralPair("das Cafe\u0301","die Cafe\u0301s")).toBe("s");
  });

  it("places each taught variant independently while preserving row, form and save references",()=>{
    const taxi=loadWordCards().cards.find(card=>card.rows.some(row=>row.singular.text==="das Taxi"))!;
    const items=buildSubjectSheets([taxi]).flatMap(sheet=>sheet.items);
    const matrix=buildPluralMatrix(items);
    const item=items[0]!;
    expect(matrix.nounCount).toBe(1);
    expect(matrix.pairCount).toBe(2);
    const entries=matrix.rows.flatMap(row=>Object.values(row.cells).flat());
    expect(entries).toHaveLength(2);
    expect(new Set(entries.map(entry=>entry.id)).size).toBe(2);
    expect(entries.every(entry=>entry.item===item)).toBe(true);
    expect(entries.every(entry=>item.plurals.includes(entry.plural as WordForm))).toBe(true);
    expect(entries.map(entry=>[entry.plural!.text,entry.pattern]).sort()).toEqual([["die Taxen","other"],["die Taxis","s"]]);
    expect(entries.every(entry=>entry.item.savedItem===item.savedItem)).toBe(true);
  });

  it("keeps missing source plurals and forms taught in plural distinct from gendered noun pairs",()=>{
    const items=[...new Map(loadSubjectSheets().flatMap(sheet=>sheet.items).map(item=>[item.id,item])).values()];
    const ketchup=items.filter(item=>item.cardId==="l9-ketchup");
    expect(ketchup.map(item=>item.tone).sort()).toEqual(["male","neuter"]);
    expect(ketchup.every(item=>item.plurals.length===0)).toBe(true);
    const parents=items.find(item=>item.de==="die Eltern")!;
    const verb=items.find(item=>item.tone==="plain"&&item.category==="Verb")!;
    const matrix=buildPluralMatrix([...ketchup,parents,verb,...ketchup]);
    const missing=matrix.rows.find(row=>row.id==="not-taught")!;
    expect(matrix.nounCount).toBe(2);
    expect(matrix.pairCount).toBe(0);
    expect(missing.cells.male[0]).toMatchObject({item:ketchup.find(item=>item.tone==="male"),plural:null,pattern:"not-taught"});
    expect(missing.cells.neuter[0]).toMatchObject({item:ketchup.find(item=>item.tone==="neuter"),plural:null,pattern:"not-taught"});
    expect(missing.cells.female).toEqual([]);
    expect(matrix.pluralFormItems).toEqual([parents]);
    expect(matrix.excludedCount).toBe(1);
  });

  it("accounts for every source noun row and plural form exactly once across all subjects",()=>{
    const items=[...new Map(loadSubjectSheets().flatMap(sheet=>sheet.items).map(item=>[item.id,item])).values()];
    const nouns=items.filter(item=>item.tone==="male"||item.tone==="female"||item.tone==="neuter");
    const matrix=buildPluralMatrix(loadSubjectSheets().flatMap(sheet=>sheet.items));
    const entries=matrix.rows.flatMap(row=>Object.values(row.cells).flat());
    expect(matrix.rows.map(row=>row.id)).toEqual(pluralPatterns.map(pattern=>pattern.id));
    expect(pluralGenders.map(gender=>gender.id)).toEqual(["male","female","neuter"]);
    expect(matrix.nounCount).toBe(nouns.length);
    expect(matrix.pairCount).toBe(nouns.reduce((sum,item)=>sum+item.plurals.length,0));
    expect(entries).toHaveLength(nouns.reduce((sum,item)=>sum+Math.max(1,item.plurals.length),0));
    expect(new Set(entries.map(entry=>entry.id)).size).toBe(entries.length);
    for(const item of nouns){
      const sourceEntries=entries.filter(entry=>entry.item===item);
      expect(sourceEntries,item.de).toHaveLength(Math.max(1,item.plurals.length));
      expect(sourceEntries.every(entry=>entry.gender===item.tone),item.de).toBe(true);
      if(item.plurals.length){
        for(const form of item.plurals)expect(sourceEntries.filter(entry=>entry.plural===form),form.text).toHaveLength(1);
      }else expect(sourceEntries.map(entry=>entry.plural)).toEqual([null]);
    }
  });
});
