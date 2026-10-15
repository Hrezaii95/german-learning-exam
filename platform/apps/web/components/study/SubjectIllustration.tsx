import type {ReactNode} from "react";
import type {StudyConcept} from "@/lib/study/scope";
import type {ObjectVocabularyIcon} from "@/lib/study/object-vocabulary";
import {countries,languageMeanings,spokenLanguage} from "@/lib/study/countries";
import {countryForVocabularyIllustration,geographyIconPath} from "@/lib/study/geography-illustrations";
import {refinedIllustrationPath} from "@/lib/study/refined-illustrations";
import {verbIllustrationPath} from "@/lib/study/verb-illustrations";
import {expressionIllustrationPath} from "@/lib/study/expression-illustrations";
import {grammarIllustrationPath} from "@/lib/study/grammar-illustrations";
import {nounIllustrationPath} from "@/lib/study/noun-illustrations";
import {homeWords} from "@/lib/study/home";
import {CountryVocabularyIllustration} from "./CountryVocabularyIllustration";
import {HomeIllustration} from "./HomeIllustration";
import {ObjectVocabularyIllustration} from "./ObjectIllustration";

/** Topic symbols describe the subject, rather than pretending to depict every word in it. */
const subjectPaths:Record<StudyConcept,string>={
  introductions:"M22 23h56v58H22ZM37 23v-8h26v8M38 43a12 12 0 1 0 24 0M31 72q0-17 19-17t19 17M15 37H8m84 0h-7",
  people:"M26 18a11 11 0 1 0 .1 0M74 18a11 11 0 1 0 .1 0M50 56a9 9 0 1 0 .1 0M8 65V52q0-17 18-17t18 17M56 52q0-17 18-17t18 17v13M32 91V83q0-15 18-15t18 15v8",
  countries:"M50 9a41 41 0 1 0 .1 0M9 50h82M50 9q-31 41 0 82M50 9q31 41 0 82M17 26h66M17 74h66",
  numbers:"M15 27l10-8v48M15 67h20M46 28q2-18 18-9t-4 23L45 66h28M15 84h65M82 18v46m-8-9h16",
  home:"M9 46 50 13 91 46M20 38v50h60V38M39 88V61h22v27M29 46h9v10h-9M64 46h9v10h-9",
  objects:"M15 25q17-9 35 3 18-12 35-3v58q-18-10-35 2-18-12-35-2ZM50 28v57M28 16V8h21v11M64 14h19v10",
  "colours-materials":"M48 12C9 12 5 65 31 83q16 12 25-6-11-13 4-16h13c25-1 15-49-25-49ZM30 31a6 6 0 1 0 .1 0M50 24a6 6 0 1 0 .1 0M70 33a6 6 0 1 0 .1 0M25 53a6 6 0 1 0 .1 0",
  office:"M13 34h74v49H13ZM33 34V20h34v14M13 51q37 16 74 0M43 52h14v13H43Z",
  seasons:"M50 10v80M10 50h80M50 10a40 40 0 1 0 .1 0M28 23v14m-7-7h14M67 22l8 12-14 1ZM24 66l13 5-13 12ZM67 64v18m-8-14 16 10m0-10-16 10",
  past:"M30 23a37 37 0 1 1-12 41M30 23H12V7M50 29v25l16 10M12 23l16 15",
  travel:"M21 12h58v62H21ZM29 22h42v25H29ZM22 57h56M30 63h2m36 0h2M31 74 20 91m49-17 11 17M29 84h42",
  food:"M50 22a30 30 0 1 0 .1 0M50 31a21 21 0 1 0 .1 0M8 14v30m8-30v30M8 29h8m-4 15v45M90 14q-12 14-8 35h8V14v75",
  time:"M50 11a39 39 0 1 0 .1 0M50 21v7m0 44v7M21 50h7m44 0h7M50 33v18l19 12",
  hobbies:"M16 31a17 17 0 1 0 .1 0M16 39l13 19M42 63l16-21M62 21l13-9 14 12-14 10ZM64 70q19-17 25 0-3 20-17 12L54 64 38 83",
  grammar:"M11 24h22v22H11ZM40 24h23v22H40ZM70 24h22v22H70ZM11 66h22v22H11ZM40 66h52v22H40ZM22 46v11h59V46M51 57v9",
  verbs:"M12 18h27v22H12ZM61 18h27v22H61ZM36 67h28v22H36ZM39 29h22m-8-8 8 8-8 8M25 40v15h25v12M75 40v15H50",
  conversation:"M10 16h56v39H30L15 69V55h-5ZM37 64h34l15 15V65h5V34H75M22 31h31M22 41h22",
  questions:"M27 31q1-23 24-23t24 22q0 14-17 22-8 4-8 15M50 83h.1M13 67v17h18m56-67V8H70",
  classroom:"M11 14h78v49H11ZM24 28h37M24 40h50M50 63v16m-17 9h34M18 79v9m64-9v9M20 74a7 7 0 1 0 .1 0M80 74a7 7 0 1 0 .1 0",
  descriptions:"M13 44h26v38H13ZM62 18h26v64H62ZM16 24h20m-7-7 7 7-7 7M65 94h20M48 48h5m-5 12h5",
  everyday:"M21 13h58v76H21ZM32 8v14m36-14v14M21 31h58M32 45l5 5 9-10M54 46h14M32 67l5 5 9-10M54 68h14",
};

