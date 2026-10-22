import { afterEach,describe,it,expect } from "vitest";
import { mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync,readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LanguageProfile,PackManifest } from "../../packages/content/src/types/packs.js";
import { parseCsv,previewCsvPack,exportCsv,CSV_MAX_ROWS,CSV_MAX_BYTES } from "../../packages/wortwerk/src/csv.js";
import { importCsv } from "../../packages/wortwerk/scripts/import-csv.js";
import { validatePack } from "../../packages/content/src/validation/packs.js";
import language from "../../content/languages/de.json";
import toyLanguage from "../fixtures/languages/xx.json";
import fixture from "../fixtures/packs/de-b2-sample/pack.json";
const profile=language as LanguageProfile;
const manifest:PackManifest={...fixture,id:"personal-fixture",review:{status:"reviewed",reviewer:"fixture",reviewedAt:"2026-10-22"},units:[{id:"u1",title:"Authored unit",canDo:[],bookRef:{book:"fixture-book",lesson:3}}]} as PackManifest;
const preview=(csv:string,extra={})=>previewCsvPack({csv,manifest,language:profile,...extra});
const folders:string[]=[];
afterEach(()=>{for(const folder of folders.splice(0))rmSync(folder,{recursive:true,force:true});});
describe("CSV authoring",()=>{
 it("parses BOM,CRLF,quoted commas,doubled quotes and multiline cells with source line numbers",()=>{
  const parsed=parseCsv('\uFEFFGerman,English,lesson\r\n"Äpfel, Birnen","say ""hello""\r\nthen reply",3\r\nBuch,book,3\r\n');
  expect(parsed.issues).toEqual([]);
  expect(parsed.headers).toEqual(["German","English","lesson"]);
  expect(parsed.rows).toEqual([{row:2,cells:["Äpfel, Birnen",'say "hello"\r\nthen reply',"3"]},{row:4,cells:["Buch","book","3"]}]);
 });
 it("rejects malformed quotes,column counts,headers and nulls",()=>{
  for(const csv of ['lemma,meaning\n"unfinished,x','lemma,meaning\n"closed"junk,x','lemma,meaning\nnot"quoted,x','lemma,meaning\nx,y,z','lemma,meaning\nx,\0'])expect(parseCsv(csv).issues.length).toBeGreaterThan(0);
  for(const csv of ['German,lemma,English\nx,x,y','lemma,meening\nx,y','lemma,meaning,constructor\nx,y,z','lemma,meaning,__proto__\nx,y,z'])expect(preview(csv).issues.length).toBeGreaterThan(0);
 });
 it("enforces UTF8 byte and row limits before making a pack",()=>{
  expect(parseCsv("ä".repeat(CSV_MAX_BYTES/2+1)).issues[0]?.code).toBe("CSV_SIZE");
  expect(parseCsv("lemma,meaning\n"+"x,y\n".repeat(CSV_MAX_ROWS+1)).issues.some(value=>value.code==="CSV_ROWS")).toBe(true);
  expect(preview("lemma,meaning\n").pack).toBeNull();
 });
 it("preserves umlauts,comma meanings,tags and all authored plural variants",()=>{
  const result=preview('German,English,lesson,page,tags,gender,plural,pos\nÄpfel,"apples, fruit",3,62,"food|fruit",male,"Äpfel|Äpfeln",noun');
  expect(result.issues).toEqual([]);expect(result.rowCount).toBe(1);
  expect(result.pack?.review).toEqual({status:"pending-german-review"});
  expect(result.pack?.itemFiles).toBeUndefined();
  expect(result.pack?.items[0]).toMatchObject({lemma:"Äpfel",meaning:"apples, fruit",source:"study-extra",bookRef:{book:"fixture-book",lesson:3,page:62},gender:"male",article:"der",tags:["food","fruit"],forms:{plural:["Äpfel","Äpfeln"]},pos:"noun",review:{status:"pending-german-review"}});
  expect(validatePack(result.pack,profile)).toEqual([]);
 });
 it("fails the entire import on NFC,case or article-normalized duplicate headwords",()=>{
  for(const csv of ['lemma,meaning\nÄpfel,one\nA\u0308PFEL,two','lemma,meaning,gender\nder Apfel,one,male\nApfel,two,male']){
   const result=preview(csv);expect(result.pack).toBeNull();expect(result.issues.some(value=>value.code==="CSV_DUPLICATE"&&value.row===3)).toBe(true);
  }
 });
 it("maps profile IDs,labels and unambiguous articles and rejects ambiguous articles",()=>{
  expect(preview('lemma,meaning,gender\nApfel,apple,Masculine').pack?.items[0]).toMatchObject({gender:"male",article:"der"});
  expect(preview('lemma,meaning,gender\nApfel,apple,der').pack?.items[0]).toMatchObject({gender:"male"});
  const ambiguous=preview('lemma,meaning,gender\nFrau,woman,die');
  expect(ambiguous.pack).toBeNull();expect(ambiguous.issues[0]?.code).toBe("CSV_AMBIGUOUS_GENDER");
  expect(preview('lemma,meaning,gender\nApfel,apple,unknown').pack).toBeNull();
  expect(preview('lemma,meaning,gender,article\nApfel,apple,male,die').pack).toBeNull();
 });
 it("requires honest book,lesson,page and matching authored unit context",()=>{
  const unbound={...manifest,units:[{id:"u1",title:"Unit",canDo:[]}]};
  expect(preview('lemma,meaning\nx,y',{manifest:unbound}).issues.map(value=>value.code)).toEqual(["CSV_BOOK","CSV_LESSON"]);
  expect(preview('lemma,meaning,lesson,page\nx,y,3,0').pack).toBeNull();
  expect(preview('lemma,meaning,lesson\nx,y,0').pack).toBeNull();
  expect(preview('lemma,meaning,lesson,unitId\nx,y,4,u1').pack).toBeNull();
  expect(preview('lemma,meaning\nx,y',{manifest:unbound,book:"supplied-book",lesson:7}).pack?.items[0]?.bookRef).toEqual({book:"supplied-book",lesson:7});
 });
 it("namespaces stable compact item identities without source-row coupling",()=>{
  const first=preview('lemma,meaning\nø,meaning\na,other').pack!;
  const reordered=preview('lemma,meaning\na,other\nø,meaning').pack!;
  expect(first.items[0]?.id).toBe(reordered.items[1]?.id);
  expect(new Set(first.items.map(item=>item.id)).size).toBe(2);
  const second=preview('lemma,meaning\nø,meaning',{namespace:"second-import"}).pack!;
  expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  const long=preview(`lemma,meaning\n${"ü".repeat(500)},long word`,{namespace:"namespace".repeat(100)}).pack!;
  expect(long.items[0]?.id.length).toBeLessThanOrEqual(200);
 });
 it("works with a toy language and keeps unknown POS explicit rather than inventing grammar",()=>{
  const toy=toyLanguage as LanguageProfile;
  const result=preview('lemma,meaning,gender\nsøl,light,left',{manifest:{...manifest,language:toy.id},language:toy});
  expect(result.issues).toEqual([]);expect(result.pack?.items[0]).toMatchObject({lemma:"søl",gender:"left",article:toy.genders[0]!.article,pos:"word"});
 });
 it("does not treat imported formulas/punctuation as code and protects spreadsheet exports",()=>{
  const result=preview('lemma,meaning\n-en,"=SUM(1,2)"');
  expect(result.issues).toEqual([]);
  const exported=exportCsv(result.pack!);
  expect(exported).toContain('"\'-en"');expect(exported).toContain('"\'=SUM(1,2)"');
  expect(result.pack?.items[0]).toMatchObject({lemma:"-en",meaning:"=SUM(1,2)"});
 });
 it("reports invalid profile/manifest without partial output",()=>{
  expect(preview('lemma,meaning\nx,y',{manifest:null as unknown as PackManifest}).pack).toBeNull();
  expect(preview('lemma,meaning\nx,y',{manifest:{...manifest,units:[null]} as unknown as PackManifest}).pack).toBeNull();
  expect(preview('lemma,meaning\nx,y',{language:{...profile,locale:"bad_locale"}}).pack).toBeNull();
  expect(preview('lemma,meaning\nx,y',{manifest:{...manifest,story:"story.json"}}).pack).toBeNull();
 });
 it("CLI validates before writing,creates a complete pack atomically,and never overwrites",()=>{
  const folder=mkdtempSync(join(tmpdir(),"wortwerk-csv-"));folders.push(folder);
  const manifestPath=join(folder,"manifest.json");const languagePath=join(folder,"language.json");const csvPath=join(folder,"words.csv");const output=join(folder,"pack");
  writeFileSync(manifestPath,JSON.stringify(manifest));writeFileSync(languagePath,JSON.stringify(profile));writeFileSync(csvPath,'lemma,meaning,page\nÄpfel,apples,62\nBuch,book,63');
  const args=["--manifest",manifestPath,"--language",languagePath,"--input",csvPath,"--output",output];
  expect(importCsv(args)).toBe(output);
  const created=JSON.parse(readFileSync(join(output,"pack.json"),"utf8")) as PackManifest;
  const createdItems=JSON.parse(readFileSync(join(output,"items","lexemes.json"),"utf8")) as unknown;
  expect(validatePack({...created,items:createdItems},profile)).toEqual([]);
  expect(()=>importCsv(args)).toThrow("create-only");
  writeFileSync(csvPath,'lemma,meaning\nBuch,book\nbuch,duplicate');
  const invalid=join(folder,"invalid");expect(()=>importCsv([...args.slice(0,-1),invalid])).toThrow("Duplicate");
  expect(existsSync(invalid)).toBe(false);expect(readdirSync(folder).some(name=>name.startsWith(".wortwerk-csv-"))).toBe(false);
 });
});
