"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
export function OverviewPanel({title,children}:{title:string;children:ReactNode}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [expanded,setExpanded]=useState(false);
  useEffect(()=>{if(expanded)dialog.current?.showModal();},[expanded]);
  return <section className="sheet-overview"><div className="study-section-heading"><h2>{title}</h2><button type="button" className="study-secondary" onClick={()=>setExpanded(true)}>Expand overview</button></div>{!expanded&&<div>{children}</div>}<dialog ref={dialog} className="sheet-overview-dialog" aria-label={title} onClose={()=>setExpanded(false)}><header><h2>{title}</h2><button type="button" className="study-secondary" onClick={()=>dialog.current?.close()}>Close overview</button></header>{expanded&&children}</dialog></section>;
}
