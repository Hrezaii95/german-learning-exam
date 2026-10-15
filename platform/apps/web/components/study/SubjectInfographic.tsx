"use client";

import Link from "next/link";
import {useEffect,useRef,useState,type CSSProperties,type RefObject} from "react";
import {appendNavigationContext} from "@/lib/content/navigation-context";
import {defaultStudyScope,scopeLabel,type StudyConcept} from "@/lib/study/scope";
import {initialSheetBrowse,readSheetBrowse,sheetBrowseQuery,sheetNavigationContext,type SheetBrowse} from "@/lib/study/sheet-browse";
import {subjectSheetHref,subjectSheets,subjectVocabularyGroups,type SubjectSheet,type SubjectVocabularyGroup,type SubjectVocabularyItem} from "@/lib/study/subject-sheets";
import {OverviewPanel} from "./OverviewPanel";
import {LineAudio} from "./StudyAudio";
import {GermanText,SaveButton} from "./StudyProvider";
import {StudyTagList,useStudyScope} from "./StudyScope";
import {SubjectIcon,SubjectVocabularyVisual} from "./SubjectIllustration";

const articles:Record<string,string>={male:"der",female:"die",neuter:"das",plural:"die"};

function searchKey(text:string){
  return text.toLocaleLowerCase("de").replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").trim();
}

function sourceQualifier(item:SubjectVocabularyItem){
  return (item.studyTags.sources??[item.studyTags.source])
    .filter(source=>source!=="course")
    .map(source=>source==="teacher-extra"?"Teacher extra":"Study extra").join(" · ");
}

function SubjectSwitcher({current}:{current:StudyConcept}){
  const chooser=useRef<HTMLDetailsElement>(null);
  const selected=subjectSheets.find(subject=>subject.id===current)!;
  return <div className="subject-navigation subject-print-hide">
    <Link href="/cheat-sheets/subjects" className="subject-back">← All subjects</Link>
    <details ref={chooser} className="subject-switcher">
      <summary><span><small>Choose a subject · {subjectSheets.length} available</small><strong>{selected.label}</strong></span><span aria-hidden="true">⌄</span></summary>
      <nav aria-label="Choose a subject">{subjectSheets.map(subject=><Link key={subject.id} href={subjectSheetHref(subject.id)} aria-current={current===subject.id?"page":undefined} onClick={()=>{if(chooser.current)chooser.current.open=false;}}><SubjectIcon subject={subject.id}/><span>{subject.label}</span></Link>)}</nav>
    </details>
  </div>;
}

