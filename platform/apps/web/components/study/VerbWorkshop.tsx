"use client";
import { LArticle, LB, LButton, LDetails, LDiv, LH2, LH3, LLabel, LOption, LP, LSection, LSelect, LSmall, LSpan, LStrong, LSummary } from "@/components/i18n/LocalizedElements";

import {useEffect,useState} from "react";
import {learningVerbs,modelTags,verbAnatomy} from "@/lib/study/verb-learning";
import {grammarPatterns,verbPersons,spokenVerb} from "@/lib/study/sheet-topics";
import type {WordCard} from "@/lib/content/word-card-types";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {useStudyScope,StudyScopeNotice} from "./StudyScope";
import {OverviewPanel} from "./OverviewPanel";
import "./VerbWorkshop.css";

export function VerbWorkshop({cards,speech}:{cards:WordCard[];speech:Record<string,string>}){
  const {matches}=useStudyScope();
  const models=learningVerbs.filter(model=>matches(modelTags(model,cards)));
  const [selected,setSelected]=useState("wohnen"),[person,setPerson]=useState(0);
  const [pattern,setPattern]=useState(0);
  const [allVerbs,setAllVerbs]=useState(false),[fromBookmark,setFromBookmark]=useState(false);
  useEffect(()=>{
    const restore=()=>{
      const patternId=window.location.hash.replace(/^#pattern-/,"");
      const patternIndex=grammarPatterns.findIndex(item=>item.id===patternId);
      if(patternIndex>=0){
        if(patternIndex<3)setPattern(patternIndex);
        requestAnimationFrame(()=>{const target=document.getElementById(`pattern-${patternId}`);const details=target?.closest("details");if(details)details.open=true;(target??document.getElementById("sentence-position"))?.scrollIntoView({block:"start"});});
        return;
      }
      const match=window.location.hash.match(/^#verb-(.+)-([0-5])$/);
      if(!match)return;
      try{const name=decodeURIComponent(match[1]!);if(!learningVerbs.some(model=>model.verb===name))return;setSelected(name);setFromBookmark(true);setPerson(Number(match[2]));requestAnimationFrame(()=>document.getElementById("verb-explorer")?.scrollIntoView({block:"start"}));}catch{/* Ignore a malformed bookmark. */}
    };
    restore();window.addEventListener("hashchange",restore);return()=>window.removeEventListener("hashchange",restore);
  },[]);
  const model=models.find(model=>model.verb===selected)??(fromBookmark?learningVerbs.find(model=>model.verb===selected):models[0]);
  const atlas=allVerbs?models:[...(model&&models.includes(model)?[model]:[]),...models.filter(item=>item!==model)].slice(0,12);
  const anatomy=model?verbAnatomy(model,person):null;
  const example=grammarPatterns[pattern]!;
  return <>
    <LSection className="sheet-workshop" id="verb-explorer"><LP className="study-eyebrow">Person → stem → ending</LP><LH2>See what changes. Hear the whole form.</LH2>
      {model&&anatomy?<><StudyScopeNotice tags={modelTags(model,cards)} subject="This saved verb"/><LDiv className="sheet-controls"><LLabel>Choose a verb<LSelect value={model.verb} onChange={event=>{setSelected(event.target.value);setFromBookmark(false);}}>{!models.includes(model)&&<LOption value={model.verb}>{model.verb} · outside selection</LOption>}{models.map(item=><LOption key={item.verb} value={item.verb}>{item.verb} · {item.meaning}</LOption>)}</LSelect></LLabel><LLabel>Choose a person<LSelect value={person} onChange={event=>setPerson(Number(event.target.value))}>{verbPersons.map((label,index)=><LOption key={label} value={index}>{label}</LOption>)}</LSelect></LLabel></LDiv>
      <LDiv role="group" className="verb-anatomy" aria-label="Published verb form, broken into parts"><LDiv><LSmall>Person</LSmall><LStrong lang="de">{verbPersons[person]}</LStrong></LDiv><LSpan aria-hidden="true">+</LSpan><LDiv className="verb-stem"><LSmall>{anatomy.whole?"Whole exception":anatomy.changed?"Changed stem":"Stem"}</LSmall><LStrong lang="de">{anatomy.stem}</LStrong></LDiv>{!anatomy.whole&&<><LSpan aria-hidden="true">+</LSpan><LDiv className="verb-ending"><LSmall>Ending</LSmall><LStrong lang="de">{anatomy.ending||"∅"}</LStrong>{!anatomy.ending&&<LSpan>No added ending</LSpan>}</LDiv></>}{anatomy.rest&&<LDiv className="verb-tail"><LSmall>{anatomy.restLabel}</LSmall><LStrong lang="de">{anatomy.rest}</LStrong></LDiv>}</LDiv>
      <LP className="verb-anatomy-note">{anatomy.note} These colors mark parts of the verb, not noun gender.</LP>
      <LDiv className="verb-stage" aria-live="polite"><LSmall>{model.meaning}</LSmall><LP><GermanText text={spokenVerb(person,anatomy.form)}/><LineAudio text={spokenVerb(person,anatomy.form)} src={speech[spokenVerb(person,anatomy.form)]} compact/></LP><LP>{model.tip}</LP><SaveButton item={{id:`conjugation-${model.verb}-${person}`,title:spokenVerb(person,anatomy.form),meaning:`${model.meaning} · ${verbPersons[person]}. ${model.tip}`,kind:"concept",href:`/cheat-sheets/verbs#verb-${encodeURIComponent(model.verb)}-${person}`,studyTags:modelTags(model,cards),audio:speech[spokenVerb(person,anatomy.form)]??null}}/></LDiv>
      <LDiv className="verb-person-grid">{verbPersons.map((label,index)=><LButton type="button" key={label} aria-pressed={person===index} onClick={()=>setPerson(index)}><LSmall>{label}</LSmall><LStrong lang="de">{model.forms[index]}</LStrong></LButton>)}</LDiv></>:<LP role="status">No verb models match your study selection. Change the lesson, concept or material source to explore a verb.</LP>}
    </LSection>
    <OverviewPanel title={`${models.length} verbs, one selected person`}><LP>Showing <LB lang="de">{verbPersons[person]}</LB>. Choose a verb to compare its pattern above.</LP><LDiv className="verb-atlas">{atlas.map(item=><LButton type="button" key={item.verb} aria-pressed={model?.verb===item.verb} onClick={()=>{setSelected(item.verb);setFromBookmark(false);}}><LSmall lang="de">{item.verb}</LSmall><LStrong lang="de">{item.forms[person]}</LStrong><LSpan>{item.meaning}</LSpan></LButton>)}</LDiv>{models.length>12&&<LButton type="button" className="study-secondary" aria-expanded={allVerbs} onClick={()=>setAllVerbs(!allVerbs)}>{allVerbs?"Show a compact overview":`Show all ${models.length} verbs`}</LButton>}<LP>{atlas.length} of {models.length} matching verbs shown. The verb selector above always includes the complete matching set.</LP></OverviewPanel>
    <LSection className="sheet-workshop" id="sentence-position"><LP className="study-eyebrow">The same idea, three sentence shapes · reference</LP><LH2>Keep your eye on the conjugated verb.</LH2><LDiv className="study-chips" role="group" aria-label="Sentence shape">{grammarPatterns.slice(0,3).map((item,index)=><LButton type="button" key={item.id} aria-pressed={pattern===index} onClick={()=>setPattern(index)}>{["Statement","W-question","Yes/no question"][index]}</LButton>)}</LDiv><LDiv className="verb-sentence-rail">{example.parts.map((part,index)=><LDiv key={index} className={(pattern===2?index===0:index===1)?"is-verb":""}><LSmall>{index===2?"Remaining information":`Position ${index+1}`}</LSmall><LSpan lang="de">{part}</LSpan></LDiv>)}</LDiv><LP><GermanText text={example.de}/><LineAudio text={example.de} src={speech[example.de]} compact/></LP><LP>{example.en}</LP><LP>{example.cue} Violet marks the conjugated verb.</LP><SaveButton item={{id:`sheet-pattern-${example.id}`,title:example.de,meaning:example.cue,kind:"concept",href:`/cheat-sheets/verbs#pattern-${example.id}`,audio:speech[example.de]??null}}/>
    </LSection>
    <LDetails className="sheet-sources"><LSummary>More sentence patterns · negatives, possession, work and origin</LSummary><LDiv className="sentence-patterns">{grammarPatterns.slice(3).map(item=><LArticle key={item.id} id={`pattern-${item.id}`}><LH3>{item.title}</LH3><LP><GermanText text={item.de}/><LineAudio text={item.de} src={speech[item.de]} compact/></LP><LP>{item.en}</LP><LP>{item.cue}</LP><SaveButton compact item={{id:`sheet-pattern-${item.id}`,title:item.de,meaning:item.cue,kind:"concept",href:`/cheat-sheets/verbs#pattern-${item.id}`,audio:speech[item.de]??null}}/></LArticle>)}</LDiv></LDetails>
  </>;
}
