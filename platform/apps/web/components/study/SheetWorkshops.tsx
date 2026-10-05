"use client";
import { LArticle, LB, LDiv, LH2, LH3, LP, LSection, LSmall, LSpan } from "@/components/i18n/LocalizedElements";

import type {WordCard} from "@/lib/content/word-card-types";
import {GermanText} from "./StudyProvider";
import {LineAudio} from "./StudyAudio";
import {PeopleFamily} from "./PeopleFamily";
import {VerbWorkshop} from "./VerbWorkshop";

export function SheetWorkshops({sheet,cards,speech}:{sheet:"people"|"verbs";cards:WordCard[];speech:Record<string,string>}){
  const audio=(text:string)=><LineAudio text={text} src={speech[text]} compact/>;
  const say=(text:string)=><LSpan className="sheet-spoken"><GermanText text={text}/>{audio(text)}</LSpan>;
  if(sheet==="people"){
    return <><PeopleFamily speech={speech}/>
      <LSection className="sheet-workshop" id="people-work"><LH2>Work roles: a pattern worth keeping.</LH2><LDiv className="sheet-formula"><LDiv className="study-tone-male"><LSmall>Masculine</LSmall>{say("der Lehrer")}</LDiv><LSpan aria-hidden="true">→</LSpan><LDiv className="study-tone-female"><LSmall>Feminine · add -in</LSmall>{say("die Lehrerin")}</LDiv><LSpan aria-hidden="true">→</LSpan><LDiv className="study-tone-plural"><LSmall>Feminine plural · -innen</LSmall>{say("die Lehrerinnen")}</LDiv></LDiv><LP className="sheet-note">Learn the masculine plural separately. Some pairs change more: <LB lang="de">Arzt → Ärztin</LB>, <LB lang="de">Koch → Köchin</LB>. These are grammatical word forms; a person’s preferred description matters.</LP><LDiv className="sheet-rule-grid"><LArticle><LH3>Belonging: mein / meine</LH3><LP className="study-tone-male">{say("mein Vater")}</LP><LP className="study-tone-neuter">{say("mein Kind")}</LP><LP className="study-tone-female">{say("meine Mutter")}</LP><LP className="study-tone-plural">{say("meine Eltern")}</LP><LP>In these subject forms, feminine and plural add -e. dein / deine follows the same pattern.</LP></LArticle><LArticle><LH3>Say what you do</LH3><LP>{say("Ich bin Ärztin.")}</LP><LP>I am a doctor.</LP><LP>{say("Ich arbeite als Lehrer.")}</LP><LP>I work as a teacher.</LP><LP>No article in these ordinary statements of profession.</LP></LArticle><LArticle id="people-descriptions"><LH3>Describe your family</LH3>{["ledig","verheiratet","geschieden","allein","zusammen"].map((s,i)=><LP key={s}>{say(s)} <LSmall>— {["single","married","divorced","alone","together"][i]}</LSmall></LP>)}</LArticle></LDiv></LSection></>;
  }
  return <VerbWorkshop cards={cards} speech={speech}/>;
}
