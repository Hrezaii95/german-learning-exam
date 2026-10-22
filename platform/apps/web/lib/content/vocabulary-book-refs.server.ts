import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import type {VocabularyBookRef,WordCard,WordCardCatalog} from "./word-card-types";
import {lessonFourCards,studyWordCards} from "../study/word-cards";
import {studyUnits} from "../study/course-lessons";
import {numericLessons} from "../study/scope";

export const BOOK_REF_SOURCE_PATHS={
  manifest:"platform/apps/web/generated/interactive-book.json",
  coursebook:"archive/cursor-demo-2026-07-30/content/extracted/_pdf_raw/kursbuch_full.txt",
  glossary:"archive/cursor-demo-2026-07-30/content/extracted/_pdf_raw/glossary_full.txt",
} as const;
export const BOOK_REF_DRAFT_PATH="platform/content/study-cards/book-refs.draft.json";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../../../../..");
const hash=(text:string)=>createHash("sha256").update(text).digest("hex");

type BookLine={id:string;text:string;box:number[]};
type BookPage={id:string;kind:string;lesson:number;printedPage:number;pdfPage:number;section:string;lines:BookLine[]};
type BookAudio={id:string;kind:string;lesson:number;exercise:number|string;pageId:string};
export type BookRefManifest={pages:BookPage[];audio:BookAudio[]};
type RawLine={page:number;line:number;text:string};
export type GlossaryLine=RawLine&{lesson:number|null;module:number|null;section:"lesson"|"magazine";exercise:string|null};
export type VocabularyBookSourceRow={
  key:string;
  lesson:number;
  sourceId:string;
  sourceRowIndex:number;
  sourcePath:string;
  sourceIds:string[];
  sourceLessonLabels:string[];
  lessonAttribution:"exact-lesson-label"|"broad-range-candidate";
  de:string;
};
type Evidence={
  id:string;
  source:keyof typeof BOOK_REF_SOURCE_PATHS;
  kind:"manifest-line"|"raw-line"|"glossary-line"|"audio-exercise"|"exercise-heading";
  text?:string;
  line?:number;
  lineId?:string;
  pdfPage?:number;
  page?:number;
  pageId?:string;
  section?:string;
  lesson?:number|null;
  module?:number|null;
  exercise?:string|null;
  audioId?:string;
};
export type DraftVocabularyBookRow=VocabularyBookSourceRow&{bookRef:VocabularyBookRef;unresolvedReason:null|"multiple-pages"|"no-literal-page"|"extraction-misalignment"|"broad-module-context"};
export type VocabularyBookRefDraft={
  version:1;
  reviewState:"draft-owner-review-required";
  semantics:string;
  matchingPolicy:string[];
  sources:{id:keyof typeof BOOK_REF_SOURCE_PATHS;path:string;sha256:string;description:string}[];
  sourceRowsSha256:string;
  rows:DraftVocabularyBookRow[];
  evidence:Evidence[];
  counts:{lesson:number;rows:number;exactLessonRows:number;broadRangeCandidates:number;located:number;unresolved:number;knownExercise:number}[];
};

/** Source identities precede family aggregation, so later l4-* merges cannot erase refs. */
export function vocabularyBookSourceRows(original:WordCardCatalog):VocabularyBookSourceRow[]{
  const rows:VocabularyBookSourceRow[]=[];
  const append=(card:WordCard,lesson:number)=>card.rows.forEach((row,index)=>rows.push({
    key:`${lesson}:${card.id}:${index}`,lesson,sourceId:card.id,sourceRowIndex:index,
    sourcePath:card.path,sourceIds:[...card.sourceIds],sourceLessonLabels:[...card.lessons],
    lessonAttribution:card.lessons.every(label=>label===String(lesson))?"exact-lesson-label":"broad-range-candidate",
    de:row.singular.text,
  }));
  for(const card of original.cards)if(numericLessons(card.lessons).includes(3))append(card,3);
  for(const card of lessonFourCards())append(card,4);
  for(const unit of studyUnits){
    if(unit.number<5||unit.number>12||!unit.words)continue;
    for(const card of studyWordCards(unit.words,unit.number,`Lesson ${unit.number} source inventory`))append(card,unit.number);
  }
  return rows;
}

export function rawSourceLines(text:string):RawLine[]{
  let page=0;
  return text.split(/\r?\n/u).flatMap((text,index)=>{
    const marker=text.match(/^--- PAGE (\d+) ---\s*$/u);
    if(marker){page=Number(marker[1]);return [];}
    return page&&text.trim()?[{page,line:index+1,text}]:[];
  });
}

