"use client";
import { LDetails, LDiv, LInput, LLabel, LNav, LP, LSmall, LSpan, LStrong, LSummary } from "@/components/i18n/LocalizedElements";

import {useRef,useState} from "react";
import {useStudyScope,StudyScopeNotice} from "./StudyScope";
import {sheetTags} from "@/lib/study/sheet-scope";
import Link from "@/components/i18n/LocalizedLink";
import {sheetLinks,type SheetId} from "@/lib/study/sheet-topics";
export function CheatSheetNav({current}:{current:SheetId}) {
  const {matches}=useStudyScope();
  const [query,setQuery]=useState("");
  const chooser=useRef<HTMLDetailsElement>(null);
  const links=sheetLinks.filter(s=>s.id===current||matches(sheetTags[s.id]));
  const visible=links.filter(sheet=>`${sheet.number} ${sheet.title}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selected=sheetLinks.find(s=>s.id===current)!;
  return <>
    <LDetails ref={chooser} className="sheet-mobile-switcher sheet-chooser">
      <LSummary><LSmall>CHEAT SHEET {selected.number} / {String(sheetLinks.length).padStart(2,"0")}</LSmall><LStrong>{selected.title}<LSpan className="sheet-chooser-action">Change <LSpan aria-hidden="true">⌄</LSpan></LSpan></LStrong></LSummary>
      <LDiv className="sheet-chooser-body">
        <LLabel className="menu-search">Find a cheat sheet<LInput type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Countries, verbs, time…"/></LLabel>
        <LP className="muted" role="status">{visible.length} of {links.length} sheets · your selection{matches(sheetTags[current])?"":" plus this open sheet"}</LP>
        <LNav aria-label="Choose a cheat sheet">{visible.map(sheet=><Link href={sheet.href} key={sheet.id} aria-current={current===sheet.id?"page":undefined} onClick={()=>{if(chooser.current)chooser.current.open=false;setQuery("");}}>{sheet.number} · {sheet.title}</Link>)}</LNav>
        {!visible.length && <LP>No matching sheet. Try a topic such as “time” or clear your search.</LP>}
      </LDiv>
    </LDetails>
    <StudyScopeNotice tags={sheetTags[current]}/>
  </>;
}
