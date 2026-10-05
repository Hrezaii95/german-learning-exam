"use client";
import { LDetails, LH2, LH3, LLabel, LLi, LOl, LOption, LP, LSection, LSelect, LSpan, LSummary } from "@/components/i18n/LocalizedElements";

import {useState} from "react";
import Link from "@/components/i18n/LocalizedLink";
import type {CoursePatternEntry} from "@/lib/study/course-patterns";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {coursePatternTags} from "@/lib/study/course-patterns";
import {appendNavigationContext,type NavigationContext} from "@/lib/content/navigation-context";

export function GrammarConnections({entries,speech,navigation}:{entries:CoursePatternEntry[];speech:Record<string,string>;navigation?:NavigationContext}) {
  const [selected,setSelected]=useState("");
  const concepts=entries.filter(entry=>entry.kind==="grammar");
  const current=concepts.find(entry=>entry.key===selected)??concepts[0];
  if(!current) return null;
  const concept=current.value;
  const href=`/lessons/${String(current.lesson).padStart(2,"0")}`;
  const destination=navigation?appendNavigationContext(href,navigation):href;
  return <LSection className="grammar-connections panel" aria-labelledby="grammar-connections-heading">
    <LH2 id="grammar-connections-heading">From a rule to a sentence</LH2>
    <LP>Connect a grammar idea to an example, then check it in the lesson. The explorer follows your study selection and search.</LP>
    <LLabel>Choose a grammar connection<LSelect className="hub-input" value={current.key} onChange={event=>setSelected(event.target.value)}>{concepts.map(entry=><LOption key={entry.key} value={entry.key}>Lesson {entry.lesson} · {entry.value.title}</LOption>)}</LSelect></LLabel>
    <LOl className="grammar-connection-flow">
      <LLi><LSpan className="study-eyebrow">1 · Understand</LSpan><LH3>{concept.title}</LH3><LP>{concept.en}</LP></LLi>
      <LLi><LSpan className="study-eyebrow">2 · Hear it in context</LSpan><LP><GermanText text={concept.examples[0]??concept.de}/></LP><LineAudio text={concept.examples[0]??concept.de} src={speech[concept.examples[0]??concept.de]} compact/><LDetails><LSummary>See the model</LSummary><LP><GermanText text={concept.de}/></LP></LDetails></LLi>
      <LLi><LSpan className="study-eyebrow">3 · Try it</LSpan><LP>Use the lesson’s examples and checked questions. A saved rule is ready for self-rated recall.</LP><Link href={`${destination}#grammar`}>Learn in Lesson {current.lesson} →</Link><Link href={`${destination}#practice`}>Open the lesson checkpoint →</Link><SaveButton item={{id:current.key,title:concept.de,meaning:concept.en,kind:"concept",lesson:current.lesson,studyTags:coursePatternTags(current),href:`${href}#grammar`}}/></LLi>
    </LOl>
  </LSection>;
}
