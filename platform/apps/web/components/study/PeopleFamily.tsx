"use client";
import { LArticle, LB, LButton, LDetails, LDiv, LFooter, LH2, LH3, LHeader, LLabel, LLi, LOption, LP, LSection, LSelect, LSmall, LSpan, LSummary, LUl } from "@/components/i18n/LocalizedElements";

import Link from "@/components/i18n/LocalizedLink";
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
  return <><LSpan className="family-name"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="6"/><path d="M5 30v-4c0-10 22-10 22 0v4M13 11h.1M19 11h.1"/></svg><LB>{person.name}</LB></LSpan><LSpan lang="de">{relation?.de??"ich"}</LSpan><LSmall>{relation?.en??"your viewpoint"}</LSmall></>;
}
function FamilyDiagram({view,selected,onSelect}:{view:FamilyView;selected?:string;onSelect?:(person:FamilyPerson)=>void}){
  return <LDiv role="group" className="family-tree-diagram" aria-label={`Family connections from ${view==="anna"?"Anna’s":"Martin’s"} viewpoint`}>
    <svg className="family-connectors" viewBox="0 0 900 580" aria-hidden="true"><path d="M380 52H430M405 52V125H115V170M405 125H720V170M320 125V170M380 207H430M405 207V285H320V325M405 285H570V325M320 405V440H220V480M320 440H420V480"/></svg>
    {familyPeople.map(person=>{
      const relation=person.relations[view],props={className:`family-member study-tone-${relation?.tone??"plain"}`,style:{left:`${person.x/9}%`,top:`${person.y/5.8}%`}};
      return onSelect?<LButton type="button" key={person.id} {...props} aria-pressed={selected===person.id} aria-label={`Explore ${person.name}: ${relation?.de??"ich"}`} onClick={()=>onSelect(person)}><PersonLabel person={person} view={view}/></LButton>:<LDiv key={person.id} {...props}><PersonLabel person={person} view={view}/></LDiv>;
    })}
  </LDiv>;
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
  return <LSection id="family-tree" className="people-family">
    <LHeader><LP className="study-eyebrow">Practice family · Lesson 3 words</LP><LH2>Whose mother? Change the viewpoint.</LH2><LP>These people are fictional. Follow the connecting lines, then say the relationship from Anna’s or Martin’s point of view.</LP></LHeader>
    <StudyScopeNotice tags={familyTags} subject="This family example"/>
    <LDiv className="family-viewpoints" role="group" aria-label="Family viewpoint">{(["anna","martin"] as const).map(value=><LButton type="button" key={value} aria-pressed={view===value} onClick={()=>setView(value)}>I am {value==="anna"?"Anna":"Martin"}</LButton>)}</LDiv>
    <FamilyDiagram view={view} selected={selected} onSelect={select}/>
    <LDiv role="group" className="family-mobile-tree" aria-label="Family connections, step by step">
      {familyConnections.map((connection,index)=><LSection key={index}><LH3>{connection.text}</LH3><LDiv>{connection.children.map(id=>{const member=familyPeople.find(p=>p.id===id)!;return <LButton type="button" key={id} className={`study-tone-${member.relations[view]?.tone??"plain"}`} aria-pressed={selected===id} onClick={()=>select(member)}><PersonLabel person={member} view={view}/></LButton>;})}</LDiv></LSection>)}
      <LLabel>Explore anyone in the family<LSelect aria-label="Explore a family member" value={selected} onChange={e=>select(familyPeople.find(p=>p.id===e.target.value)!)}>{familyPeople.map(member=><LOption key={member.id} value={member.id}>{member.name} · {member.relations[view]?.de??"ich"}</LOption>)}</LSelect></LLabel>
    </LDiv>
    <LArticle ref={focus} tabIndex={-1} id={`family-${view}-${selected}`} className={`family-focus study-tone-${relation?.tone??"plain"}`}>
      <LDiv><LP className="study-eyebrow">Speaking as {view==="anna"?"Anna":"Martin"}</LP><LH3><GermanText text={text}/><LineAudio text={text} src={speech[text]} compact/></LH3><LP>{meaning}</LP></LDiv>
      {relation&&<LDiv><LP><GermanText text={relation.de}/><LineAudio text={relation.de} src={speech[relation.de]??card?.audio} compact/></LP><LP className="study-tone-plural"><LSmall>Plural</LSmall> <GermanText text={relation.plural}/><LineAudio text={relation.plural} src={speech[relation.plural]} compact/></LP><LP>{relation.tone==="female"?"Feminine subject form: meine + noun.":"Masculine subject form: mein + noun."}</LP></LDiv>}
      <LDiv className="study-row"><SaveButton item={{id:`family-${view}-${selected}`,title:text,meaning,kind:"concept",href:`/cheat-sheets/people#family-${view}-${selected}`,studyTags:familyTags,audio:speech[text]??null}}/>{card&&<Link href={appendNavigationContext(card.href,{entryContext:"hub",returnPath:"/cheat-sheets/people",resultId:`family-${view}-${selected}`})}>Open word card →</Link>}</LDiv>
    </LArticle>
    <LDetails className="family-reading-guide"><LSummary>Read the connections · family words and groups</LSummary><LUl>{familyConnections.map(connection=><LLi key={connection.text}>{connection.text}</LLi>)}</LUl><LP>Horizontal partner lines join Karl–Eva and Martin–Nora. Downward branches connect parents to their children. This is one practice family, not a rule about how families must be arranged.</LP><LDiv className="family-groups">{[{de:"die Großeltern",en:"grandparents"},{de:"die Eltern",en:"parents"},{de:"die Geschwister",en:"siblings"},{de:"die Kinder",en:"children"},{de:"die Enkelkinder",en:"grandchildren"}].map(group=><LP key={group.de}><LB className="study-tone-plural"><GermanText text={group.de}/></LB> · {group.en} <LineAudio text={group.de} src={speech[group.de]} compact/></LP>)}</LDiv><LP><LB lang="de">das Kind</LB> and <LB lang="de">das Enkelkind</LB> are neuter nouns, regardless of the child’s gender. <LB lang="de">die Geschwister</LB> is a plural group; name one sibling as <LB lang="de">der Bruder</LB> or <LB lang="de">die Schwester</LB>.</LP></LDetails>
  </LSection>;
}

