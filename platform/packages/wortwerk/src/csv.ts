import type { ContentPack, LanguageProfile, PackLexeme, PackManifest, PackSource } from "../../content/src/types/packs.js";
import { validateLanguageProfile, validatePack } from "../../content/src/validation/packs.js";

export const CSV_MAX_BYTES=1_000_000;
export const CSV_MAX_ROWS=5_000;
export type CsvIssue={code:string;row:number;column?:string;message:string};
export type CsvRow={row:number;cells:string[]};
export type CsvTable={headers:string[];rows:CsvRow[];issues:CsvIssue[]};
const issue=(code:string,row:number,message:string,column?:string):CsvIssue=>({code,row,message,...(column?{column}:{})});

/** RFC 4180 parsing; quoted commas/newlines remain data rather than separators. */
export function parseCsv(input:string):CsvTable {
  const issues:CsvIssue[]=[];
  const records:CsvRow[]=[];
  if(input.length>CSV_MAX_BYTES||new TextEncoder().encode(input).length>CSV_MAX_BYTES)return {headers:[],rows:[],issues:[issue("CSV_SIZE",1,`CSV must be at most ${CSV_MAX_BYTES} UTF-8 bytes.`)]};
  const text=input.replace(/^\uFEFF/u,"");
  if(text.includes("\0"))return {headers:[],rows:[],issues:[issue("CSV_CONTROL",1,"CSV must not contain null characters.")]};
  let cells:string[]=[];let cell="";let state:"start"|"plain"|"quoted"|"closed"="start";let line=1;let startLine=1;
  function finishRecord(){
    cells.push(cell);cell="";state="start";
    if(cells.some(value=>value.length))records.push({row:startLine,cells});
    cells=[];
  }
  for(let index=0;index<text.length;index++){
    if(issues.length>=100)return {headers:[],rows:[],issues};
    const char=text[index]!;
    if(state==="quoted"){
      if(char==='"'){
        if(text[index+1]==='"'){cell+='"';index++;}else state="closed";
      }else {cell+=char;if(char==="\n"||(char==="\r"&&text[index+1]!=="\n"))line++;}
      continue;
    }
    if(char===","){cells.push(cell);cell="";state="start";continue;}
    if(char==="\n"||char==="\r"){
      finishRecord();if(char==="\r"&&text[index+1]==="\n")index++;line++;startLine=line;
      if(records.length>CSV_MAX_ROWS+1)return {headers:[],rows:[],issues:[issue("CSV_ROWS",line,`CSV must contain at most ${CSV_MAX_ROWS} data rows.`)]};
      continue;
    }
    if(char==='"'){
      if(state==="start")state="quoted";
      else issues.push(issue("CSV_QUOTE",line,"A quote must start a field or be doubled inside a quoted field."));
      continue;
    }
    if(state==="closed")issues.push(issue("CSV_AFTER_QUOTE",line,"Only a comma or line break may follow a closing quote."));
    cell+=char;state="plain";
  }
  if(state==="quoted")issues.push(issue("CSV_UNCLOSED_QUOTE",startLine,"A quoted field is not closed."));
  if(cell.length||cells.length||state!=="start")finishRecord();
  if(records.length>CSV_MAX_ROWS+1)issues.push(issue("CSV_ROWS",line,`CSV must contain at most ${CSV_MAX_ROWS} data rows.`));
  const header=records.shift();
  if(!header)return {headers:[],rows:[],issues:[...issues,issue("CSV_HEADERS",1,"CSV needs a header row.")]};
  const headers=header.cells.map(value=>value.normalize("NFC").trim());
  for(const row of records)if(row.cells.length!==headers.length)issues.push(issue("CSV_COLUMNS",row.row,`Expected ${headers.length} columns, received ${row.cells.length}.`));
  return {headers,rows:records,issues};
}

