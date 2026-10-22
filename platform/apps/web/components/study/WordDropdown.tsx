"use client";

import Link from "next/link";
import {useEffect,useRef} from "react";
import type {StudyConcept} from "@/lib/study/scope";
import type {SubjectVocabularyItem} from "@/lib/study/subject-sheets";
import {LineAudio} from "./StudyAudio";
import {GermanText,SaveButton} from "./StudyProvider";
import {StudyTagList} from "./StudyScope";
import {SubjectVocabularyVisual} from "./SubjectIllustration";
import {vocabularySourceQualifier} from "@/lib/study/vocabulary-entry";

/** Mounted only for the open entry; its parent owns the disclosure and focus. */
export function WordDropdown({item,subject,href,panelId,onClose}:{
  item:SubjectVocabularyItem;
  subject:StudyConcept;
  href:string;
  panelId:string;
  onClose:()=>void;
}){
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{
    const element=panel.current;
    if(!element)return;
    // Delegate Escape from the card's controls while preserving article semantics.
    const closeOnEscape=(event:KeyboardEvent)=>{
      if(event.key==="Escape"&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();onClose();}
    };
    element.addEventListener("keydown",closeOnEscape);
    return()=>element.removeEventListener("keydown",closeOnEscape);
  },[onClose]);
  const isSingular=item.tone==="male"||item.tone==="female"||item.tone==="neuter";
  const pluralForms=item.plurals.filter((form,index,forms)=>
    forms.findIndex(other=>other.text===form.text)===index&&
    (item.tone!=="plural"||form.text!==item.de),
  );
  const qualifier=vocabularySourceQualifier(item);
  const examples=item.examples.slice(0,2);
  return <article ref={panel} id={panelId} className={`subject-word-detail subject-word-dropdown subject-tone-${item.tone}`} aria-label={`Vocabulary card: ${item.de}`}>
    <div className="subject-detail-heading subject-word-dropdown-header">
      <SubjectVocabularyVisual de={item.de} category={item.category} cardId={item.cardId} subject={subject}/>
      <div className="subject-word-dropdown-identity"><p className="subject-detail-category">{item.category}{qualifier&&<> · {qualifier}</>}</p><h3><GermanText text={item.de}/></h3><p className="subject-detail-meaning">{item.meaning}</p></div>
      <button type="button" className="subject-word-dropdown-close subject-print-hide" aria-label={`Close vocabulary card: ${item.de}`} onClick={onClose}><span aria-hidden="true">×</span><span>Close</span></button>
    </div>
    <div className="subject-word-dropdown-forms" aria-label="Word forms and pronunciation">
      <div className={`subject-word-dropdown-form subject-tone-${item.tone}`}>
        <h4>{isSingular?"Singular":item.tone==="plural"?"Plural":"Entry"}</h4>
        <p><GermanText text={item.de}/><LineAudio text={item.de} src={item.audio}/></p>
      </div>
      {pluralForms.length>0&&<div className="subject-word-dropdown-form subject-tone-plural">
        <h4>{pluralForms.length===1?"Plural":"Plural forms"}</h4>
        {pluralForms.map(form=><p key={form.text}><GermanText text={form.text}/><LineAudio text={form.text} src={form.audio}/></p>)}
      </div>}
      {isSingular&&!pluralForms.length&&<p className="subject-detail-form-note">No plural is taught on this card.</p>}
      {item.tone==="plural"&&<p className="subject-detail-form-note">This entry is taught in the plural. No singular form is supplied here.</p>}
    </div>
    {(examples.length>0||item.patterns.length>0)&&<details className="subject-word-dropdown-card" open>
      <summary>Examples & word patterns</summary>
      {examples.length>0&&<div className="subject-detail-examples"><h4>In a sentence</h4>{examples.map((example,index)=><div key={`${example.de}-${index}`}><p><GermanText text={example.de}/><LineAudio text={example.de} src={example.audio} compact/></p><p>{example.en}</p></div>)}</div>}
      {item.patterns.length>0&&<div className="subject-detail-patterns"><h4>Useful patterns</h4><ul>{item.patterns.map((pattern,index)=><li key={`${pattern}-${index}`}><GermanText text={pattern}/></li>)}</ul></div>}
    </details>}
    <div className="subject-detail-actions"><SaveButton item={item.savedItem}/><Link href={href}>{item.href.startsWith("/vocabulary/")?"Full vocabulary card →":"Open word reference →"}</Link></div>
    <StudyTagList tags={item.studyTags}/>
    {item.note&&<details className="subject-source-note"><summary>Word notes & source context</summary>{item.note.split(/\n\n+/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</details>}
  </article>;
}
