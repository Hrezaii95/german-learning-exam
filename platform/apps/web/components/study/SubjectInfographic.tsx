"use client";

import { Icon } from "@/components/media/Icon";
import Link from "next/link";
import {useEffect,useRef,useState,type CSSProperties} from "react";
import {queryMatchKeys} from "@/lib/content/match-keys";
import {appendNavigationContext} from "@/lib/content/navigation-context";
import {defaultStudyScope,matchesStudyScope,scopeLabel,selectedLessons,studyConcepts,type StudyConcept,type StudyScope} from "@/lib/study/scope";
import {initialSheetBrowse,readSheetBrowse,sheetBrowseQuery,sheetNavigationContext,type SheetBrowse} from "@/lib/study/sheet-browse";
import {getActiveGroupOrder} from "@/lib/study/sheet-grouping";
import {sortSheetItems} from "@/lib/study/sheet-sorting";
import {subjectSheetHref,subjectVocabularyGroups,type SubjectSheet,type SubjectVocabularyGroup,type SubjectVocabularyItem} from "@/lib/study/subject-sheets";
import {OverviewPanel} from "./OverviewPanel";
import {useStudyScope} from "./StudyScope";
import {SubjectIcon} from "./SubjectIllustration";
import {SubjectPluralGrid} from "./SubjectPluralGrid";
import {SubjectGroupedVocabulary} from "./SubjectGroupedVocabulary";
import {SubjectGroupingControls} from "./SubjectGroupingControls";
import {SubjectSortingControls} from "./SubjectSortingControls";
import {SubjectSheetFilters} from "./SubjectSheetFilters";
import {CheatSheetFrame} from "./CheatSheetFrame";
import {sheetDestinations} from "@/lib/study/sheet-navigation";
import {VOCABULARY_SHEET_PATH} from "@/lib/study/sheet-routes";
import {WordDropdown} from "./WordDropdown";
import {VocabularyEntry} from "./VocabularyEntry";

const articles:Record<string,string>={male:"der",female:"die",neuter:"das",plural:"die"};

function searchKey(text:string){
  return text.toLocaleLowerCase("de").replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").trim();
}

