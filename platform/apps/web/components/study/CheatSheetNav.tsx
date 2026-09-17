"use client";
import {useStudyScope,StudyScopeNotice} from "./StudyScope";
import {sheetTags} from "@/lib/study/sheet-scope";
import Link from "next/link";
import {sheetLinks,type SheetId} from "@/lib/study/sheet-topics";
export function CheatSheetNav({current}:{current:SheetId}) {
  const {matches}=useStudyScope();
  const links=sheetLinks.filter(s=>s.id===current||matches(sheetTags[s.id]));
  const selected=sheetLinks.find(s=>s.id===current)!;
  return <><nav className="cheat-sheet-switcher sheet-desktop-switcher" aria-label="Choose a cheat sheet">{links.map(s=><Link href={s.href} key={s.id} aria-current={current===s.id?"page":undefined}>{s.number} · {s.title}</Link>)}</nav><details className="sheet-mobile-switcher"><summary><small>CHEAT SHEET {selected.number} / {String(sheetLinks.length).padStart(2,"0")}</small><strong>{selected.title} <span aria-hidden="true">⌄</span></strong></summary><nav aria-label="Choose a cheat sheet on phone">{links.map(s=><Link href={s.href} key={s.id} aria-current={current===s.id?"page":undefined}>{s.number} · {s.title}</Link>)}</nav></details><StudyScopeNotice tags={sheetTags[current]}/></>;
}
