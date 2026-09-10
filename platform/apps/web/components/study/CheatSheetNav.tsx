import Link from "next/link";
import {sheetLinks,type SheetId} from "@/lib/study/sheet-topics";
export function CheatSheetNav({current}:{current:SheetId}) {
  const selected=sheetLinks.find(s=>s.id===current)!;
  return <><nav className="cheat-sheet-switcher sheet-desktop-switcher" aria-label="Choose a cheat sheet">{sheetLinks.map(s=><Link href={s.href} key={s.id} aria-current={current===s.id?"page":undefined}>{s.number} · {s.title}</Link>)}</nav><details className="sheet-mobile-switcher"><summary><small>CHEAT SHEET {selected.number} / 06</small><strong>{selected.title} <span aria-hidden="true">⌄</span></strong></summary><nav aria-label="Choose a cheat sheet on phone">{sheetLinks.map(s=><Link href={s.href} key={s.id} aria-current={current===s.id?"page":undefined}>{s.number} · {s.title}</Link>)}</nav></details></>;
}
