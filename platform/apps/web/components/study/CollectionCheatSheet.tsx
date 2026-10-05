"use client";
import { LArticle, LButton, LDetails, LDiv, LH1, LH2, LH3, LHeader, LInput, LLabel, LNav, LOption, LP, LSection, LSelect, LSmall, LSummary } from "@/components/i18n/LocalizedElements";

import Link from "@/components/i18n/LocalizedLink";
import {useEffect,useState} from "react";
import type {WordCard} from "@/lib/content/word-card-types";
import {sheetLinks,sheetTitles,type ExtendedSheetId} from "@/lib/study/sheet-topics";
import {CheatSheetNav} from "./CheatSheetNav";
import {SheetWorkshops} from "./SheetWorkshops";
import {GermanText,SaveButton,useStudy} from "./StudyProvider";
import {useStudyScope,StudyTagList} from "./StudyScope";
import {wordStudyTags} from "@/lib/study/tags";
import {LineAudio} from "./StudyAudio";
import {ConversationWorkshop,ConversationPrintSummary} from "./ConversationWorkshop";
import {conversationRecallQuestions} from "@/lib/study/conversation-learning";
import {NumbersWorkshop,NumbersPrintSummary} from "./NumbersWorkshop";
import {numberRecallQuestions} from "@/lib/study/number-learning";
import {VerbPrintSummary} from "./GrammarPrintSummaries";
import {PeoplePrintSummary} from "./PeopleFamily";
import {savedWordCard} from "@/lib/study/saved-word-card";
import {verbRecallQuestions} from "@/lib/study/verb-learning";
import {peopleRecallQuestions} from "@/lib/study/sheet-recall";
import {SheetRecall} from "./SheetRecall";
import {initialSheetBrowse,readSheetBrowse,sheetBrowseQuery,sheetNavigationContext,type SheetBrowse} from "@/lib/study/sheet-browse";
import {appendNavigationContext} from "@/lib/content/navigation-context";

