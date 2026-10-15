"use client";

import Link from "next/link";
import {useEffect,useRef,useState,type CSSProperties} from "react";
import {appendNavigationContext} from "@/lib/content/navigation-context";
import {defaultStudyScope,scopeLabel,type StudyConcept} from "@/lib/study/scope";
import {initialSheetBrowse,readSheetBrowse,sheetBrowseQuery,sheetNavigationContext,type SheetBrowse} from "@/lib/study/sheet-browse";
import {subjectSheetHref,subjectSheets,subjectVocabularyGroups,type SubjectSheet,type SubjectVocabularyGroup,type SubjectVocabularyItem} from "@/lib/study/subject-sheets";
import {OverviewPanel} from "./OverviewPanel";
import {useStudyScope} from "./StudyScope";
import {SubjectIcon,SubjectVocabularyVisual} from "./SubjectIllustration";
import {SubjectPluralGrid} from "./SubjectPluralGrid";
import {SubjectSheetFilters} from "./SubjectSheetFilters";
import {SubjectWordDropdown} from "./SubjectWordDropdown";

const articles:Record<string,string>={male:"der",female:"die",neuter:"das",plural:"die"};

function searchKey(text:string){
  return text.toLocaleLowerCase("de").replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").trim();
}

function sourceQualifier(item:SubjectVocabularyItem){
  return (item.studyTags.sources??[item.studyTags.source])
    .filter(source=>source!=="course")
    .map(source=>source==="teacher-extra"?"Teacher extra":"Study extra").join(" · ");
}

function SubjectSwitcher({current,browse,allNouns}:{current:StudyConcept;browse:SheetBrowse;allNouns:boolean}){
  const chooser=useRef<HTMLDetailsElement>(null);
  const selected=subjectSheets.find(subject=>subject.id===current)!;
  const layoutQuery=sheetBrowseQuery({...initialSheetBrowse,view:browse.view??"illustrated",...(browse.gender!==undefined?{gender:browse.gender}:{})});
  return <div className="subject-navigation subject-print-hide">
    <Link href="/cheat-sheets/subjects" className="subject-back">← All subjects</Link>
    <details ref={chooser} className="subject-switcher">
      <summary><span><small>Choose a subject · {subjectSheets.length} available</small><strong>{allNouns?"All nouns":selected.label}</strong></span><span aria-hidden="true">⌄</span></summary>
      <nav aria-label="Choose a subject"><Link href={`/cheat-sheets/plurals${layoutQuery}`} aria-current={allNouns?"page":undefined}>All nouns · plural patterns</Link>{subjectSheets.map(subject=><Link key={subject.id} href={`${subjectSheetHref(subject.id)}${layoutQuery}`} aria-current={!allNouns&&current===subject.id?"page":undefined} onClick={()=>{if(chooser.current)chooser.current.open=false;}}><SubjectIcon subject={subject.id}/><span>{subject.label}</span></Link>)}</nav>
    </details>
  </div>;
}