export function PeoplePrintSummary(){
  return <LDiv className="sheet-print-summary" aria-label="Printable people summary"><LSection className="sheet-print-page people-print">
    <LHeader><LSpan>03 · People, family & work</LSpan><LH2>Start with “I”. Follow the family.</LH2><LP>Speaking as Anna · horizontal lines join partners; branches lead to their children. Fictional practice family.</LP></LHeader>
    <FamilyDiagram view="anna"/>
    <LDiv className="people-print-contrasts"><LP><LB>Change the viewpoint:</LB> Anna says <LSpan lang="de">Mia ist meine Tochter.</LSpan> Martin says <LSpan lang="de">Mia ist meine Enkelin.</LSpan></LP><LP><LB>Subject forms:</LB> <LSpan lang="de">mein Vater · mein Kind · meine Mutter · meine Eltern.</LSpan> The noun determines the ending; <LSpan lang="de">dein / deine</LSpan> follows the same pattern.</LP><LP><LB>Plural groups:</LB> <LSpan lang="de">die Großeltern · die Eltern · die Geschwister · die Kinder · die Enkelkinder.</LSpan> Plural is not feminine.</LP><LP><LB>Work roles:</LB> <LSpan className="study-tone-male" lang="de">der Lehrer</LSpan> → <LSpan className="study-tone-female" lang="de">die Lehrerin</LSpan> → <LSpan className="study-tone-plural" lang="de">die Lehrerinnen.</LSpan> Learn masculine plurals separately. Also: <LSpan lang="de">Arzt → Ärztin; Koch → Köchin.</LSpan></LP><LP><LB>Say what you do:</LB> <LSpan lang="de">Ich bin Ärztin. · Ich arbeite als Lehrer.</LSpan> Normally no article in these profession statements.</LP><LP><LB>Recall:</LB> cover a relationship label and name it from Anna’s viewpoint; then try Martin’s. Hear and save each sentence in the interactive sheet.</LP></LDiv>
    <LFooter>Vocabulary based on Momente A1.1, © Hueber Verlag. Fictional family, diagram and practice sentences created as study aids. Full source cards, pronunciation and review online.</LFooter>
  </LSection></LDiv>;
}
