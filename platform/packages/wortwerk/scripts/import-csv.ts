import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LanguageProfile, PackManifest } from "../../content/src/types/packs.js";
import { assertContentPack } from "../../content/src/validation/packs.js";
import { previewCsvPack } from "../src/csv.js";

const usage="Usage: node --import tsx packages/wortwerk/scripts/import-csv.ts --manifest <json> --language <json> --input <csv> --output <new-directory> [--book <id>] [--lesson <number>]";
export function importCsv(args:readonly string[]=process.argv.slice(2)):string {
  const options=new Map<string,string>();
  for(let index=0;index<args.length;index+=2){
    const flag=args[index];const value=args[index+1];
    if(!flag||!["--manifest","--language","--input","--output","--book","--lesson"].includes(flag)||!value||value.startsWith("--")||options.has(flag))throw new Error(usage);
    options.set(flag,value);
  }
  for(const flag of ["--manifest","--language","--input","--output"])if(!options.has(flag))throw new Error(usage);
  const output=resolve(options.get("--output")!);
  if(existsSync(output))throw new Error("Output already exists; imports are create-only.");
  const manifest=JSON.parse(readFileSync(resolve(options.get("--manifest")!),"utf8")) as PackManifest;
  const language=JSON.parse(readFileSync(resolve(options.get("--language")!),"utf8")) as LanguageProfile;
  const csv=readFileSync(resolve(options.get("--input")!),"utf8");
  const lesson=options.get("--lesson");
  if(lesson!==undefined&&(!/^\d+$/u.test(lesson)||!Number.isSafeInteger(Number(lesson))||Number(lesson)<1))throw new Error("Lesson must be a positive whole number.");
  const result=previewCsvPack({csv,manifest,language,...(options.has("--book")?{book:options.get("--book")!}:{}),...(lesson!==undefined?{lesson:Number(lesson)}:{})});
  if(!result.pack)throw new Error(result.issues.map(value=>`${value.code} row ${value.row}${value.column?` (${value.column})`:""}: ${value.message}`).join("\n"));
  assertContentPack(result.pack,language);
  const parent=dirname(output);mkdirSync(parent,{recursive:true});
  const staging=mkdtempSync(join(parent,".wortwerk-csv-"));
  let createdOutput=false;
  try{
    const {items,...metadata}=result.pack;
    mkdirSync(join(staging,"items"));
    writeFileSync(join(staging,"items","lexemes.json"),`${JSON.stringify(items,null,2)}\n`,{flag:"wx"});
    writeFileSync(join(staging,"pack.json"),`${JSON.stringify({...metadata,itemFiles:["items/lexemes.json"]},null,2)}\n`,{flag:"wx"});
    // Exclusive creation refuses even an empty existing target. The manifest is
    // published last, so discovery never observes a half-populated content pack.
    mkdirSync(output);createdOutput=true;
    renameSync(join(staging,"items"),join(output,"items"));
    renameSync(join(staging,"pack.json"),join(output,"pack.json"));
    rmSync(staging,{recursive:true,force:true});
  }catch(error){rmSync(staging,{recursive:true,force:true});if(createdOutput)rmSync(output,{recursive:true,force:true});throw error;}
  return output;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{process.stdout.write(`${importCsv()}\nPending review; enable explicitly for testing.\n`);}
  catch(error){process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;}
}
