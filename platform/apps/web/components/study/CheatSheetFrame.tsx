"use client";

import Link from "next/link";
import {useEffect,useRef,useState,type HTMLAttributes,type ReactNode} from "react";
import {sheetDestination,sheetDestinations,type SheetDestinationId} from "@/lib/study/sheet-navigation";
import {initialSheetBrowse,sheetBrowseQuery,type SheetBrowse} from "@/lib/study/sheet-browse";
import {sheetTags} from "@/lib/study/sheet-scope";
import type {SheetId} from "@/lib/study/sheet-topics";
import {SubjectIcon} from "./SubjectIllustration";
import {StudyScopeNotice} from "./StudyScope";
import "../../app/cheat-sheets/subjects/subjects.css";
import "./CheatSheetFrame.css";

export function CheatSheetNavigation({current,browse}:{current:SheetDestinationId;browse?:SheetBrowse|undefined}){
  const chooser=useRef<HTMLDetailsElement>(null);
  const [query,setQuery]=useState("");
  const selected=sheetDestination(current);
  const visible=sheetDestinations.filter(destination=>`${destination.label} ${destination.kind}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const layoutQuery=browse?sheetBrowseQuery({...initialSheetBrowse,view:browse.view??"illustrated",...(browse.gender!==undefined?{gender:browse.gender}:{}),...(browse.subjects!==undefined?{subjects:browse.subjects}:{}),...(browse.lessons!==undefined?{lessons:browse.lessons}:{}),...(browse.groupOrder?{groupOrder:browse.groupOrder}:{}),...(browse.sort?{sort:browse.sort}:{}),...(browse.direction?{direction:browse.direction}:{})}):"";
  const close=()=>{if(chooser.current)chooser.current.open=false;setQuery("");};
  useEffect(()=>{
    const element=chooser.current;
    if(!element)return;
    const closeOnEscape=(event:KeyboardEvent)=>{
      if(event.key!=="Escape")return;
      event.preventDefault();element.open=false;setQuery("");element.querySelector("summary")?.focus();
    };
    element.addEventListener("keydown",closeOnEscape);
    return()=>element.removeEventListener("keydown",closeOnEscape);
  },[]);
  return <div className="subject-navigation subject-print-hide">
    <Link href="/cheat-sheets" className="subject-back">← All cheat sheets</Link>
    <details ref={chooser} className="subject-switcher sheet-switcher">
      <summary><span><small>Choose a study sheet</small><strong>{selected.label}</strong></span><span aria-hidden="true">⌄</span></summary>
      <div className="sheet-switcher-panel">
        <label className="sheet-switcher-search">Find a study sheet<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Vocabulary, countries, verbs…"/></label>
        <p role="status">{visible.length} of {sheetDestinations.length} study sheets</p>
        <nav aria-label="Choose a study sheet">{([['vocabulary','All vocabulary'],['subject','Vocabulary by subject'],['workshop','Topic workshops']] as const).map(([kind,label])=>{
          const items=visible.filter(destination=>destination.kind===kind);
          return items.length?<section key={kind} aria-label={label}><h2>{label}</h2>{items.map(destination=><Link key={destination.id} href={`${destination.href}${destination.kind!=="workshop"?layoutQuery:""}`} aria-current={destination.id===current?"page":undefined} onClick={close}><SubjectIcon subject={destination.subject}/><span>{destination.label}</span><small>{destination.kind==="workshop"?"Workshop":destination.kind==="subject"?"Vocabulary":"Catalogue"}</small></Link>)}</section>:null;
        })}</nav>
        {!visible.length&&<p>No matching study sheet. Try another topic or clear your search.</p>}
      </div>
    </details>
  </div>;
}

type CheatSheetFrameProps=Omit<HTMLAttributes<HTMLDivElement>,"title">&{
  current:SheetDestinationId;
  eyebrow:string;
  title:string;
  lead:ReactNode;
  children:ReactNode;
  printNote?:ReactNode;
  browse?:SheetBrowse|undefined;
};

export function CheatSheetFrame({current,eyebrow,title,lead,className="",children,printNote,browse,...attributes}:CheatSheetFrameProps){
  return <div {...attributes} className={`subject-sheet study-workspace cheat-sheet-frame ${className}`}>
    <CheatSheetNavigation current={current} browse={browse}/>
    {sheetDestination(current).kind==="workshop"&&<StudyScopeNotice tags={sheetTags[current as SheetId]}/>}
    <header className="subject-page-heading"><div className="subject-heading-copy"><p className="study-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{lead}</p></div><div className="subject-heading-mark"><SubjectIcon subject={sheetDestination(current).subject}/></div></header>
    <div className="subject-page-actions subject-print-hide"><p>{printNote??"Keep a copy of this sheet for your study notes."}</p><button type="button" className="study-secondary" onClick={()=>window.print()}>Print / save as PDF</button></div>
    {children}
  </div>;
}