export function CollectionCheatSheet({sheet,cards,speech}:{sheet:ExtendedSheetId;cards:WordCard[];speech:Record<string,string>}){
  const study=useStudy();
  const {matches}=useStudyScope();
  const scopedCards=cards.filter(c=>matches(wordStudyTags(c)));
  const [browse,setBrowse]=useState(initialSheetBrowse);
  const {query,category,saved}=browse;
  const [recall,setRecall]=useState(false),[revealed,setRevealed]=useState<string[]>([]);
  useEffect(()=>{const restore=()=>setBrowse(readSheetBrowse(new URLSearchParams(window.location.search)));restore();window.addEventListener("popstate",restore);return()=>window.removeEventListener("popstate",restore);},[]);
  const changeBrowse=(next:SheetBrowse)=>{setBrowse(next);window.history.replaceState(window.history.state,"",`${window.location.pathname}${sheetBrowseQuery(next)}`);};
  const setQuery=(query:string)=>changeBrowse({...browse,query,page:1});
  const setCategory=(category:string)=>changeBrowse({...browse,category,page:1});
  const setSaved=(saved:boolean)=>changeBrowse({...browse,saved,page:1});
  const title=sheetTitles[sheet],link=sheetLinks.find(s=>s.id===sheet)!;
  const visible=scopedCards.filter(c=>(category==="all"||c.category===category)&&(!saved||study?.state.saved[`card-${c.id}`])&&`${c.title} ${c.searchText}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de")));
  const scopedQuestions=sheet==="people"?peopleRecallQuestions(visible):sheet==="verbs"?verbRecallQuestions(visible):sheet==="numbers"?numberRecallQuestions(visible):conversationRecallQuestions(visible,cards);
  const shown=visible.slice(0,browse.page*12);
  useEffect(()=>{
    if(!window.location.hash.startsWith("#sheet-card-"))return;
    const frame=requestAnimationFrame(()=>{
      try {document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({block:"center"});}
      catch { /* An invalid fragment has no matching learning card. */ }
    });
    return()=>cancelAnimationFrame(frame);
  },[browse,shown.length]);
  const cardHref=(card:WordCard)=>appendNavigationContext(card.path,sheetNavigationContext(link.href,browse,card.id));
  const audio=(text:string,src?:string|null)=><LineAudio text={text} src={src??speech[text]} compact/>;
  const print=()=>window.print();
  return <LDiv className={`collection-sheet collection-${sheet}`}>
    <CheatSheetNav current={sheet}/><LHeader className="collection-heading"><LDiv><LP className="study-eyebrow">Cheat sheet {link.number} · {title.eyebrow}</LP><LH1>{title.title}</LH1><LP>{title.subtitle}</LP></LDiv><LButton type="button" className="study-secondary" onClick={print}>Print cheat sheet</LButton></LHeader>
    <LNav className="sheet-jump" aria-label="Sheet sections">{sheet==="people"?<><Link href="#family-tree">Family tree</Link><Link href="#people-work">Work & word forms</Link><Link href="#people-descriptions">Describe people</Link></>:<Link href="#sheet-workshop">Explore & understand</Link>}<Link href="#sheet-cards">Cards & recall</Link><Link href="#sheet-practice">Test yourself</Link></LNav>
    <LDiv id="sheet-workshop">{sheet==="numbers"?<NumbersWorkshop cards={visible} allCards={cards} speech={speech}/>:sheet==="conversation"?<ConversationWorkshop cards={cards} speech={speech}/>:<SheetWorkshops sheet={sheet} cards={sheet==="verbs"?cards:scopedCards} speech={speech}/>}</LDiv>
    <LSection id="sheet-cards"><LDiv className="study-section-heading"><LDiv><LP className="study-eyebrow">From your course collection</LP><LH2>Learn it. Hide it. Recall it.</LH2></LDiv><LButton type="button" className="study-secondary" aria-pressed={recall} onClick={()=>{setRecall(!recall);setRevealed([]);}}>{recall?"Show all answers":"Hide answers & recall"}</LButton></LDiv><LDiv className="sheet-controls"><LLabel>Find a card<LInput value={query} onChange={e=>setQuery(e.target.value)} placeholder="German or English…"/></LLabel><LLabel>Category<LSelect value={category} onChange={e=>setCategory(e.target.value)}><LOption value="all">All categories</LOption>{[...new Set(cards.map(c=>c.category))].map(c=><LOption key={c}>{c}</LOption>)}</LSelect></LLabel><LButton type="button" className="study-secondary" aria-pressed={saved} onClick={()=>setSaved(!saved)}>{saved?"Showing saved cards":"Show saved cards"}</LButton></LDiv><LP role="status">{visible.length} cards · showing {shown.length} · {recall?"Say the German before revealing.":"Tap a word for its meaning. Save the ones you want to revisit."}</LP><LDiv className="collection-cards">{shown.map(card=>{const hidden=recall&&!revealed.includes(card.id);return <LArticle key={card.id} id={`sheet-card-${card.id}`} data-sheet-card={card.id}><LHeader><LSmall>{card.category}</LSmall><SaveButton compact item={savedWordCard(card)}/></LHeader><LH3>{card.title}</LH3>{hidden?<LButton type="button" className="study-secondary" onClick={()=>setRevealed([...revealed,card.id])}>Reveal German</LButton>:<>{card.rows.map((row,i)=><LDiv className="collection-word" key={i}><LP className={`study-tone-${row.singular.tone}`}><GermanText text={row.singular.text}/>{audio(row.singular.text,row.singular.audio)}</LP>{row.plurals.map(p=><LP className="study-tone-plural" key={p.text}><LSmall>Plural</LSmall> <GermanText text={p.text}/>{audio(p.text,p.audio)}</LP>)}</LDiv>)}<LDetails><LSummary>Memory cue & example</LSummary><LP>{card.tip}</LP>{card.examples[0]&&<><LP><GermanText text={card.examples[0].de}/>{audio(card.examples[0].de,card.examples[0].audio)}</LP><LP>{card.examples[0].en}</LP></>}</LDetails><Link href={cardHref(card)}>Full card →</Link></>}<StudyTagList tags={wordStudyTags(card)}/></LArticle>;})}</LDiv>{shown.length<visible.length&&<LButton type="button" className="study-secondary" onClick={()=>changeBrowse({...browse,page:browse.page+1})}>Show 12 more cards</LButton>}{!visible.length&&<LP className="sheet-note">No matches. Clear the search or choose All categories.</LP>}</LSection>
    <LSection id="sheet-practice" className="sheet-practice"><LDiv><LP className="study-eyebrow">Check the pattern</LP><LH2>Practise your selected words.</LH2><LP>This short set follows your study selection and card filters. Changing the filters starts a new set.</LP></LDiv><SheetRecall key={scopedQuestions.map(question=>question.id).join("|")} prefix="sheet" questions={scopedQuestions} speech={speech}/></LSection>
    <LDetails className="sheet-sources"><LSummary>Coverage & sources</LSummary><LP>Selected vocabulary and patterns from Momente A1.1 Lessons 1–12, including related exercise vocabulary. Word cards retain their course references. This sheet’s diagrams, explanations, practice combinations and quizzes were created for learning; example personal details are fictional.</LP><LP>{sheet==="people"?"Includes the family and profession entries indexed to the released lessons. Pronoun and family-status patterns connect these nouns to sentences.":sheet==="verbs"?"Present-tense verb models from the released lessons, plus the course pronouns, question words, connecting words and descriptive vocabulary. The six-person display includes ihr for a complete present-tense overview.":sheet==="numbers"?"The course collection provides 0–100; the interactive builder extends the Lesson 4 hundreds, thousands and million patterns. Number and price outputs are synthesized speech when no matching recorded clip exists.":"Informal and formal introductions, basic greetings, help phrases, and the German alphabet. The conversation chart includes practice combinations and useful help phrases."}</LP><LP>Original and existing pronunciation clips are reused where available. Added lines use synthesized German speech. Tap any German word, or select a phrase, for the dictionary.</LP><Link href="/references">Course sources & credits →</Link></LDetails>
    {sheet==="people"&&<PeoplePrintSummary/>}{sheet==="verbs"&&<VerbPrintSummary/>}{sheet==="numbers"&&<NumbersPrintSummary/>}{sheet==="conversation"&&<ConversationPrintSummary cards={cards}/>}
  </LDiv>;
}