function LineDrawing({path,className="subject-vocabulary-illustration"}:{path:string;className?:string}){
  return <svg className={className} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="46" fill="currentColor" opacity=".055" stroke="none"/><path d={path}/></svg>;
}

export function SubjectIcon({subject,className=""}:{subject:StudyConcept;className?:string}){
  return <span className={`subject-icon${className?` ${className}`:""}`} data-subject-icon={subject} aria-hidden="true"><LineDrawing path={subjectPaths[subject]}/></span>;
}

const objectTerms:Record<string,ObjectVocabularyIcon>={
  "die Uhr":"watch","das Auto":"car","das Handy":"mobile","das Buch":"book",
  "der Bleistift":"pencil","die Brille":"glasses","die Flasche":"bottle","die Kamera":"camera",
  "die Kette":"necklace","der Kugelschreiber":"pen","der Schlüssel":"key","die Tasche":"bag",
  "das Ding":"thing","das Feuerzeug":"lighter","der Geldbeutel":"wallet","das Taschentuch":"tissue",
  "der Regenschirm":"umbrella","der Regen":"rain","die Jacke":"jacket","das Streichholz":"match",
  "die Bürste":"brush","die Seife":"soap","das Handtuch":"towel","der Föhn":"hairdryer",
  "die Sonne":"sun","die Sonnenbrille":"sunglasses","das Telefon":"telephone","das Haus":"house",
};
const relatedObjectTerms:Record<string,ObjectVocabularyIcon>={
  "das Taxi":"car","der Autoschlüssel":"key","der Stift":"pen","der Kuli":"pen",
  schreiben:"pen",notieren:"pen",fotografieren:"camera","der Fotograf":"camera","die Fotografin":"camera","der Modefotograf":"camera","die Modefotografin":"camera",
};

// HomeIllustration intentionally has a house fallback. Only these registered IDs may reach it.
const homeIds=new Set(["haus","zimmer","tisch","stuhl","bett","schrank","lampe","sofa","teppich","fernseher","fenster","tuer","spiegel","kissen","decke","uhr","computer","regal","pflanze","radio","bild","sessel","buch","geschaeft","hotel","wohnort","zuhause","moebel","moebelgeschaeft","hotelzimmer"]);
const homeTerms=new Map(homeWords.filter(word=>homeIds.has(word.id)).map(word=>[word.de,word.id]));
const languageTerms=new Set([...Object.keys(languageMeanings),...countries.flatMap(country=>country.languages.map(spokenLanguage))]);
const colours:Record<string,string>={weiß:"#fffdf4",gelb:"#e8be35",orange:"#e78937",rot:"#c64d4d",grün:"#4e855d",blau:"#417ba6",braun:"#865c41",schwarz:"#28313a"};
function exactValue<T>(record:Readonly<Record<string,T>>,word:string):T|undefined{return Object.hasOwn(record,word)?record[word]:undefined;}

