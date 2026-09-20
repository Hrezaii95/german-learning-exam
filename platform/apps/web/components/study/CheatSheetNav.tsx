"use client";
import {useRef,useState} from "react";
import {useStudyScope,StudyScopeNotice} from "./StudyScope";
import {sheetTags} from "@/lib/study/sheet-scope";
import Link from "next/link";
import {sheetLinks,type SheetId} from "@/lib/study/sheet-topics";
export function CheatSheetNav({current}:{current:SheetId}) {
  const {matches}=useStudyScope();
  const [query,setQuery]=useState("");
  const chooser=useRef<HTMLDetailsElement>(null);
  const links=sheetLinks.filter(s=>s.id===current||matches(sheetTags[s.id]));
  const visible=links.filter(sheet=>`${sheet.number} ${sheet.title}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selected=sheetLinks.find(s=>s.id===current)!;
  return <>
    <details ref={chooser} className="sheet-mobile-switcher sheet-chooser">
      <summary><small>CHEAT SHEET {selected.number} / {String(sheetLinks.length).padStart(2,"0")}</small><strong>{selected.title}<span className="sheet-chooser-action">Change <span aria-hidden="true">⌄</span></span></strong></summary>
      <div className="sheet-chooser-body">
        <label className="menu-search">Find a cheat sheet<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Countries, verbs, time…"/></label>
        <p className="muted" role="status">{visible.length} of {links.length} sheets · your selection{matches(sheetTags[current])?"":" plus this open sheet"}</p>
        <nav aria-label="Choose a cheat sheet">{visible.map(sheet=><Link href={sheet.href} key={sheet.id} aria-current={current===sheet.id?"page":undefined} onClick={()=>{if(chooser.current)chooser.current.open=false;setQuery("");}}>{sheet.number} · {sheet.title}</Link>)}</nav>
        {!visible.length && <p>No matching sheet. Try a topic such as “time” or clear your search.</p>}
      </div>
    </details>
    <StudyScopeNotice tags={sheetTags[current]}/>
  </>;
}
