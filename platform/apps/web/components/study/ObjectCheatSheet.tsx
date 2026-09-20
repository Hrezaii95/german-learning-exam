"use client";
import Link from "next/link";
import type {WordCard} from "@/lib/content/word-card-types";
import type {StudyUnit} from "@/lib/study/course-lessons";
import {objectModels,colourSwatches,materialModels} from "@/lib/study/object-sheet";
import {tagsForLesson} from "@/lib/study/scope";
import {CheatSheetNav} from "./CheatSheetNav";
import {GermanText,SaveButton} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {StudyTagList,StudyScopeNotice} from "./StudyScope";
import {SheetWordIndex} from "./SheetWordIndex";
import {ObjectBuilder} from "./ObjectBuilders";
import {ObjectPrintSummary} from "./ObjectPrintSummaries";
import {CoursePatterns} from "./CourseStudy";

export function ObjectCheatSheet({cards,speech,unit}:{cards:WordCard[];speech:Record<string,string>;unit:StudyUnit}){
  const say=(text:string)=><div className="study-row"><GermanText text={text}/><LineAudio text={text} src={speech[text]} compact/></div>;
  return <div className="study-workspace object-sheet"><CheatSheetNav current="objects"/><header className="study-page-header"><div><p className="study-eyebrow">Lesson 5 · Objects, colours & materials</p><h1>One object. One colour trail.</h1><p>Learn the noun with its article. Follow the same gender through ein, kein and the pronoun.</p><StudyTagList tags={tagsForLesson(5)}/></div><button type="button" className="study-secondary" onClick={()=>window.print()}>Print cheat sheet</button></header>
    <nav className="study-row" aria-label="Object sheet sections"><Link href="#article-map">Article map</Link><Link href="#object-lab">Try it</Link><Link href="#materials">Colours & materials</Link><Link href="#object-words">Word cards</Link><Link href="#sheet-practice">Test yourself</Link></nav>
    <section id="article-map"><StudyScopeNotice tags={tagsForLesson(5)} subject="This article reference"/><h2>Remember three trails.</h2><p>These are <strong>nominative</strong> forms: use them after <span lang="de">Das ist …</span>.</p><div className="article-trails">{objectModels.slice(0,3).map(m=><article key={m.de} data-gender={m.gender}><small>{m.gender==="male"?"MASCULINE":m.gender==="neuter"?"NEUTER":"FEMININE"}</small><h3 lang="de">{m.de}</h3><div className="article-trail" lang="de"><b>{m.article}</b><span>→</span><b>{m.indefinite}</b><span>→</span><b>{m.negative}</b><span>→</span><b>{m.pronoun}</b></div><p>{m.gender==="female"?"The feminine trail keeps the e: eine → keine.":"Masculine and neuter share ein and kein here."}</p><SaveButton item={{id:`l5-trail-${m.gender}`,title:`${m.de}: ${m.indefinite} → ${m.negative} → ${m.pronoun}`,meaning:`${m.en}. Nominative after Das ist …`,kind:"concept",lesson:5,href:"/cheat-sheets/objects#article-map"}}/></article>)}</div><p className="object-memory">A new thing: <b>ein / eine</b> · Correct a guess: <b>kein / keine</b> · Talk about it again: <b>er / es / sie</b></p></section>
    <ObjectBuilder speech={speech}/>
    <section id="materials"><h2>Colour stays simple. Material follows aus.</h2><p><span lang="de">Die Tasche ist rot.</span> The colour after <i>ist</i> has no extra ending. For material, usually leave out the article: <span lang="de">aus Holz</span>.</p><div className="colour-palette">{colourSwatches.map(([de,en,colour])=><article key={de}><span className="colour-swatch" style={{background:colour}} aria-hidden="true"/>{say(de)}<small>{en}</small></article>)}</div><p><b lang="de">hell-</b> = light: <span lang="de">hellbraun</span> · <b lang="de">dunkel-</b> = dark: <span lang="de">dunkelgrün</span>. These describe actual colours; the article colours show grammatical gender.</p><div className="material-grid">{materialModels.map(([de,en,sentence])=><article key={de}><h3 lang="de">aus {de}</h3><small>{en}</small>{say(sentence)}</article>)}</div></section>
    <section><h2>Keep the conversation going.</h2><div className="material-grid">{[["Wie heißt das auf Deutsch?","What is that called in German?"],["Wie schreibt man das?","How do you spell that?"],["Noch einmal, bitte.","Once again, please."],["Vielen Dank!","Thank you very much!"],["Bitte schön.","You are welcome."]].map(([de,en])=><article key={de}>{say(de!)}<p>{en}</p><SaveButton item={{id:`l5-help-${de}`,title:de!,meaning:en!,kind:"phrase",lesson:5,href:"/cheat-sheets/objects"}}/></article>)}</div></section>
    <details><summary>More Lesson 5 grammar and examples</summary><CoursePatterns units={[unit]} section="grammar" speech={speech}/></details>
    <SheetWordIndex cards={cards} speech={speech} path="/cheat-sheets/objects" id="object-words" title="Your Lesson 5 word cards."/>
    <p className="muted">Based on Momente A1.1 KB 33–36, AB 30–33 and the Lesson 5 glossary. Descriptions, diagrams and quizzes are learning aids. Tap German words or select a phrase for meaning.</p>
    <ObjectPrintSummary/>
  </div>;
}
