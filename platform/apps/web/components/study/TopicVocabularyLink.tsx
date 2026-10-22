"use client";

import { Icon } from "@/components/media/Icon";

import Link from "next/link";
import {useEffect,useState} from "react";
import type {WordCard} from "@/lib/content/word-card-types";
import {studyConcepts,type StudyConcept} from "@/lib/study/scope";
import {subjectSheetHref} from "@/lib/study/subject-sheets";
import {wordRecallQuestions} from "@/lib/study/sheet-recall";
import {wordStudyTags} from "@/lib/study/tags";
import {SheetRecall} from "./SheetRecall";
import {useStudyScope} from "./StudyScope";

/** Lesson filters use `lesson`; `lessons` remains the catalogue grouping switch. */
export function topicVocabularyHref(subject:StudyConcept,lessons:readonly number[],query?:string){
  const params=new URLSearchParams({lesson:lessons.join(",")});
  if(query)params.set("q",query);
  return `${subjectSheetHref(subject)}?${params}`;
}

function familyAnchors(card:WordCard){
  const vocabularyIds=[card.path,...card.aliases].flatMap(path=>path.match(/^\/vocabulary\/([^/?#]+)\/?$/)?.[1]??[]);
  return [...new Set([card.id,...vocabularyIds])].map(cardId=>`sheet-card-${cardId}`);
}

export type TopicVocabularyWordTarget={anchor:string;text:string;entryId?:string;lessons?:readonly number[]};

export function TopicVocabularyLink({id,subject,label,lessons,legacyIds=[],cards=[],wordTargets=[]}:{id:string;subject:StudyConcept;label:string;lessons:readonly number[];legacyIds?:readonly string[];cards?:readonly WordCard[];wordTargets?:readonly TopicVocabularyWordTarget[]}){
  const [hash,setHash]=useState("");
  useEffect(()=>{
    const restore=()=>{try{setHash(decodeURIComponent(window.location.hash.slice(1)));}catch{setHash("");}};
    restore();window.addEventListener("hashchange",restore);
    return()=>window.removeEventListener("hashchange",restore);
  },[]);
  const focusedCard=cards.find(card=>familyAnchors(card).includes(hash));
  const focusedTarget=wordTargets.find(target=>target.anchor===hash);
  const focusedWord=focusedCard?.rows[0]?.singular.text??focusedTarget?.text;
  const focusedEntryId=focusedCard?`${focusedCard.id}-0`:focusedTarget?.entryId;
  const focusedTags=focusedCard?wordStudyTags(focusedCard):undefined;
  const handoffSubject=focusedTags&&!focusedTags.concepts.includes(subject)?focusedTags.concepts[0]??subject:subject;
  const handoffLabel=handoffSubject===subject?label:studyConcepts.find(value=>value.id===handoffSubject)?.label??label;
  const handoffLessons=focusedTags?.lessons.length&&!focusedTags.lessons.some(lesson=>lessons.includes(lesson))
    ?[...new Set([...lessons,...focusedTags.lessons])].sort((a,b)=>a-b)
    :focusedTarget?.lessons??lessons;
  const anchors=[...new Set([...legacyIds,...cards.flatMap(familyAnchors),...wordTargets.map(target=>target.anchor)])];
  return <section id={id} className="topic-vocabulary-link">
    {anchors.map(anchor=><span id={anchor} key={anchor} aria-hidden="true"/>)}
    <p className="study-eyebrow">Vocabulary for this topic</p>
    <h2>{label} vocabulary</h2>
    <p>Explore the illustrated words, articles and plurals in the subject sheet, filtered to {lessons.length===1?`Lesson ${lessons[0]}`:`Lessons ${lessons.join(", ")}`}.</p>
    {focusedWord&&<p data-topic-word-handoff={focusedCard?.id??focusedTarget?.anchor}><Link className="study-secondary" href={`${topicVocabularyHref(handoffSubject,handoffLessons,focusedWord)}${focusedEntryId?`#sheet-card-${focusedEntryId}`:""}`}>Open <span lang="de">{focusedWord}</span> in {handoffLabel.toLowerCase()} vocabulary <Icon name="arrow"/></Link></p>}
    <Link className="study-secondary" href={topicVocabularyHref(subject,lessons)}>Open {label.toLowerCase()} subject sheet <Icon name="arrow"/></Link>
  </section>;
}

/** Topic grammar keeps its practice without maintaining another vocabulary list. */
export function TopicWordPractice({cards,speech}:{cards:WordCard[];speech:Record<string,string>}){
  const {matches}=useStudyScope();
  const visible=cards.filter(card=>matches(wordStudyTags(card)));
  const questions=wordRecallQuestions(visible,cards);
  return <section id="sheet-practice" className="sheet-practice"><h2>Practise your selected words.</h2><p>Up to eight questions from this lesson’s cards in your study selection.</p><SheetRecall key={questions.map(question=>question.id).join("|")} prefix="sheet" questions={questions} speech={speech}/></section>;
}