export function SubjectInfographic({sheet,allNouns=false,allItems}:{sheet:SubjectSheet;allNouns?:boolean;allItems?:SubjectVocabularyItem[]}){
  const {scope,setScope,ready}=useStudyScope();
  const catalogue=allItems??sheet.items;
  const [browse,setBrowse]=useState<SheetBrowse>(()=>allNouns?{...initialSheetBrowse,view:"plurals"}:initialSheetBrowse);
  const [selected,setSelected]=useState("");
  const [openEntry,setOpenEntry]=useState("");
  const triggers=useRef(new Map<string,HTMLButtonElement>());
  const entries=useRef(new Map<string,HTMLButtonElement>());
  const pendingHash=useRef<string|null>(null);
  useEffect(()=>{
    const restore=()=>{
      const restored={...(allNouns?{view:"plurals" as const}:{}),...readSheetBrowse(new URLSearchParams(window.location.search))};
      if(window.location.hash.startsWith("#sheet-card-")){
        try{
          const requested=decodeURIComponent(window.location.hash.slice("#sheet-card-".length));
          const item=catalogue.find(item=>item.id===requested||item.legacyIds?.includes(requested));
          const id=item?.id??requested;
          if(item&&id!==requested&&restored.category!=="all")restored.category=subjectVocabularyGroups([item])[0]?.id??"all";
          setSelected(id);
          setOpenEntry(id);
          pendingHash.current=id;
        }catch{/* Malformed fragments have no matching vocabulary entry. */}
      }
      setBrowse(restored);
    };
    restore();
    window.addEventListener("popstate",restore);
    window.addEventListener("hashchange",restore);
    return()=>{window.removeEventListener("popstate",restore);window.removeEventListener("hashchange",restore);};
  },[sheet.id,allNouns,catalogue]);
  const changeBrowse=(next:SheetBrowse)=>{
    setBrowse(next);
    window.history.replaceState(window.history.state,"",`${window.location.pathname}${sheetBrowseQuery(next)}`);
  };
  const effectiveConcepts=browse.tags??(allNouns?scope.concepts:[sheet.id]);
  const sheetScope:StudyScope={...scope,...(browse.lessonFilter?{mode:browse.lessonFilter.length===1?"one" as const:"multiple" as const,lessons:browse.lessonFilter}:{}),concepts:effectiveConcepts,source:browse.sourceFilter??scope.source};
  const setSheetScope=(next:StudyScope)=>{
    setScope(next);
    const nextBrowse:SheetBrowse={...browse,tags:[...next.concepts],...(next.concepts.join(",")!==effectiveConcepts.join(",")?{category:"all"}:{}),page:1};
    if(browse.lessonFilter&&next.mode!=="all")nextBrowse.lessonFilter=selectedLessons(next);
    else delete nextBrowse.lessonFilter;
    if(next.source==="all")delete nextBrowse.sourceFilter;
    else nextBrowse.sourceFilter=next.source;
    changeBrowse(nextBrowse);
  };
  const resetFilters=()=>{
    setScope(defaultStudyScope());
    const resetBrowse:SheetBrowse={...browse,...initialSheetBrowse,tags:[]};
    delete resetBrowse.lessonFilter;
    delete resetBrowse.sourceFilter;
    changeBrowse(resetBrowse);
  };
  const scoped=catalogue.filter(item=>matchesStudyScope(item.studyTags,sheetScope));
  const groups=subjectVocabularyGroups(scoped);
  const queryKeys=queryMatchKeys(browse.query.trim());
  const visibleGroups=subjectVocabularyGroups(scoped.filter(item=>{
    if(!queryKeys.length)return true;
    const keys=queryMatchKeys([item.de,item.meaning,item.category,...item.plurals.map(form=>form.text)].join(" "));
    return queryKeys.some(query=>keys.some(key=>key===query||key.startsWith(query)||(query.length>=2&&key.includes(query))));
  }))
    .filter(group=>browse.category==="all"||group.id===browse.category);
  const visible=visibleGroups.flatMap(group=>group.items);
  const sortItems=(items:readonly SubjectVocabularyItem[])=>sortSheetItems(items,browse,{lessons:selectedLessons(sheetScope),source:sheetScope.source,catalogue});
  const orderedItems=sortItems(visible);
  const current=visible.find(item=>item.id===selected)??visible[0];
  const nounGroups=visibleGroups.filter(group=>group.tone!=="plain");
  const plainGroups=visibleGroups.filter(group=>group.tone==="plain");
  const pluralView=browse.view==="plurals";
  const groupByGender=browse.gender!==false;
  const groupBySubject=browse.subjects===true;
  const groupByLesson=browse.lessons===true;
  const groupOrder=getActiveGroupOrder(browse);
  const nestedGrouping=groupByLesson||groupBySubject||browse.groupOrder!==undefined;
  const layoutTitle=nestedGrouping&&groupOrder.length?"Illustrated vocabulary groups":pluralView?(groupByGender?"Gender × plural patterns":"Illustrated plural patterns"):`${visible.length} vocabulary ${visible.length===1?"entry":"entries"}`;
  const changeGrouping=(next:SheetBrowse)=>{if(openEntry)setOpenEntry(selected);changeBrowse(next);};
  const hasNouns=scoped.some(item=>item.tone!=="plain");
  const activeSubject=effectiveConcepts.length===1?studyConcepts.find(subject=>subject.id===effectiveConcepts[0]):undefined;
  const heading=activeSubject?.label??(effectiveConcepts.length?"Selected vocabulary":"All vocabulary");
  const returnPath=allNouns?VOCABULARY_SHEET_PATH:subjectSheetHref(sheet.id);
  const families=new Set(visible.map(item=>item.cardId)).size;
  useEffect(()=>{
    if(!ready||!pendingHash.current)return;
    const target=entries.current.get(pendingHash.current);
    if(!target)return;
    const frame=requestAnimationFrame(()=>target.scrollIntoView({block:"center"}));
    pendingHash.current=null;
    return()=>cancelAnimationFrame(frame);
  },[ready,browse,visible.length]);
  const choose=(id:string,key=id)=>{
    setSelected(id);
    setOpenEntry(old=>old===key?"":key);
  };
  const triggerRef=(key:string,node:HTMLButtonElement|null)=>{if(node)triggers.current.set(key,node);else triggers.current.delete(key);};
  const closeDropdown=(key:string)=>{setOpenEntry("");triggers.current.get(key)?.focus();};
  const renderDropdown=(item:SubjectVocabularyItem,key:string)=><WordDropdown item={item} subject={sheet.id} panelId={`subject-word-detail-${key}`} href={appendNavigationContext(item.href,sheetNavigationContext(returnPath,browse,item.id))} onClose={()=>closeDropdown(key)}/>;
  const renderEntry=(item:SubjectVocabularyItem)=><div className={`subject-entry-wrap subject-tone-${item.tone}`} key={item.id}>
    <VocabularyEntry item={item} subject={sheet.id} selected={current?.id===item.id} expanded={openEntry===item.id} showPluralChanges={pluralView}
      buttonRef={node=>{triggerRef(item.id,node);if(node)entries.current.set(item.id,node);else entries.current.delete(item.id);}}
      onChoose={()=>choose(item.id)} onClose={()=>closeDropdown(item.id)}/>
    {openEntry===item.id&&renderDropdown(item,item.id)}</div>;
  const renderGroup=(group:SubjectVocabularyGroup)=><section key={group.id} className={`subject-vocabulary-lane subject-tone-${group.tone}${group.tone==="plain"?" subject-lane-plain":""}`} aria-labelledby={`subject-lane-${group.id}`}>
    <h3 id={`subject-lane-${group.id}`}>{articles[group.tone]&&<span className="subject-lane-article" lang="de">{articles[group.tone]}</span>}<span>{group.label}<small>{group.items.length} {group.items.length===1?"entry":"entries"}</small></span></h3>
    <div className="subject-lane-entries">{sortItems(group.items).map(renderEntry)}</div>
  </section>;
  return <CheatSheetFrame current={allNouns?"vocabulary":`subject:${activeSubject?.id??sheet.id}`} browse={browse} eyebrow="Your illustrated vocabulary catalogue" title={heading} lead={hasNouns?"Learn each noun with its article and plural. Compare the actual changes in the grid.":"Explore the expressions and word types in this subject."} printNote="Tap an illustrated word to open its card and play the singular or plural pronunciation." data-subject-sheet={allNouns?"plurals":sheet.id} data-sheet-view={pluralView?"plurals":"illustrated"} data-gender-grouping={groupByGender?"on":"off"} data-plural-grouping={pluralView?"on":"off"} data-subject-grouping={groupBySubject?"on":"off"} data-lesson-grouping={groupByLesson?"on":"off"} data-group-order={groupOrder.join(",")}>
    <div className="subject-controls subject-print-hide"><label>Find a word or form<input type="search" value={browse.query} onChange={event=>changeBrowse({...browse,query:event.target.value,page:1})} placeholder="Search German, English or a plural…"/></label><p><strong>{scopeLabel(sheetScope)}</strong><span>{scoped.length} of {catalogue.length} entries match your study selection.</span></p></div>
    <p className="study-print-selection">Selection: {scopeLabel(sheetScope)} · {effectiveConcepts.length?effectiveConcepts.map(id=>studyConcepts.find(subject=>subject.id===id)?.label??id).join(", "):"All subjects"} · {sheetScope.source==="all"?"All sources":sheetScope.source==="course"?"Course material":sheetScope.source==="teacher-extra"?"Teacher extras":"Additional study aids"}{browse.query?` · Search: ${browse.query}`:""}{browse.category!=="all"?` · Group: ${browse.category}`:""}</p>
    {groups.length>1&&<div className="subject-group-filters subject-print-hide" role="group" aria-label="Vocabulary groups"><button type="button" aria-pressed={browse.category==="all"} onClick={()=>changeBrowse({...browse,category:"all",page:1})}>All groups <span>{scoped.length}</span></button>{groups.map(group=><button type="button" key={group.id} className={`subject-tone-${group.tone}`} aria-pressed={browse.category===group.id} onClick={()=>changeBrowse({...browse,category:group.id,page:1})}>{group.label} <span>{group.items.length}</span></button>)}</div>}
    <div id="subject-overview"><OverviewPanel title={layoutTitle}>
      <SubjectGroupingControls browse={browse} onChange={changeGrouping}/>
      <SubjectSortingControls browse={browse} onChange={changeGrouping}/>
      <SubjectSheetFilters items={catalogue} scope={sheetScope} onChange={setSheetScope} onReset={resetFilters} hasLocalFilters={Boolean(browse.query||browse.category!=="all"||browse.lessonFilter||browse.sourceFilter)}/>
      <div className="subject-overview-meta"><p role="status">{visible.length} {visible.length===1?"entry":"entries"} · {families} {families===1?"word card":"word cards"}{browse.query&&<> · matching “{browse.query}”</>}</p>{nounGroups.length>0&&<span>Article colours show grammatical gender.</span>}</div>
      {visible.length>0?<>
        {nestedGrouping?<SubjectGroupedVocabulary items={orderedItems} order={groupOrder} scope={sheetScope} subject={sheet.id} sortItems={sortItems} renderEntry={renderEntry}/>:pluralView?<SubjectPluralGrid groupByGender={groupByGender} items={orderedItems} subject={sheet.id} currentId={current?.id??""} openEntry={openEntry} onChoose={choose} onClose={closeDropdown} renderDropdown={renderDropdown} triggerRef={triggerRef} entryRef={(id,node)=>{if(node)entries.current.set(id,node);else entries.current.delete(id);}}/>:groupByGender?(nounGroups.length>0&&<div className="subject-vocabulary-lanes" style={{"--subject-lanes":Math.min(4,nounGroups.length)} as CSSProperties} aria-label="Nouns grouped by article">{nounGroups.map(renderGroup)}</div>):<div className="subject-vocabulary-flat" aria-label="Illustrated vocabulary">{orderedItems.map(renderEntry)}</div>}
        {pluralView&&!nounGroups.length&&<p className="subject-plural-other-subject"><Link href={`${VOCABULARY_SHEET_PATH}?tags=`}>Open the full vocabulary cheat sheet <Icon name="arrow"/></Link></p>}
        {!nestedGrouping&&(pluralView||groupByGender)&&plainGroups.length>0&&<div className="subject-plain-groups" aria-label="Vocabulary grouped by word type">{plainGroups.map(renderGroup)}</div>}
        {nounGroups.length>0&&<p className="subject-gender-key"><b className="subject-tone-male" lang="de">der</b> masculine <b className="subject-tone-female" lang="de">die</b> feminine <b className="subject-tone-neuter" lang="de">das</b> neuter <b className="subject-tone-plural" lang="de">die</b> plural<span>Learn each noun with its own plural.</span></p>}
      </>:<div className="subject-empty"><SubjectIcon subject={sheet.id}/><h3>No matching vocabulary</h3><p>{!scoped.length?`Your study selection (${scopeLabel(scope)}) does not include entries in this subject.`:"No entries match this search and group within your study selection."}</p><div>{(browse.query||browse.category!=="all")&&<button type="button" className="study-secondary" onClick={()=>changeBrowse({...browse,query:"",category:"all",saved:false,page:1})}>Clear search & group</button>}<button type="button" className="study-secondary" onClick={resetFilters}>Reset study selection</button></div></div>}
    </OverviewPanel></div>
    {sheet.relatedHref&&<aside className="subject-related subject-print-hide"><div><p className="study-eyebrow">Put the words to work</p><h2>Explore the patterns.</h2><p>Open the related reference for diagrams, examples and practice.</p></div><Link href={sheet.relatedHref} className="study-secondary">Open related reference <Icon name="arrow"/></Link></aside>}
    <p className="subject-footer-note">The full vocabulary catalogue is available to these filters. A word can belong to more than one subject; changing grouping never removes word types.</p>
  </CheatSheetFrame>;
}

