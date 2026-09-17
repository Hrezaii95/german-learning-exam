import five from "../../generated/lesson-five-study.json";
import six from "../../generated/lesson-six-study.json";
import seven from "../../generated/lesson-seven-study.json";
import eight from "../../generated/lesson-eight-study.json";
import ten from "../../generated/lesson-ten-study.json";
import nine from "../../generated/lesson-nine-study.json";
import type {StudyWord} from "./lesson-four";
import three from "../../generated/lesson-three-study.json";
import {lessonFourConcepts,lessonFourPhrases,lessonFourVerbs,lessonFourQuiz} from "./lesson-four";
export type StudyUnit={
  number:number;summary:string;words?:StudyWord[];
  concepts:{id:string;title:string;de:string;en:string;examples:string[];source?:string}[];
  verbs:{verb:string;meaning:string;forms:string[];tip:string;source?:string;priority?:string}[];
  phrases:{de:string;en:string;note?:string;source?:string}[];
  quiz:{q:string;options:string[];answer:string;why:string}[];
};
export const studyUnits:StudyUnit[]=[three,{
  number:4,summary:"Describe furniture, share opinions and ask the price.",
  concepts:lessonFourConcepts,verbs:lessonFourVerbs,
  phrases:lessonFourPhrases.map(([de,en])=>({de,en})),quiz:lessonFourQuiz,
},five,six,seven,eight,nine,ten];
