"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import type {WordCard} from "@/lib/content/word-card-types";
import {sheetLinks,sheetQuizzes,sheetTitles,type ExtendedSheetId} from "@/lib/study/sheet-topics";
import {CheatSheetNav} from "./CheatSheetNav";
import {SheetWorkshops} from "./SheetWorkshops";
import {GermanText,SaveButton,useStudy} from "./StudyProvider";
import {useStudyScope,StudyTagList} from "./StudyScope";
import {wordStudyTags} from "@/lib/study/tags";
import {LineAudio} from "./StudyAudio";
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
  const [position,setPosition]=useState(0),[answer,setAnswer]=useState<string|null>(null),[score,setScore]=useState(0);
  const title=sheetTitles[sheet],link=sheetLinks.find(s=>s.id===sheet)!;
  const visible=scopedCards.filter(c=>(category==="all"||c.category===category)&&(!saved||study?.state.saved[`card-${c.id}`])&&`${c.title} ${c.searchText}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de")));
  const quiz=sheetQuizzes[sheet],question=quiz[position];
  const scopedQuestions=sheet==="people"?peopleRecallQuestions(visible):sheet==="verbs"?verbRecallQuestions(visible):[];
  const hasScopedPractice=sheet==="people"||sheet==="verbs";
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
  return <div className={`collection-sheet collection-${sheet}`}>
    <CheatSheetNav current={sheet}/><header className="collection-heading"><div><p className="study-eyebrow">Cheat sheet {link.number} · {title.eyebrow}</p><h1>{title.title}</h1><p>{title.subtitle}</p></div><button type="button" className="study-secondary" onClick={print}>Print cheat sheet</button></header>
    <nav className="sheet-jump" aria-label="Sheet sections">{sheet==="people"?<><Link href="#family-tree">Family tree</Link><Link href="#people-work">Work & word forms</Link><Link href="#people-descriptions">Describe people</Link></>:<Link href="#sheet-workshop">Explore & understand</Link>}<Link href="#sheet-cards">Cards & recall</Link><Link href="#sheet-practice">Test yourself</Link></nav>
    <div id="sheet-workshop"><SheetWorkshops sheet={sheet} cards={sheet==="verbs"?cards:scopedCards} speech={speech}/></div>
    <section id="sheet-cards"><div className="study-section-heading"><div><p className="study-eyebrow">From your course collection</p><h2>Learn it. Hide it. Recall it.</h2></div><button type="button" className="study-secondary" aria-pressed={recall} onClick={()=>{setRecall(!recall);setRevealed([]);}}>{recall?"Show all answers":"Hide answers & recall"}</button></div><div className="sheet-controls"><label>Find a card<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="German or English…"/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{[...new Set(cards.map(c=>c.category))].map(c=><option key={c}>{c}</option>)}</select></label><button type="button" className="study-secondary" aria-pressed={saved} onClick={()=>setSaved(!saved)}>{saved?"Showing saved cards":"Show saved cards"}</button></div><p role="status">{visible.length} cards · showing {shown.length} · {recall?"Say the German before revealing.":"Tap a word for its meaning. Save the ones you want to revisit."}</p><div className="collection-cards">{shown.map(card=>{const hidden=recall&&!revealed.includes(card.id);return <article key={card.id} id={`sheet-card-${card.id}`} data-sheet-card={card.id}><header><small>{card.category}</small><SaveButton compact item={savedWordCard(card)}/></header><h3>{card.title}</h3>{hidden?<button type="button" className="study-secondary" onClick={()=>setRevealed([...revealed,card.id])}>Reveal German</button>:<>{card.rows.map((row,i)=><div className="collection-word" key={i}><p className={`study-tone-${row.singular.tone}`}><GermanText text={row.singular.text}/>{audio(row.singular.text,row.singular.audio)}</p>{row.plurals.map(p=><p className="study-tone-plural" key={p.text}><small>Plural</small> <GermanText text={p.text}/>{audio(p.text,p.audio)}</p>)}</div>)}<details><summary>Memory cue & example</summary><p>{card.tip}</p>{card.examples[0]&&<><p><GermanText text={card.examples[0].de}/>{audio(card.examples[0].de,card.examples[0].audio)}</p><p>{card.examples[0].en}</p></>}</details><Link href={cardHref(card)}>Full card →</Link></>}<StudyTagList tags={wordStudyTags(card)}/></article>;})}</div>{shown.length<visible.length&&<button type="button" className="study-secondary" onClick={()=>changeBrowse({...browse,page:browse.page+1})}>Show 12 more cards</button>}{!visible.length&&<p className="sheet-note">No matches. Clear the search or choose All categories.</p>}</section>
    <section id="sheet-practice" className="sheet-practice"><div><p className="study-eyebrow">Check the pattern</p><h2>{hasScopedPractice?"Practise your selected words.":"Eight quick questions."}</h2><p>{hasScopedPractice?"This short set follows your study selection and card filters. Changing the filters starts a new set.":"Use your mistakes to choose what to save for review."}</p></div>{hasScopedPractice?<SheetRecall key={scopedQuestions.map(q=>q.id).join("|")} prefix="sheet" questions={scopedQuestions} speech={speech}/>:<div className="sheet-quiz">{question?<><small>Question {position+1} / {quiz.length}</small><h3>{question.q}</h3><div className="sheet-quiz-options">{question.options.map(o=><button type="button" key={o} disabled={answer!==null} aria-pressed={answer===o} data-answer={answer===null?undefined:o===question.answer?"correct":o===answer?"wrong":undefined} onClick={()=>{setAnswer(o);if(o===question.answer)setScore(score+1);}}>{o}</button>)}</div>{answer!==null&&<div role="status"><h4>{answer===question.answer?"Exactly.":"Remember this:"}</h4><p>{question.why}</p><div className="study-row"><SaveButton item={{id:`sheet-quiz-${sheet}-${position}`,title:`${question.q} → ${question.answer}`,meaning:question.why,kind:"concept",href:`${link.href}#sheet-practice`}}/><button type="button" className="study-primary" onClick={()=>{setPosition(position+1);setAnswer(null);}}>Next →</button></div></div>}</>:<div role="status"><h3>{score} / {quiz.length}</h3><p>{score===quiz.length?"You have the pattern. Try recalling the cards next.":"Save the tricky patterns, then try again."}</p><button type="button" className="study-primary" onClick={()=>{setPosition(0);setAnswer(null);setScore(0);}}>Practise again</button></div>}</div>}</section>
    <details className="sheet-sources"><summary>Coverage & sources</summary><p>Selected vocabulary and patterns from Momente A1.1 Lessons 1–12, including related exercise vocabulary. Word cards retain their course references. This sheet’s diagrams, explanations, practice combinations and quizzes were created for learning; example personal details are fictional.</p><p>{sheet==="people"?"Includes the family and profession entries indexed to the released lessons. Pronoun and family-status patterns connect these nouns to sentences.":sheet==="verbs"?"Present-tense verb models from the released lessons, plus the course pronouns, question words, connecting words and descriptive vocabulary. The six-person display includes ihr for a complete present-tense overview.":sheet==="numbers"?"The course collection provides 0–100; the interactive builder extends the Lesson 4 hundreds, thousands and million patterns. Number and price outputs are synthesized speech when no matching recorded clip exists.":"Informal and formal introductions, basic greetings, help phrases, and the German alphabet. The conversation chart includes practice combinations and useful help phrases."}</p><p>Original and existing pronunciation clips are reused where available. Added lines use synthesized German speech. Tap any German word, or select a phrase, for the dictionary.</p><Link href="/references">Course sources & credits →</Link></details>
    {sheet==="people"&&<PeoplePrintSummary/>}{sheet==="verbs"&&<VerbPrintSummary/>}
  </div>;
}