export function SubjectDirectory({subjects,workshops=false}:{subjects:{id:StudyConcept;label:string;count:number;families:number}[];workshops?:boolean}){
  const [query,setQuery]=useState("");
  const visible=subjects.filter(subject=>searchKey(`${subject.label} ${subject.id}`).includes(searchKey(query)));
  const visibleWorkshops=sheetDestinations.filter(destination=>destination.kind==="workshop"&&searchKey(destination.label).includes(searchKey(query)));
  return <div className={`subject-directory study-workspace${workshops?" cheat-sheet-directory":""}`}>
    {!workshops&&<Link href="/cheat-sheets" className="subject-back subject-print-hide">← All cheat sheets</Link>}
    <header className="subject-page-heading"><div className="subject-heading-copy"><p className="study-eyebrow">{workshops?"Vocabulary and topic workshops":`All ${subjects.length} subject tags`}</p><h1>{workshops?"Cheat sheets":"A picture of every subject."}</h1><p>{workshops?"Browse all vocabulary, explore a subject, or practise with a topic workshop.":"Explore your German vocabulary by theme, with articles, plurals and pronunciation."}</p></div></header>
    <div className="subject-directory-catalogue"><Link href={VOCABULARY_SHEET_PATH} className="subject-directory-tile" data-catalogue-tile="vocabulary"><span className="subject-directory-icon"><SubjectIcon subject="objects"/></span><h2>All vocabulary</h2><p>The complete illustrated catalogue, with article colours, plural patterns, pronunciation and study filters.</p><span className="subject-tile-action">Explore all vocabulary <span aria-hidden="true">↗</span></span></Link></div>
    <div className="subject-directory-controls"><label>{workshops?"Find a study sheet":"Find a subject"}<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Home, food, verbs…"/></label><p role="status">{visible.length} of {subjects.length} subjects{workshops&&<> · {visibleWorkshops.length} workshops</>}<span>Counts cover the whole collection. Open a subject to apply your study selection.</span></p></div>
    <section id="subjects" aria-label="Vocabulary by subject"><h2>Vocabulary by subject</h2><nav className="subject-directory-grid" aria-label="Subject vocabulary overviews">{visible.map(subject=><Link key={subject.id} href={subjectSheetHref(subject.id)} className="subject-directory-tile" data-subject-tile={subject.id}><span className="subject-directory-icon"><SubjectIcon subject={subject.id}/></span><h2>{subject.label}</h2><p>{subject.count} {subject.count===1?"entry":"entries"} · {subject.families} {subject.families===1?"word card":"word cards"}</p><span className="subject-tile-action">Explore subject <span aria-hidden="true">↗</span></span></Link>)}</nav></section>
    {workshops&&<section id="workshops" aria-label="Topic workshops"><h2>Topic workshops</h2><nav className="subject-directory-grid" aria-label="Topic workshop sheets">{visibleWorkshops.map(destination=><Link key={destination.id} href={destination.href} className="subject-directory-tile" data-workshop-tile={destination.id}><span className="subject-directory-icon"><SubjectIcon subject={destination.subject}/></span><h2>{destination.label}</h2><p>Diagrams, examples and practice for this topic.</p><span className="subject-tile-action">Open workshop <span aria-hidden="true">↗</span></span></Link>)}</nav></section>}
    {!visible.length&&(!workshops||!visibleWorkshops.length)&&<div className="subject-empty"><h2>No matching {workshops?"study sheet":"subject"}</h2><p>Try another topic or clear your search.</p><button type="button" className="study-secondary" onClick={()=>setQuery("")}>Clear search</button></div>}
  </div>;
}
