"use client";

import {normalizeSheetSort,normalizeSheetSortDirection} from "@/lib/study/sheet-sorting";
import type {SheetBrowse} from "@/lib/study/sheet-browse";

export function SubjectSortingControls({browse,onChange}:{browse:SheetBrowse;onChange:(browse:SheetBrowse)=>void}){
  return <div className="subject-sorting-controls subject-print-hide" role="group" aria-label="Word sorting">
    <label>Sort words by<select value={browse.sort??"german"} onChange={event=>{const sort=normalizeSheetSort(event.target.value);if(sort)onChange({...browse,sort});}}>
      <option value="german">German alphabet</option><option value="meaning">English meaning</option><option value="lesson">Lesson</option><option value="source">Source</option><option value="original">Original vocabulary order</option>
    </select></label>
    <label>Sort direction<select value={browse.direction??"asc"} onChange={event=>{const direction=normalizeSheetSortDirection(event.target.value);if(direction)onChange({...browse,direction});}}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
    <p>Applied within each group. German alphabet uses the word after its article.{browse.sort==="source"&&<span>Source order: {browse.direction==="desc"?"study aids → teacher extras → course material.":"course material → teacher extras → study aids."}</span>}</p>
  </div>;
}