// The small paths are shared with the existing food and hobby teaching drawings;
// keeping the paths here avoids loading their interactive workshops and CSS.
const foodPaths=[
  "M16 43a34 27 0 0 1 68 0ZM17 50h66M16 56l14 7 13-7 14 7 14-7 13 7M17 70h66v7H17ZM31 28h3m16-5h3m16 5h3",
  "M13 48h74q-3 36-37 36T13 48ZM22 44q-15-25 8-25l20 22M48 42q-7-34 14-29l-3 27M65 43q5-29 21-15l-6 17M23 39l17 6m26-13-7 13",
  "M18 45 67 19l17 21-17 43H18ZM18 60h58M67 19v64M24 37q11-17 22-4M30 26q6-9 12-2",
  "M20 39h51v27q0 16-25 16T20 66ZM71 43h10q19 16-10 21M14 89h64M33 13q-9 10 0 18m19-18q-9 10 0 18",
  "M12 47h76q-3 36-38 36T12 47ZM17 42q33-16 66 0M29 14q-8 10 0 19m20-21q-8 10 0 19m20-17q-8 10 0 19",
  "M50 33q-35-20-36 18-1 34 36 35 37-1 36-35-1-38-36-18ZM50 32l-9-18 14 9 14-8-10 16M50 25V11",
  "M18 16h64v70H18ZM18 39h64M18 62h64M40 16v70M61 16v70",
  "M16 49q-4-27 34-29 38 2 34 29v14q-7 22-34 22-27 0-34-22ZM38 32 27 55m31-25L45 55m28-16L63 58",
  "M50 13C33 13 17 50 20 67c4 24 56 24 60 0C83 50 67 13 50 13ZM37 64a13 13 0 1 0 26 0 13 13 0 1 0-26 0",
  "M38 25q29-20 42 5 16 29-17 42-21 5-37-16ZM32 51 17 71q-16-6-9 8 3 8 11 6 8 10 12 1 2-6-3-9l18-13M55 32q22-5 17 16",
  "M15 49 61 16l24 28v39H15ZM15 49h70M36 63a5 5 0 1 0 .1 0M66 59a5 5 0 1 0 .1 0M52 75a3 3 0 1 0 .1 0M46 34l14 5",
  "M20 38 13 14l9-3 12 31M36 42 32 9h10l5 33M50 42l5-29 10 2-5 31M67 41l9-24 10 4-9 26M14 40h73L77 87H25ZM42 63h19",
] as const;
const foodTerms:Record<string,number>={"der Hamburger":0,"der Salat":1,"der Kuchen":2,"der Tee":3,"die Suppe":4,"die Tomate":5,"die Schokolade":6,"das Brötchen":7,"das Ei":8,"das Fleisch":9,"der Käse":10,"die Pommes frites":11};
const hobbyPaths=[
  "M12 64q10-10 20 0t20 0t20 0t20 0M12 79q10-10 20 0t20 0t20 0t20 0M25 54l28-16 19 16M36 44 21 29l20-14M73 29a8 8 0 1 0 .1 0",
  "M20 56h60v18q0 12-12 12H32q-12 0-12-12ZM20 61H9m71 0h11M15 49h70M50 40V29M33 22q-8 9 0 17M66 22q-8 9 0 17M35 49q15-20 30 0",
  "M53 12a8 8 0 1 0 .1 0M49 30 40 50l-17-8M45 37l19 11 18-16M41 51 60 57 48 75 26 91M53 64l22 26M38 38l-12-16",
  "M30 14a9 9 0 1 0 .1 0M30 33v31M30 43l24 5 9-12M30 64 15 91M30 64l17 27M67 18q12 0 12 12v14H59V30q0-12 8-12ZM55 40q0 19 13 19t13-19M68 59v28M56 90h24",
  "M49 13a11 11 0 1 0 .1 0M33 35l-12 14v26M66 36l14 15v25M23 43q14-3 27 6 13-9 27-6v42q-13-5-27 4-13-9-27-4ZM50 49v40",
  "M22 57a18 18 0 1 0 .1 0M78 57a18 18 0 1 0 .1 0M22 75 39 45l21 30H22M60 75l15-37M66 35h14M34 43h14M53 12a8 8 0 1 0 .1 0M51 30 37 41 52 52 46 65M50 31 66 39",
  "M20 49h47l11-21 11 4-1 22-13 9-7 25M63 65H30l-5 23M30 51l-14 13-8-8M44 15a8 8 0 1 0 .1 0M45 33v19l14 10M44 36l28 8M39 66l-2 22",
  "M72 13 85 22 63 56q10 17-3 29-15 13-34-1-17-13-5-28 9-11 25-4ZM72 21 44 65M77 25 49 69M31 61a9 9 0 1 0 .1 0M27 82l-7-7M71 13l5-7M83 20l6-6",
] as const;
const hobbyTerms:Record<string,number>={schwimmen:0,kochen:1,tanzen:2,singen:3,lesen:4,"Rad fahren":5,"Rad / Fahrrad fahren":5,reiten:6,"Gitarre spielen":7};