/** Page-header numbers must not reset exercises continued from the preceding page. */
export function glossarySourceLines(text:string):GlossaryLine[]{
  let lesson:number|null=null,module:number|null=null,exercise:string|null=null;
  let section:"lesson"|"magazine"="lesson",skipPrintedPage=false;
  const entries:GlossaryLine[]=[];
  for(const line of rawSourceLines(text)){
    const value=line.text.trim();
    if(value.startsWith("Übersetzung:")){skipPrintedPage=true;continue;}
    if(skipPrintedPage&&value===String(line.page)){skipPrintedPage=false;continue;}
    if(/^(?:Kursbuch|Momente A1\.1|Glosario Alemán - Español)$/u.test(value)||value.startsWith("Momente A1.1 – Glossar"))continue;
    const chapter=value.match(/^Lektion (\d{2})\s*$/u);
    if(chapter){lesson=Number(chapter[1]);module=null;exercise=null;section="lesson";continue;}
    const magazine=value.match(/^Magazin (\d{2})\s*$/u);
    if(magazine){module=Number(magazine[1]);lesson=null;exercise=null;section="magazine";continue;}
    if(!lesson&&!module)continue;
    if(/^\d{1,2}[a-z]?$/u.test(value)){exercise=value;continue;}
    entries.push({...line,lesson,module,exercise,section});
  }
  return entries;
}

function literal(text:string):string{
  return text.normalize("NFKC").replace(/[|\u00ad]/gu,"").replace(/[’‘]/gu,"'").replace(/…/gu,"...").replace(/\s+/gu," ").trim();
}
function headword(text:string):string{
  return text.replace(/^(?:der|die|das)\s+/u,"").trim().replace(/[.!?]+$/u,"");
}
function continuesWord(previous:string|undefined,text:string):boolean{
  return Boolean(previous&&/\p{L}[-‐‑]\s*$/u.test(previous)&&/^\p{L}/u.test(text));
}
export function hasLiteralHeadword(text:string,de:string,continuesPreviousWord=false):boolean{
  const needle=headword(de);
  if(!needle)return false;
  const value=literal(text),key=literal(needle);
  for(let index=value.indexOf(key);index>=0;index=value.indexOf(key,index+1)){
    if(index===0&&continuesPreviousWord)continue;
    const before=index?value[index-1]??"":"",after=value[index+key.length]??"";
    if(!/[\p{L}\p{N}]/u.test(before)&&!/[\p{L}\p{N}]/u.test(after))return true;
  }
  return false;
}
export function glossaryHeadwordMatches(text:string,de:string):boolean{
  const noun=/^(?:der|die|das)\s/u.test(de);
  const clean=(value:string)=>headword((noun?value.split(",")[0]!:value).replace(/\([^)]*\)/gu,"").trim());
  const needle=clean(de);
  const key=(value:string)=>literal(clean(value));
  if(!needle)return false;
  if(key(text)===key(de))return true;
  const alternatives=text.split(/\s*\/\s*/u).map(key);
  return de.split(/\s*\/\s*/u).every(form=>alternatives.includes(key(form)));
}
function pageContext(page:BookPage,lesson:number):"lesson"|"partner"|"module"|null{
  if(page.kind!=="coursebook")return null;
  if(page.section===`Lesson ${lesson}`)return "lesson";
  const partners=page.section.match(/^Partner activities · Lesson ([\d /]+)$/u);
  if(partners&&partners[1]!.split(/\s*\/\s*/u).map(Number).includes(lesson))return "partner";
  const module=page.section.match(/^Module (\d+) · /u);
  return module&&Number(module[1])===Math.ceil(lesson/3)?"module":null;
}

