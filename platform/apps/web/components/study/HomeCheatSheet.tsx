"use client";
import { Icon } from "@/components/media/Icon";
import Link from "next/link";
import {useState} from "react";
import {homeWords,homeLabels,homePronouns,homeExample,homePronounExample,homeAdjectives,homePhrases,type HomeWord} from "@/lib/study/home";
import {GermanText,SaveButton,useStudy} from "./StudyProvider";
import {useStudyScope} from "./StudyScope";
import {homeStudyTags} from "@/lib/study/sheet-scope";
import {LineAudio} from "./StudyAudio";
import {HomeIllustration} from "./HomeIllustration";
import {CheatSheetFrame} from "./CheatSheetFrame";
import {homeRecallQuestions} from "@/lib/study/sheet-recall";
import {SheetRecall} from "./SheetRecall";
import {TopicVocabularyLink,topicVocabularyHref} from "./TopicVocabularyLink";
import type {SavedItem} from "@/lib/study/types";

const roomIds=["bild","fenster","regal","lampe","sessel","sofa","tisch","teppich"];
const homeLessons=[1,2,3,4];
export function HomeCheatSheet({speech,cardLinks,saveIds}:{speech:Record<string,string>;cardLinks:Record<string,string>;saveIds:Record<string,string>}) {
  const study=useStudy();
  const {matches}=useStudyScope();
  const scopedWords=homeWords.filter(w=>matches(homeStudyTags(w,study?.dictionary)));
  const [slow,setSlow]=useState(false);
  const savedItem=(w:HomeWord):SavedItem=>({id:saveIds[w.id]??`home-${w.id}`,title:w.de,meaning:`${w.en}${w.plural?` · Plural: ${w.plural}`:""}`,kind:"word",studyTags:homeStudyTags(w,study?.dictionary),href:cardLinks[w.id]??topicVocabularyHref("home",homeLessons,w.de),audio:speech[w.de]??null});
  const clip=(text:string)=><LineAudio text={text} src={speech[text]} compact {...(slow ? {rate:0.8} : {})}/>;
  const questions=homeRecallQuestions(scopedWords,savedItem);
  const wordTargets=homeWords.map(word=>{
    const pathId=cardLinks[word.id]?.match(/^\/vocabulary\/([^/?#]+)\/?$/)?.[1];
    const cardId=saveIds[word.id]?.replace(/^card-/,"")??pathId?.replace(/^w(?=\d)/,"W");
    const idLesson=cardId?.match(/^l(\d{1,2})-/)?.[1];
    const wordLessons=idLesson?[Number(idLesson)]:homeStudyTags(word,study?.dictionary).lessons;
    return {anchor:`home-${word.id}`,text:word.de,lessons:[...new Set([...homeLessons,...wordLessons])].sort((a,b)=>a-b),...(cardId?{entryId:`${cardId}-0`}:{})};
  });
  return <CheatSheetFrame current="home" className="home-sheet" eyebrow="The memory room" title="A home for every word." lead="See it. Say its article. Remember its plural.">
    <nav className="home-jump" aria-label="Home cheat sheet sections"><Link href="#memory-room">Explore the room</Link><Link href="#home-patterns">Article → pronoun</Link><Link href="#home-index">Home vocabulary</Link><Link href="#home-describe">Describe & buy</Link><Link href="#home-practice">Test yourself</Link></nav>
    <section className="home-room-layout" id="memory-room" aria-labelledby="room-title">
      <div className="home-room"><div className="home-room-heading"><p className="study-eyebrow">Your visual anchor</p><h2 id="room-title">Step into the memory room.</h2><p>Open an object in the Home subject sheet to explore its article, plural and examples.</p></div><div className="home-room-objects">{roomIds.map(id=>{const w=homeWords.find(w=>w.id===id)!;return <Link key={id} href={topicVocabularyHref("home",homeLessons,w.de)} aria-label={`Explore ${w.de}`} className={`study-tone-${w.tone}`}><HomeIllustration id={id}/><span lang="de">{w.de}</span></Link>;})}</div><p className="home-room-foot">Blue der · Pink die · Green das · Purple plural</p></div>
      <TopicVocabularyLink id="home-index" subject="home" label="Home" lessons={homeLessons} wordTargets={wordTargets}/>
    </section>
    <section id="home-patterns" className="home-patterns"><p className="study-eyebrow">The Lesson 4 shortcut</p><h2>The article leaves a color trail.</h2><p>German objects can become <b lang="de">er</b>, <b lang="de">sie</b> or <b lang="de">es</b>. Follow the noun’s grammatical gender.</p><div className="home-pronoun-map">{(["male","female","neuter","plural"] as const).map(tone=>{const w=homeWords.find(w=>w.id===({male:"stuhl",female:"lampe",neuter:"bett",plural:"moebel"}[tone]))!;return <div key={tone} className={`study-tone-${tone}`}><small>{homeLabels[tone]}</small><strong lang="de">{tone==="male"?"der":tone==="neuter"?"das":"die"} <span aria-hidden="true">→</span> {homePronouns[tone]}</strong><p><GermanText text={homeExample(w)}/>{clip(homeExample(w))}</p><p><GermanText text={homePronounExample(w)}/>{clip(homePronounExample(w))}</p></div>;})}</div><p className="home-note"><b>Plural has its own lane.</b> All plural nouns use <b lang="de">die</b> and <b lang="de">sie</b>. That does not make them feminine. <b lang="de">Die Möbel sind schön.</b></p>
      <div className="home-mini-rules"><div><h3>Plural memory hooks</h3><p lang="de"><b>+ umlaut + e</b> · Stuhl → Stühle · Schrank → Schränke</p><p lang="de"><b>+ s</b> · Sofa → Sofas · Radio → Radios</p><p lang="de"><b>Same spelling</b> · Sessel · Spiegel · Zimmer · Kissen</p><p>These are memory groups for these words. Always learn each noun with its own plural.</p></div><div><h3>The last noun runs the word.</h3><p lang="de">die Möbel + <b>das Geschäft</b><br/>→ <b className="study-tone-neuter">das Möbelgeschäft</b></p><p lang="de">das Hotel + <b>das Zimmer</b><br/>→ <b className="study-tone-neuter">das Hotelzimmer</b></p><p>A compound takes its gender from its last noun.</p></div></div>
    </section>
    <section id="home-describe" className="home-describe"><p className="study-eyebrow">Use what you know · Lessons 2–4</p><h2>Give the room a voice.</h2><div className="home-adjectives">{homeAdjectives.map(a=><article key={a.de}><span aria-hidden="true">{a.symbol}</span><small>{a.cue}</small><p><GermanText text={a.de}/>{clip(a.de)}{a.opposite&&<> <span aria-hidden="true">↔</span> <GermanText text={a.opposite}/>{clip(a.opposite)}</>}</p><p>{a.en}{a.oppositeEn?` ↔ ${a.oppositeEn}`:""}</p></article>)}</div><div className="home-note"><b>Turn the volume up carefully:</b> <span lang="de">schön → sehr schön</span> = beautiful → very beautiful. <span lang="de">klein → zu klein</span> = small → too small. After <b lang="de">ist</b>, these adjectives keep their basic form: <b lang="de">Die Lampe ist schön.</b></div><div className="home-phrase-grid">{homePhrases.map((p,i)=><article key={p.de}><small>{p.cue}</small><p><GermanText text={p.de}/>{clip(p.de)}</p><p>{p.en}</p><SaveButton compact item={{id:`home-phrase-${i}`,title:p.de,meaning:p.en,kind:"phrase",href:"/cheat-sheets/home#home-describe",audio:speech[p.de]??null}}/></article>)}</div><p className="home-note"><b lang="de">das Zuhause</b> = home, the noun. <b lang="de">zu Hause</b> = at home, the phrase in Lesson 4. <b lang="de">zuhause</b> is also a correct spelling of the phrase. <a href="https://www.duden.de/sprachwissen/sprachratgeber/zu-Hause-oder-Zuhause" target="_blank" rel="noreferrer">Duden ↗</a></p></section>
    <section id="home-practice" className="home-practice"><div><p className="study-eyebrow">A quick room check</p><h2>Can you name it and use it?</h2><p>This short set follows your study selection. Save a difficult word and revisit it in My review.</p></div><button type="button" className="study-secondary" aria-pressed={slow} onClick={()=>setSlow(!slow)}>{slow?"Slow audio on":"Slow audio off"}</button><SheetRecall key={questions.map(q=>q.id).join("|")} prefix="home" questions={questions} speech={speech} {...(slow?{rate:0.8}:{})}/></section>
    <details className="home-sources"><summary>Coverage & sources</summary><p>All 20 labelled objects and the Zuhause heading from your supplied easydeutsch image, plus related words from Momente A1.1 Lessons 1–4: Bild, Sessel, Möbel, Geschäft, Möbelgeschäft, Hotel, Hotelzimmer, Wohnort and Buch. Items from the image that occur later in the course are labelled as extra vocabulary here. The book additions include vocabulary from exercise instructions.</p><p>Book patterns: KB 15–18, 29–32; AB 26–29; German–English glossary pp. 5–6. Momente © Hueber Verlag. Illustrations, memory cues and example combinations were created for this sheet. Audio uses existing pronunciation clips where available, with synthesized speech for additions.</p><Link href="/references">Course sources & credits <Icon name="arrow"/></Link></details><p className="home-credit">Reference vocabulary: your easydeutsch image + Momente A1.1 Lessons 1–4, © Hueber Verlag. Original line illustrations and learning notes.</p>

  </CheatSheetFrame>;
}
