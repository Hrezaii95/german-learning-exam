"use client";
import {useRef,type ReactNode} from "react";
export function OverviewPanel({title,children}:{title:string;children:ReactNode}){
  const dialog=useRef<HTMLDialogElement>(null);
  return <section className="sheet-overview"><div className="study-section-heading"><h2>{title}</h2><button type="button" className="study-secondary" onClick={()=>dialog.current?.showModal()}>Expand overview</button></div><div>{children}</div><dialog ref={dialog} className="sheet-overview-dialog" aria-label={title}><header><h2>{title}</h2><button type="button" className="study-secondary" onClick={()=>dialog.current?.close()}>Close overview</button></header>{children}</dialog></section>;
}
