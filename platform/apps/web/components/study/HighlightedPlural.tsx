import type {ReactNode} from "react";
import {pluralDifference} from "@/lib/study/plural-patterns";

/** Highlight only exact, observed changes; keep every original source character. */
export function HighlightedPlural({singular,plural}:{singular:string;plural:string}):ReactNode{
  const original=plural;
  const change=pluralDifference(singular,original);
  if(!change||!change.plural||change.stem+change.ending!==change.plural||!original.endsWith(change.plural))return original;
  const prefix=original.slice(0,original.length-change.plural.length);
  const changed=new Set(change.umlautIndices);
  return <>{prefix}{Array.from(change.stem).map((letter,index)=>changed.has(index)
    ?<mark key={index} className="subject-plural-umlaut">{letter}</mark>
    :letter)}{change.ending&&<mark className="subject-plural-ending">{change.ending}</mark>}</>;
}
