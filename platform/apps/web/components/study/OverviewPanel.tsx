"use client";
import { LButton, LDialog, LDiv, LH2, LHeader, LSection } from "@/components/i18n/LocalizedElements";

import {useEffect,useRef,useState,type ReactNode} from "react";
export function OverviewPanel({title,children}:{title:string;children:ReactNode}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [expanded,setExpanded]=useState(false);
  useEffect(()=>{if(expanded)dialog.current?.showModal();},[expanded]);
  return <LSection className="sheet-overview"><LDiv className="study-section-heading"><LH2>{title}</LH2><LButton type="button" className="study-secondary" onClick={()=>setExpanded(true)}>Expand overview</LButton></LDiv>{!expanded&&<LDiv>{children}</LDiv>}<LDialog ref={dialog} className="sheet-overview-dialog" aria-label={title} onClose={()=>setExpanded(false)}><LHeader><LH2>{title}</LH2><LButton type="button" className="study-secondary" onClick={()=>dialog.current?.close()}>Close overview</LButton></LHeader>{expanded&&children}</LDialog></LSection>;
}
