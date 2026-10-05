"use client";
import { LAside, LButton, LDetails, LDiv, LFieldset, LInput, LLabel, LLegend, LOption, LP, LSelect, LSmall, LSpan, LStrong, LSummary } from "@/components/i18n/LocalizedElements";


import {createContext,useContext,useEffect,useState,useCallback,type ReactNode} from "react";
import {availableLessons,defaultStudyScope,matchesStudyScope,parseStudyScope,scopeLabel,selectedLessons,STUDY_SCOPE_KEY,studyConcepts,type StudyScope,type StudyTags} from "@/lib/study/scope";

type ScopeContext = {scope:StudyScope;setScope:(scope:StudyScope)=>void;ready:boolean;error:string};
const Context=createContext<ScopeContext|null>(null);
const fallbackScope=defaultStudyScope();
export function StudyScopeProvider({children}:{children:ReactNode}){
  const [scope,setValue]=useState(defaultStudyScope);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    try{setValue(parseStudyScope(localStorage.getItem(STUDY_SCOPE_KEY)));}
    catch{setError("Your saved selection could not be read. Choose a new selection below.");}
    setReady(true);
    const sync=(event:StorageEvent)=>{
      if(event.key!==STUDY_SCOPE_KEY)return;
      try{setValue(parseStudyScope(event.newValue));setError("");}
      catch{setError("The selection from another tab could not be read.");}
    };
    window.addEventListener("storage",sync);
    return()=>window.removeEventListener("storage",sync);
  },[]);
  const setScope=useCallback((next:StudyScope)=>{
    const valid=parseStudyScope(JSON.stringify(next));
    setValue(valid);
    try{localStorage.setItem(STUDY_SCOPE_KEY,JSON.stringify(valid));setError("");}
    catch{setError("This selection works now, but could not be saved for your next visit.");}
  },[]);
  return <Context.Provider value={{scope,setScope,ready,error}}>{children}</Context.Provider>;
}
export function useStudyScope(){
  const context=useContext(Context);
  const scope=context?.scope??fallbackScope;
  return {scope,connected:context!==null,ready:context?.ready??true,setScope:context?.setScope??(()=>{}),error:context?.error??"",matches:(tags:StudyTags)=>matchesStudyScope(tags,scope)};
}
/** A direct link remains readable even when it is outside the current selection. */
export function StudyScopeNotice({tags,subject="This page"}:{tags:StudyTags;subject?:string}){
  const {matches,setScope,ready}=useStudyScope();
  if(!ready||matches(tags))return null;
  return <LAside className="study-scope-notice" role="status">{subject} is outside your study selection. <LButton type="button" className="study-secondary" onClick={()=>setScope({...defaultStudyScope(),mode:"multiple",lessons:tags.lessons})}>Study these lessons</LButton></LAside>;
}
export function StudyScopeControl(){
  const {scope,setScope,error}=useStudyScope();
  const lessons=availableLessons();
  return <LDetails className="study-scope" aria-label="Study selection">
    <LSummary><LSpan>Study selection</LSpan><LStrong>{scopeLabel(scope)}</LStrong><LSpan>{scope.concepts.length?`${scope.concepts.length} concepts`:"All concepts"}{scope.source==="teacher-extra"?" · Teacher extras":scope.source==="study-extra"?" · Study extras":scope.source==="course"?" · Course material":""}</LSpan><LSpan className="study-scope-edit">Change</LSpan></LSummary>
    <LDiv className="study-scope-body">
      <LFieldset><LLegend>Choose lessons</LLegend><LDiv className="study-scope-modes">{([['all','All lessons'],['one','One lesson'],['multiple','Choose several'],['through','Up to a lesson']] as const).map(([mode,label])=><LButton key={mode} type="button" aria-pressed={scope.mode===mode} onClick={()=>setScope({...scope,mode,lessons:mode==="all"?[]:mode==="multiple"?selectedLessons(scope):[selectedLessons(scope).at(-1)??1]})}>{label}</LButton>)}</LDiv>
        {(scope.mode==="one"||scope.mode==="through")&&<LLabel>{scope.mode==="through"?"Include through":"Selected lesson"}<LSelect aria-label={scope.mode==="through"?"Include through":"Selected lesson"} value={scope.lessons[0]} onChange={e=>setScope({...scope,lessons:[Number(e.target.value)]})}>{lessons.map(n=><LOption key={n} value={n}>Lesson {n}</LOption>)}</LSelect></LLabel>}
        {scope.mode==="multiple"&&<LDiv className="study-scope-options">{lessons.map(n=><LLabel key={n}><LInput type="checkbox" checked={scope.lessons.includes(n)} onChange={e=>setScope({...scope,lessons:e.target.checked?[...scope.lessons,n]:scope.lessons.filter(l=>l!==n)})}/>Lesson {n}</LLabel>)}</LDiv>}
      </LFieldset>
      <LFieldset><LLegend>Concepts <LSmall>— choose any; none means all concepts</LSmall></LLegend><LDiv className="study-scope-options">{studyConcepts.map(c=><LLabel key={c.id}><LInput type="checkbox" checked={scope.concepts.includes(c.id)} onChange={e=>setScope({...scope,concepts:e.target.checked?[...scope.concepts,c.id]:scope.concepts.filter(id=>id!==c.id)})}/>{c.label}</LLabel>)}</LDiv></LFieldset>
      <LLabel>Material source<LSelect aria-label="Material source" value={scope.source} onChange={e=>setScope({...scope,source:e.target.value as StudyScope['source']})}><LOption value="all">All sources</LOption><LOption value="course">Course material</LOption><LOption value="teacher-extra">Teacher extras</LOption><LOption value="study-extra">Additional study aids</LOption></LSelect></LLabel>
      <LDiv className="study-scope-footer"><LP>Your selection follows you between sections.</LP><LButton type="button" className="study-secondary" onClick={()=>setScope(defaultStudyScope())}>Reset selection</LButton></LDiv>
      {error&&<LP role="status">{error}</LP>}
    </LDiv>
  </LDetails>;
}
export function StudyTagList({tags}:{tags:StudyTags}){
  return <LDiv className="study-tag-list">{tags.lessons.map(n=><LSpan key={n}>Lesson {n}</LSpan>)}{(tags.sources??[tags.source]).filter(s=>s!=="course").map(source=><LSpan className="study-source-tag" key={source}>{source==="teacher-extra"?"Teacher extra":"Study extra"}</LSpan>)}{tags.concepts.map(id=><LSpan key={id}>{studyConcepts.find(c=>c.id===id)?.label}</LSpan>)}</LDiv>;
}
