"use client";
import {useEffect,useState} from "react";
import type {WordCard} from "@/lib/content/word-card-types";
import {appendNavigationContext} from "@/lib/content/navigation-context";
import {initialSheetBrowse,readSheetBrowse,sheetBrowseQuery,sheetNavigationContext,type SheetBrowse} from "@/lib/study/sheet-browse";
import {wordStudyTags} from "@/lib/study/tags";
import {wordRecallQuestions} from "@/lib/study/sheet-recall";
import {useStudy} from "./StudyProvider";
import {useStudyScope} from "./StudyScope";
import {SheetRecall} from "./SheetRecall";
import {WordFamilyPreview} from "../word-cards/WordFamilyPreview";

/** Reuse the established sheet query and return contract for lesson-specific sheets. */
export function SheetWordIndex({cards,speech,path,id,title}:{cards:WordCard[];speech:Record<string,string>;path:string;id:string;title:string}){
 const study=useStudy(),{matches}=useStudyScope();
 const [browse,setBrowse]=useState(initialSheetBrowse);
 useEffect(()=>{const restore=()=>setBrowse(readSheetBrowse(new URLSearchParams(window.location.search)));restore();window.addEventListener("popstate",restore);return()=>window.removeEventListener("popstate",restore);},[]);
 const change=(next:SheetBrowse)=>{setBrowse(next);window.history.replaceState(window.history.state,"",`${window.location.pathname}${sheetBrowseQuery(next)}${window.location.hash}`);};
 const visible=cards.filter(card=>matches(wordStudyTags(card))&&(browse.category==="all"||card.category===browse.category)&&(!browse.saved||study?.state.saved[`card-${card.id}`])&&`${card.title} ${card.searchText}`.toLocaleLowerCase("de").includes(browse.query.trim().toLocaleLowerCase("de")));
 const shown=visible.slice(0,browse.page*12),questions=wordRecallQuestions(visible,cards);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{if(window.location.hash.startsWith("#sheet-card-")){try{document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({block:"center"});}catch{/* A malformed fragment has no matching card. */}}});return()=>cancelAnimationFrame(frame);},[browse,shown.length]);
 return <><section id={id}><h2>{title}</h2><div className="sheet-controls"><label>Find a card<input type="search" value={browse.query} onChange={event=>change({...browse,query:event.target.value,page:1})} placeholder="German or English…"/></label><label>Category<select value={browse.category} onChange={event=>change({...browse,category:event.target.value,page:1})}><option value="all">All categories</option>{[...new Set(cards.map(card=>card.category))].map(category=><option key={category}>{category}</option>)}</select></label><button type="button" className="study-secondary" aria-pressed={browse.saved} onClick={()=>change({...browse,saved:!browse.saved,page:1})}>{browse.saved?"Showing saved cards":"Show saved cards"}</button></div><p role="status">{visible.length} cards · showing {shown.length}</p><div className="card-grid">{shown.map(card=><div id={`sheet-card-${card.id}`} key={card.id} data-sheet-card={card.id}><WordFamilyPreview card={card} headingLevel={3} href={appendNavigationContext(card.path,sheetNavigationContext(path,browse,card.id))} lessonIds={card.lessons.map(n=>`lesson:${n.padStart(2,"0")}`)}/></div>)}</div>{shown.length<visible.length&&<button type="button" className="study-secondary" onClick={()=>change({...browse,page:browse.page+1})}>Show 12 more cards</button>}{!visible.length&&<p>No matching cards. Clear the search, saved filter or study selection.</p>}</section><section id="sheet-practice" className="sheet-practice"><h2>Practise your selected words.</h2><p>Up to eight questions from the cards matching your filters. Change the selection to start a new set.</p><SheetRecall key={questions.map(question=>question.id).join("|")} prefix="sheet" questions={questions} speech={speech}/></section></>;
}