type Field="lemma"|"meaning"|"book"|"lesson"|"page"|"tags"|"gender"|"article"|"plural"|"pos"|"unitId";
const aliases:Readonly<Record<string,Field>>={lemma:"lemma",word:"lemma",german:"lemma",meaning:"meaning",translation:"meaning",english:"meaning",book:"book",lesson:"lesson",page:"page",tags:"tags",topics:"tags",gender:"gender",article:"article",plural:"plural",plurals:"plural",pos:"pos",partofspeech:"pos",unit:"unitId",unitid:"unitId"};
function headerKey(value:string):string{return value.toLocaleLowerCase("en").replace(/[\s_-]+/gu,"");}
function normal(value:string,locale:string):string{return value.normalize("NFC").trim().replace(/\s+/gu," ").toLocaleLowerCase(locale);}
function positive(value:string):number|undefined {return /^\d+$/u.test(value)&&Number.isSafeInteger(Number(value))&&Number(value)>0?Number(value):undefined;}
function values(value:string):string[]{return [...new Set(value.split(/[|;]/u).map(part=>part.normalize("NFC").trim()).filter(Boolean))];}
/** Stable, compact identifiers; collisions are rejected before a pack can be saved. */
function fingerprint(value:string):string {
  let hash=0x6c62272e07bb014262b821756295c58dn;
  const mask=(1n<<128n)-1n;
  for(const byte of new TextEncoder().encode(value))hash=((hash^BigInt(byte))*0x0000000001000000000000000000013bn)&mask;
  return hash.toString(16).padStart(32,"0");
}
function identifier(namespace:string,lemma:string):string {
  return `personal:${fingerprint(namespace)}:${fingerprint(lemma.normalize("NFC"))}`;
}
export type CsvPackOptions={csv:string;manifest:PackManifest;language:LanguageProfile;book?:string;lesson?:number;source?:PackSource;namespace?:string};
export type CsvImportPreview={pack:ContentPack|null;issues:CsvIssue[];rowCount:number};

