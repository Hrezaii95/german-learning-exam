"use client";
import { LArticle, LB, LButton, LDetails, LDiv, LH1, LH2, LH3, LHeader, LI, LNav, LP, LSection, LSmall, LSpan, LStrong, LSummary } from "@/components/i18n/LocalizedElements";

import Link from "@/components/i18n/LocalizedLink";
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
  const say=(text:string)=><LDiv className="study-row"><GermanText text={text}/><LineAudio text={text} src={speech[text]} compact/></LDiv>;
  return <LDiv className="study-workspace object-sheet"><CheatSheetNav current="objects"/><LHeader className="study-page-header"><LDiv><LP className="study-eyebrow">Lesson 5 · Objects, colours & materials</LP><LH1>One object. One colour trail.</LH1><LP>Learn the noun with its article. Follow the same gender through ein, kein and the pronoun.</LP><StudyTagList tags={tagsForLesson(5)}/></LDiv><LButton type="button" className="study-secondary" onClick={()=>window.print()}>Print cheat sheet</LButton></LHeader>
    <LNav className="study-row" aria-label="Object sheet sections"><Link href="#article-map">Article map</Link><Link href="#object-lab">Try it</Link><Link href="#materials">Colours & materials</Link><Link href="#object-words">Word cards</Link><Link href="#sheet-practice">Test yourself</Link></LNav>
    <LSection id="article-map"><StudyScopeNotice tags={tagsForLesson(5)} subject="This article reference"/><LH2>Remember three trails.</LH2><LP>These are <LStrong>nominative</LStrong> forms: use them after <LSpan lang="de">Das ist …</LSpan>.</LP><LDiv className="article-trails">{objectModels.slice(0,3).map(m=><LArticle key={m.de} data-gender={m.gender}><LSmall>{m.gender==="male"?"MASCULINE":m.gender==="neuter"?"NEUTER":"FEMININE"}</LSmall><LH3 lang="de">{m.de}</LH3><LDiv className="article-trail" lang="de"><LB>{m.article}</LB><LSpan>→</LSpan><LB>{m.indefinite}</LB><LSpan>→</LSpan><LB>{m.negative}</LB><LSpan>→</LSpan><LB>{m.pronoun}</LB></LDiv><LP>{m.gender==="female"?"The feminine trail keeps the e: eine → keine.":"Masculine and neuter share ein and kein here."}</LP><SaveButton item={{id:`l5-trail-${m.gender}`,title:`${m.de}: ${m.indefinite} → ${m.negative} → ${m.pronoun}`,meaning:`${m.en}. Nominative after Das ist …`,kind:"concept",lesson:5,href:"/cheat-sheets/objects#article-map"}}/></LArticle>)}</LDiv><LP className="object-memory">A new thing: <LB>ein / eine</LB> · Correct a guess: <LB>kein / keine</LB> · Talk about it again: <LB>er / es / sie</LB></LP></LSection>
    <ObjectBuilder speech={speech}/>
    <LSection id="materials"><LH2>Colour stays simple. Material follows aus.</LH2><LP><LSpan lang="de">Die Tasche ist rot.</LSpan> The colour after <LI>ist</LI> has no extra ending. For material, usually leave out the article: <LSpan lang="de">aus Holz</LSpan>.</LP><LDiv className="colour-palette">{colourSwatches.map(([de,en,colour])=><LArticle key={de}><LSpan className="colour-swatch" style={{background:colour}} aria-hidden="true"/>{say(de)}<LSmall>{en}</LSmall></LArticle>)}</LDiv><LP><LB lang="de">hell-</LB> = light: <LSpan lang="de">hellbraun</LSpan> · <LB lang="de">dunkel-</LB> = dark: <LSpan lang="de">dunkelgrün</LSpan>. These describe actual colours; the article colours show grammatical gender.</LP><LDiv className="material-grid">{materialModels.map(([de,en,sentence])=><LArticle key={de}><LH3 lang="de">aus {de}</LH3><LSmall>{en}</LSmall>{say(sentence)}</LArticle>)}</LDiv></LSection>
    <LSection><LH2>Keep the conversation going.</LH2><LDiv className="material-grid">{[["Wie heißt das auf Deutsch?","What is that called in German?"],["Wie schreibt man das?","How do you spell that?"],["Noch einmal, bitte.","Once again, please."],["Vielen Dank!","Thank you very much!"],["Bitte schön.","You are welcome."]].map(([de,en])=><LArticle key={de}>{say(de!)}<LP>{en}</LP><SaveButton item={{id:`l5-help-${de}`,title:de!,meaning:en!,kind:"phrase",lesson:5,href:"/cheat-sheets/objects"}}/></LArticle>)}</LDiv></LSection>
    <LDetails><LSummary>More Lesson 5 grammar and examples</LSummary><CoursePatterns units={[unit]} section="grammar" speech={speech}/></LDetails>
    <SheetWordIndex cards={cards} speech={speech} path="/cheat-sheets/objects" id="object-words" title="Your Lesson 5 word cards."/>
    <LP className="muted">Based on Momente A1.1 KB 33–36, AB 30–33 and the Lesson 5 glossary. Descriptions, diagrams and quizzes are learning aids. Tap German words or select a phrase for meaning.</LP>
    <ObjectPrintSummary/>
  </LDiv>;
}
