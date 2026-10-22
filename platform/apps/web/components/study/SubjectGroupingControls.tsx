"use client";

import { Icon } from "@/components/media/Icon";
import {DEFAULT_GROUP_ORDER,getActiveGroupOrder,type SheetGrouping} from "@/lib/study/sheet-grouping";
import type {SheetBrowse} from "@/lib/study/sheet-browse";

const labels:Record<SheetGrouping,string>={lesson:"Lesson",subject:"Subject tags",gender:"Gender",plural:"Plural pattern"};
const switches:Record<SheetGrouping,string>={lesson:"Group by lesson",subject:"Group by subject tags",gender:"Group by gender",plural:"Group by plural pattern"};

export function SubjectGroupingControls({browse,onChange}:{browse:SheetBrowse;onChange:(browse:SheetBrowse)=>void}){
  const order=browse.groupOrder??DEFAULT_GROUP_ORDER;
  const active=getActiveGroupOrder(browse);
  const enabled=(dimension:SheetGrouping)=>active.includes(dimension);
  const toggle=(dimension:SheetGrouping)=>{
    if(dimension==="lesson")onChange({...browse,lessons:!enabled(dimension)});
    else if(dimension==="subject")onChange({...browse,subjects:!enabled(dimension)});
    else if(dimension==="gender")onChange({...browse,gender:!enabled(dimension)});
    else onChange({...browse,view:enabled(dimension)?"illustrated":"plurals"});
  };
  const move=(dimension:SheetGrouping,direction:-1|1)=>{
    const index=active.indexOf(dimension);
    const neighbour=active[index+direction];
    if(!neighbour)return;
    const next=[...order];
    const from=next.indexOf(dimension),to=next.indexOf(neighbour);
    [next[from],next[to]]=[next[to]!,next[from]!];
    onChange({...browse,groupOrder:next});
  };
  return <div className="subject-grouping-controls subject-print-hide">
    <div className="subject-grouping-switches" role="group" aria-label="Infographic grouping">
      {DEFAULT_GROUP_ORDER.map(dimension=><button key={dimension} type="button" role="switch" className="subject-grouping-switch" aria-label={switches[dimension]} aria-checked={enabled(dimension)} onClick={()=>toggle(dimension)}><span className="subject-switch-track" aria-hidden="true"/><strong>{switches[dimension]}</strong><small>{enabled(dimension)?"On":"Off"}</small></button>)}
      <p>Icons, meanings and article colours stay visible in every layout.</p>
    </div>
    <div className="subject-grouping-priority" role="group" aria-label="Grouping priority">
      <div><strong>Grouping order</strong><p>First group outside, then split within it. Move a group earlier or later.</p></div>
      {active.length>0?<ol aria-label="Active grouping order">{active.map((dimension,index)=><li key={dimension} data-grouping-priority={dimension}>
        <span className="subject-priority-number" aria-hidden="true">{index+1}</span><strong>{labels[dimension]}</strong>
        <span className="subject-priority-move"><button type="button" aria-label={`Move ${labels[dimension]} earlier`} disabled={index===0} onClick={()=>move(dimension,-1)}><span aria-hidden="true"><Icon name="back"/></span></button><button type="button" aria-label={`Move ${labels[dimension]} later`} disabled={index===active.length-1} onClick={()=>move(dimension,1)}><span aria-hidden="true"><Icon name="arrow"/></span></button></span>
      </li>)}</ol>:<p className="subject-grouping-none">No grouping · one illustrated word collection.</p>}
      <p className="subject-priority-summary" role="status">{active.length?active.map(dimension=>labels[dimension]).join(" → "):"All grouping is off"}</p>
    </div>
  </div>;
}
