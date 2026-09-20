"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {familyPeople,familyConnections,familyStatement,familyMeaning,type FamilyView,type FamilyPerson} from "@/lib/study/people-family";
import {GermanText,SaveButton,useStudy} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {StudyScopeNotice} from "./StudyScope";
import {appendNavigationContext} from "@/lib/content/navigation-context";
import "./PeopleFamily.css";
import "./CheatSheetPrint.css";

const familyTags={lessons:[3],concepts:["people" as const,"grammar" as const],source:"course" as const};
function PersonLabel({person,view}:{person:FamilyPerson;view:FamilyView}){
  const relation=person.relations[view];
  return <><span className="family-name"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="6"/><path d="M5 30v-4c0-10 22-10 22 0v4M13 11h.1M19 11h.1"/></svg><b>{person.name}</b></span><span lang="de">{relation?.de??"ich"}</span><small>{relation?.en??"your viewpoint"}</small></>;
}
function FamilyDiagram({view,selected,onSelect}:{view:FamilyView;selected?:string;onSelect?:(person:FamilyPerson)=>void}){
  return <div className="family-tree-diagram" aria-label={`Family connections from ${view==="anna"?"Anna’s":"Martin’s"} viewpoint`}>
    <svg className="family-connectors" viewBox="0 0 900 580" aria-hidden="true"><path d="M380 52H430M405 52V125H115V170M405 125H720V170M320 125V170M380 207H430M405 207V285H320V325M405 285H570V325M320 405V440H220V480M320 440H420V480"/></svg>
    {familyPeople.map(person=>{
      const relation=person.relations[view],props={className:`family-member study-tone-${relation?.tone??"plain"}`,style:{left:`${person.x/9}%`,top:`${person.y/5.8}%`}};
      return onSelect?<button type="button" key={person.id} {...props} aria-pressed={selected===person.id} aria-label={`Explore ${person.name}: ${relation?.de??"ich"}`} onClick={()=>onSelect(person)}><PersonLabel person={person} view={view}/></button>:<div key={person.id} {...props}><PersonLabel person={person} view={view}/></div>;
    })}
  </div>;
}

