import type {WordForm} from "../content/word-card-types";
import type {SubjectVocabularyItem} from "./subject-sheets";

export type SingularGender="male"|"female"|"neuter";
export type PluralGender=SingularGender;
export type PluralPatternId="s"|"e"|"en-n"|"unchanged"|"er"|"umlaut"|"umlaut-e"|"umlaut-er"|"innen"|"other"|"not-taught";

export type PluralPatternDefinition={
  id:PluralPatternId;
  label:string;
  explanation:string;
};

export const pluralGenders:{id:SingularGender;label:string;article:string}[]=[
  {id:"male",label:"Masculine",article:"der"},
  {id:"female",label:"Feminine",article:"die"},
  {id:"neuter",label:"Neuter",article:"das"},
];

/** Describes observed source pairs, rather than rules for predicting new forms. */
export const pluralPatterns:PluralPatternDefinition[]=[
  {id:"s",label:"-s",explanation:"Add -s to the singular noun."},
  {id:"e",label:"-e",explanation:"Add -e; the existing stem stays the same."},
  {id:"en-n",label:"-(e)n",explanation:"Add -en or -n; the existing stem stays the same."},
  {id:"unchanged",label:"—",explanation:"The noun stays the same; its plural article is die."},
  {id:"er",label:"-er",explanation:"Add -er; the existing stem stays the same."},
  {id:"umlaut",label:"Umlaut only",explanation:"Change a vowel to an umlaut: a → ä, o → ö or u → ü. Add no ending."},
  {id:"umlaut-e",label:"Umlaut + -e",explanation:"Change a vowel to an umlaut and add -e."},
  {id:"umlaut-er",label:"Umlaut + -er",explanation:"Change a vowel to an umlaut and add -er."},
  {id:"innen",label:"-in → -innen",explanation:"For these source pairs, singular -in becomes plural -innen."},
  {id:"other",label:"Other changes",explanation:"Learn the exact pair: its spelling, stem or phrase changes in another way."},
  {id:"not-taught",label:"No plural taught",explanation:"This source row does not supply a plural. That does not mean the noun has no plural."},
];

export type PluralPatternEntry={
  id:string;
  item:SubjectVocabularyItem;
  plural:WordForm|null;
  gender:SingularGender;
  pattern:PluralPatternId;
};

export type PluralPatternRow=PluralPatternDefinition&{
  cells:Record<SingularGender,PluralPatternEntry[]>;
};

export type PluralMatrix={
  rows:PluralPatternRow[];
  /** These rows are taught in plural; no singular or gender is inferred. */
  pluralFormItems:SubjectVocabularyItem[];
  /** Unique male/female/neuter source rows, including rows without a taught plural. */
  nounCount:number;
  /** Stored plural forms across gendered noun rows; each variant counts once. */
  pairCount:number;
  /** Unique article-free rows omitted from the gender matrix. */
  excludedCount:number;
};

export type PluralDifference={
  singular:string;
  plural:string;
  stem:string;
  ending:string;
  /** Offsets in the plural stem of newly changed umlaut letters only. */
  umlautIndices:number[];
};

function nounText(text:string):string{
  return text.normalize("NFC").trim().replace(/\s+/g," ").replace(/^(?:der|die|das)\s+/i,"");
}

function addedUmlautIndices(singular:string,pluralStem:string):number[]|null{
  if(singular.length!==pluralStem.length)return null;
  const changes:Record<string,string>={a:"ä",o:"ö",u:"ü",A:"Ä",O:"Ö",U:"Ü"};
  const indices:number[]=[];
  for(let index=0;index<singular.length;index++){
    if(singular[index]===pluralStem[index])continue;
    if(changes[singular[index]!]!==pluralStem[index])return null;
    indices.push(index);
  }
  return indices.length?indices:null;
}

type ClassifiedPair={pattern:Exclude<PluralPatternId,"not-taught">;difference:PluralDifference|null};

function observedPair(singularText:string,pluralText:string):ClassifiedPair{
  const singular=nounText(singularText);
  const plural=nounText(pluralText);
  if(!singular||!plural)return {pattern:"other",difference:null};
  const difference=(stem:string,ending:string,umlautIndices:number[]=[]):PluralDifference=>({singular,plural,stem,ending,umlautIndices});
  if(singular===plural)return {pattern:"unchanged",difference:difference(plural,"")};
  const endings:{ending:string;pattern:PluralPatternId}[]=[
    {ending:"s",pattern:"s"},
    {ending:"e",pattern:"e"},
    {ending:"en",pattern:"en-n"},
    {ending:"n",pattern:"en-n"},
    {ending:"er",pattern:"er"},
  ];
  for(const {ending,pattern} of endings){
    if(plural===singular+ending){
      return {pattern:pattern as Exclude<PluralPatternId,"not-taught">,difference:difference(singular,ending)};
    }
  }
  if(singular.endsWith("in")&&plural===singular+"nen"){
    return {pattern:"innen",difference:difference(singular,"nen")};
  }
  const umlautEndings:{ending:string;pattern:"umlaut"|"umlaut-e"|"umlaut-er"}[]=[
    {ending:"",pattern:"umlaut"},
    {ending:"e",pattern:"umlaut-e"},
    {ending:"er",pattern:"umlaut-er"},
  ];
  for(const {ending,pattern} of umlautEndings){
    if(ending&&!plural.endsWith(ending))continue;
    const stem=ending?plural.slice(0,-ending.length):plural;
    const indices=addedUmlautIndices(singular,stem);
    if(indices)return {pattern,difference:difference(stem,ending,indices)};
  }
  return {pattern:"other",difference:null};
}

/** Compare the actual supplied pair; no ending is inferred from its gender. */
export function classifyPluralPair(singular:string,plural:string):Exclude<PluralPatternId,"not-taught">{
  return observedPair(singular,plural).pattern;
}

/** Safe highlighting data for exact core patterns. Special spellings stay unmarked. */
export function pluralDifference(singular:string,plural:string):PluralDifference|null{
  return observedPair(singular,plural).difference;
}

/** Each gendered source row contributes its actual variants, or one explicit gap. */
export function buildPluralMatrix(items:readonly SubjectVocabularyItem[]):PluralMatrix{
  const rows:PluralPatternRow[]=pluralPatterns.map(pattern=>({...pattern,cells:{male:[],female:[],neuter:[]}}));
  const byPattern=new Map(rows.map(row=>[row.id,row]));
  const pluralFormItems:SubjectVocabularyItem[]=[];
  const seen=new Set<string>();
  let nounCount=0;
  let pairCount=0;
  let excludedCount=0;
  for(const item of items){
    if(seen.has(item.id))continue;
    seen.add(item.id);
    if(item.tone==="plural"){
      pluralFormItems.push(item);
      continue;
    }
    if(item.tone!=="male"&&item.tone!=="female"&&item.tone!=="neuter"){
      excludedCount++;
      continue;
    }
    const gender=item.tone;
    nounCount++;
    if(!item.plurals.length){
      byPattern.get("not-taught")!.cells[gender].push({id:`${item.id}-no-plural`,item,plural:null,gender,pattern:"not-taught"});
      continue;
    }
    item.plurals.forEach((plural,index)=>{
      const pattern=classifyPluralPair(item.de,plural.text);
      byPattern.get(pattern)!.cells[gender].push({id:`${item.id}-plural-${index}`,item,plural,gender,pattern});
      pairCount++;
    });
  }
  return {rows,pluralFormItems,nounCount,pairCount,excludedCount};
}
