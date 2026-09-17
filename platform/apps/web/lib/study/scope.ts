/** Shared course selection. The available ceiling advances only after each lesson is integrated. */
export const LAST_AVAILABLE_LESSON = 6;
export const A1_LESSON_COUNT = 12;
export const STUDY_SCOPE_KEY = "german-study-scope-v1";

export const studyConcepts = [
  {id:"introductions",label:"Introductions & greetings"},
  {id:"people",label:"People, family & jobs"},
  {id:"countries",label:"Countries & languages"},
  {id:"numbers",label:"Numbers, prices & time"},
  {id:"home",label:"Home & furniture"},
  {id:"objects",label:"Everyday objects"},
  {id:"colours-materials",label:"Colours, shapes & materials"},
  {id:"office",label:"Office & communication"},
  {id:"grammar",label:"Articles & sentence patterns"},
  {id:"verbs",label:"Verbs & conjugation"},
  {id:"conversation",label:"Useful conversations"},
  {id:"questions",label:"Questions & answers"},
  {id:"classroom",label:"Learning & classroom"},
  {id:"descriptions",label:"Describing & comparing"},
  {id:"everyday",label:"Everyday vocabulary"},
] as const;
export type StudyConcept = typeof studyConcepts[number]["id"];
export type StudySource = "course" | "teacher-extra" | "study-extra";
export type StudyTags = {lessons:number[];concepts:StudyConcept[];source:StudySource;sources?:StudySource[]};
export type StudyScope = {
  mode:"all"|"one"|"multiple"|"through";
  lessons:number[];
  concepts:StudyConcept[];
  source:"all"|StudySource;
};
export const defaultStudyScope = ():StudyScope => ({mode:"all",lessons:[],concepts:[],source:"all"});
export const availableLessons = () => Array.from({length:LAST_AVAILABLE_LESSON},(_,i)=>i+1);
export function selectedLessons(scope:StudyScope):number[]{
  if(scope.mode==="all")return availableLessons();
  if(scope.mode==="through")return availableLessons().filter(n=>n<=(scope.lessons[0]??0));
  return scope.lessons.filter(n=>n<=LAST_AVAILABLE_LESSON);
}
export function parseStudyScope(raw:string|null):StudyScope{
  if(!raw)return defaultStudyScope();
  const input:unknown=JSON.parse(raw);
  if(!input||typeof input!=="object")throw Error("Invalid study selection");
  const value=input as Record<string,unknown>;
  if(!["all","one","multiple","through"].includes(String(value.mode)))throw Error("Invalid selection mode");
  const mode=value.mode as StudyScope["mode"];
  if(!Array.isArray(value.lessons)||!value.lessons.every(n=>Number.isInteger(n)&&n>=1&&n<=A1_LESSON_COUNT))throw Error("Invalid lessons");
  const lessons=[...new Set(value.lessons as number[])].sort((a,b)=>a-b);
  if((mode==="one"||mode==="through")&&lessons.length!==1)throw Error("Choose one lesson");
  if(!Array.isArray(value.concepts)||!value.concepts.every(id=>studyConcepts.some(c=>c.id===id)))throw Error("Invalid concepts");
  if(!["all","course","teacher-extra","study-extra"].includes(String(value.source)))throw Error("Invalid source");
  return {mode,lessons,concepts:[...new Set(value.concepts)] as StudyConcept[],source:value.source as StudyScope["source"]};
}
export function matchesStudyScope(tags:StudyTags,scope:StudyScope):boolean{
  return (tags.lessons.length?tags.lessons.some(n=>selectedLessons(scope).includes(n)):scope.mode==="all")
    &&(!scope.concepts.length||tags.concepts.some(c=>scope.concepts.includes(c)))
    &&(scope.source==="all"||(tags.sources??[tags.source]).includes(scope.source));
}
export function scopeLabel(scope:StudyScope):string{
  const lessons=selectedLessons(scope);
  if(!lessons.length)return "No lessons selected";
  if(scope.mode==="all")return `Lessons 1–${LAST_AVAILABLE_LESSON}`;
  if(scope.mode==="through")return `Through Lesson ${lessons.at(-1)}`;
  return lessons.length===1?`Lesson ${lessons[0]}`:`Lessons ${lessons.join(", ")}`;
}
export function numericLessons(values:readonly string[]):number[]{
  return [...new Set(values.flatMap(value=>{
    const range=value.match(/^(\d+)[–-](\d+)$/);
    if(range)return Array.from({length:Number(range[2])-Number(range[1])+1},(_,i)=>Number(range[1])+i);
    const module=value.match(/^Module (\d+)$/);
    if(module)return [1,2,3].map(n=>(Number(module[1])-1)*3+n);
    const number=Number(value.replace(/^lesson:/,""));
    return Number.isInteger(number)&&number>0&&number<=A1_LESSON_COUNT?[number]:[];
  }))].sort((a,b)=>a-b);
}
export const lessonConcepts:Record<number,StudyConcept[]> = {
  1:["introductions","countries","conversation","verbs","grammar","questions","classroom"],
  2:["people","numbers","verbs","grammar","conversation","questions"],
  3:["people","countries","verbs","grammar","conversation","questions"],
  4:["home","numbers","grammar","conversation","questions","descriptions"],
  5:["objects","colours-materials","grammar","conversation","verbs","questions","classroom"],
  6:["office","objects","numbers","verbs","grammar","conversation","questions"],
};
export function tagsForLesson(lesson:number):StudyTags{
  return {lessons:[lesson],concepts:lessonConcepts[lesson]??[],source:"course"};
}
