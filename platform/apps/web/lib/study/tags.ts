import type {WordCard} from "../content/word-card-types";
import type {LearnerHubRecord} from "../content/hub-types";
import {studyUnits} from "./course-lessons";
import {homeWords} from "./home";
import {lessonFourWords} from "./lesson-four";
import {numericLessons,type StudyConcept,type StudyTags} from "./scope";

const homeTerms=new Set(homeWords.map(word=>word.de));
const officeTerms=new Set(["die Arbeit","das Büro","der Computer","der Laptop","der Drucker","die Tastatur","die Maus","der Bildschirm","das Telefon","der Termin","die E-Mail","die Nachricht","der Arbeitsplatz","der Schreibtisch"]);
const numberTerms=new Set(["der Euro","der Cent","der Preis","das Jahr","der Tag","die Zahl","die Nummer","die Telefonnummer","die Uhr"]);
const classroomTerms=new Set(["das Wort","der Satz","die Frage","die Antwort","das Buch","der Text","das Gespräch","das Interview","der Partner","die Partnerin","die Übung","der Kurs","die Klasse","der Unterricht","die Hausaufgabe","das Wörterbuch"]);
const categoryConcepts:Record<string,StudyConcept[]>={
  "Question word":["questions","grammar"],Pronoun:["grammar"],Verb:["verbs"],
  Greeting:["introductions","conversation"],"Function word":["grammar"],
  Country:["countries"],Language:["countries"],Geography:["countries"],
  Interjection:["conversation"],"Adjective / adverb":["descriptions"],Adjective:["descriptions"],
  Profession:["people"],Family:["people"],Number:["numbers"],Alphabet:["classroom","conversation"],Expression:["conversation"],
};
export function wordStudyTags(card:WordCard):StudyTags{
  const numbered=numericLessons(card.lessons);
  const lessons=[...new Set([...numbered,...(card.teacherRows.length?[2]:[])])].sort((a,b)=>a-b);
  const concepts=new Set<StudyConcept>(categoryConcepts[card.category]??[]);
  for(const row of card.rows){
    const word=row.singular.text;
    if(homeTerms.has(word))concepts.add("home");
    if(officeTerms.has(word))concepts.add("office");
    if(numberTerms.has(word))concepts.add("numbers");
    if(classroomTerms.has(word))concepts.add("classroom");
  }
  const lessonFour=lessonFourWords.find(word=>word.id===card.id);
  if(lessonFour?.category==="Furniture")concepts.add("home");
  if(lessonFour?.category==="Adjectives")concepts.add("descriptions");
  if(lessonFour?.category==="Verbs")concepts.add("verbs");
  for(const unit of studyUnits){const word=unit.words?.find(w=>w.id===card.id||card.aliases.includes(`/vocabulary/${w.id}`));if(!word)continue;
    if(word.category==="Objects"||word.category==="Shopping")concepts.add("objects");
    if(["Materials","Colours"].includes(word.category))concepts.add("colours-materials");
    if(["Forms","Office"].includes(word.category))concepts.add("office");
    if(word.category==="Food"||(unit.number===9&&word.category==="Verbs"))concepts.add("food");
    if(word.category==="People")concepts.add("people");
    if(["Hobbies","Frequency"].includes(word.category)||(unit.number===7&&word.category==="Verbs"))concepts.add("hobbies");
    if(word.category==="Time"){concepts.add("numbers");if(unit.number>=8)concepts.add("time");}
    if(unit.number===8&&["Places","Grammar","Verbs","Conversation","Questions"].includes(word.category))concepts.add("time");
    if(word.category==="Classroom")concepts.add("classroom");
    if(word.category==="Grammar")concepts.add("grammar");
  }
  if(!concepts.size)concepts.add("everyday");
  const teacher=card.teacherRows.length>0||card.priorities.includes("Teacher extra");
  const core=numbered.length>0;
  const source=teacher&&!core?"teacher-extra":"course";
  return {lessons,concepts:[...concepts],source,sources:teacher&&core?["course","teacher-extra"]:[source],sourceLessons:{...(core?{course:numbered}:{}),...(teacher?{"teacher-extra":[2]}:{})}};
}
export function hubStudyTags(record:LearnerHubRecord):StudyTags{
  if(record.wordFamily)return wordStudyTags(record.wordFamily);
  const concepts:StudyConcept[]=record.kind==="Verb"?["verbs"]:record.kind==="GrammarConcept"?["grammar"]:record.kind==="QAPair"||record.kind==="PhrasePattern"?["conversation",...(record.displayLabel.includes("?")?["questions" as const]:[])]:["everyday"];
  return {lessons:numericLessons(record.lessonIds),concepts,source:"course"};
}
