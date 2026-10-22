import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";
import {loadWordCards} from "../../apps/web/lib/content/word-cards";
import type {WordCardCatalog} from "../../apps/web/lib/content/word-card-types";
import {
  BOOK_REF_DRAFT_PATH,BOOK_REF_SOURCE_PATHS,generateVocabularyBookRefDraft,
  glossaryHeadwordMatches,glossarySourceLines,hasLiteralHeadword,projectVocabularyBookRefs,vocabularyBookSourceRows,
  type BookRefManifest,type VocabularyBookRefDraft,type VocabularyBookSourceRow,
} from "../../apps/web/lib/content/vocabulary-book-refs.server";

const original=JSON.parse(readFileSync(resolve("apps/web/generated/word-cards.json"),"utf8")) as WordCardCatalog;
const draft=JSON.parse(readFileSync(resolve("..",BOOK_REF_DRAFT_PATH),"utf8")) as VocabularyBookRefDraft;
const glossaryText=readFileSync(resolve("..",BOOK_REF_SOURCE_PATHS.glossary),"utf8");

describe("draft source-backed vocabulary book references",()=>{
  it("covers every stable source row without changing source text, IDs, order or publication",()=>{
    const before=JSON.stringify(original);
    const sourceRows=vocabularyBookSourceRows(original);
    expect(sourceRows).toHaveLength(1046);
    expect(new Set(sourceRows.map(row=>row.key)).size).toBe(sourceRows.length);
    expect(draft.rows.map(({bookRef:_,unresolvedReason:__,...row})=>row)).toEqual(sourceRows);
    expect(draft.counts.map(count=>[count.lesson,count.rows])).toEqual([[3,289],[4,45],[5,98],[6,74],[7,94],[8,74],[9,101],[10,87],[11,82],[12,102]]);
    expect(JSON.stringify(original)).toBe(before);
    expect(draft.reviewState).toBe("draft-owner-review-required");
    expect(loadWordCards().cards.flatMap(card=>card.rows).every(row=>row.bookRef===undefined)).toBe(true);
  });

  it("keeps per-lesson source identities even when repeated words become one canonical family",()=>{
    const picture=draft.rows.filter(row=>row.de==="das Bild");
    expect(picture.map(row=>[row.lesson,row.sourceId])).toContainEqual([3,"W464"]);
    expect(picture.map(row=>[row.lesson,row.sourceId])).toContainEqual([4,"l4-bild"]);
    const variants=draft.rows.filter(row=>row.sourceId==="l9-ketchup");
    expect(variants.map(row=>[row.sourceRowIndex,row.de])).toEqual([[0,"der Ketchup"],[1,"das Ketchup"]]);
  });

  it("keeps broad source ranges distinct from exact lesson attribution",()=>{
    const broad=draft.rows.filter(row=>row.lessonAttribution==="broad-range-candidate");
    expect(broad.length).toBeGreaterThan(0);
    for(const row of broad){
      expect(row.sourceLessonLabels).not.toEqual(["3"]);
      expect(row.bookRef.note).toContain("definite Lesson 3 attribution is not established");
    }
    expect(draft.counts[0]!.exactLessonRows+draft.counts[0]!.broadRangeCandidates).toBe(289);
  });

  it("retains glossary exercise context across page headers, sub-exercises and magazines",()=>{
    const lines=glossarySourceLines(glossaryText);
    expect(lines.find(line=>line.text.trim()==="der Steckbrief, -e")).toMatchObject({lesson:3,page:5,exercise:"7"});
    expect(lines.find(line=>line.text.trim()==="der Schreibtisch, -e")).toMatchObject({lesson:6,exercise:"6b"});
    expect(lines.find(line=>line.text.trim()==="schnell (gehen)")).toMatchObject({lesson:null,module:2,section:"magazine",exercise:null});
    expect(draft.sources.find(source=>source.id==="glossary")!.description).toContain("Deutsch–Spanisch");
  });

  it("requires literal word boundaries and preserves formal pronoun case",()=>{
    expect(hasLiteralHeadword("Das Bild ist teuer.","das Bild")).toBe(true);
    expect(hasLiteralHeadword("im Möbelgeschäft","die Möbel")).toBe(false);
    expect(hasLiteralHeadword("Sie","sie")).toBe(false);
    expect(hasLiteralHeadword("sie","Sie")).toBe(false);
    expect(hasLiteralHeadword("Ihr","ihr")).toBe(false);
  });

  it("preserves case when an adjective differs from a capitalized language name",()=>{
    expect(hasLiteralHeadword("Türkisch","türkisch")).toBe(false);
    expect(glossaryHeadwordMatches("Türkisch","türkisch")).toBe(false);
    expect(draft.rows.find(row=>row.key==="3:W534:0")!.bookRef.page).toBeNull();
    expect(hasLiteralHeadword("Trinken:","trinken")).toBe(false);
    expect(draft.rows.find(row=>row.key==="9:l9-trinken:0")!.bookRef.page).toBeNull();
  });

  it("does not truncate phrases at commas as if they were noun plural suffixes",()=>{
    expect(glossaryHeadwordMatches("Ja, nein, doch?","Ja, habe ich.")).toBe(false);
    expect(glossaryHeadwordMatches("der Stuhl, ..e","der Stuhl")).toBe(true);
  });

  it("rejects an apparent standalone word continued from a hyphenated compound",()=>{
    expect(hasLiteralHeadword("getränk/Lieblingsessen?","getränk",true)).toBe(false);
    expect(draft.rows.find(row=>row.key==="9:l9-getraenk:0")!.bookRef.page).toBeNull();
  });

  it("leaves genuinely ambiguous pages null rather than taking the earliest match",()=>{
    const row:VocabularyBookSourceRow={key:"4:l4-bild:0",lesson:4,sourceId:"l4-bild",sourceRowIndex:0,sourcePath:"/vocabulary/l4-bild",sourceIds:[],sourceLessonLabels:["4"],lessonAttribution:"exact-lesson-label",de:"das Bild"};
    const manifest:BookRefManifest={pages:[29,30].map((page,index)=>({id:`coursebook-${page}`,kind:"coursebook",lesson:4,printedPage:page,pdfPage:page+2,section:"Lesson 4",lines:[{id:`line-${index}`,text:"Das Bild ist teuer.",box:[0,0,10,1.5]}]})),audio:[]};
    const input={rows:[row],manifest,manifestText:JSON.stringify(manifest),coursebookText:"--- PAGE 31 ---\nDas Bild ist teuer.\n--- PAGE 32 ---\nDas Bild ist teuer.",glossaryText:""};
    const before=JSON.stringify(input);
    const result=projectVocabularyBookRefs(input).rows[0]!;
    expect(result.bookRef.page).toBeNull();
    expect(result.bookRef.candidatePages).toEqual([29,30]);
    expect(result.unresolvedReason).toBe("multiple-pages");
    expect(result.bookRef.note).toContain("no page was selected");
    expect(JSON.stringify(input)).toBe(before);
  });

  it("keeps a module-only occurrence unresolved for a broad Lesson 1–3 candidate",()=>{
    const row:VocabularyBookSourceRow={key:"3:W309:0",lesson:3,sourceId:"W309",sourceRowIndex:0,sourcePath:"/vocabulary/W309",sourceIds:[],sourceLessonLabels:["1–3"],lessonAttribution:"broad-range-candidate",de:"Australien"};
    const manifest:BookRefManifest={pages:[{id:"coursebook-23",kind:"coursebook",lesson:3,printedPage:23,pdfPage:25,section:"Module 1 · Magazine",lines:[{id:"module-line",text:"Australien",box:[0,0,10,1.5]}]}],audio:[]};
    const result=projectVocabularyBookRefs({rows:[row],manifest,manifestText:JSON.stringify(manifest),coursebookText:"--- PAGE 25 ---\nAustralien",glossaryText:""}).rows[0]!;
    expect(result.bookRef.page).toBeNull();
    expect(result.bookRef.candidatePages).toEqual([23]);
    expect(result.unresolvedReason).toBe("broad-module-context");
    expect(result.bookRef.note).toContain("does not locate this broad-range candidate in Lesson 3");
  });

  it("records inspectable page and exercise proof and a reason for every unresolved row",()=>{
    const evidence=new Map(draft.evidence.map(item=>[item.id,item]));
    for(const row of draft.rows){
      const ref=row.bookRef;
      const proof=ref.evidenceIds.map(id=>evidence.get(id));
      expect(proof.every(Boolean),row.key).toBe(true);
      if(ref.page!==null){
        expect(ref.candidatePages,row.key).toEqual([ref.page]);
        expect(proof.some(item=>item?.kind==="manifest-line"&&item.page===ref.page),row.key).toBe(true);
        expect(proof.some(item=>item?.kind==="raw-line"&&item.page===ref.page),row.key).toBe(true);
        if(ref.exercise!==null)expect(proof.some(item=>(item?.kind==="exercise-heading"||item?.kind==="audio-exercise")&&item.exercise===ref.exercise&&item.page===ref.page),row.key).toBe(true);
      }else{
        expect(row.unresolvedReason,row.key).not.toBeNull();
        expect(ref.note.length,row.key).toBeGreaterThan(20);
      }
      if(ref.exercise!==null)expect(proof.some(item=>item?.kind==="glossary-line"&&item.lesson===row.lesson&&item.exercise===ref.exercise),row.key).toBe(true);
    }
  });

  it("reproduces the committed draft from the exact local source bytes",()=>{
    expect(generateVocabularyBookRefDraft()).toEqual(draft);
  });
});
