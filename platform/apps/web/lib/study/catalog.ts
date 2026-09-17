import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadWordCards } from "../content/word-cards";
import { lessonFourWords, lessonFourVerbs, lessonFourPhrases } from "./lesson-four";
import type { BookManifest, BookAnswer, DictionaryEntry } from "./types";
import type { LearnerQaDetail } from "../content/detail-types";
import { phraseMeanings, bookPhraseMeanings } from "./phrase-meanings";
import { phraseKey } from "./lookup";
import { countries, countryName, countryFrom, countryOriginMeaning, countryGroups, languageMeanings } from "./countries";
import { bookTranscript } from "../audio/listening-transcripts";
import { homeWords, homeLabels, homePhrases } from "./home";
import {grammarPatterns,conversationFrames,verbModels,spokenVerb} from "./sheet-topics";
import {questionWords,questionBuilders,questionReplyCases,questionWordLessons} from "./questions";
import {studyUnits} from "./course-lessons";
import {tagsForLesson} from "./scope";
import {objectModels,objectSentences,materialModels} from "./object-sheet";
import {officeModels,officeSentence,officeMeaning,phoneSteps,type OfficeMode} from "./office-sheet";
import {hobbyModels,hobbyPeople,abilityLevels,frequencyWords,abilitySentence,abilityMeaning,frequencySentence,frequencyMeaning} from "./hobbies-sheet";
import {clockSaveId,clockHours,clockMinutes,clockSentence,clockMeaning,weekDays,timePlaces,planSentence,planMeaning} from "./time-sheet";
const generated = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../generated",
);

