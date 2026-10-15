"use client";

import type {ReactNode} from "react";
import {buildPluralMatrix,pluralDifference,pluralGenders,type PluralPatternEntry} from "@/lib/study/plural-patterns";
import type {SubjectVocabularyItem} from "@/lib/study/subject-sheets";
import type {StudyConcept} from "@/lib/study/scope";
import {SubjectVocabularyVisual} from "./SubjectIllustration";

type SubjectPluralGridProps={
  items:readonly SubjectVocabularyItem[];
  currentId?:string;
  subject:StudyConcept;
  openEntry:string;
  onChoose:(id:string,key:string)=>void;
  onClose:(key:string)=>void;
  renderDropdown:(item:SubjectVocabularyItem,key:string)=>ReactNode;
  triggerRef:(key:string,node:HTMLButtonElement|null)=>void;
  entryRef?:(id:string,node:HTMLButtonElement|null)=>void;
};

function sourceQualifier(item:SubjectVocabularyItem){
  return (item.studyTags.sources??[item.studyTags.source])
    .filter(source=>source!=="course")
    .map(source=>source==="teacher-extra"?"Teacher extra":"Study extra").join(" · ");
}

/** Highlight only exact, observed changes; keep every original source character. */
function highlightedPlural(entry:PluralPatternEntry):ReactNode{
  if(!entry.plural)return null;
  const original=entry.plural.text;
  const change=pluralDifference(entry.item.de,original);
  if(!change||!change.plural||change.stem+change.ending!==change.plural||!original.endsWith(change.plural))return original;
  const prefix=original.slice(0,original.length-change.plural.length);
  const changed=new Set(change.umlautIndices);
  return <>{prefix}{Array.from(change.stem).map((letter,index)=>changed.has(index)
    ?<mark key={index} className="subject-plural-umlaut">{letter}</mark>
    :letter)}{change.ending&&<mark className="subject-plural-ending">{change.ending}</mark>}</>;
}

function PatternSchema({item,subject}:{item:SubjectVocabularyItem;subject:StudyConcept}){
  return <span className="subject-plural-pattern-schema" aria-hidden="true"><SubjectVocabularyVisual de={item.de} category={item.category} cardId={item.cardId} subject={subject}/><span>→</span><span className="subject-plural-many">{[0,1,2].map(index=><SubjectVocabularyVisual key={index} de={item.de} category={item.category} cardId={item.cardId} subject={subject}/>)}</span></span>;
}