const semanticPaths={
  speech:"M12 19h76v48H45L25 85V67H12ZM27 35h46M27 48h33",
  calendar:"M19 23h62v65H19ZM19 39h62M33 14v18m34-18v18M31 51h9m13 0h9M31 64h9m13 0h9M31 77h9m13 0h9",
  tablet:"M27 10h46v80H27ZM34 19h32v59H34ZM46 84h8",
  mouse:"M50 18q-26 0-26 35v12q0 24 26 24t26-24V53q0-35-26-35ZM50 18v32M24 50h52M50 18V7",
  lock:"M16 39h68v48H16ZM32 39V26a18 18 0 0 1 36 0v13M50 57v13M47 56a3 3 0 1 0 .1 0",
  message:"M12 25h76v53H12ZM13 26l37 28 37-28M13 77l26-28m48 28L61 49",
  printer:"M28 37V12h44v25M28 70H12V37h76v33H72M28 57h44v33H28ZM37 68h26M37 79h26M74 47h3",
  keyboard:"M10 31h80v46H10ZM21 43h3m10 0h3m10 0h3m10 0h3m10 0h3M21 54h3m10 0h3m10 0h3m10 0h3m10 0h3M28 66h44",
  laptop:"M22 16h56v48H22ZM29 23h42v34H29ZM22 64 9 82h82L78 64M38 75h24",
  screen:"M12 16h76v52H12ZM20 24h60v36H20ZM50 68v15M33 88h34",
  wifi:"M10 35q40-35 80 0M24 50q26-23 52 0M37 64q13-11 26 0M50 80h.1",
  badge:"M22 23h56v59H22ZM39 23v-9h22v9M40 42a8 8 0 1 0 .1 0M28 70q0-16 12-16t12 16M58 45h11M58 59h11",
  train:"M22 12h56v63H22ZM30 22h40v25H30ZM23 57h54M31 65h2m34 0h2M32 75 20 91m48-16 12 16M29 84h42",
  bus:"M17 21q33-13 66 0v57H17ZM25 30h50v26H25ZM17 65h66M26 78v11h9V78m30 0v11h9V78M28 66h4m36 0h4",
  plane:"M45 12h10l5 28 29 19v10L59 58v18l12 10v6L50 85 29 92v-6l12-10V58L11 69V59l29-19Z",
  suitcase:"M23 29h54v55H23ZM38 29V16h24v13M34 30v54m32-54v54M31 84v7m38-7v7",
  backpack:"M22 38q0-20 28-20t28 20v49H22ZM38 18v-8h24v8M32 55h36v24H32ZM22 42H12v30h10m56-30h10v30H78M36 41h28",
  ship:"M10 65h80L77 85H28ZM31 65V40h36v25M42 40V19h18v21M18 93q8-7 16 0t16 0t16 0t16 0",
  map:"M12 24 37 13 63 24 88 13v63L63 87 37 76 12 87ZM37 13v63M63 24v63M22 42l6 7 17-12 10 21 16-6 8 9",
  sign:"M22 21h53l15 15-15 15H22ZM47 51v40M14 65h47l14 12-14 12H14Z",
  walking:"M58 12a9 9 0 1 0 .1 0M52 32 39 54l-18 4M47 41l20 12 14-6M40 55l19 11-8 23M42 57 23 89",
  mountain:"M8 85 36 24 57 66 71 39 93 85ZM27 44l9 9 9-9M62 56l9 6 7-4",
  sail:"M49 10v66H15ZM55 24l28 46H55ZM10 79h80L74 92H26Z",
  ball:"M50 13a37 37 0 1 0 .1 0M50 34l17 12-7 21H40l-7-21ZM50 13v21M15 39l18 7M28 80l12-13m20 0 12 13M67 46l18-7",
  tennis:"M62 12c31 9 17 53-8 53S20 42 32 23q10-16 30-11ZM38 55 16 87l10 7 22-33M35 26l30 24M31 36l26 21M44 17l24 20M39 19l-5 29M50 15l-8 42M62 17 51 61M80 74a10 10 0 1 0 .1 0",
  chess:"M35 12h30v12H35ZM42 8h16M50 3v18M39 25q-10 17 3 27L29 79h42L58 52q13-10 3-27ZM26 80h48v11H26Z",
  music:"M40 19v54q-21-6-23 8-1 14 15 10 11-2 11-15V29l35-9v45q-21-5-23 9-1 14 15 9 11-2 11-15V10Z",
  paint:"M18 71 65 13 81 27 34 84 14 91ZM18 71l16 13M60 20l16 13M17 23h19M26 14v18",
  eye:"M8 50q42-52 84 0-42 52-84 0ZM50 34a16 16 0 1 0 .1 0M50 44a6 6 0 1 0 .1 0",
  ear:"M30 42q-6-31 22-31t24 30q-2 17-18 24-6 3-6 13-2 14-15 10M41 42q-2-16 11-16t10 16l-12 9v10",
  search:"M42 13a27 27 0 1 0 .1 0M62 62l27 27M71 69l-8 8",
  scissors:"M25 58a12 12 0 1 0 .1 0M65 58a12 12 0 1 0 .1 0M33 61 73 13M58 61 22 13M47 45h.1",
  medical:"M17 28h66v60H17ZM35 28V15h30v13M43 40h14v13h13v14H57v13H43V67H30V53h13Z",
  teeth:"M24 16q-12 13-3 35l12 35q7 11 10-8l7-20 7 20q3 19 10 8l12-35q9-22-3-35-12-9-26 0-14-9-26 0ZM36 24q11 5 21 1",
  tools:"M28 10q-19 19-3 35l-14 33q-5 12 6 15 7 2 11-7l15-33q26 1 29-23L59 40 46 28 58 14q-15-6-23 8ZM60 60l24 24M67 53l24 24",
  gears:"M42 9h16l3 12 10 6 12-3 8 14-9 9v12l9 9-8 14-12-3-10 6-3 12H42l-3-12-10-6-12 3-8-14 9-9V47l-9-9 8-14 12 3 10-6ZM50 35a18 18 0 1 0 .1 0",
  parcel:"M14 30 50 12 86 30v48L50 95 14 78ZM14 30l36 18 36-18M50 48v47M32 21l36 18v16M24 67l14 7",
  tray:"M12 67h76M20 64a30 30 0 0 1 60 0M50 34v-9M44 25h12M21 77h58M39 78v10m22-10v10",
  building:"M19 13h62v78H19ZM42 69h16v22M29 25h10v12H29Zm32 0h10v12H61ZM29 47h10v12H29Zm32 0h10v12H61Z",
  education:"M10 36 50 15 90 36 50 57ZM26 45v27q24 17 48 0V45M89 36v36M87 72h4v12h-4",
  scales:"M50 10v79M35 89h30M19 26h62M19 26 5 59h28ZM81 26 67 59h28ZM50 13 19 26m31-13 31 13M5 59q14 16 28 0m34 0q14 16 28 0",
  shopping:"M14 18h11l12 49h44l10-34H29M38 77a7 7 0 1 0 .1 0M76 77a7 7 0 1 0 .1 0M40 45h38M50 32v34m15-34v34",
  plant:"M29 63h42l-7 28H36ZM50 63V17M50 46Q13 43 21 17q26 0 29 29M51 34Q57 8 80 15q4 27-29 31",
  family:"M50 10a10 10 0 1 0 .1 0M50 30v16M18 46h64M18 46v15m32-15v15m32-15v15M18 62a9 9 0 1 0 .1 0M50 62a9 9 0 1 0 .1 0M82 62a9 9 0 1 0 .1 0M7 91q0-15 11-15t11 15M39 91q0-15 11-15t11 15M71 91q0-15 11-15t11 15",
  person:"M50 12a15 15 0 1 0 .1 0M21 89V72q0-27 29-27t29 27v17M35 61v28m30-28v28",
  theatre:"M13 20q19 8 38 0v33Q32 81 13 53ZM21 35h5m12 0h5M22 52q10-9 20 0M51 35q18 7 36 0v35Q69 95 51 70M59 48h5m12 0h5M60 66q9 9 18 0",
  document:"M23 10h36l19 20v60H23ZM59 10v21h19M34 44h32M34 57h32M34 70h22",
  globe:subjectPaths.countries,
  clock:subjectPaths.time,
  meal:subjectPaths.food,
  compare:subjectPaths.descriptions,
  sentence:subjectPaths.grammar,
  round:"M50 16a34 34 0 1 0 .1 0M13 89h74",
  square:"M18 18h64v64H18ZM12 91h76",
  size:"M15 48h23v35H15ZM61 15h24v68H61M14 29h24m-7-7 7 7-7 7M62 94h23",
  price:"M15 20h45l27 28-40 40L15 56ZM30 31a5 5 0 1 0 .1 0M53 45h17M49 53h17M68 37q-17-4-20 13t12 18",
  light:"M50 27a23 23 0 1 0 .1 0M50 7v10M50 83v10M7 50h10m66 0h10M19 19l8 8m46 46 8 8M19 81l8-8m46-46 8-8",
  dark:"M66 13Q20 15 20 51q0 34 38 36Q19 56 66 13ZM77 32h9M82 27v10",
  snow:"M50 10v80M15 30l70 40M15 70l70-40M39 16l11 10 11-10M39 84l11-10 11 10M15 43l16-2-2-16M85 57l-16 2 2 16M15 57l16 2-2 16M85 43l-16-2 2-16",
  celebration:"M20 86 33 41l28 28ZM25 70l12 10M30 55l20 20M45 16l8 15M70 13 60 31M83 40l-19 4M65 59l18 12M25 28l7 4M86 20h.1M48 48h.1",
  wave:"M28 52V28q0-10 8-10t8 10v17-29q0-10 8-10t8 10v28-24q0-10 8-10t8 10v28-15q0-10 8-10t8 10v29q0 28-30 28-18 0-28-16L14 55q-5-11 3-14 6-2 11 11ZM7 25l7 7M15 10l7 9",
  wood:"M15 20h70v65H15ZM25 20q-15 30 5 65M45 20q-21 30 0 65M67 20q-14 30 3 65M54 42q-13 8-5 20t13-2q6-12-8-18Z",
  material:"M17 24 50 10 83 24v55L50 92 17 79ZM17 24l33 15 33-15M50 39v53M29 31v33m42-33v33",
  glass:"M22 14h56L69 89H31ZM25 37h50M36 22l-3 25M35 55l3 22",
  apple:"M50 31q-32-20-34 17-3 36 21 41 9 2 13-3 4 5 13 3 24-5 21-41-2-37-34-17ZM50 30V12M51 24q6-17 23-10-3 15-23 10",
  citrus:"M50 17a34 34 0 1 0 .1 0M50 25a26 26 0 1 0 .1 0M50 25v52M24 51h52M31 32l38 38m0-38L31 70",
  fish:"M12 49q35-35 62 0-27 35-62 0ZM74 49l17-20v40ZM31 45h.1M51 34v30",
  bread:"M12 47q-5-30 21-27 17-17 35-4 24-3 21 31v35H12ZM29 29l-4 16m24-21-3 20m23-21-3 20M13 65h75",
  milk:"M31 10h38v18l10 15v45H21V43l10-15ZM31 28h38M21 43h58M44 43v45M31 10l13 18v15",
  jar:"M27 28h46v60H27ZM24 15h52v13H24ZM28 47h44v24H28M37 19h26",
  drink:"M24 19h52L67 88H33ZM29 49h42M56 49l12-40h20M37 59l9 12m10-13 6 11",
  strawberry:"M25 35q25-19 50 0 10 18-25 56-35-38-25-56ZM50 30 35 13l16 7 12-10-3 18 15-3-7 12M36 44h1m24 2h1M45 57h1m14 8h1m-12 9h1",
  icecream:"M27 47h46L50 92ZM23 46q-9-19 8-23 5-20 23-12 17-2 19 16 14 3 8 19ZM35 60l24 21M64 60 43 81",
  leaf:"M20 79Q7 22 84 13 89 85 20 79ZM20 79 70 30M42 57V35m0 22h22",
  plate:"M12 36h76q-3 37-38 37T12 36ZM19 83h62M26 21h48M35 13v8m15-8v8m15-8v8",
  gift:"M16 40h68v49H16ZM10 28h80v12H10ZM50 28v61M50 28Q17 27 26 12q12-13 24 16ZM50 28q33-1 24-16-12-13-24 16Z",
  sleep:"M12 37v52M88 47v42M12 57h76v18H12M21 43h19v14H21ZM45 47h43M65 13h17L65 30h17",
  clean:"M22 39h56v48H22ZM33 39V24h34v15M43 13V6m14 7V6M33 57l8 8 20-18M65 69h10m-5-5v10",
  chart:"M16 14v74h74M28 61h12v20H28ZM48 43h12v38H48ZM68 22h12v59H68Z",
} as const;
type SemanticIcon=keyof typeof semanticPaths;
const sourceVisuals=new Map<string,SemanticIcon>();
function register(icon:SemanticIcon,...terms:string[]){for(const term of terms)sourceVisuals.set(term,icon);}