function SubjectWordDetail({item,subject,href,focus}:{item:SubjectVocabularyItem;subject:StudyConcept;href:string;focus:RefObject<HTMLElement|null>}){
  return <article ref={focus} id="subject-word-detail" className={`subject-word-detail subject-tone-${item.tone}`} aria-live="polite" aria-label="Selected vocabulary">
    <div className="subject-detail-heading">
      <SubjectVocabularyVisual de={item.de} category={item.category} cardId={item.cardId} subject={subject}/>
      <div><p className="subject-detail-category">{item.category}{sourceQualifier(item)&&<> · {sourceQualifier(item)}</>}</p><h3><GermanText text={item.de}/><LineAudio text={item.de} src={item.audio} compact/></h3><p className="subject-detail-meaning">{item.meaning}</p></div>
    </div>
    {item.plurals.length>0&&<div className="subject-detail-plurals"><h4>Plural {item.plurals.length===1?"form":"forms"}</h4>{item.plurals.map(form=><p key={form.text} className="subject-tone-plural"><GermanText text={form.text}/><LineAudio text={form.text} src={form.audio} compact/></p>)}</div>}
    {!item.plurals.length&&item.tone!=="plain"&&item.tone!=="plural"&&<p className="subject-detail-form-note">No plural is taught on this card.</p>}
    {item.tone==="plural"&&<p className="subject-detail-form-note">This entry is shown in its plural form.</p>}
    {item.examples.length>0&&<div className="subject-detail-examples"><h4>In a sentence</h4>{item.examples.map((example,index)=><div key={`${example.de}-${index}`}><p><GermanText text={example.de}/><LineAudio text={example.de} src={example.audio} compact/></p><p>{example.en}</p></div>)}</div>}
    {item.patterns.length>0&&<div className="subject-detail-patterns"><h4>Useful patterns</h4><ul>{item.patterns.map((pattern,index)=><li key={`${pattern}-${index}`}><GermanText text={pattern}/></li>)}</ul></div>}
    <div className="subject-detail-actions"><SaveButton item={item.savedItem}/><Link href={href}>Full vocabulary card →</Link></div>
    <StudyTagList tags={item.studyTags}/>
    {item.note&&<details className="subject-source-note"><summary>Word notes & source context</summary>{item.note.split(/\n\n+/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</details>}
  </article>;
}

export function SubjectInfographic({sheet}:{sheet:SubjectSheet}){
  const {matches,scope,setScope,ready}=useStudyScope();
  const [browse,setBrowse]=useState<SheetBrowse>(initialSheetBrowse);
  const [selected,setSelected]=useState("");
  const focus=useRef<HTMLElement>(null);
  const entries=useRef(new Map<string,HTMLButtonElement>());
  const pendingHash=useRef<string|null>(null);
  useEffect(()=>{
    const restore=()=>{
      setBrowse(readSheetBrowse(new URLSearchParams(window.location.search)));
      if(window.location.hash.startsWith("#sheet-card-")){
        try{
          const id=decodeURIComponent(window.location.hash.slice("#sheet-card-".length));
          setSelected(id);
          pendingHash.current=id;
        }catch{/* Malformed fragments have no matching vocabulary entry. */}
      }
    };
    restore();
    window.addEventListener("popstate",restore);
    window.addEventListener("hashchange",restore);
    return()=>{window.removeEventListener("popstate",restore);window.removeEventListener("hashchange",restore);};
  },[sheet.id]);
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
  const families=new Set(visible.map(item=>item.cardId)).size;
  useEffect(()=>{
    if(!ready||!pendingHash.current)return;
    const target=entries.current.get(pendingHash.current);
    if(!target)return;
    const frame=requestAnimationFrame(()=>target.scrollIntoView({block:"center"}));
    pendingHash.current=null;
    return()=>cancelAnimationFrame(frame);
  },[ready,browse,visible.length]);
  const choose=(id:string)=>{
    setSelected(id);
    requestAnimationFrame(()=>focus.current?.scrollIntoView({block:"nearest",behavior:"smooth"}));
  };
  const renderGroup=(group:SubjectVocabularyGroup)=><section key={group.id} className={`subject-vocabulary-lane subject-tone-${group.tone}${group.tone==="plain"?" subject-lane-plain":""}`} aria-labelledby={`subject-lane-${group.id}`}>
    <h3 id={`subject-lane-${group.id}`}>{articles[group.tone]&&<span className="subject-lane-article" lang="de">{articles[group.tone]}</span>}<span>{group.label}<small>{group.items.length} {group.items.length===1?"entry":"entries"}</small></span></h3>
    <div className="subject-lane-entries">{group.items.map(item=><button type="button" key={item.id} ref={node=>{if(node)entries.current.set(item.id,node);else entries.current.delete(item.id);}} id={`sheet-card-${item.id}`} data-subject-entry={item.id} className="subject-vocabulary-entry" aria-label={[item.de,...item.plurals.map(form=>form.text),sourceQualifier(item)].filter(Boolean).join(" · ")} aria-pressed={current?.id===item.id} aria-controls="subject-word-detail" onClick={()=>choose(item.id)}>
      <SubjectVocabularyVisual de={item.de} category={item.category} cardId={item.cardId} subject={sheet.id}/>
      <span className="subject-entry-text"><strong lang="de">{item.de}</strong><small lang={item.plurals.length?"de":undefined}>{item.plurals.length?item.plurals.map(form=>form.text).join(" · "):item.tone==="plain"?item.category:item.tone==="plural"?"Plural form":"No plural taught here"}</small>{sourceQualifier(item)&&<em>{sourceQualifier(item)}</em>}</span>
    </button>)}</div>
  </section>;
  return <div className="subject-sheet study-workspace" data-subject-sheet={sheet.id}>
    <SubjectSwitcher current={sheet.id}/>
    <header className="subject-page-heading"><div className="subject-heading-copy"><p className="study-eyebrow">Your illustrated vocabulary collection</p><h1>{sheet.label}</h1><p>Learn the words together. Keep the article and plural in view.</p></div><div className="subject-heading-mark"><SubjectIcon subject={sheet.id}/></div></header>
    <div className="subject-page-actions subject-print-hide"><p>Tap an entry for its meaning and examples. The speaker plays German pronunciation.</p><button type="button" className="study-secondary" onClick={()=>window.print()}>Print / save as PDF</button></div>
    <div className="subject-controls subject-print-hide"><label>Find a word or form<input type="search" value={browse.query} onChange={event=>changeBrowse({...browse,query:event.target.value,page:1})} placeholder="Search German, English or a plural…"/></label><p><strong>{scopeLabel(scope)}</strong><span>{scoped.length} of {sheet.items.length} entries match your study selection.</span></p></div>
    {groups.length>1&&<div className="subject-group-filters subject-print-hide" role="group" aria-label="Vocabulary groups"><button type="button" aria-pressed={browse.category==="all"} onClick={()=>changeBrowse({...browse,category:"all",page:1})}>All groups <span>{scoped.length}</span></button>{groups.map(group=><button type="button" key={group.id} className={`subject-tone-${group.tone}`} aria-pressed={browse.category===group.id} onClick={()=>changeBrowse({...browse,category:group.id,page:1})}>{group.label} <span>{group.items.length}</span></button>)}</div>}
    <div id="subject-overview"><OverviewPanel title={`${visible.length} vocabulary ${visible.length===1?"entry":"entries"}`}>
      <div className="subject-overview-meta"><p role="status">{visible.length} {visible.length===1?"entry":"entries"} · {families} {families===1?"word card":"word cards"}{browse.query&&<> · matching “{browse.query}”</>}</p><span>Article colours show grammatical gender.</span></div>
      {visible.length>0?<>
        {nounGroups.length>0&&<div className="subject-vocabulary-lanes" style={{"--subject-lanes":Math.min(4,nounGroups.length)} as CSSProperties} aria-label="Nouns grouped by article">{nounGroups.map(renderGroup)}</div>}
        {plainGroups.length>0&&<div className="subject-plain-groups" aria-label="Vocabulary grouped by word type">{plainGroups.map(renderGroup)}</div>}
        {nounGroups.length>0&&<p className="subject-gender-key"><b className="subject-tone-male" lang="de">der</b> masculine <b className="subject-tone-female" lang="de">die</b> feminine <b className="subject-tone-neuter" lang="de">das</b> neuter <b className="subject-tone-plural" lang="de">die</b> plural<span>Learn each noun with its own plural.</span></p>}
        {current&&<SubjectWordDetail item={current} subject={sheet.id} focus={focus} href={appendNavigationContext(current.href,sheetNavigationContext(subjectSheetHref(sheet.id),browse,current.id))}/>}
      </>:<div className="subject-empty"><SubjectIcon subject={sheet.id}/><h3>No matching vocabulary</h3><p>{!scoped.length?`Your study selection (${scopeLabel(scope)}) does not include entries in this subject.`:"No entries match this search and group within your study selection."}</p><div>{(browse.query||browse.category!=="all")&&<button type="button" className="study-secondary" onClick={()=>changeBrowse(initialSheetBrowse)}>Clear search & group</button>}<button type="button" className="study-secondary" onClick={()=>setScope(defaultStudyScope())}>Reset study selection</button></div></div>}
    </OverviewPanel></div>
    {sheet.relatedHref&&<aside className="subject-related subject-print-hide"><div><p className="study-eyebrow">Put the words to work</p><h2>Explore the patterns.</h2><p>Open the related reference for diagrams, examples and practice.</p></div><Link href={sheet.relatedHref} className="study-secondary">Open related reference →</Link></aside>}
    <p className="subject-footer-note">Entries follow the subject tags on your word cards. A word can belong to more than one subject.</p>
  </div>;
}

export function SubjectDirectory({subjects}:{subjects:{id:StudyConcept;label:string;count:number;families:number}[]}){
  const [query,setQuery]=useState("");
  const visible=subjects.filter(subject=>searchKey(`${subject.label} ${subject.id}`).includes(searchKey(query)));
  return <div className="subject-directory study-workspace">
    <Link href="/cheat-sheets" className="subject-back subject-print-hide">← Learning cheat sheets</Link>
    <header className="subject-page-heading"><div className="subject-heading-copy"><p className="study-eyebrow">All {subjects.length} subject tags</p><h1>A picture of every subject.</h1><p>Explore your German vocabulary by theme, with articles, plurals and pronunciation.</p></div></header>
    <div className="subject-directory-controls"><label>Find a subject<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Home, food, verbs…"/></label><p role="status">{visible.length} of {subjects.length} subjects<span>Counts cover the whole collection. Open a subject to apply your study selection.</span></p></div>
    <nav className="subject-directory-grid" aria-label="Subject vocabulary overviews">{visible.map(subject=><Link key={subject.id} href={subjectSheetHref(subject.id)} className="subject-directory-tile" data-subject-tile={subject.id}><span className="subject-directory-icon"><SubjectIcon subject={subject.id}/></span><h2>{subject.label}</h2><p>{subject.count} {subject.count===1?"entry":"entries"} · {subject.families} {subject.families===1?"word card":"word cards"}</p><span className="subject-tile-action">Explore subject <span aria-hidden="true">↗</span></span></Link>)}</nav>
    {!visible.length&&<div className="subject-empty"><h2>No matching subject</h2><p>Try another subject name, or see all {subjects.length} subjects.</p><button type="button" className="study-secondary" onClick={()=>setQuery("")}>Clear search</button></div>}
  </div>;
}
