"use client";

import {useId,type ReactNode} from "react";
import {groupSheetItems,type SheetGrouping} from "@/lib/study/sheet-grouping";
import {pluralPatterns} from "@/lib/study/plural-patterns";
import type {SubjectVocabularyItem} from "@/lib/study/subject-sheets";
import type {StudyConcept} from "@/lib/study/scope";
import {SubjectIcon} from "./SubjectIllustration";
import {PatternSchema} from "./SubjectPluralGrid";

const articles:Record<string,string>={male:"der",female:"die",neuter:"das",plural:"die"};

/** Each grouping partitions its input, keeping one anchor and one card per source row. */
export function SubjectGroupedVocabulary({items,order,preferredSubjects,subject,renderEntry}:{items:readonly SubjectVocabularyItem[];order:readonly SheetGrouping[];preferredSubjects:readonly StudyConcept[];subject:StudyConcept;renderEntry:(item:SubjectVocabularyItem)=>ReactNode}){
  const prefix=useId();
  const renderLevel=(members:readonly SubjectVocabularyItem[],depth:number,path:string):ReactNode=>{
    const dimension=order[depth];
    if(!dimension)return <div className="subject-grouped-leaves">{[...members].sort((a,b)=>a.de.localeCompare(b.de,"de")||a.id.localeCompare(b.id)).map(renderEntry)}</div>;
    const groups=groupSheetItems(members,dimension,preferredSubjects);
    const Heading=depth===0?"h3":depth===1?"h4":"h5";
    return <div className={`subject-nested-groups subject-nested-${dimension}`} data-group-level={dimension} data-group-depth={depth}>{groups.map(group=>{
      const groupPath=`${path}-${group.id}`;
      const pattern=dimension==="plural"&&pluralPatterns.some(pattern=>pattern.id===group.id);
      return <section key={group.id} className={`subject-nested-group subject-nested-group-${dimension}${group.tone?` subject-tone-${group.tone}`:""}`} data-sheet-group={dimension} data-group-key={group.id} data-plural-pattern={pattern?group.id:undefined} aria-labelledby={`${prefix}-${groupPath}`}>
        <header className="subject-nested-heading">
          {dimension==="subject"&&group.subject&&<SubjectIcon subject={group.subject}/>}
          {dimension==="gender"&&group.tone&&articles[group.tone]&&<span className="subject-lane-article" lang="de">{articles[group.tone]}</span>}
          <div><Heading id={`${prefix}-${groupPath}`}>{group.label}</Heading><small>{group.items.length} {group.items.length===1?"entry":"entries"}</small>{group.explanation&&<p>{group.explanation}</p>}</div>
          {pattern&&group.items[0]!.plurals.length>0&&<PatternSchema item={group.items[0]!} subject={subject}/>}
        </header>
        {renderLevel(group.items,depth+1,groupPath)}
      </section>;
    })}</div>;
  };
  return <div className={`subject-grouped-vocabulary${order.includes("plural")?" subject-plural-view":""}`}>
    {order.includes("subject")&&<p className="subject-grouping-note">Each word appears once, under its first matching selected subject tag. With all tags selected, the subject list order is used. All its tags remain on the word card.</p>}
    {order.includes("plural")&&<div className="subject-grouped-plural-key"><p><strong lang="de">der / die / das → die</strong><span>Learn the article and plural together. These groups describe the recorded forms; a missing form is not a rule.</span></p><div className="subject-plural-legend"><span><mark className="subject-plural-ending">-e</mark> Added ending</span><span><mark className="subject-plural-umlaut">ü</mark> Changed vowel: umlaut</span><span><b>—</b> No ending added</span></div><p className="subject-grouping-note">Words with several plural forms are grouped by their first matching pattern. Every recorded plural stays on the word.</p></div>}
    {renderLevel(items,0,"root")}
  </div>;
}
