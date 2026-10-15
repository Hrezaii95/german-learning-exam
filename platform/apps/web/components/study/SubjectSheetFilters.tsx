"use client";

import {useMemo} from "react";
import {useStudyScope} from "./StudyScope";
import {availableLessons,matchesStudyScope,selectedLessons,studyConcepts,type StudyConcept} from "@/lib/study/scope";
import type {SubjectVocabularyItem} from "@/lib/study/subject-sheets";

const lessons=availableLessons();

/** The sheet controls edit the same persisted selection as the rest of the site. */
export function SubjectSheetFilters({items}:{items:readonly SubjectVocabularyItem[]}){
  const {scope,setScope,ready,error}=useStudyScope();
  const chosenLessons=scope.mode==="all"?[]:selectedLessons(scope);
  const counts=useMemo(()=>({
    lessons:new Map(lessons.map(lesson=>[lesson,items.filter(item=>matchesStudyScope(item.studyTags,{...scope,mode:"one",lessons:[lesson]})).length])),
    concepts:new Map(studyConcepts.map(concept=>[concept.id,items.filter(item=>matchesStudyScope(item.studyTags,{...scope,concepts:[concept.id]})).length])),
    matching:items.filter(item=>matchesStudyScope(item.studyTags,scope)).length,
  }),[items,scope]);

  const toggleLesson=(lesson:number,checked:boolean)=>{
    const next=checked?[...chosenLessons,lesson]:chosenLessons.filter(value=>value!==lesson);
    setScope({...scope,mode:next.length?"multiple":"all",lessons:next});
  };
  const toggleConcept=(concept:StudyConcept,checked:boolean)=>setScope({
    ...scope,concepts:checked?[...scope.concepts,concept]:scope.concepts.filter(value=>value!==concept),
  });

  return <div className="subject-sheet-filters" aria-label="Filter this cheat sheet">
    <details className="subject-sheet-filter">
      <summary><span>Lessons</span><strong>{scope.mode==="all"?"All lessons":`${chosenLessons.length} selected`}</strong></summary>
      <div className="subject-sheet-filter-options">
        <p>Choose any lessons. Leave all unchecked to include every lesson.</p>
        {scope.mode!=="all"&&!chosenLessons.length&&<p>No lessons are included in your saved selection. Choose a lesson or reset these filters.</p>}
        <fieldset disabled={!ready}><legend>Choose lessons</legend>
          {lessons.map(lesson=><label className="subject-sheet-filter-option" key={lesson}>
            <input type="checkbox" checked={chosenLessons.includes(lesson)} onChange={event=>toggleLesson(lesson,event.target.checked)}/>
            <span>Lesson {lesson}</span>
            <small className="subject-sheet-filter-count" aria-hidden="true" title="Entries with the current subject tags and source">{counts.lessons.get(lesson)??0}</small>
          </label>)}
        </fieldset>
      </div>
    </details>
    <details className="subject-sheet-filter">
      <summary><span>Subject tags</span><strong>{scope.concepts.length?`${scope.concepts.length} selected`:"All tags"}</strong></summary>
      <div className="subject-sheet-filter-options">
        <p>Choose any tags. Leave all unchecked to include every subject.</p>
        <fieldset disabled={!ready}><legend>Choose subject tags</legend>
          {studyConcepts.map(concept=><label className="subject-sheet-filter-option" key={concept.id}>
            <input type="checkbox" checked={scope.concepts.includes(concept.id)} onChange={event=>toggleConcept(concept.id,event.target.checked)}/>
            <span>{concept.label}</span>
            <small className="subject-sheet-filter-count" aria-hidden="true" title="Entries with the current lessons and source">{counts.concepts.get(concept.id)??0}</small>
          </label>)}
        </fieldset>
      </div>
    </details>
    <button type="button" className="study-secondary" disabled={!ready||(scope.mode==="all"&&!scope.concepts.length)} onClick={()=>setScope({...scope,mode:"all",lessons:[],concepts:[]})}>Reset lesson & tag filters</button>
    <p className="subject-sheet-filter-summary" role="status">{counts.matching} of {items.length} {items.length===1?"entry":"entries"} in this sheet. Your selection follows you between pages.</p>
    {error&&<p role="status">{error}</p>}
  </div>;
}