register("speech","die Sprache","die Muttersprache","die Fremdsprache","die Aussprache","die Sprechblase","das Gespräch","das Interview","sprechen","sagen","fragen","antworten","erzählen","nachsprechen","weiterfragen","telefonieren","anrufen","chatten","der Chat","die Durchsage");
register("calendar","der Kalender","der Termin","der Tag","das Jahr","der Monat","die Woche","der Wochentag","das Wochenende","der Geburtstag","die Jahreszahl","der Urlaub","der Montag","der Dienstag","der Mittwoch","der Donnerstag","der Freitag","der Samstag","der Sonntag","der Januar","der Februar","der März","der April","der Mai","der Juni","der Juli","der August","der September","der Oktober","der November","der Dezember","heute","morgen","gestern");
register("clock","die Zeit","die Uhrzeit","die Minute","die Stunde","der Moment","warten","dauern");
register("tablet","das Tablet");register("mouse","die Maus");register("lock","das Passwort");register("message","die Nachricht","der Brief","die E-Mail","die E-Mail-Adresse");
register("printer","der Drucker");register("keyboard","die Tastatur");register("laptop","der Laptop");register("screen","der Bildschirm");register("wifi","das WLAN","das Internet","im Internet surfen");
register("badge","die Visitenkarte","der Steckbrief","das Profil","die Anrede","der Name","der Vorname","der Nachname","der Familienname");
register("building","das Büro","die Firma","die Speditionsfirma","die Elektronikfirma","die Abteilung","die Personalabteilung","die Marketingabteilung","die IT-Abteilung","das Start-up");
register("building","der Architekt","die Architektin");
register("train","der Zug","die U-Bahn","die S-Bahn","die Straßenbahn","der Intercity","der Bahnhof","der Hauptbahnhof","der Bahnsteig","das Gleis");
register("bus","der Bus","der Busbahnhof","der Busfahrer","die Busfahrerin");register("plane","das Flugzeug","der Flughafen","der Flug","der Abendflug","die Flugreise","fliegen","abfliegen","landen","der Flugzeugpilot","die Flugzeugpilotin");
register("suitcase","der Koffer","das Gepäck");register("backpack","der Rucksack");register("ship","das Schiff","der Hafen");register("map","die Reise","die Tour","die Fahrt","der Ausflug","die Richtung");register("sign","der Ausgang","das Schild","die Abfahrt");
register("walking","gehen","laufen","der Spaziergang","der Kursspaziergang");register("mountain","die Alpen","wandern");register("sail","segeln");
register("ball","Fußball spielen","der Basketball","der Handball","der Sport");register("tennis","Tennis spielen");register("chess","Schach spielen");register("music","die Musik","das Konzert","der Chor","der Sänger","die Sängerin","der Komponist","die Komponistin");
register("paint","malen","zeichnen","der Maler","die Malerin","der Künstler","die Künstlerin");register("eye","sehen","ansehen","schauen");register("ear","hören","laut");register("search","suchen","finden","recherchieren","der Detektiv","die Detektivin");
register("scissors","der Friseur","die Friseurin","der Schneider","die Schneiderin");register("medical","der Arzt","die Ärztin","der Doktor","der Kinderarzt","die Kinderärztin","der Chirurg","die Chirurgin","die Krankenschwester","der Krankenpfleger","die Medizin","die Praxis");
register("teeth","der Zahn","der Zahnarzt","die Zahnärztin");register("tools","der Mechaniker","die Mechanikerin","der Automechaniker","die Automechanikerin","der Kfz-Mechatroniker","die Kfz-Mechatronikerin","der Mechatroniker","die Mechatronikerin","der Klempner","die Klempnerin","der Installateur","die Installateurin","der Tischler","die Tischlerin","der Schmied","die Schmiedin");
register("gears","der Ingenieur","die Ingenieurin","die Robotik");register("parcel","der Paketzusteller","die Paketzustellerin");register("message","der Postbote","die Postbotin","der Briefträger","die Briefträgerin");register("tray","der Kellner","die Kellnerin");
register("education","der Lehrer","die Lehrerin","der Deutschlehrer","die Deutschlehrerin","der Schüler","die Schülerin","der Student","die Studentin","der Erzieher","die Erzieherin","der Kursleiter","die Kursleiterin","die Ausbildung","das Studium","der Kurs","der Deutschkurs","der Unterricht","die Klasse","der Kursraum");
register("scales","der Rechtsanwalt","die Rechtsanwältin","der Richter","die Richterin");register("shopping","der Verkäufer","die Verkäuferin","der Kassierer","die Kassiererin","der Warenkorb","einkaufen","kaufen","der Einkaufsbummel");
register("plant","der Gärtner","die Gärtnerin","der Landwirt","die Landwirtin","der Bauer","die Bäuerin","die Blume","der Garten");register("theatre","der Schauspieler","die Schauspielerin","das Theater","die Oper");
register("family","die Familie","die Mutter","der Vater","die Schwester","der Bruder","der Onkel","die Tante","die Oma","der Opa","der Großvater","die Großmutter","die Großeltern","die Eltern","der Sohn","die Tochter","das Enkelkind","der Enkel","die Enkelin","die Geschwister","der Ehemann","die Ehefrau","der Verwandte","die Verwandte","der Mann","die Frau","der Papa","die Mama","das Familienmitglied","der Stammbaum");
register("person","das Kind","der Mensch","die Person","der Freund","die Freundin","der Partner","die Partnerin","der Kollege","die Kollegin","der Gast","der Fahrgast","der Besucher","die Besucherin","die Senioren","der Rentner","die Rentnerin");
register("document","das Formular","die Notiz","die Liste","der Text","der Zettel","die Zeitung","die Hausaufgabe","die Aufgabe","die Übung","der Test","der Schnelltest","die Prüfung","der Fragebogen","die Doktorarbeit","der Journalist","die Journalistin","der Schriftsteller","die Schriftstellerin","der Sekretär","die Sekretärin");
register("globe","die Welt","das Land","der Kontinent","Europa","Asien","Nordamerika","die Region");register("sentence","der Satz","das Verb","die Aussage","die W-Frage","die Ja-/Nein-Frage");register("chart","die Tabelle","die Kursstatistik");
register("compare","vergleichen","anders");register("size","groß","klein");register("price","teuer","günstig","der Euro","der Cent","der Preis","das Sonderangebot");register("round","rund");register("square","eckig");register("light","hell-","der Sommer");register("dark","dunkel-","die Nacht","nachts");register("leaf","der Herbst");register("plant","der Frühling");
register("snow","der Winter");register("celebration","das Fest","das Familienfest","das Volksfest","das Weihnachten","das Silvester","feiern");register("wave","Hallo!","Hallo","Tschüs!","Tschüs","Auf Wiedersehen!","Auf Wiedersehen");register("light","Guten Morgen!","Guten Morgen","der Morgen");register("dark","Gute Nacht!","Gute Nacht");
register("speech","Guten Tag!","Guten Tag","Guten Abend!","Guten Abend","Danke!","Vielen Dank!","Herzlichen Dank!","Entschuldigung!","Noch einmal, bitte.","Wie schreibt man …?","Wie bitte?","willkommen");
register("wood","das Holz");register("document","das Papier");register("material","das Material","das Metall","das Plastik","der Kunststoff","das Leder");register("glass","das Glas");
register("apple","der Apfel","das Obst");register("citrus","die Orange","die Zitrone");register("fish","der Fisch","der Fischer","die Fischerin");register("bread","das Brot","das Schinkenbrot","der Bäcker","die Bäckerin","der Müller","die Müllerin");register("milk","die Milch");register("jar","die Marmelade","der Honig");register("drink","der Saft","der Apfelsaft","der Orangensaft","das Wasser","das Getränk");register("strawberry","die Erdbeere");register("icecream","das Eis");
register("meal","das Essen","das Frühstück","das Mittagessen","das Abendessen","die Speise","die Vorspeise","das Hauptgericht","das Dessert","der Nachtisch","die Portion","das Menü","das Restaurant","essen","frühstücken");register("plate","das Müsli","der Reis","die Nudel","die Soße");
register("gift","das Geschenk");register("sleep","schlafen");register("clean","waschen","abwaschen","aufräumen","die Wäsche","der Putzmann","die Putzfrau");

