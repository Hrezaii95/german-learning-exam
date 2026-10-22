"use client";

import { Icon } from "@/components/media/Icon";

import type {Ref} from "react";
import type {WordForm} from "@/lib/content/word-card-types";
import type {StudyConcept} from "@/lib/study/scope";
import type {SubjectVocabularyItem} from "@/lib/study/subject-sheets";
import {vocabularySourceQualifier} from "@/lib/study/vocabulary-entry";
import {HighlightedPlural} from "./HighlightedPlural";
import {SubjectVocabularyVisual} from "./SubjectIllustration";

export type VocabularyEntryProps={
  item:SubjectVocabularyItem;
  subject:StudyConcept;
  selected:boolean;
  expanded:boolean;
  onChoose:()=>void;
  onClose:()=>void;
  buttonRef?:Ref<HTMLButtonElement>;
  variant?:"illustrated"|"plural";
  /** A plural variant has its own disclosure key, but shares the word identity. */
  entryKey?:string;
  anchor?:boolean;
  tone?:WordForm["tone"];
  plural?:WordForm|null;
  showPluralChanges?:boolean;
};

/** Shared illustrated word toggle; the parent owns its inline dropdown and focus. */
export function VocabularyEntry({item,subject,selected,expanded,onChoose,onClose,buttonRef,
  variant="illustrated",entryKey=item.id,anchor=true,tone=item.tone,plural,showPluralChanges=false}:VocabularyEntryProps){
  const qualifier=vocabularySourceQualifier(item);
  const pluralLayout=variant==="plural";
  const pluralOnly=pluralLayout&&item.tone==="plural";
  const labelForms=pluralLayout
    ?[pluralOnly?"Already shown as plural":plural?`→ ${plural.text}`:"No plural taught here"]
    :item.plurals.map(form=>form.text);
  return <button type="button" ref={buttonRef} id={anchor?`sheet-card-${item.id}`:undefined}
    data-subject-entry={anchor?item.id:undefined}
    data-subject-plural-entry={pluralLayout&&!pluralOnly?entryKey:undefined}
    className={`${pluralLayout?"subject-plural-entry":"subject-vocabulary-entry"} subject-tone-${tone}`}
    aria-label={[item.de,...labelForms,qualifier].filter(Boolean).join(" · ")}
    aria-pressed={selected} aria-expanded={expanded} aria-controls={expanded?`subject-word-detail-${entryKey}`:undefined}
    onClick={onChoose} onKeyDown={event=>{if(event.key==="Escape"&&expanded){event.preventDefault();event.stopPropagation();onClose();}}}>
    <SubjectVocabularyVisual de={item.de} category={item.category} cardId={item.cardId} subject={subject}/>
    {pluralLayout?<span className="subject-plural-entry-copy">
      <span className="subject-plural-singular" lang="de">{item.de}</span>
      {plural?<span className="subject-plural-result" lang="de"><span className="subject-plural-arrow" aria-hidden="true">→</span><span><HighlightedPlural singular={item.de} plural={plural.text}/></span></span>
        :<span className="subject-plural-unrecorded">{pluralOnly?"Plural form on this card":"No plural taught on this card."}</span>}
      {!pluralOnly&&qualifier&&<small className="subject-plural-source">{qualifier}</small>}
      <span className="subject-plural-meaning">{item.meaning}</span>
      {pluralOnly&&qualifier&&<small className="subject-plural-source">{qualifier}</small>}
    </span>:<span className="subject-entry-text">
      <strong lang="de">{item.de}</strong>
      {showPluralChanges&&item.plurals.length>0?<span className="subject-entry-plurals" lang="de">{item.plurals.map((form,index)=><span className="subject-plural-result" key={`${form.text}-${index}`}><span className="subject-plural-arrow" aria-hidden="true">→</span><span><HighlightedPlural singular={item.de} plural={form.text}/></span></span>)}</span>
        :<small lang={item.plurals.length?"de":undefined}>{item.plurals.length?item.plurals.map(form=>form.text).join(" · "):item.tone==="plain"?item.category:item.tone==="plural"?"Plural form":"No plural taught here"}</small>}
      <span className="subject-entry-meaning">{item.meaning}</span>{qualifier&&<em>{qualifier}</em>}
    </span>}
    <span className="subject-entry-chevron" aria-hidden="true"><Icon name="chevron" direction={expanded?"up":"down"}/></span>
  </button>;
}