export function loadBook(): BookManifest {
  const raw = JSON.parse(
    readFileSync(join(generated, "interactive-book.json"), "utf8"),
  ) as BookManifest;
  const answers = loadBookAnswers();
  // Only reading data crosses the server/client boundary. Source paths and
  // checksums stay in the build manifest for release verification.
  return {
    version: raw.version,
    credit: "Momente A1 · © Hueber Verlag.",
    pages: raw.pages.map(page=>({...page,answers:answers.filter(answer=>answer.pageId===page.id)})),
    audio: raw.audio.map(
      ({ id, lesson, kind, exercise, label, src, pageId }) => ({
        id,
        lesson,
        kind,
        exercise,
        label,
        src,
        pageId,
        transcript: bookTranscript(id)!,
      }),
    ),
  };
}
export function loadBookAnswers(): BookAnswer[] {
  return JSON.parse(readFileSync(join(generated,"book-answers.json"),"utf8")) as BookAnswer[];
}
export function loadStudySpeech(): Record<string, string> {
  return JSON.parse(
    readFileSync(join(generated, "study-speech.json"), "utf8"),
  ) as Record<string, string>;
}
export function loadCountrySpeech(): Record<string,string> {
  return JSON.parse(readFileSync(join(generated,"country-speech.json"),"utf8")) as Record<string,string>;
}
export function loadDictionary(): DictionaryEntry[] {
  const entries: DictionaryEntry[] = loadWordCards().cards.map((card) => ({
    id: card.id,
    ...(card.studyTags?{studyTags:card.studyTags}:{}),
    de: card.rows.map((r) => r.singular.text).join(" / "),
    en: card.title,
    forms: card.rows.flatMap((r) => [
      r.singular.text,
      ...r.plurals.map((p) => p.text),
    ]),
    example: card.examples[0]?.de ?? "",
    translation: card.examples[0]?.en ?? "",
    href: card.path,
    audio: card.rows[0]?.singular.audio ?? null,
    kind: "word",
    displayForms: card.rows.flatMap(row => [row.singular, ...row.plurals].map(form => ({
      text: form.text,
      tone: form.tone,
      label: { male: "Masculine · der", female: "Feminine · die", neuter: "Neuter · das", plural: "Plural · die", plain: form.label }[form.tone],
    }))),
  }));
  for (const word of lessonFourWords) {
    const verb = lessonFourVerbs.find((v) => v.verb === word.de);
    const entry = entries.find((item) => item.id === word.id)!;
    entry.forms = [...entry.forms, ...(verb?.forms ?? [])];
  }
  const speech=loadStudySpeech();
  const addStudySentence=(id:string,de:string,en:string,lesson:number,href:string,saveId?:string)=>entries.push({id,de,en,forms:[de],example:"",translation:"",href,audio:speech[de]??null,kind:"sentence",studyTags:tagsForLesson(lesson),...(saveId?{saveId}:{})});
  objectModels.forEach((m,i)=>{
    const material=materialModels.find(row=>row[0]===m.material)?.[1]??m.material;
    const colours:Record<string,string>={braun:"brown",blau:"blue",schwarz:"black",grün:"green",grau:"grey"};
    const meanings=[`This is a ${m.en}.`,`This is not a ${m.en}.`,`The ${m.en} is made of ${material}.`,`It is ${colours[m.colour]}.`];
    objectSentences(i).forEach((de,n)=>addStudySentence(`objects-${i}-${n}`,de,meanings[n]!,5,"/cheat-sheets/objects#object-lab",n<2?`l5-description-${i}-${n===1}`:undefined));
  });
  officeModels.forEach((_,i)=>{
    for(const mode of ["identify","have","need","find"] as OfficeMode[])for(const negative of [false,true])for(const plural of [false,true])addStudySentence(`office-${i}-${mode}-${negative}-${plural}`,officeSentence(i,mode,negative,plural),officeMeaning(i,mode,negative,plural),6,"/cheat-sheets/office#office-lab",`l6-office-${i}-${mode}-${negative}-${plural}`);
  });
  phoneSteps.forEach((p,i)=>addStudySentence(`office-phone-${i}`,p.de,p.en,6,"/cheat-sheets/office#phone-lab",`l6-phone-${i}`));
  hobbyModels.forEach((_,h)=>{
    hobbyPeople.forEach((_,p)=>abilityLevels.forEach((_,a)=>[false,true].forEach(q=>addStudySentence(`hobby-${h}-${p}-${a}-${q}`,abilitySentence(h,p,a,q),abilityMeaning(h,p,a,q),7,"/cheat-sheets/hobbies#ability-lab",`l7-ability-${h}-${p}-${a}-${q}`))));
    frequencyWords.forEach((_,f)=>addStudySentence(`hobby-frequency-${h}-${f}`,frequencySentence(h,f),frequencyMeaning(h,f),7,"/cheat-sheets/hobbies#frequency-lab",`l7-frequency-${h}-${f}`));
  });
  clockHours.forEach(h=>clockMinutes.forEach(m=>(["official","everyday"] as const).filter(mode=>mode==='official'||h<12).forEach(mode=>addStudySentence(`clock-${h}-${m}-${mode}`,clockSentence(h,m,mode),clockMeaning(h,m,mode),8,"/cheat-sheets/time#clock-lab",clockSaveId(h,m,mode)))));
  weekDays.forEach((_,d)=>timePlaces.forEach((_,p)=>[false,true].forEach(front=>addStudySentence(`plan-${d}-${p}-${front}`,planSentence(d,p,front),planMeaning(d,p),8,"/cheat-sheets/time#plan-lab",`l8-plan-${d}-${p}-${front}`))));
  for(const unit of studyUnits){
    for(const verb of unit.verbs){const entry=entries.find(e=>e.de===verb.verb||e.de.startsWith(verb.verb+" "));if(entry)entry.forms=[...new Set([...entry.forms,...verb.forms])];}
    for(const [index,phrase] of unit.phrases.entries())entries.push({id:`unit-${unit.number}-phrase-${index}`,saveId:`l${unit.number}-phrase-${index}`,de:phrase.de,en:phrase.en,forms:[phrase.de],example:"",translation:"",href:`/lessons/${String(unit.number).padStart(2,"0")}#phrases`,audio:speech[phrase.de]??null,kind:"phrase",studyTags:{...tagsForLesson(unit.number),concepts:["conversation"]}});
  }
  const instructions: [string, string, string[]][] = [
    ["lesen", "to read", ["Lesen", "lies", "liest"]],
    ["hören", "to listen / hear", ["Hören", "hört"]],
    ["ergänzen", "to fill in / complete", ["Ergänzen"]],
    ["zuordnen", "to match / assign", ["ordnen", "Ordnen"]],
    ["verbinden", "to connect / match", ["Verbinden"]],
    ["ankreuzen", "to tick / mark with a cross", ["kreuzen", "Kreuzen"]],
    ["markieren", "to highlight / mark", ["Markieren"]],
    ["vergleichen", "to compare", ["Vergleichen"]],
    ["notieren", "to note down", ["Notieren"]],
    ["schreiben", "to write", ["Schreiben", "schreibt"]],
    ["sehen", "to see / look", ["Sehen", "siehst", "sieht"]],
    ["richtig", "correct / right", []],
    ["falsch", "wrong / incorrect", []],
    ["Gespräch", "conversation", ["Gespräche", "Gesprächen"]],
    ["Wort", "word", ["Wörter", "Wörtern"]],
    ["Satz", "sentence", ["Sätze", "Sätzen"]],
    ["Frage", "question", ["Fragen"]],
    ["Antwort", "answer", ["Antworten"]],
    ["welcher", "which", ["welche", "welches", "welchen"]],
    ["sein", "to be", ["bin", "bist", "ist", "sind", "seid"]],
    ["haben", "to have", ["habe", "hast", "hat", "habt"]],
    ["sprechen", "to speak", ["spreche", "sprichst", "spricht", "sprecht"]],
    ["er", "he / it (masculine noun)", []],
    ["es", "it (neuter noun)", []],
    ["sie", "she / they; formal Sie = you", []],
    ["der", "the (masculine nominative)", []],
    ["das", "the (neuter nominative); that", []],
    ["die", "the (feminine or plural nominative)", []],
  ];
  instructions.forEach(([de, en, forms], index) =>
    entries.push({
      id: `instruction-${index}`,
      de,
      en,
      forms,
      example: "",
      translation: "",
      href: "/book",
      audio: null,
    }),
  );

  // Reuse every translated card example, not just the first example on a card.
  for (const card of loadWordCards().cards) {
    card.examples.forEach((example, index) => {
      if (!example.de || !example.en) return;
      entries.push({ id: `example-${card.id}-${index}`, de: example.de, en: example.en,
        forms: [], example: "", translation: "", kind: "sentence", href: card.path,
        audio: example.audio ?? speech[example.de] ?? null });
    });
  }
  const details = JSON.parse(readFileSync(join(generated, "learner-details.json"), "utf8")) as {
    details: { kind: string }[];
  };
  for (const detail of details.details) {
    if (detail.kind !== "QAPair") continue;
    const qa = detail as LearnerQaDetail;
    qa.acceptedRealizations.forEach((de, index) => {
      const en = phraseMeanings[de];
      if (!en) throw new Error(`Missing phrase meaning: ${de}`);
      entries.push({ id: `${qa.id}-${index}`, de, en, forms: [], example: "", translation: "",
        kind: "phrase", href: qa.canonicalPath, audio: speech[de] ?? null });
    });
  }
  lessonFourPhrases.forEach(([de, en], index) => entries.push({
    id: `l4-phrase-${index}`, saveId: `l4-phrase-${index}`, de, en, forms: [],
    example: "", translation: "", kind: "phrase", href: "/lessons/04#phrases",
    audio: speech[de] ?? null,
  }));
  const pages = loadBook().pages;
  Object.entries(bookPhraseMeanings).forEach(([de, en], index) => {
    const page = pages.find(p => p.lines.some(line => phraseKey(line.text).includes(phraseKey(de))));
    entries.push({ id: `book-meaning-${index}`, de, en, forms: [], example: "", translation: "",
      kind: "sentence", href: `/book?page=${page?.id ?? "coursebook-30"}`, audio: speech[de] ?? null });
  });
  const countrySpeech = loadCountrySpeech();
  for (const country of countries) {
    const de = countryName(country);
    const existing = entries.find(entry => entry.kind === "word" && entry.de === de);
    const displayForms = [{text:de,tone:country.group,label:countryGroups[country.group].label}];
    if (existing) {
      existing.displayForms = displayForms;
      if (country.dative) existing.forms.push(country.dative);
    } else entries.push({id:`country-${country.id}`,de,en:country.en,forms:[country.name,country.dative??country.name],
      example:`Ich komme ${countryFrom(country)}.`,translation:countryOriginMeaning(country),href:`/cheat-sheets#country-${country.id}`,
      audio:countrySpeech[de]??null,kind:"word",displayForms});
    entries.push({id:`country-origin-${country.id}`,de:`Ich komme ${countryFrom(country)}.`,en:countryOriginMeaning(country),forms:[],example:"",translation:"",
      href:`/cheat-sheets#country-${country.id}`,kind:"sentence",audio:countrySpeech[`Ich komme ${countryFrom(country)}.`]??null});
  }
  for (const [de,en] of Object.entries(languageMeanings)) {
    if (entries.some(entry=>entry.kind==="word"&&entry.de===de)) continue;
    entries.push({id:`language-${de}`,de,en,forms:de==="Persisch"?["Farsi"]:[],example:`Ich spreche ${de}.`,translation:`I speak ${en.split(" / ")[0]}.`,
      href:"/cheat-sheets",kind:"word",audio:countrySpeech[de]??null,displayForms:[{text:de,tone:"neuter",label:"Language · normally no article"}]});
  }
  const homeSpeech = loadHomeSpeech();
  for (const word of homeWords) {
    if (entries.some(entry=>entry.kind==="word"&&entry.de===word.de)) continue;
    entries.push({id:`home-${word.id}`,saveId:`home-${word.id}`,de:word.de,en:word.en,forms:word.plural?[word.plural]:[],example:"",translation:"",kind:"word",href:`/cheat-sheets/home#home-${word.id}`,audio:homeSpeech[word.de]??null,displayForms:[{text:word.de,tone:word.tone,label:homeLabels[word.tone]},...(word.plural?[{text:word.plural,tone:"plural" as const,label:"Plural · die"}]:[])]});
  }
  homePhrases.forEach((phrase,index)=>{
    if(entries.some(entry=>entry.de===phrase.de))return;
    entries.push({id:`home-phrase-${index}`,saveId:`home-phrase-${index}`,de:phrase.de,en:phrase.en,forms:[],example:"",translation:"",kind:"phrase",href:"/cheat-sheets/home#home-describe",audio:homeSpeech[phrase.de]??null});
  });
  const collectionSpeech=loadCollectionSpeech();
  const addQuestion=(id:string,de:string,en:string,studyTags?:ReturnType<typeof tagsForLesson>,saveId?:string)=>{
    if(entries.some(entry=>entry.de===de))return;
    entries.push({id:`question-${id}`,de,en,forms:[],example:"",translation:"",href:"/cheat-sheets/questions",audio:speech[de]??collectionSpeech[de]??null,kind:"phrase",...(studyTags?{studyTags}:{}),...(saveId?{saveId}:{})});
  };
  for(const word of questionWords){const tags:ReturnType<typeof tagsForLesson>={lessons:questionWordLessons(word),concepts:["questions","grammar"],source:word.lesson?"course":"study-extra"};addQuestion(word.id,word.word,word.meaning,tags);addQuestion(`${word.id}-ask`,word.question,word.translation,tags,`question-${word.id}`);addQuestion(`${word.id}-answer`,word.answer,word.answerMeaning,tags);}
  for(const builder of questionBuilders){for(const [i,parts] of [builder.w,builder.formal,builder.yes,builder.yesFormal].entries())addQuestion(`${builder.id}-${i}`,parts.join(" "),i<2?builder.meaning:builder.yesMeaning,tagsForLesson(builder.lesson),`question-builder-${builder.id}-${i===1||i===3}-${i>=2}`);}
  for(const [i,reply] of questionReplyCases.entries()){addQuestion(`reply-${i}`,reply.question,reply.translation);addQuestion(`reply-${i}-yes`,reply.yes,reply.yesMeaning);addQuestion(`reply-${i}-no`,reply.no,reply.noMeaning);}
  for(const [i,[de,en]] of [["Wer kommt aus dem Iran?","Who comes from Iran?"],["Welche Sprache sprichst du?","Which language do you speak?"],["Welcher Tisch ist schön?","Which table is beautiful?"],["Welches Buch ist das?","Which book is that?"]].entries())addQuestion(`example-${i}`,de!,en!);
  for(const p of grammarPatterns) entries.push({id:`sheet-pattern-${p.id}`,de:p.de,en:p.en,forms:[p.de],example:p.de,translation:p.en,href:`/cheat-sheets/verbs#pattern-${p.id}`,audio:collectionSpeech[p.de]??null,kind:"sentence",saveId:`sheet-pattern-${p.id}`});
  for(const f of conversationFrames){for(const [i,de] of [f.casual,f.formal,f.answer,...(f.formalAnswer?[f.formalAnswer]:[])].entries()){if(entries.some(e=>e.de===de))continue;const en=i<2?f.en:f.answerEn;entries.push({id:`sheet-conversation-${f.id}-${i}`,de,en,forms:[de],example:de,translation:en,href:"/cheat-sheets/conversation#sheet-workshop",audio:collectionSpeech[de]??null,kind:"phrase"});}}
  for(const v of verbModels){const entry=entries.find(e=>e.forms.includes(v.verb));if(entry)entry.forms.push(...v.forms,...v.forms.map((f,i)=>spokenVerb(i,f)));}
  return entries;
}
export function loadCollectionSpeech():Record<string,string>{return JSON.parse(readFileSync(join(generated,"collection-speech.json"),"utf8")) as Record<string,string>;}
export function loadHomeSpeech(): Record<string,string> {
  return JSON.parse(readFileSync(join(generated,"home-speech.json"),"utf8")) as Record<string,string>;
}