function SourceGlyph({text}:{text:string}){
  return <svg className="subject-vocabulary-illustration subject-word-glyph" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><rect x="11" y="16" width="78" height="68" rx="13" fill="currentColor" opacity=".065"/><text x="50" y="59" textAnchor="middle" fill="currentColor" fontFamily="inherit" fontWeight="650" fontSize={text.length>3?21:29}>{text}</text></svg>;
}

/** Every concrete picture has an exact source-word match; unknown words keep a neutral source glyph. */
export function SubjectVocabularyVisual({de,category,cardId,subject}:{de:string;category:string;cardId:string;subject:StudyConcept}){
  const word=de.normalize("NFC").trim().replace(/\s+/g," ");
  const wrap=(kind:string,visual:ReactNode)=><span className="subject-vocabulary-visual" data-subject-visual={kind} data-subject={subject} aria-hidden="true">{visual}</span>;
  const country=countryForVocabularyIllustration(word,category);
  if(country)return wrap(`country:${country.id}`,<CountryVocabularyIllustration id={country.id}/>);
  if(category==="Language"||languageTerms.has(word))return wrap("language",<LineDrawing path={semanticPaths.speech}/>);
  const colour=exactValue(colours,word);
  if(colour)return wrap(`colour:${word}`,<svg className="subject-vocabulary-illustration" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="33" fill={colour} stroke="currentColor" strokeWidth="2.6"/><path d="M29 39q5-10 16-12" fill="none" stroke={word==="weiß"?"#c5c7c0":"#fff"} strokeWidth="5" strokeLinecap="round" opacity=".65"/></svg>);
  if(category==="Number"&&/^N\d{3}$/.test(cardId)&&Number(cardId.slice(1))<=100)return wrap("number",<SourceGlyph text={String(Number(cardId.slice(1)))}/>);
  if(category==="Alphabet"&&/^A(?:0[1-9]|[12]\d|30)$/.test(cardId))return wrap("letter",<SourceGlyph text={[..."ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß"][Number(cardId.slice(1))-1]!}/>);
  const object=exactValue(objectTerms,word)??exactValue(relatedObjectTerms,word);
  if(object)return wrap(`object:${object}`,<ObjectVocabularyIllustration icon={object}/>);
  const home=homeTerms.get(word);
  if(home)return wrap(`home:${home}`,<HomeIllustration id={home}/>);
  const food=exactValue(foodTerms,word);
  if(food!==undefined)return wrap(`food:${food}`,<LineDrawing path={foodPaths[food]!}/>);
  const hobby=exactValue(hobbyTerms,word);
  if(hobby!==undefined)return wrap(`hobby:${hobby}`,<LineDrawing path={hobbyPaths[hobby]!}/>);
  const geography=geographyIconPath(word);
  if(geography)return wrap("illustrated:geography",<LineDrawing path={geography}/>);
  const refined=refinedIllustrationPath(word);
  if(refined)return wrap("illustrated:refined",<LineDrawing path={refined}/>);
  const semantic=sourceVisuals.get(word);
  if(semantic)return wrap(`semantic:${semantic}`,<LineDrawing path={semanticPaths[semantic]}/>);
  const noun=nounIllustrationPath(word);
  if(noun)return wrap("illustrated:noun",<LineDrawing path={noun}/>);
  const verb=verbIllustrationPath(word);
  if(verb)return wrap("illustrated:verb",<LineDrawing path={verb}/>);
  const expression=expressionIllustrationPath(word);
  if(expression)return wrap("illustrated:expression",<LineDrawing path={expression}/>);
  const grammar=grammarIllustrationPath(word);
  if(grammar)return wrap("illustrated:grammar",<LineDrawing path={grammar}/>);
  const headword=word.replace(/^(?:der|die|das) /u,"");
  return wrap("source-glyph",<SourceGlyph text={[...headword].slice(0,3).join("")||"·"}/>);
}
