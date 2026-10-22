import type {WordForm} from "../content/word-card-types";
import {studyConcepts,type StudyConcept,type StudyTags} from "./scope";
import type {SavedItem} from "./types";

/** Serializable row data; catalog loading stays in subject-sheets.server.ts. */
export type SubjectVocabularyItem={
  id:string;
  legacyIds?:string[];
  cardId:string;
  de:string;
  meaning:string;
  category:string;
  tone:WordForm["tone"];
  audio:string|null;
  plurals:WordForm[];
  href:string;
  studyTags:StudyTags;
  savedItem:SavedItem;
  examples:{de:string;en:string;audio:string|null}[];
  patterns:string[];
  note:string;
};

export type SubjectSheet={
  id:StudyConcept;
  label:string;
  relatedHref?:string;
  items:SubjectVocabularyItem[];
};
export type SubjectSheetMetadata=Omit<SubjectSheet,"items">;

const relatedSheets:Record<StudyConcept,string>={
  introductions:"/cheat-sheets/conversation#conversation-flow",
  people:"/cheat-sheets/people",
  countries:"/cheat-sheets",
  numbers:"/cheat-sheets/numbers",
  home:"/cheat-sheets/home",
  objects:"/cheat-sheets/objects",
  "colours-materials":"/cheat-sheets/objects#materials",
  office:"/cheat-sheets/office",
  seasons:"/cheat-sheets/journeys",
  past:"/cheat-sheets/past",
  travel:"/cheat-sheets/travel",
  food:"/cheat-sheets/food",
  time:"/cheat-sheets/time",
  hobbies:"/cheat-sheets/hobbies",
  grammar:"/cheat-sheets/verbs#sentence-position",
  verbs:"/cheat-sheets/verbs",
  conversation:"/cheat-sheets/conversation",
  questions:"/cheat-sheets/questions",
  classroom:"/cheat-sheets/conversation#conversation-spelling",
  descriptions:"/cheat-sheets/home#home-describe",
  everyday:"/vocabulary",
};

export const subjectSheets:SubjectSheetMetadata[]=studyConcepts.map(subject=>({
  ...subject,relatedHref:relatedSheets[subject.id],
}));

export function subjectSheetHref(id:StudyConcept):string{
  return `/cheat-sheets/subjects/${id}`;
}

export type SubjectVocabularyGroup={
  id:string;
  label:string;
  tone:WordForm["tone"];
  items:SubjectVocabularyItem[];
};

const groupDefinitions:{id:string;label:string;tone:WordForm["tone"]}[]=[
  {id:"male",label:"Masculine",tone:"male"},
  {id:"female",label:"Feminine",tone:"female"},
  {id:"neuter",label:"Neuter",tone:"neuter"},
  {id:"plural",label:"Plural forms",tone:"plural"},
  {id:"verbs",label:"Verbs & actions",tone:"plain"},
  {id:"names",label:"Names & languages",tone:"plain"},
  {id:"numbers",label:"Numbers",tone:"plain"},
  {id:"letters",label:"Letter names",tone:"plain"},
  {id:"expressions",label:"Expressions",tone:"plain"},
  {id:"descriptions",label:"Describing words",tone:"plain"},
  {id:"sentence-words",label:"Sentence & question words",tone:"plain"},
  {id:"words",label:"Other words",tone:"plain"},
];

function groupId(item:SubjectVocabularyItem):string{
  if(item.tone!=="plain")return item.tone;
  switch(item.category){
    case "Verb":return "verbs";
    case "Country":case "Geography":case "Language":return "names";
    case "Number":return "numbers";
    case "Alphabet":return "letters";
    case "Greeting":case "Expression":case "Interjection":return "expressions";
    case "Adjective":case "Adjective / adverb":case "Adjectives":return "descriptions";
    case "Pronoun":case "Function word":case "Functionword":case "Question word":case "Questionword":return "sentence-words";
    default:return "words";
  }
}

/** Plain forms retain their category: an article-free name is not a non-noun. */
export function subjectVocabularyGroups(items:readonly SubjectVocabularyItem[]):SubjectVocabularyGroup[]{
  const grouped=new Map<string,SubjectVocabularyItem[]>();
  for(const item of items){
    const id=groupId(item);
    const group=grouped.get(id)??[];
    group.push(item);
    grouped.set(id,group);
  }
  return groupDefinitions.flatMap(definition=>{
    const group=grouped.get(definition.id);
    return group?.length?[{...definition,items:group.sort((a,b)=>a.de.localeCompare(b.de,"de")||a.id.localeCompare(b.id))}]:[];
  });
}
