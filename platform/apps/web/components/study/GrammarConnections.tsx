"use client";
import {useState} from "react";
import Link from "next/link";
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
  return <section className="grammar-connections panel" aria-labelledby="grammar-connections-heading">
    <h2 id="grammar-connections-heading">From a rule to a sentence</h2>
    <p>Connect a grammar idea to an example, then check it in the lesson. The explorer follows your study selection and search.</p>
    <label>Choose a grammar connection<select className="hub-input" value={current.key} onChange={event=>setSelected(event.target.value)}>{concepts.map(entry=><option key={entry.key} value={entry.key}>Lesson {entry.lesson} · {entry.value.title}</option>)}</select></label>
    <ol className="grammar-connection-flow">
      <li><span className="study-eyebrow">1 · Understand</span><h3>{concept.title}</h3><p>{concept.en}</p></li>
      <li><span className="study-eyebrow">2 · Hear it in context</span><p><GermanText text={concept.examples[0]??concept.de}/></p><LineAudio text={concept.examples[0]??concept.de} src={speech[concept.examples[0]??concept.de]} compact/><details><summary>See the model</summary><p><GermanText text={concept.de}/></p></details></li>
      <li><span className="study-eyebrow">3 · Try it</span><p>Use the lesson’s examples and checked questions. A saved rule is ready for self-rated recall.</p><Link href={`${destination}#grammar`}>Learn in Lesson {current.lesson} →</Link><Link href={`${destination}#practice`}>Open the lesson checkpoint →</Link><SaveButton item={{id:current.key,title:concept.de,meaning:concept.en,kind:"concept",lesson:current.lesson,studyTags:coursePatternTags(current),href:`${href}#grammar`}}/></li>
    </ol>
  </section>;
}
