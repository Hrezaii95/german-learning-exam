"use client";
import type {WordCard} from "@/lib/content/word-card-types";
import {GermanText} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {PeopleFamily} from "./PeopleFamily";
import {VerbWorkshop} from "./VerbWorkshop";

export function SheetWorkshops({sheet,cards,speech}:{sheet:"people"|"verbs";cards:WordCard[];speech:Record<string,string>}){
  const audio=(text:string)=><LineAudio text={text} src={speech[text]} compact/>;
  const say=(text:string)=><span className="sheet-spoken"><GermanText text={text}/>{audio(text)}</span>;
  if(sheet==="people"){
    return <><PeopleFamily speech={speech}/>
      <section className="sheet-workshop" id="people-work"><h2>Work roles: a pattern worth keeping.</h2><div className="sheet-formula"><div className="study-tone-male"><small>Masculine</small>{say("der Lehrer")}</div><span aria-hidden="true">→</span><div className="study-tone-female"><small>Feminine · add -in</small>{say("die Lehrerin")}</div><span aria-hidden="true">→</span><div className="study-tone-plural"><small>Feminine plural · -innen</small>{say("die Lehrerinnen")}</div></div><p className="sheet-note">Learn the masculine plural separately. Some pairs change more: <b lang="de">Arzt → Ärztin</b>, <b lang="de">Koch → Köchin</b>. These are grammatical word forms; a person’s preferred description matters.</p><div className="sheet-rule-grid"><article><h3>Belonging: mein / meine</h3><p className="study-tone-male">{say("mein Vater")}</p><p className="study-tone-neuter">{say("mein Kind")}</p><p className="study-tone-female">{say("meine Mutter")}</p><p className="study-tone-plural">{say("meine Eltern")}</p><p>In these subject forms, feminine and plural add -e. dein / deine follows the same pattern.</p></article><article><h3>Say what you do</h3><p>{say("Ich bin Ärztin.")}</p><p>I am a doctor.</p><p>{say("Ich arbeite als Lehrer.")}</p><p>I work as a teacher.</p><p>No article in these ordinary statements of profession.</p></article><article id="people-descriptions"><h3>Describe your family</h3>{["ledig","verheiratet","geschieden","allein","zusammen"].map((s,i)=><p key={s}>{say(s)} <small>— {["single","married","divorced","alone","together"][i]}</small></p>)}</article></div></section></>;
  }
  return <VerbWorkshop cards={cards} speech={speech}/>;
}