/** Pure draft projection. Nothing here annotates the live catalogue or publishes content. */
export function projectVocabularyBookRefs(input:{rows:VocabularyBookSourceRow[];manifest:BookRefManifest;manifestText:string;coursebookText:string;glossaryText:string}):VocabularyBookRefDraft{
  const raw=rawSourceLines(input.coursebookText),glossary=glossarySourceLines(input.glossaryText);
  const evidence=new Map<string,Evidence>();
  const add=(value:Evidence)=>{evidence.set(value.id,value);return value.id;};
  const rows=input.rows.map((row):DraftVocabularyBookRow=>{
    const evidenceIds:string[]=[];
    const glossaryHits=glossary.filter(line=>
      ((line.section==="lesson"&&line.lesson===row.lesson)||(line.section==="magazine"&&line.module===Math.ceil(row.lesson/3)&&(row.lessonAttribution==="broad-range-candidate"||row.lesson%3===0)))&&glossaryHeadwordMatches(line.text,row.de),
    );
    for(const line of glossaryHits)evidenceIds.push(add({id:`g:${line.line}`,source:"glossary",kind:"glossary-line",text:line.text,line:line.line,pdfPage:line.page,section:line.section,lesson:line.lesson,module:line.module,exercise:line.exercise}));
    const allowModule=row.lessonAttribution==="broad-range-candidate"||glossaryHits.some(line=>line.section==="magazine");
    const contexts=input.manifest.pages.filter(page=>{
      const context=pageContext(page,row.lesson);
      return context!==null&&(context!=="module"||allowModule);
    });
    const manifestHits=contexts.map(page=>({page,line:page.lines.find((line,index)=>hasLiteralHeadword(line.text,row.de,continuesWord(page.lines[index-1]?.text,line.text)))})).filter((hit):hit is {page:BookPage;line:BookLine}=>Boolean(hit.line));
    const verified=manifestHits.flatMap(hit=>{
      evidenceIds.push(add({id:`m:${hit.line.id}`,source:"manifest",kind:"manifest-line",lineId:hit.line.id,text:hit.line.text,page:hit.page.printedPage,pdfPage:hit.page.pdfPage,pageId:hit.page.id,section:hit.page.section,lesson:hit.page.lesson}));
      const alignment=raw.find((line,index)=>line.page===hit.page.pdfPage&&hasLiteralHeadword(line.text,row.de,continuesWord(raw[index-1]?.page===line.page?raw[index-1]?.text:undefined,line.text)));
      if(!alignment)return [];
      evidenceIds.push(add({id:`r:${alignment.line}`,source:"coursebook",kind:"raw-line",text:alignment.text,line:alignment.line,pdfPage:alignment.page,page:hit.page.printedPage,pageId:hit.page.id,section:hit.page.section}));
      return [hit.page];
    });
    const candidatePages=[...new Set(verified.map(page=>page.printedPage))].sort((a,b)=>a-b);
    const unique=candidatePages.length===1?verified.find(page=>page.printedPage===candidatePages[0]):undefined;
    const broadModuleOnly=unique&&row.lessonAttribution==="broad-range-candidate"&&pageContext(unique,row.lesson)==="module";
    const selected=broadModuleOnly?undefined:unique;
    const glossaryExercises=[...new Set(glossaryHits.filter(line=>line.section==="lesson").map(line=>line.exercise).filter((exercise):exercise is string=>exercise!==null))];
    let exercise:string|null=null;
    if(glossaryExercises.length===1){
      const known=glossaryExercises[0]!;
      if(!selected)exercise=known;
      else if(selected.section===`Lesson ${row.lesson}`){
        const number=Number(known.match(/^\d+/u)?.[0]);
        // This edition's main numbered headings use 1.935%-high lines.
        // Summary checks and numbered answers have other heights and are excluded.
        const heading=selected.lines.find(line=>Math.abs((line.box[3]??0)-1.935)<0.001&&new RegExp(`^${number} `,"u").test(line.text));
        const audio=input.manifest.audio.find(audio=>audio.kind==="coursebook"&&audio.lesson===row.lesson&&audio.pageId===selected.id&&String(audio.exercise)===String(number));
        if(heading){exercise=known;evidenceIds.push(add({id:`h:${heading.id}`,source:"manifest",kind:"exercise-heading",lineId:heading.id,text:heading.text,page:selected.printedPage,pdfPage:selected.pdfPage,pageId:selected.id,section:selected.section,exercise:known}));}
        else if(audio){exercise=known;evidenceIds.push(add({id:`a:${audio.id}`,source:"manifest",kind:"audio-exercise",audioId:audio.id,page:selected.printedPage,pageId:selected.id,section:selected.section,exercise:known}));}
      }
    }
    const unresolvedReason=selected?null:broadModuleOnly?"broad-module-context":candidatePages.length>1?"multiple-pages":manifestHits.length?"extraction-misalignment":"no-literal-page";
    const notes=[selected?"Unique literal coursebook occurrence in the selected source context; first introduction is not established.":unresolvedReason==="broad-module-context"?`The module occurrence does not locate this broad-range candidate in Lesson ${row.lesson}; its page remains a candidate only.`:unresolvedReason==="multiple-pages"?"Several coursebook pages contain this form; no page was selected.":unresolvedReason==="extraction-misalignment"?"Manifest matches were not corroborated at the same raw PDF page; no page was selected.":"No exact single-line occurrence was located in the applicable coursebook source pages."];
    if(row.lessonAttribution==="broad-range-candidate")notes.push(`Original labels (${row.sourceLessonLabels.join(", ")}) span a range; definite Lesson ${row.lesson} attribution is not established.`);
    if(selected&&pageContext(selected,row.lesson)!=="lesson")notes.push(`Occurrence belongs to ${selected.section}; it is not an exclusive lesson attribution.`);
    if(glossaryExercises.length>1)notes.push("The glossary names several exercises; no single exercise was selected.");
    else if(glossaryExercises.length===1&&selected&&!exercise)notes.push("The glossary exercise is retained in glossaryExercises, but its association with the selected page is unverified.");
    else if(!glossaryExercises.length)notes.push("No numbered lesson exercise was proved from the specified glossary.");
    return {...row,bookRef:{lesson:row.lesson,page:selected?.printedPage??null,exercise,candidatePages,glossaryExercises,evidenceIds:[...new Set(evidenceIds)],note:notes.join(" ")},unresolvedReason};
  });
  return {
    version:1,reviewState:"draft-owner-review-required",
    semantics:"Candidate source occurrences for owner review; not first-introduction claims and not wired into learner publication.",
    matchingPolicy:["Stable per-lesson source rows precede canonical family aggregation.","Article-stripped, case-preserving whole-word literal matching only; no stemming, translation, or inferred German forms. Line-start continuations of hyphenated compounds are excluded.","A selected page requires a single manifest page with a matching raw-PDF occurrence; these are extraction-alignment checks, not independent evidence.","Shared partner and module contexts retain their section labels; broad lesson-range labels remain candidates. A module-only occurrence cannot establish a Lesson 3 page for a broad Lesson 1–3 candidate.","Exercise numbers come only from the specified Deutsch–Spanisch glossary; a selected-page association also needs a matching core-lesson heading or audio entry.","Multiple or absent page matches remain null with a note. Owner review is required before publication."],
    sources:[
      {id:"manifest",path:BOOK_REF_SOURCE_PATHS.manifest,sha256:hash(input.manifestText),description:"Interactive-book extraction with printed/PDF page mapping, line IDs, sections and audio exercises."},
      {id:"coursebook",path:BOOK_REF_SOURCE_PATHS.coursebook,sha256:hash(input.coursebookText),description:"Raw Kursbuch PDF text; corroborates extraction page alignment."},
      {id:"glossary",path:BOOK_REF_SOURCE_PATHS.glossary,sha256:hash(input.glossaryText),description:"Momente A1.1 Glossar Deutsch–Spanisch, ISBN 978-3-19-001791-1; source for lesson/exercise context only."},
    ],
    sourceRowsSha256:hash(JSON.stringify(input.rows)),rows,evidence:[...evidence.values()],
    counts:Array.from({length:10},(_,index)=>{
      const lesson=index+3,matching=rows.filter(row=>row.lesson===lesson);
      return {lesson,rows:matching.length,exactLessonRows:matching.filter(row=>row.lessonAttribution==="exact-lesson-label").length,broadRangeCandidates:matching.filter(row=>row.lessonAttribution==="broad-range-candidate").length,located:matching.filter(row=>row.bookRef.page!==null).length,unresolved:matching.filter(row=>row.bookRef.page===null).length,knownExercise:matching.filter(row=>row.bookRef.exercise!==null).length};
    }),
  };
}

export function generateVocabularyBookRefDraft():VocabularyBookRefDraft{
  const manifestText=readFileSync(resolve(root,BOOK_REF_SOURCE_PATHS.manifest),"utf8");
  return projectVocabularyBookRefs({
    rows:vocabularyBookSourceRows(JSON.parse(readFileSync(resolve(root,"platform/apps/web/generated/word-cards.json"),"utf8")) as WordCardCatalog),
    manifest:JSON.parse(manifestText) as BookRefManifest,manifestText,
    coursebookText:readFileSync(resolve(root,BOOK_REF_SOURCE_PATHS.coursebook),"utf8"),
    glossaryText:readFileSync(resolve(root,BOOK_REF_SOURCE_PATHS.glossary),"utf8"),
  });
}