export function SubjectInfographic({sheet,allNouns=false}:{sheet:SubjectSheet;allNouns?:boolean}){
  const {matches,scope,setScope,ready}=useStudyScope();
  const [browse,setBrowse]=useState<SheetBrowse>(()=>allNouns?{...initialSheetBrowse,view:"plurals"}:initialSheetBrowse);
  const [selected,setSelected]=useState("");
  const [openEntry,setOpenEntry]=useState("");
  const triggers=useRef(new Map<string,HTMLButtonElement>());
  const entries=useRef(new Map<string,HTMLButtonElement>());
  const pendingHash=useRef<string|null>(null);
  useEffect(()=>{
    const restore=()=>{
      setBrowse({...(allNouns?{view:"plurals" as const}:{}),...readSheetBrowse(new URLSearchParams(window.location.search))});
      if(window.location.hash.startsWith("#sheet-card-")){
        try{
          const id=decodeURIComponent(window.location.hash.slice("#sheet-card-".length));
          setSelected(id);
          setOpenEntry(id);
          pendingHash.current=id;
        }catch{/* Malformed fragments have no matching vocabulary entry. */}
      }
    };
    restore();
    window.addEventListener("popstate",restore);
    window.addEventListener("hashchange",restore);
    return()=>{window.removeEventListener("popstate",restore);window.removeEventListener("hashchange",restore);};
  },[sheet.id,allNouns]);
  const changeBrowse=(next:SheetBrowse)=>{
    setBrowse(next);
    window.history.replaceState(window.history.state,"",`${window.location.pathname}${sheetBrowseQuery(next)}`);
  };
  const scoped=sheet.items.filter(item=>matches(item.studyTags));
  const groups=subjectVocabularyGroups(scoped);
  const query=searchKey(browse.query);
  const visibleGroups=subjectVocabularyGroups(scoped.filter(item=>!query||searchKey([item.de,item.meaning,...item.plurals.map(form=>form.text)].join(" ")).includes(query)))
    .filter(group=>browse.category==="all"||group.id===browse.category);
  const visible=visibleGroups.flatMap(group=>group.items);
  const current=visible.find(item=>item.id===selected)??visible[0];
  const nounGroups=visibleGroups.filter(group=>group.tone!=="plain");
  const plainGroups=visibleGroups.filter(group=>group.tone==="plain");
  const pluralView=browse.view==="plurals";
  const groupByGender=browse.gender!==false;
  const layoutTitle=pluralView?(groupByGender?"Gender × plural patterns":"Illustrated plural patterns"):`${visible.length} vocabulary ${visible.length===1?"entry":"entries"}`;
  const changeGrouping=(next:SheetBrowse)=>{if(openEntry)setOpenEntry(selected);changeBrowse(next);};
  const hasNouns=sheet.items.some(item=>item.tone!=="plain");
  const returnPath=allNouns?"/cheat-sheets/plurals":subjectSheetHref(sheet.id);
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
  const renderDropdown=(item:SubjectVocabularyItem,key:string)=><SubjectWordDropdown item={item} subject={sheet.id} panelId={`subject-word-detail-${key}`} href={appendNavigationContext(item.href,sheetNavigationContext(returnPath,browse,item.id))} onClose={()=>closeDropdown(key)}/>;
  const renderEntry=(item:SubjectVocabularyItem)=><div className={`subject-entry-wrap subject-tone-${item.tone}`} key={item.id}><button type="button" ref={node=>{triggerRef(item.id,node);if(node)entries.current.set(item.id,node);else entries.current.delete(item.id);}} id={`sheet-card-${item.id}`} data-subject-entry={item.id} className={`subject-vocabulary-entry subject-tone-${item.tone}`} aria-label={[item.de,...item.plurals.map(form=>form.text),sourceQualifier(item)].filter(Boolean).join(" · ")} aria-pressed={current?.id===item.id} aria-expanded={openEntry===item.id} aria-controls={openEntry===item.id?`subject-word-detail-${item.id}`:undefined} onClick={()=>choose(item.id)} onKeyDown={event=>{if(event.key==="Escape"&&openEntry===item.id){event.preventDefault();event.stopPropagation();closeDropdown(item.id);}}}>
    <SubjectVocabularyVisual de={item.de} category={item.category} cardId={item.cardId} subject={sheet.id}/>
    <span className="subject-entry-text"><strong lang="de">{item.de}</strong><small lang={item.plurals.length?"de":undefined}>{item.plurals.length?item.plurals.map(form=>form.text).join(" · "):item.tone==="plain"?item.category:item.tone==="plural"?"Plural form":"No plural taught here"}</small><span className="subject-entry-meaning">{item.meaning}</span>{sourceQualifier(item)&&<em>{sourceQualifier(item)}</em>}</span><span className="subject-entry-chevron" aria-hidden="true">{openEntry===item.id?"⌃":"⌄"}</span>
  </button>{openEntry===item.id&&renderDropdown(item,item.id)}</div>;
  const renderGroup=(group:SubjectVocabularyGroup)=><section key={group.id} className={`subject-vocabulary-lane subject-tone-${group.tone}${group.tone==="plain"?" subject-lane-plain":""}`} aria-labelledby={`subject-lane-${group.id}`}>
    <h3 id={`subject-lane-${group.id}`}>{articles[group.tone]&&<span className="subject-lane-article" lang="de">{articles[group.tone]}</span>}<span>{group.label}<small>{group.items.length} {group.items.length===1?"entry":"entries"}</small></span></h3>
    <div className="subject-lane-entries">{group.items.map(renderEntry)}</div>
  </section>;
  return <div className="subject-sheet study-workspace" data-subject-sheet={allNouns?"plurals":sheet.id} data-sheet-view={pluralView?"plurals":"illustrated"} data-gender-grouping={groupByGender?"on":"off"} data-plural-grouping={pluralView?"on":"off"}>
    <SubjectSwitcher current={sheet.id} browse={browse} allNouns={allNouns}/>
    <header className="subject-page-heading"><div className="subject-heading-copy"><p className="study-eyebrow">{allNouns?"Your noun plural reference":"Your illustrated vocabulary collection"}</p><h1>{allNouns?"Illustrated noun cheat sheet":sheet.label}</h1><p>{hasNouns?"Learn each noun with its article and plural. Compare the actual changes in the grid.":"Explore the expressions and word types in this subject."}</p></div><div className="subject-heading-mark"><SubjectIcon subject={sheet.id}/></div></header>
    <div className="subject-page-actions subject-print-hide"><p>Tap an illustrated word to open its card and play the singular or plural pronunciation.</p><button type="button" className="study-secondary" onClick={()=>window.print()}>Print / save as PDF</button></div>
    <div className="subject-controls subject-print-hide"><label>Find a word or form<input type="search" value={browse.query} onChange={event=>changeBrowse({...browse,query:event.target.value,page:1})} placeholder="Search German, English or a plural…"/></label><p><strong>{scopeLabel(scope)}</strong><span>{scoped.length} of {sheet.items.length} entries match your study selection.</span></p></div>
    {groups.length>1&&<div className="subject-group-filters subject-print-hide" role="group" aria-label="Vocabulary groups"><button type="button" aria-pressed={browse.category==="all"} onClick={()=>changeBrowse({...browse,category:"all",page:1})}>All groups <span>{scoped.length}</span></button>{groups.map(group=><button type="button" key={group.id} className={`subject-tone-${group.tone}`} aria-pressed={browse.category===group.id} onClick={()=>changeBrowse({...browse,category:group.id,page:1})}>{group.label} <span>{group.items.length}</span></button>)}</div>}
    <div id="subject-overview"><OverviewPanel title={layoutTitle}>
      <div className="subject-grouping-switches subject-print-hide" role="group" aria-label="Infographic grouping">
        <button type="button" role="switch" className="subject-grouping-switch" aria-label="Group by gender" aria-checked={groupByGender} onClick={()=>changeGrouping({...browse,gender:!groupByGender})}><span className="subject-switch-track" aria-hidden="true"/><strong>Group by gender</strong><small>{groupByGender?"On":"Off"}</small></button>
        <button type="button" role="switch" className="subject-grouping-switch" aria-label="Group by plural pattern" aria-checked={pluralView} onClick={()=>changeGrouping({...browse,view:pluralView?"illustrated":"plurals"})}><span className="subject-switch-track" aria-hidden="true"/><strong>Group by plural pattern</strong><small>{pluralView?"On":"Off"}</small></button>
        <p>Icons, meanings and article colours stay visible in every layout.</p>
      </div>
      <SubjectSheetFilters items={sheet.items}/>
      <div className="subject-overview-meta"><p role="status">{visible.length} {visible.length===1?"entry":"entries"} · {families} {families===1?"word card":"word cards"}{browse.query&&<> · matching “{browse.query}”</>}</p>{nounGroups.length>0&&<span>Article colours show grammatical gender.</span>}</div>
      {visible.length>0?<>
        {pluralView?<SubjectPluralGrid groupByGender={groupByGender} items={visible} subject={sheet.id} currentId={current?.id??""} openEntry={openEntry} onChoose={choose} onClose={closeDropdown} renderDropdown={renderDropdown} triggerRef={triggerRef} entryRef={(id,node)=>{if(node)entries.current.set(id,node);else entries.current.delete(id);}}/>:groupByGender?(nounGroups.length>0&&<div className="subject-vocabulary-lanes" style={{"--subject-lanes":Math.min(4,nounGroups.length)} as CSSProperties} aria-label="Nouns grouped by article">{nounGroups.map(renderGroup)}</div>):<div className="subject-vocabulary-flat" aria-label="Illustrated vocabulary">{[...visible].sort((a,b)=>a.de.localeCompare(b.de,"de")).map(renderEntry)}</div>}
        {pluralView&&!nounGroups.length&&<p className="subject-plural-other-subject"><Link href="/cheat-sheets/plurals">Open plural patterns for all nouns →</Link></p>}
        {(pluralView||groupByGender)&&plainGroups.length>0&&<div className="subject-plain-groups" aria-label="Vocabulary grouped by word type">{plainGroups.map(renderGroup)}</div>}
        {nounGroups.length>0&&<p className="subject-gender-key"><b className="subject-tone-male" lang="de">der</b> masculine <b className="subject-tone-female" lang="de">die</b> feminine <b className="subject-tone-neuter" lang="de">das</b> neuter <b className="subject-tone-plural" lang="de">die</b> plural<span>Learn each noun with its own plural.</span></p>}
      </>:<div className="subject-empty"><SubjectIcon subject={sheet.id}/><h3>No matching vocabulary</h3><p>{!scoped.length?`Your study selection (${scopeLabel(scope)}) does not include entries in this subject.`:"No entries match this search and group within your study selection."}</p><div>{(browse.query||browse.category!=="all")&&<button type="button" className="study-secondary" onClick={()=>changeBrowse({...initialSheetBrowse,...(browse.view?{view:browse.view}:{}),...(browse.gender!==undefined?{gender:browse.gender}:{})})}>Clear search & group</button>}<button type="button" className="study-secondary" onClick={()=>setScope(defaultStudyScope())}>Reset study selection</button></div></div>}
    </OverviewPanel></div>
    {sheet.relatedHref&&<aside className="subject-related subject-print-hide"><div><p className="study-eyebrow">Put the words to work</p><h2>Explore the patterns.</h2><p>Open the related reference for diagrams, examples and practice.</p></div><Link href={sheet.relatedHref} className="study-secondary">Open related reference →</Link></aside>}
    <p className="subject-footer-note">{allNouns?"All noun entries from your word cards, shown once per recorded singular or plural entry.":"Entries follow the subject tags on your word cards. A word can belong to more than one subject."}</p>
  </div>;
}

