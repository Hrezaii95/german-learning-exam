"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import type {ShellNavCurrent} from "@/lib/content/nav";

const tabs=[
  {key:"book",href:"/book",label:"Book",icon:"M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z M12 6v15"},
  {key:"lessons",href:"/lessons",label:"Lessons",icon:"M4 3h16v18H4z M8 7h8 M8 12h8 M8 17h5"},
  {key:"cheat-sheets",href:"/cheat-sheets",label:"Cheat sheets",icon:"M12 3l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.5l-5.7 3 1.1-6.3L2.8 9.7l6.4-.9z"},
  {key:"saved",href:"/saved",label:"My review",icon:"M6 3h12v18l-6-4-6 4z"},
] as const;
const more=[
  {href:"/",label:"Dashboard",key:"dashboard",description:"Your daily starting point"},
  {href:"/vocabulary",label:"Vocabulary",key:"vocabulary",description:"Words, articles & plurals"},
  {href:"/verbs",label:"Verbs",key:"verbs",description:"Conjugations & examples"},
  {href:"/grammar",label:"Grammar",key:"grammar",description:"Patterns made clear"},
  {href:"/phrases",label:"Phrases & Q&A",key:"phrases",description:"Ready-to-use conversations"},
  {href:"/listening",label:"Listening",key:"listening",description:"Audio & transcripts"},
  {href:"/search",label:"Search",key:"search",description:"Find anything in the course"},
  {href:"/concepts",label:"Concepts",key:"concepts",description:"Connect words and ideas"},
  {href:"/hubs",label:"Study library",key:"hubs",description:"Browse every learning area"},
  {href:"/practice",label:"Practice",key:"practice",description:"Exercise your memory"},
  {href:"/review",label:"Course review",key:"review",description:"Review course material"},
  {href:"/references",label:"References",key:"references",description:"Sources & credits"},
  {href:"/settings",label:"Settings",key:"settings",description:"Your preferences"},
];
export function MobileNavigation({current}:{current:ShellNavCurrent}){
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false);
  useEffect(()=>{if(!open)return;const before=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=before;};},[open]);
  const close=()=>{dialog.current?.close();setOpen(false);trigger.current?.focus();};
  return <>
    <nav className="shell-bottomnav mobile-navigation" aria-label="Mobile">
      {tabs.map(item=><Link key={item.key} href={item.href} aria-current={current===item.key?"page":undefined}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d={item.icon}/></svg><span>{item.label}</span></Link>)}
      <button type="button" ref={trigger} aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={open} data-current={more.some(item=>item.key===current)||undefined} onClick={()=>{dialog.current?.showModal();setOpen(true);}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16 M4 12h16 M4 18h16"/></svg><span>Menu</span></button>
    </nav>
    <dialog ref={dialog} className="mobile-menu" aria-labelledby="mobile-menu-title" onClose={()=>setOpen(false)} onCancel={()=>setOpen(false)}>
      <header><div><small>German Learning OS</small><h2 id="mobile-menu-title">Where to next?</h2></div><button type="button" onClick={close} aria-label="Close navigation menu">✕</button></header>
      <nav aria-label="All study areas">{more.map(item=><Link key={item.key} href={item.href} aria-current={current===item.key?"page":undefined} onClick={close}><strong>{item.label}</strong><span>{item.description}</span></Link>)}</nav>
    </dialog>
  </>;
}
