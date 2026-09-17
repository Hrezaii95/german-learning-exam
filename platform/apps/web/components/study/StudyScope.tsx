"use client";

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
export function StudyScopeNotice({tags}:{tags:StudyTags}){
  const {matches,setScope,ready}=useStudyScope();
  if(!ready||matches(tags))return null;
  return <aside className="study-scope-notice" role="status">This page is outside your study selection. <button type="button" className="study-secondary" onClick={()=>setScope({...defaultStudyScope(),mode:"multiple",lessons:tags.lessons})}>Study these lessons</button></aside>;
}
export function StudyScopeControl(){
  const {scope,setScope,error}=useStudyScope();
  const lessons=availableLessons();
  return <details className="study-scope" aria-label="Study selection">
    <summary><span>Study selection</span><strong>{scopeLabel(scope)}</strong><span>{scope.concepts.length?`${scope.concepts.length} concepts`:"All concepts"}{scope.source==="teacher-extra"?" · Teacher extras":scope.source==="study-extra"?" · Study extras":scope.source==="course"?" · Course material":""}</span><span className="study-scope-edit">Change</span></summary>
    <div className="study-scope-body">
      <fieldset><legend>Choose lessons</legend><div className="study-scope-modes">{([['all','All lessons'],['one','One lesson'],['multiple','Choose several'],['through','Up to a lesson']] as const).map(([mode,label])=><button key={mode} type="button" aria-pressed={scope.mode===mode} onClick={()=>setScope({...scope,mode,lessons:mode==="all"?[]:mode==="multiple"?selectedLessons(scope):[selectedLessons(scope).at(-1)??1]})}>{label}</button>)}</div>
        {(scope.mode==="one"||scope.mode==="through")&&<label>{scope.mode==="through"?"Include through":"Selected lesson"}<select aria-label={scope.mode==="through"?"Include through":"Selected lesson"} value={scope.lessons[0]} onChange={e=>setScope({...scope,lessons:[Number(e.target.value)]})}>{lessons.map(n=><option key={n} value={n}>Lesson {n}</option>)}</select></label>}
        {scope.mode==="multiple"&&<div className="study-scope-options">{lessons.map(n=><label key={n}><input type="checkbox" checked={scope.lessons.includes(n)} onChange={e=>setScope({...scope,lessons:e.target.checked?[...scope.lessons,n]:scope.lessons.filter(l=>l!==n)})}/>Lesson {n}</label>)}</div>}
      </fieldset>
      <fieldset><legend>Concepts <small>— choose any; none means all concepts</small></legend><div className="study-scope-options">{studyConcepts.map(c=><label key={c.id}><input type="checkbox" checked={scope.concepts.includes(c.id)} onChange={e=>setScope({...scope,concepts:e.target.checked?[...scope.concepts,c.id]:scope.concepts.filter(id=>id!==c.id)})}/>{c.label}</label>)}</div></fieldset>
      <label>Material source<select aria-label="Material source" value={scope.source} onChange={e=>setScope({...scope,source:e.target.value as StudyScope['source']})}><option value="all">All sources</option><option value="course">Course material</option><option value="teacher-extra">Teacher extras</option><option value="study-extra">Additional study aids</option></select></label>
      <div className="study-scope-footer"><p>Your selection follows you between sections.</p><button type="button" className="study-secondary" onClick={()=>setScope(defaultStudyScope())}>Reset selection</button></div>
      {error&&<p role="status">{error}</p>}
    </div>
  </details>;
}
export function StudyTagList({tags}:{tags:StudyTags}){
  return <div className="study-tag-list">{tags.lessons.map(n=><span key={n}>Lesson {n}</span>)}{(tags.sources??[tags.source]).filter(s=>s!=="course").map(source=><span className="study-source-tag" key={source}>{source==="teacher-extra"?"Teacher extra":"Study extra"}</span>)}{tags.concepts.map(id=><span key={id}>{studyConcepts.find(c=>c.id===id)?.label}</span>)}</div>;
}