export function PeopleFamily({speech}:{speech:Record<string,string>}){
  const study=useStudy();
  const [view,setView]=useState<FamilyView>("anna");
  const [selected,setSelected]=useState("nora");
  const focus=useRef<HTMLElement>(null);
  const person=familyPeople.find(person=>person.id===selected)!;
  const relation=person.relations[view];
  const text=familyStatement(person,view),meaning=familyMeaning(person,view);
  const card=relation?study?.dictionary.find(entry=>entry.kind==="word"&&(entry.de===relation.de||entry.forms.includes(relation.de))):undefined;
  useEffect(()=>{
    const follow=()=>{const match=window.location.hash.match(/^#family-(anna|martin)-([a-z]+)$/);if(!match||!familyPeople.some(p=>p.id===match[2]))return;setView(match[1] as FamilyView);setSelected(match[2]!);requestAnimationFrame(()=>focus.current?.scrollIntoView({block:"nearest"}));};
    follow();window.addEventListener("hashchange",follow);return()=>window.removeEventListener("hashchange",follow);
  },[]);
  const select=(person:FamilyPerson)=>{
    setSelected(person.id);
    if(window.matchMedia("(max-width:800px)").matches)requestAnimationFrame(()=>{focus.current?.scrollIntoView({block:"nearest"});focus.current?.focus({preventScroll:true});});
  };
  return <section id="family-tree" className="people-family">
    <header><p className="study-eyebrow">Practice family · Lesson 3 words</p><h2>Whose mother? Change the viewpoint.</h2><p>These people are fictional. Follow the connecting lines, then say the relationship from Anna’s or Martin’s point of view.</p></header>
    <StudyScopeNotice tags={familyTags} subject="This family example"/>
    <div className="family-viewpoints" role="group" aria-label="Family viewpoint">{(["anna","martin"] as const).map(value=><button type="button" key={value} aria-pressed={view===value} onClick={()=>setView(value)}>I am {value==="anna"?"Anna":"Martin"}</button>)}</div>
    <FamilyDiagram view={view} selected={selected} onSelect={select}/>
    <div className="family-mobile-tree" aria-label="Family connections, step by step">
      {familyConnections.map((connection,index)=><section key={index}><h3>{connection.text}</h3><div>{connection.children.map(id=>{const member=familyPeople.find(p=>p.id===id)!;return <button type="button" key={id} className={`study-tone-${member.relations[view]?.tone??"plain"}`} aria-pressed={selected===id} onClick={()=>select(member)}><PersonLabel person={member} view={view}/></button>;})}</div></section>)}
      <label>Explore anyone in the family<select aria-label="Explore a family member" value={selected} onChange={e=>select(familyPeople.find(p=>p.id===e.target.value)!)}>{familyPeople.map(member=><option key={member.id} value={member.id}>{member.name} · {member.relations[view]?.de??"ich"}</option>)}</select></label>
    </div>
    <article ref={focus} tabIndex={-1} id={`family-${view}-${selected}`} className={`family-focus study-tone-${relation?.tone??"plain"}`}>
      <div><p className="study-eyebrow">Speaking as {view==="anna"?"Anna":"Martin"}</p><h3><GermanText text={text}/><LineAudio text={text} src={speech[text]} compact/></h3><p>{meaning}</p></div>
      {relation&&<div><p><GermanText text={relation.de}/><LineAudio text={relation.de} src={speech[relation.de]??card?.audio} compact/></p><p className="study-tone-plural"><small>Plural</small> <GermanText text={relation.plural}/><LineAudio text={relation.plural} src={speech[relation.plural]} compact/></p><p>{relation.tone==="female"?"Feminine subject form: meine + noun.":"Masculine subject form: mein + noun."}</p></div>}
      <div className="study-row"><SaveButton item={{id:`family-${view}-${selected}`,title:text,meaning,kind:"concept",href:`/cheat-sheets/people#family-${view}-${selected}`,studyTags:familyTags,audio:speech[text]??null}}/>{card&&<Link href={appendNavigationContext(card.href,{entryContext:"hub",returnPath:"/cheat-sheets/people",resultId:`family-${view}-${selected}`})}>Open word card →</Link>}</div>
    </article>
    <details className="family-reading-guide"><summary>Read the connections · family words and groups</summary><ul>{familyConnections.map(connection=><li key={connection.text}>{connection.text}</li>)}</ul><p>Horizontal partner lines join Karl–Eva and Martin–Nora. Downward branches connect parents to their children. This is one practice family, not a rule about how families must be arranged.</p><div className="family-groups">{[{de:"die Großeltern",en:"grandparents"},{de:"die Eltern",en:"parents"},{de:"die Geschwister",en:"siblings"},{de:"die Kinder",en:"children"},{de:"die Enkelkinder",en:"grandchildren"}].map(group=><p key={group.de}><b className="study-tone-plural"><GermanText text={group.de}/></b> · {group.en} <LineAudio text={group.de} src={speech[group.de]} compact/></p>)}</div><p><b lang="de">das Kind</b> and <b lang="de">das Enkelkind</b> are neuter nouns, regardless of the child’s gender. <b lang="de">die Geschwister</b> is a plural group; name one sibling as <b lang="de">der Bruder</b> or <b lang="de">die Schwester</b>.</p></details>
  </section>;
}

export function PeoplePrintSummary(){
  return <div className="sheet-print-summary" aria-label="Printable people summary"><section className="sheet-print-page people-print">
    <header><span>03 · People, family & work</span><h2>Start with “I”. Follow the family.</h2><p>Speaking as Anna · horizontal lines join partners; branches lead to their children. Fictional practice family.</p></header>
    <FamilyDiagram view="anna"/>
    <div className="people-print-contrasts"><p><b>Change the viewpoint:</b> Anna says <span lang="de">Mia ist meine Tochter.</span> Martin says <span lang="de">Mia ist meine Enkelin.</span></p><p><b>Subject forms:</b> <span lang="de">mein Vater · mein Kind · meine Mutter · meine Eltern.</span> The noun determines the ending; <span lang="de">dein / deine</span> follows the same pattern.</p><p><b>Plural groups:</b> <span lang="de">die Großeltern · die Eltern · die Geschwister · die Kinder · die Enkelkinder.</span> Plural is not feminine.</p><p><b>Work roles:</b> <span className="study-tone-male" lang="de">der Lehrer</span> → <span className="study-tone-female" lang="de">die Lehrerin</span> → <span className="study-tone-plural" lang="de">die Lehrerinnen.</span> Learn masculine plurals separately. Also: <span lang="de">Arzt → Ärztin; Koch → Köchin.</span></p><p><b>Say what you do:</b> <span lang="de">Ich bin Ärztin. · Ich arbeite als Lehrer.</span> Normally no article in these profession statements.</p><p><b>Recall:</b> cover a relationship label and name it from Anna’s viewpoint; then try Martin’s. Hear and save each sentence in the interactive sheet.</p></div>
    <footer>Vocabulary based on Momente A1.1, © Hueber Verlag. Fictional family, diagram and practice sentences created as study aids. Full source cards, pronunciation and review online.</footer>
  </section></div>;
}