export function SubjectDirectory({subjects}:{subjects:{id:StudyConcept;label:string;count:number;families:number}[]}){
  const [query,setQuery]=useState("");
  const visible=subjects.filter(subject=>searchKey(`${subject.label} ${subject.id}`).includes(searchKey(query)));
  return <div className="subject-directory study-workspace">
    <Link href="/cheat-sheets" className="subject-back subject-print-hide">← Learning cheat sheets</Link>
    <header className="subject-page-heading"><div className="subject-heading-copy"><p className="study-eyebrow">All {subjects.length} subject tags</p><h1>A picture of every subject.</h1><p>Explore your German vocabulary by theme, with articles, plurals and pronunciation.</p></div></header>
    <p className="subject-directory-plurals"><Link href="/cheat-sheets/plurals" className="study-secondary">Gender × plural patterns · all nouns →</Link></p>
    <div className="subject-directory-controls"><label>Find a subject<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Home, food, verbs…"/></label><p role="status">{visible.length} of {subjects.length} subjects<span>Counts cover the whole collection. Open a subject to apply your study selection.</span></p></div>
    <nav className="subject-directory-grid" aria-label="Subject vocabulary overviews">{visible.map(subject=><Link key={subject.id} href={subjectSheetHref(subject.id)} className="subject-directory-tile" data-subject-tile={subject.id}><span className="subject-directory-icon"><SubjectIcon subject={subject.id}/></span><h2>{subject.label}</h2><p>{subject.count} {subject.count===1?"entry":"entries"} · {subject.families} {subject.families===1?"word card":"word cards"}</p><span className="subject-tile-action">Explore subject <span aria-hidden="true">↗</span></span></Link>)}</nav>
    {!visible.length&&<div className="subject-empty"><h2>No matching subject</h2><p>Try another subject name, or see all {subjects.length} subjects.</p><button type="button" className="study-secondary" onClick={()=>setQuery("")}>Clear search</button></div>}
  </div>;
}
