"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {NAV_GROUPS,navItemsFor,shellCurrentMatches,type Role,type ShellNavCurrent} from "@/lib/content/nav";
import {AccountSlot} from "@/components/account/AccountSlot";

export function SkipToMainContent() {
  return <Link className="skip-link" href="#main-content" onClick={event=>{
    if(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button!==0) return;
    const main=document.getElementById("main-content");
    if(!main) return;
    // Skipping navigation changes focus within this page, not the reading history.
    event.preventDefault();
    main.focus({preventScroll:true});
    main.scrollIntoView({block:"start"});
  }}>Skip to main content</Link>;
}

export function MobileNavigation({current,role}:{current:ShellNavCurrent;role?:Role|undefined}){
  const tabs=navItemsFor("tabs",role);
  const destinations=navItemsFor("menu",role);
  const navigation=useRef<HTMLElement>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  useEffect(()=>{
    const element=navigation.current;
    if(!element || typeof ResizeObserver==="undefined")return;
    const sync=()=>document.documentElement.style.setProperty("--measured-bottom-nav-height",`${Math.ceil(element.getBoundingClientRect().height)}px`);
    const observer=new ResizeObserver(sync);
    observer.observe(element);sync();
    return()=>{observer.disconnect();document.documentElement.style.removeProperty("--measured-bottom-nav-height");};
  },[]);
  const visible = destinations.filter(item => `${item.label} ${item.description??""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  useEffect(()=>{if(!open)return;const before=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=before;};},[open]);
  const close=()=>{dialog.current?.close();setOpen(false);setQuery("");trigger.current?.focus();};
  return <>
    <nav ref={navigation} className="shell-bottomnav mobile-navigation" aria-label="Mobile">
      {tabs.map(item=><Link key={item.id} href={item.href} aria-current={shellCurrentMatches(current,item.id,"rail")?"page":undefined}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d={item.icon}/></svg><span>{item.label}</span></Link>)}
      <button type="button" ref={trigger} aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={open} data-current={destinations.some(item=>shellCurrentMatches(current,item.id,"rail")&&!tabs.some(tab=>tab.id===item.id))||undefined} onClick={()=>{dialog.current?.showModal();setOpen(true);}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16 M4 12h16 M4 18h16"/></svg><span>Menu</span></button>
    </nav>
    <dialog ref={dialog} className="mobile-menu" aria-labelledby="mobile-menu-title" onClose={()=>setOpen(false)} onCancel={event=>{event.preventDefault();close();}} onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();close();}}}>
      <header><div><small>German Learning OS</small><h2 id="mobile-menu-title">Where to next?</h2></div><button type="button" onClick={close} aria-label="Close navigation menu">✕</button></header>
      <AccountSlot/>
      <label className="menu-search">Find a study area<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Listening, vocabulary, settings…"/></label>
      <nav aria-label="All study areas">{NAV_GROUPS.map(group=>{
        const items = visible.filter(item=>(item.group??"explore")===group.id);
        return items.length ? <section key={group.label} aria-label={group.label}><h3>{group.label}</h3><div>{items.map(item=><Link key={item.id} href={item.href} aria-current={shellCurrentMatches(current,item.id,"rail")?"page":undefined} onClick={close}><strong>{item.label}</strong><span>{item.description}</span></Link>)}</div></section> : null;
      })}</nav>
      {!visible.length && <p role="status">No study area matches. Try “book” or “listening”.</p>}
    </dialog>
  </>;
}