export function SubjectPluralGrid({items,currentId,subject,openEntry,onChoose,onClose,renderDropdown,triggerRef,entryRef}:SubjectPluralGridProps){
  const matrix=buildPluralMatrix(items);
  const rows=matrix.rows.filter(row=>row.id!=="not-taught"&&pluralGenders.some(gender=>row.cells[gender.id].length>0));
  const notTaught=matrix.rows.find(row=>row.id==="not-taught");
  const hasNotTaught=notTaught&&pluralGenders.some(gender=>notTaught.cells[gender.id].length>0);
  const anchored=new Set<string>();
  const entryButton=(entry:PluralPatternEntry)=>{
    const {item}=entry;
    const anchor=!anchored.has(item.id);
    anchored.add(item.id);
    const qualifier=sourceQualifier(item);
    const expanded=openEntry===entry.id||(anchor&&openEntry===item.id);
    return <><button type="button" id={anchor?`sheet-card-${item.id}`:undefined}
      ref={node=>{triggerRef(entry.id,node);if(anchor)entryRef?.(item.id,node);}}
      className={`subject-plural-entry subject-tone-${entry.gender}`}
      data-subject-entry={anchor?item.id:undefined}
      data-subject-plural-entry={entry.id}
      aria-label={[item.de,entry.plural?`→ ${entry.plural.text}`:"No plural taught here",qualifier].filter(Boolean).join(" · ")}
      aria-pressed={currentId===item.id} aria-expanded={expanded} aria-controls={expanded?`subject-word-detail-${entry.id}`:undefined} onClick={()=>onChoose(item.id,expanded?openEntry:entry.id)} onKeyDown={event=>{if(event.key==="Escape"&&expanded){event.preventDefault();event.stopPropagation();onClose(entry.id);}}}>
      <SubjectVocabularyVisual de={item.de} category={item.category} cardId={item.cardId} subject={subject}/>
      <span className="subject-plural-entry-copy"><span className="subject-plural-singular" lang="de">{item.de}</span>
      {entry.plural?<span className="subject-plural-result" lang="de"><span className="subject-plural-arrow" aria-hidden="true">→</span><span>{highlightedPlural(entry)}</span></span>
        :<span className="subject-plural-unrecorded">No plural taught on this card.</span>}
      {qualifier&&<small className="subject-plural-source">{qualifier}</small>}
      <span className="subject-plural-meaning">{item.meaning}</span></span><span className="subject-entry-chevron" aria-hidden="true">{expanded?"⌃":"⌄"}</span>
    </button>{expanded&&renderDropdown(item,entry.id)}</>;
  };
  return <section className="subject-plural-view" aria-labelledby="subject-plural-heading">
    <div className="subject-plural-intro">
      <div><p className="study-eyebrow">See the meaning · notice the change</p><h3 id="subject-plural-heading">Gender × plural pattern</h3><p>Follow the illustrations across the singular genders and down the plural changes. Open any word for both pronunciations and its card.</p></div>
      <p className="subject-plural-rule"><strong lang="de">der / die / das → die</strong><span>Plural forms here use <b lang="de">die</b> (nominative). Gender alone does not tell you the plural. Learn the pair together.</span></p>
    </div>
    <div className="subject-plural-legend"><span><mark className="subject-plural-ending">-e</mark> Added ending</span><span><mark className="subject-plural-umlaut">ü</mark> Changed vowel: umlaut</span><span><b>—</b> No ending added</span></div>
    {rows.length>0?<div className="subject-plural-table-wrap"><table className="subject-plural-table" role="table">
      <caption>Plural patterns and singular genders in this selection · {matrix.nounCount} {matrix.nounCount===1?"noun":"nouns"} · {matrix.pairCount} taught plural {matrix.pairCount===1?"form":"forms"}</caption>
      <thead><tr role="row"><th scope="col" role="columnheader" className="subject-plural-pattern-column">Plural change</th>{pluralGenders.map(gender=><th scope="col" role="columnheader" aria-label={`${gender.article} · ${gender.label} singular`} id={`subject-plural-col-${gender.id}`} key={gender.id} className={`subject-tone-${gender.id}`}><span lang="de">{gender.article}</span><small>{gender.label} singular</small></th>)}</tr></thead>
      <tbody>{rows.map(row=><tr role="row" key={row.id} data-plural-pattern={row.id}>
        <th scope="row" role="rowheader" id={`subject-plural-row-${row.id}`}><strong>{row.label}</strong><PatternSchema item={Object.values(row.cells).flat()[0]!.item} subject={subject}/><span>{row.explanation}</span></th>
        {pluralGenders.map(gender=><td key={gender.id} headers={`subject-plural-row-${row.id} subject-plural-col-${gender.id}`} className={`subject-tone-${gender.id}`}>
          <span className="subject-plural-mobile-label" aria-hidden="true"><b lang="de">{gender.article}</b> {gender.label}</span>
          {row.cells[gender.id].length>0?<ul className="subject-plural-cell-entries">{row.cells[gender.id].map(entry=><li key={entry.id}>{entryButton(entry)}</li>)}</ul>:<span className="subject-plural-empty-cell">No examples in this selection.</span>}
        </td>)}
      </tr>)}</tbody>
    </table></div>:<p className="subject-plural-no-nouns">{matrix.nounCount>0?"No plural changes are taught for the singular nouns in this selection. Their recorded forms are listed below.":"This selection has no singular nouns with a grammatical gender to place in the grid."}</p>}
    {notTaught&&hasNotTaught&&<section className="subject-plural-missing" aria-labelledby="subject-plural-missing-heading">
      <div className="subject-plural-missing-heading"><h4 id="subject-plural-missing-heading">No plural taught on these cards</h4><p>A missing form here does not mean the noun has no plural. These entries stay separate from the recorded plural changes.</p></div>
      <div className="subject-plural-missing-genders">{pluralGenders.map(gender=><section key={gender.id} className={`subject-plural-missing-lane subject-tone-${gender.id}`} aria-labelledby={`subject-plural-missing-${gender.id}`}>
        <h5 id={`subject-plural-missing-${gender.id}`}><span lang="de">{gender.article}</span> {gender.label}</h5>
        {notTaught.cells[gender.id].length>0?<ul className="subject-plural-cell-entries">{notTaught.cells[gender.id].map(entry=><li key={entry.id}>{entryButton(entry)}</li>)}</ul>:<p className="subject-plural-empty-cell">No entries in this selection.</p>}
      </section>)}</div>
    </section>}
    {matrix.pluralFormItems.length>0&&<section className="subject-plural-existing" aria-labelledby="subject-plural-existing-heading">
      <div><h4 id="subject-plural-existing-heading">Already shown as plural</h4><p>These cards give a plural form. A singular-to-plural change cannot be read from this entry.</p></div>
      <ul>{matrix.pluralFormItems.map(item=>{
        const qualifier=sourceQualifier(item);
        const expanded=openEntry===item.id;
        return <li key={item.id}><button type="button" className="subject-plural-entry subject-tone-plural" id={`sheet-card-${item.id}`} ref={node=>{triggerRef(item.id,node);entryRef?.(item.id,node);}} data-subject-entry={item.id} aria-label={[item.de,"Already shown as plural",qualifier].filter(Boolean).join(" · ")} aria-pressed={currentId===item.id} aria-expanded={expanded} aria-controls={expanded?`subject-word-detail-${item.id}`:undefined} onClick={()=>onChoose(item.id,item.id)} onKeyDown={event=>{if(event.key==="Escape"&&expanded){event.preventDefault();event.stopPropagation();onClose(item.id);}}}><SubjectVocabularyVisual de={item.de} category={item.category} cardId={item.cardId} subject={subject}/><span className="subject-plural-entry-copy"><span className="subject-plural-singular" lang="de">{item.de}</span><span className="subject-plural-unrecorded">Plural form on this card</span><span className="subject-plural-meaning">{item.meaning}</span>{qualifier&&<small className="subject-plural-source">{qualifier}</small>}</span><span className="subject-entry-chevron" aria-hidden="true">{expanded?"⌃":"⌄"}</span></button>{expanded&&renderDropdown(item,item.id)}</li>;
      })}</ul>
    </section>}
    <p className="subject-plural-footnote">The grid describes these recorded forms. It is a memory aid for your vocabulary, rather than a rule that predicts every German noun.</p>
  </section>;
}