/** Build and validate a whole pending pack before the caller registers or saves it. */
export function previewCsvPack({csv,manifest,language,book,lesson,source="study-extra",namespace}:CsvPackOptions):CsvImportPreview {
  const table=parseCsv(csv);const issues=[...table.issues];
  if(!manifest||typeof manifest!=="object"||Array.isArray(manifest))return {pack:null,issues:[...issues,issue("CSV_MANIFEST",1,"Supply a valid pack manifest.")],rowCount:table.rows.length};
  const profileIssues=validateLanguageProfile(language);
  if(profileIssues.length)return {pack:null,issues:[...issues,...profileIssues.map(value=>issue(value.code,1,value.message,"language"))],rowCount:table.rows.length};
  const importNamespace=namespace??manifest.id;
  if(typeof importNamespace!=="string"||!importNamespace.trim())issues.push(issue("CSV_NAMESPACE",1,"Choose an import namespace."));
  const {itemFiles:_itemFiles,...metadata}=manifest;
  const manifestIssues=validatePack({...metadata,review:{status:"pending-german-review"},items:[]},language);
  if(manifestIssues.length)return {pack:null,issues:[...issues,...manifestIssues.map(value=>issue(value.code,1,`${value.path}: ${value.message}`,"manifest"))],rowCount:table.rows.length};
  const fields=new Map<Field,number>();
  table.headers.forEach((header,index)=>{
    const field=Object.hasOwn(aliases,headerKey(header))?aliases[headerKey(header)]:undefined;
    if(!field)issues.push(issue("CSV_HEADER",1,`Unknown column: ${header||"(empty)"}.`,header));
    else if(fields.has(field))issues.push(issue("CSV_DUPLICATE_HEADER",1,`Use only one column for ${field}.`,header));
    else fields.set(field,index);
  });
  for(const field of ["lemma","meaning"] as const)if(!fields.has(field))issues.push(issue("CSV_REQUIRED_HEADER",1,`Missing ${field} column.`,field));
  if(!table.rows.length)issues.push(issue("CSV_EMPTY",2,"Add at least one vocabulary row."));
  if(manifest.story||manifest.exam)issues.push(issue("CSV_MANIFEST_RESOURCES",1,"A vocabulary CSV manifest must not reference story or exam resource files."));
  const items:PackLexeme[]=[];const seen=new Map<string,number>();const identifiers=new Map<string,{lemma:string;row:number}>();
  const units=Array.isArray(manifest.units)?manifest.units:[];
  const authoredBooks=[...new Set(units.flatMap(unit=>unit.bookRef?[unit.bookRef.book]:[]))];
  const authoredLessons=[...new Set(units.flatMap(unit=>unit.bookRef?[unit.bookRef.lesson]:[]))];
  if(!issues.length)for(const row of table.rows){
    const get=(field:Field)=>{const index=fields.get(field);return index===undefined?"":(row.cells[index]??"").normalize("NFC").trim();};
    let lemma=get("lemma");const meaning=get("meaning");
    if(!lemma||!meaning){issues.push(issue("CSV_REQUIRED_VALUE",row.row,"A word and its meaning are required.",!lemma?"lemma":"meaning"));continue;}
    const rowBook=get("book")||book||(authoredBooks.length===1?authoredBooks[0]:undefined);
    const rowLesson=get("lesson")?positive(get("lesson")):lesson??(authoredLessons.length===1?authoredLessons[0]:undefined);
    if(!rowBook)issues.push(issue("CSV_BOOK",row.row,"Supply a book in the row, import context, or manifest unit.","book"));
    if(!rowLesson||!Number.isSafeInteger(rowLesson)||rowLesson<1)issues.push(issue("CSV_LESSON",row.row,"Supply a positive whole lesson number.","lesson"));
    const page=get("page")?positive(get("page")):undefined;
    if(get("page")&&page===undefined)issues.push(issue("CSV_PAGE",row.row,"Page must be a positive whole number.","page"));
    const candidates=units.filter(candidate=>!!candidate.bookRef&&candidate.bookRef.book===rowBook&&candidate.bookRef.lesson===rowLesson);
    const unit=get("unitId")?units.find(candidate=>candidate.id===get("unitId")):candidates.length===1?candidates[0]:(units.length===1&&!units[0]?.bookRef?units[0]:undefined);
    if(!unit||unit.bookRef&&(unit.bookRef.book!==rowBook||unit.bookRef.lesson!==rowLesson))issues.push(issue("CSV_UNIT",row.row,"Choose a unit matching this row's book and lesson.","unitId"));
    const suppliedGender=get("gender")||get("article");
    let gender:LanguageProfile["genders"][number]|undefined;
    if(suppliedGender){
      const byId=language.genders.filter(value=>normal(value.id,language.locale)===normal(suppliedGender,language.locale));
      const candidates=byId.length?byId:language.genders.filter(value=>[value.label,value.article].some(label=>normal(label,language.locale)===normal(suppliedGender,language.locale)));
      if(candidates.length!==1)issues.push(issue(candidates.length?"CSV_AMBIGUOUS_GENDER":"CSV_GENDER",row.row,candidates.length?"This label/article matches several genders; use the profile's gender id.":"Gender must match an id, label, or unambiguous article in the language profile.","gender"));
      else gender=candidates[0];
    }
    if(gender&&get("article")&&normal(get("article"),language.locale)!==normal(gender.article,language.locale))issues.push(issue("CSV_ARTICLE",row.row,"Article does not match the selected profile gender.","article"));
    // Strip a presentation article only after an explicit, unambiguous gender choice.
    const firstSpace=lemma.indexOf(" ");
    if(gender&&firstSpace>0&&normal(lemma.slice(0,firstSpace),language.locale)===normal(gender.article,language.locale))lemma=lemma.slice(firstSpace+1).trim();
    const duplicate=seen.get(normal(lemma,language.locale));
    if(duplicate!==undefined)issues.push(issue("CSV_DUPLICATE",row.row,`Duplicate headword also appears on row ${duplicate}.`,"lemma"));
    else seen.set(normal(lemma,language.locale),row.row);
    const plural=values(get("plural"));
    const itemId=identifier(importNamespace,lemma);
    const previousIdentifier=identifiers.get(itemId);
    if(previousIdentifier&&previousIdentifier.lemma!==lemma)issues.push(issue("CSV_ID_COLLISION",row.row,`This word's identifier collides with row ${previousIdentifier.row}; import these words as separate personal packs.`,"lemma"));
    else identifiers.set(itemId,{lemma,row:row.row});
    if(rowBook&&rowLesson&&unit)items.push({type:"lexeme",id:itemId,unitId:unit.id,bookRef:{book:rowBook,lesson:rowLesson,...(page!==undefined?{page}:{})},source,tags:values(get("tags")),lemma,pos:get("pos")||"word",meaning,...(gender?{gender:gender.id,article:gender.article}:{}),...(plural.length?{forms:{plural}}:{}),review:{status:"pending-german-review"}});
  }
  const pack:ContentPack={...metadata,review:{status:"pending-german-review"},items};
  if(!issues.length)issues.push(...validatePack(pack,language).map(value=>issue(value.code,1,`${value.path}: ${value.message}`)));
  return {pack:issues.length?null:pack,issues,rowCount:table.rows.length};
}

/** Spreadsheet-safe CSV is for interchange; JSON mini-packs preserve text byte-for-byte. */
export function exportCsv(pack:ContentPack):string {
  const safe=(value:string)=>{const protectedValue=/^[\s]*[=+@-]/u.test(value)||/^[\t\r]/u.test(value)?`'${value}`:value;return `"${protectedValue.replace(/"/gu,'""')}"`;};
  const rows:unknown[][]=[["lemma","meaning","book","lesson","page","tags","gender","article","plural","pos","unitId"]];
  for(const item of pack.items)if(item.type==="lexeme")rows.push([item.lemma,item.meaning,item.bookRef.book,item.bookRef.lesson,item.bookRef.page??"",item.tags.join("|"),item.gender??"",item.article??"",item.forms?.plural?.join("|")??"",item.pos,item.unitId]);
  return `${rows.map(row=>row.map(value=>safe(String(value))).join(",")).join("\r\n")}\r\n`;
}
