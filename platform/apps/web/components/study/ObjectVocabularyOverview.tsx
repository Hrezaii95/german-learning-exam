"use client";
import Link from "next/link";
import {useRef,useState} from "react";
import type {WordCard} from "@/lib/content/word-card-types";
import {appendNavigationContext} from "@/lib/content/navigation-context";
import {withPagesBaseAssetPath} from "@/lib/content/pages-base-path";
import {objectVocabulary,type ObjectVocabularyTone} from "@/lib/study/object-vocabulary";
import {initialSheetBrowse,sheetNavigationContext} from "@/lib/study/sheet-browse";
import {savedWordCard} from "@/lib/study/saved-word-card";
import {tagsForLesson} from "@/lib/study/scope";
import {wordStudyTags} from "@/lib/study/tags";
import {OverviewPanel} from "./OverviewPanel";
import {ObjectVocabularyIllustration} from "./ObjectIllustration";
import {LineAudio} from "./StudyAudio";
import {SaveButton} from "./StudyProvider";
import {StudyScopeNotice,useStudyScope} from "./StudyScope";

const groups:{tone:ObjectVocabularyTone;article:string;label:string}[]=[
  {tone:"male",article:"der",label:"Masculine"},
  {tone:"female",article:"die",label:"Feminine"},
  {tone:"neuter",article:"das",label:"Neuter"},
  {tone:"plural",article:"die",label:"Plural only"},
];

export function ObjectVocabularyOverview({cards}:{cards:WordCard[]}){
  const {matches}=useStudyScope();
  const words=objectVocabulary(cards).filter(word=>matches(wordStudyTags(word.card)));
  const [selected,setSelected]=useState("l5-buch");
  const focus=useRef<HTMLElement>(null);
  const current=words.find(word=>word.id===selected)??words[0];
  const choose=(id:string)=>{
    setSelected(id);
    requestAnimationFrame(()=>focus.current?.scrollIntoView({block:"nearest"}));
  };
  return <div id="object-overview" className="object-vocabulary-overview"><OverviewPanel title={`${words.length} everyday words, sorted by article`}>
    <p className="object-overview-intro">Lesson 5 · Tap an illustration to explore the word and its plural. Use the speaker to listen. The colours show grammatical gender.</p>
    <p className="object-overview-download"><a href={withPagesBaseAssetPath("/cheat-sheets/everyday-objects.pdf")} download>Download printable overview (PDF) →</a></p>
    {!words.length?<div className="object-overview-empty"><p role="status">No objects match your study selection. Change Study selection above to include Lesson 5 objects.</p><StudyScopeNotice tags={tagsForLesson(5)} subject="This object collection"/></div>:<>
      <div className="object-vocabulary-lanes" aria-label="Everyday objects grouped by German article">
        {groups.filter(group=>words.some(word=>word.tone===group.tone)).map(group=><section key={group.tone} className={`object-vocabulary-lane study-tone-${group.tone}`} aria-labelledby={`object-lane-${group.tone}`}>
          <h3 id={`object-lane-${group.tone}`}><span lang="de">{group.article}</span>{" "}<small>{group.label} · {words.filter(word=>word.tone===group.tone).length}</small></h3>
          {words.filter(word=>word.tone===group.tone).sort((a,b)=>a.de.localeCompare(b.de,"de")).map(word=><button type="button" key={word.id} data-object-vocabulary={word.id} aria-pressed={current?.id===word.id} onClick={()=>choose(word.id)}>
            <ObjectVocabularyIllustration icon={word.icon}/><span><strong lang="de">{word.de}</strong>{" "}<small lang={word.plural?"de":undefined}>{word.plural??"No plural taught here"}</small></span>
          </button>)}
        </section>)}
      </div>
      <p className="object-overview-plural-rule"><b className="study-tone-plural">Plural → <span lang="de">die</span></b><span>Every plural uses <span lang="de">die</span>. Learn each noun with its own plural.</span></p>
      {current&&<article ref={focus} id="object-overview-focus" className={`object-overview-focus study-tone-${current.tone}`} aria-live="polite">
        <ObjectVocabularyIllustration icon={current.icon}/>
        <div className="object-focus-word"><small>{groups.find(group=>group.tone===current.tone)?.label}</small><h3 lang="de">{current.de}<LineAudio text={current.de} src={current.row.singular.audio} compact/></h3><p>{current.meaning}</p></div>
        <div className="object-focus-plural"><small>{current.plural?"Plural":"Singular in this lesson"}</small>{current.plural?current.row.plurals.map(form=><p key={form.text} className="study-tone-plural" lang="de"><strong>{form.text}</strong><LineAudio text={form.text} src={form.audio} compact/></p>):<p>No plural taught here</p>}</div>
        <div className="object-focus-actions"><SaveButton compact item={savedWordCard(current.card)}/><Link href={appendNavigationContext(current.card.path,sheetNavigationContext("/cheat-sheets/objects",initialSheetBrowse,current.card.id))}>Full vocabulary card →</Link></div>
      </article>}
    </>}
  </OverviewPanel></div>;
}
