"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { countries, countryGroups, countryName, countryFrom, countryWhere, countryTo, spokenLanguage, countryOriginMeaning, type Country, type CountryGroup } from "@/lib/study/countries";
import { GermanText, SaveButton, useStudy } from "./StudyProvider";
import { LineAudio } from "./StudyAudio";

const groups = Object.keys(countryGroups) as CountryGroup[];
const quiz = ["IR", "CH", "US", "NL", "DE", "PL", "TR", "MV", "IR-language", "AT-language"];
const savedCountry = (country: Country) => ({
  id: `country-${country.id}`, title: `Ich komme ${countryFrom(country)}.`,
  meaning: `${countryOriginMeaning(country)} ${countryGroups[country.group].label}. Languages: ${country.languages.join(", ")}.`,
  kind: "concept" as const, href: `/cheat-sheets#country-${country.id}`,
});

export function CountryCheatSheet({ speech, cardLinks }: { speech: Record<string, string>; cardLinks: Record<string, string> }) {
  const [chosen, setChosen] = useState("IR");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CountryGroup | "all" | "saved">("all");
  const [scope, setScope] = useState("all");
  const [recall, setRecall] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [position, setPosition] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  useEffect(() => {
    const openCountry = () => {
      const id = window.location.hash.replace(/^#country-/, "");
      if (!countries.some(c=>c.id===id)) return;
      setChosen(id);setSearch("");setFilter("all");setScope("all");
      requestAnimationFrame(()=>document.getElementById(`country-${id}`)?.scrollIntoView());
    };
    openCountry();window.addEventListener("hashchange",openCountry);
    return ()=>window.removeEventListener("hashchange",openCountry);
  }, []);
  const study = useStudy();
  const current = countries.find(c => c.id === chosen)!;
  const visible = countries.filter(c => (filter === "all" || (filter === "saved" ? study?.state.saved[`country-${c.id}`] : c.group === filter)) &&
    (scope === "all" || !c.extra) && `${c.name} ${c.en} ${c.languages.join(" ")}`.toLocaleLowerCase("de").includes(search.trim().toLocaleLowerCase("de")));
  const clip = (text: string) => <LineAudio text={text} src={speech[text]} compact />;
  const quizId = quiz[position];
  const quizCountry = countries.find(c => c.id === quizId?.split("-")[0]);
  const languageQuestion = quizId?.endsWith("language");
  const correct = quizCountry ? languageQuestion ? spokenLanguage(quizCountry.languages[0]!) : countryFrom(quizCountry) : "";
  const isCorrect = (value: string) => value === correct || (!languageQuestion && quizCountry?.id === "IR" && value === "aus Iran");
  const choices = quizCountry ? languageQuestion ? [correct, quizCountry.id === "IR" ? "Iranisch" : "Österreichisch", "Spanisch"] :
    quizCountry.id === "IR" ? ["aus der Iran", "aus dem Iran", "aus Iran", "aus den Iran"] :
    [...new Set([`aus der ${quizCountry.name}`, `aus ${quizCountry.name}`, `aus den ${quizCountry.dative ?? quizCountry.name}`, `aus dem ${quizCountry.name}`])] : [];

  return <div className="country-sheet">
    <header className="country-heading">
      <div><p className="study-eyebrow">Cheat sheets · 01 / Your language passport</p><h1>Countries, without the guesswork.</h1>
        <p>Learn the country. Keep its color. Let <b lang="de">aus</b> change the article.</p></div>
      <button type="button" className="study-secondary country-print" onClick={() => {setRecall(false);setFilter("all");setScope("all");setSearch("");requestAnimationFrame(()=>window.print());}}>Print cheat sheet</button>
    </header>
    <nav className="country-jump" aria-label="Cheat sheet sections">
      <a href="#country-patterns">The 4 patterns</a><a href="#country-passport">Build a sentence</a><a href="#country-index">All {countries.length} countries</a><a href="#country-practice">Test yourself</a>
    </nav>
    <section id="country-patterns" className="country-patterns" aria-labelledby="patterns-title">
      <div className="study-section-heading"><div><p className="study-eyebrow">One rule, four paths</p><h2 id="patterns-title">Pass through the AUS gate.</h2></div><span className="country-rule-stamp">AUS + DATIVE</span></div>
      <p>Imagine the article showing its passport at <b lang="de">aus</b>. It changes into the dative form. The country’s grammatical gender stays the same.</p>
      <div className="country-gate-map">
        {groups.map(group => <div key={group} className={`country-gate study-tone-${group}`}>
          <small>{countryGroups[group].label}</small>
          <div className="country-gate-path" aria-label={`${countryGroups[group].example} becomes aus ${countryGroups[group].after}`}>
            <b>{group === "neuter" ? "∅" : group === "male" ? "der" : "die"}</b><span aria-hidden="true">→</span><strong>{countryGroups[group].from}</strong>
          </div>
          <p lang="de">{countryGroups[group].from} {group === "neuter" ? "Deutschland" : group === "female" ? "Schweiz" : group === "male" ? "Iran" : "USA"}</p>
          <span>{countryGroups[group].memory}</span>
        </div>)}
      </div>
      <p className="country-trap"><b>Don’t let “der” trick you.</b> <span className="study-tone-female" lang="de">aus der Schweiz</span> is still feminine. Pink follows the country, not the letters of its article. Purple marks plural, which is a number category, not a fourth gender.</p>
    </section>

    <section id="country-passport" className="country-passport-layout" aria-labelledby="passport-title">
      <div className={`country-passport study-tone-${current.group}`}>
        <div className="country-passport-top"><span>MY LANGUAGE PASSPORT</span><svg width="42" height="42" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20"/><ellipse cx="24" cy="24" rx="9" ry="20"/><path d="M4 24h40M8 12h32M8 36h32"/></svg></div>
        <label className="study-field">Choose a country<select aria-label="Choose a country" value={chosen} onChange={event => setChosen(event.target.value)}>{countries.map(c => <option key={c.id} value={c.id}>{countryName(c)} · {c.en}</option>)}</select></label>
        <h2 id="passport-title" lang="de">{countryName(current)}</h2><p className="country-passport-type">{countryGroups[current.group].label}</p>
        <div className="country-passport-line"><span>01 / WHERE FROM?</span><p><GermanText text={`Ich komme ${countryFrom(current)}.`}/>{clip(`Ich komme ${countryFrom(current)}.`)}</p></div>
        <div className="country-passport-line"><span>02 / A LANGUAGE EXAMPLE</span><p><GermanText text={`Ich spreche ${spokenLanguage(current.languages[0]!)}.`}/>{clip(`Ich spreche ${spokenLanguage(current.languages[0]!)}.`)}</p></div>
        <SaveButton item={{...savedCountry(current), audio:speech[`Ich komme ${countryFrom(current)}.`] ?? null}} />
      </div>
      <div className="country-memory-notes">
        <p className="study-eyebrow">Make it stick</p><h2>Three questions. Three directions.</h2>
        <div className="country-direction"><b>↗</b><div><h3>Woher? <span>Where from?</span></h3><p><GermanText text={`Ich komme ${countryFrom(current)}.`}/></p><small>Origin → aus + dative</small></div></div>
        <div className="country-direction"><b>●</b><div><h3>Wo? <span>Where?</span></h3><p><GermanText text={`Ich wohne ${countryWhere(current)}.`}/>{clip(`Ich wohne ${countryWhere(current)}.`)}</p><small>Location → in + dative</small></div></div>
        <div className="country-direction"><b>↘</b><div><h3>Wohin? <span>Where to?</span></h3><p><GermanText text={`Ich fahre ${countryTo(current)}.`}/>{clip(`Ich fahre ${countryTo(current)}.`)}</p><small>No article → nach. With an article → in + accusative.</small></div></div>
        {current.note && <p className="country-note">{current.note}</p>}
        {current.id === "IR" && <p className="country-source-note">Iran also works without an article: <b lang="de">aus Iran · in Iran · nach Iran</b>. <a href="https://www.duden.de/rechtschreibung/Iran" target="_blank" rel="noreferrer">Duden ↗</a></p>}
      </div>
    </section>

    <section className="country-language-rule" aria-labelledby="languages-title">
      <div><p className="study-eyebrow">Your mouth speaks a language, not a passport</p><h2 id="languages-title">Country ≠ language.</h2><p>After <b lang="de">sprechen</b>, use the language name with a capital letter and normally no article.</p></div>
      <div className="country-language-examples"><p><span lang="de">Iran</span><span aria-hidden="true">→</span><strong lang="de">Ich spreche Persisch.</strong></p><p><span lang="de">Österreich</span><span aria-hidden="true">→</span><strong lang="de">Ich spreche Deutsch.</strong></p><p><span lang="de">Brasilien</span><span aria-hidden="true">→</span><strong lang="de">Ich spreche Portugiesisch.</strong></p></div>
      <p className="country-wide-note">Language names such as <b lang="de">Deutsch</b> are neuter nouns, but we usually say <b lang="de">Ich spreche Deutsch</b>, not <s lang="de">Ich spreche das Deutsch</s>. A country can have many languages; the lists below give useful examples, not everyone’s personal language.</p>
      <p className="country-wide-note">Also in your book: <GermanText text="Russisch"/> — Russian. {clip("Russisch")}</p>
    </section>

    <section id="country-index" aria-labelledby="index-title">
      <div className="study-section-heading"><div><p className="study-eyebrow">Keep this close while you practise</p><h2 id="index-title">Your country index</h2></div><button type="button" className="study-secondary" aria-pressed={recall} onClick={() => {setRecall(!recall);setRevealed([]);}}>{recall ? "Show all answers" : "Hide answers & recall"}</button></div>
      <div className="country-controls"><label className="study-field">Find a country or language<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Iran, Switzerland, Deutsch…" /></label><label className="study-field">Book coverage<select aria-label="Book coverage" value={scope} onChange={e=>setScope(e.target.value)}><option value="all">All {countries.length} country names</option><option value="core">28 study-card countries</option></select></label></div>
      <div className="study-chips" role="group" aria-label="Country article filter">
        {(["all",...groups,"saved"] as const).map(group => <button type="button" key={group} aria-pressed={filter===group} onClick={()=>setFilter(group)}>{group==="all" ? "All patterns" : group==="saved" ? "Saved for review" : countryGroups[group].label}</button>)}
      </div>
      <p className="muted" role="status">{visible.length} {visible.length===1?"country":"countries"} · Tap a word for meaning; save the patterns you want to revisit.</p>
      <div className="country-ledger-head" aria-hidden="true"><span>COUNTRY / GENDER</span><span>WHERE FROM? · AUS</span><span>LANGUAGE EXAMPLES</span><span>REVIEW</span></div>
      <div className="country-ledger">
        {visible.map(c => {const hidden = recall && !revealed.includes(c.id); return <article key={c.id} id={`country-${c.id}`} data-country={c.id} className={`country-row study-tone-${c.group}`}>
          <div><span className="country-code" aria-hidden="true">{c.id === "GB-ENG" ? "EN" : c.id}</span><h3><GermanText text={countryName(c)}/></h3><p>{c.en}</p><small>{countryGroups[c.group].label}{c.extra ? " · Other book mention" : ""}</small></div>
          <div className="country-answer">{hidden ? <button type="button" className="study-secondary" onClick={()=>setRevealed([...revealed,c.id])} aria-label={`Reveal ${c.name}`}>Reveal origin & language</button> : <><strong><GermanText text={countryFrom(c)}/></strong>{clip(`Ich komme ${countryFrom(c)}.`)}<small>Ich komme …</small></>}</div>
          <div className="country-languages">{hidden ? <span className="muted">Try saying it first.</span> : c.languages.map(language => <span key={language}><GermanText text={language}/>{clip(spokenLanguage(language))}</span>)}</div>
          <div className="country-row-save"><SaveButton compact item={{...savedCountry(c),audio:speech[`Ich komme ${countryFrom(c)}.`] ?? null}} /></div>
          {!hidden && <details className="country-row-more"><summary>Memory cue & more</summary><p>{c.note ?? `No article in ordinary use: ${countryFrom(c)}. The country name is neuter, but you normally leave das out.`}</p><p lang="de">{countryWhere(c)} · {countryTo(c)}</p>{cardLinks[c.id] && <Link href={cardLinks[c.id]!}>Open vocabulary card →</Link>}</details>}
        </article>;})}
        {!visible.length && <p className="country-empty">No countries match. Try another search or choose All patterns.</p>}
      </div>
    </section>

    <section id="country-practice" className="country-practice" aria-labelledby="practice-title">
      <div><p className="study-eyebrow">A two-minute check</p><h2 id="practice-title">Can you get through the gate?</h2><p>Choose an answer, read the reason, then save any country you want to practise again.</p></div>
      {quizCountry ? <div className="country-quiz"><span>Question {position+1} / {quiz.length}</span><h3 lang="de">{languageQuestion ? `${quizCountry.name}: Ich spreche …` : `${countryName(quizCountry)}: Ich komme …`}</h3>
        <div className="country-quiz-options">{choices.map(choice=><button type="button" key={choice} disabled={answer!==null} aria-pressed={answer===choice} data-answer={answer===null?undefined:isCorrect(choice)?"correct":answer===choice?"wrong":undefined} onClick={()=>{setAnswer(choice);if(isCorrect(choice))setScore(score+1);}} lang="de">{choice}</button>)}</div>
        {answer!==null && <div className="country-quiz-feedback" role="status"><strong>{isCorrect(answer)?"Yes — that works.":"Almost. Keep this pattern:"}</strong><p lang="de">{languageQuestion?`Ich spreche ${correct}.`:`Ich komme ${correct}.`}</p><p>{languageQuestion ? quizCountry.note : `${countryGroups[quizCountry.group].label} → ${countryGroups[quizCountry.group].from}. ${quizCountry.note ?? "No article needs to be added."}`}</p><div className="study-row"><SaveButton item={savedCountry(quizCountry)}/><button type="button" className="study-primary" onClick={()=>{setPosition(position+1);setAnswer(null);}}>Next →</button></div></div>}
      </div> : <div className="country-quiz" role="status"><h3>{score} / {quiz.length}</h3><p>{score===quiz.length?"Every pattern remembered. Try the hidden-answer country index next.":"Keep the tricky countries in My review and try again."}</p><button type="button" className="study-primary" onClick={()=>{setPosition(0);setAnswer(null);setScore(0);}}>Practise again</button></div>}
    </section>
    <details className="country-sources"><summary>Coverage, sources & pronunciation</summary>
      <p>{countries.length} country names: all 28 country cards from the existing study collection, including Iran, plus 13 additional country names found in the supplied coursebook and workbook. Includes geographical names used in the book, such as England and Great Britain. Momente course material © Hueber Verlag. Grammar explanations, memory cues and English teaching translations were written for this sheet.</p>
      <p>The language lists are learning examples, not exhaustive official-language lists. Audio is synthesized German speech.</p>
      <ul><li><a href="https://grammis.ids-mannheim.de/fragen/5" target="_blank" rel="noreferrer">Leibniz Institute for the German Language: country names and grammatical gender</a></li><li><a href="https://www.duden.de/rechtschreibung/Iran" target="_blank" rel="noreferrer">Duden: Iran with and without an article</a></li><li><a href="https://gfds.de/heisst-es-im-iran-oder-in-iran/" target="_blank" rel="noreferrer">GfdS: im Iran / in Iran</a></li><li><a href="https://www.plurilingua.admin.ch/dam/en/sd-web/wgN8O5waA2LA/20240717_Swiss%20plurilingulism%20%E2%80%93%20a%20brief%20guide.pdf" target="_blank" rel="noreferrer">Swiss Confederation: four national languages</a></li><li><a href="https://home.eritreaembassy.ch/discover-eritrea/fact-and-figures" target="_blank" rel="noreferrer">Eritrean Embassy: multilingualism and working languages</a></li><li><a href="https://www.statssa.gov.za/publications/03-00-22/03-00-222024.pdf" target="_blank" rel="noreferrer">Statistics South Africa: languages</a></li></ul>
      <Link href="/references">Course sources & credits →</Link>
    </details>
    <p className="country-credit">Country coverage: Momente coursebook, workbook and study collection · © Hueber Verlag. Explanations and memory cues created for your study sheet.</p>
  </div>;
}
