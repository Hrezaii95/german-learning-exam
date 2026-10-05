"use client";
import { LA, LArticle, LB, LButton, LDetails, LDiv, LH1, LH2, LH3, LHeader, LInput, LLabel, LLi, LNav, LOption, LP, LSection, LSelect, LSmall, LSpan, LStrong, LSummary, LUl } from "@/components/i18n/LocalizedElements";


import Link from "@/components/i18n/LocalizedLink";
import { useEffect, useState } from "react";
import { countries, countryGroups, countryName, countryFrom, countryWhere, countryTo, spokenLanguage, type Country, type CountryGroup } from "@/lib/study/countries";
import { GermanText, SaveButton, useStudy } from "./StudyProvider";
import { LineAudio } from "./StudyAudio";
import { CheatSheetNav } from "./CheatSheetNav";
import { CountryFlag } from "./CountryFlag";
import {useStudyScope,StudyScopeNotice} from "./StudyScope";
import {countryStudyTags} from "@/lib/study/sheet-scope";
import { CountryOverview } from "./CountryOverview";
import { CountryPrintSummary } from "./CheatSheetPrint";
import {countryRecallQuestions,savedCountry as countryReviewItem} from "@/lib/study/sheet-recall";
import {SheetRecall} from "./SheetRecall";
import {appendNavigationContext} from "@/lib/content/navigation-context";

const groups = Object.keys(countryGroups) as CountryGroup[];
export function CountryCheatSheet({ speech, cardLinks }: { speech: Record<string, string>; cardLinks: Record<string, string> }) {
  const [chosen, setChosen] = useState("IR");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CountryGroup | "all" | "saved">("all");
  const [scope, setScope] = useState("all");
  const [recall, setRecall] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
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
  const savedCountry=(country:Country)=>countryReviewItem(country,study?.dictionary,speech);
  const cardHref=(id:string)=>appendNavigationContext(cardLinks[id]!,{entryContext:"hub",returnPath:"/cheat-sheets",resultId:`country-${id}`});
  const {matches}=useStudyScope();
  const scopedCountries=countries.filter(c=>matches(countryStudyTags(c,study?.dictionary)));
  const current = countries.find(c => c.id === chosen)!;
  const visible = scopedCountries.filter(c => (filter === "all" || (filter === "saved" ? study?.state.saved[`country-${c.id}`] : c.group === filter)) &&
    (scope === "all" || !c.extra) && `${c.name} ${c.en} ${c.languages.join(" ")}`.toLocaleLowerCase("de").includes(search.trim().toLocaleLowerCase("de")));
  const clip = (text: string) => <LineAudio text={text} src={speech[text]} compact />;
  const questions=countryRecallQuestions(visible,study?.dictionary,speech);

  return <LDiv className="country-sheet">
    <CheatSheetNav current="countries"/>
    <LHeader className="country-heading">
      <LDiv><LP className="study-eyebrow">Cheat sheets · 01 / Your language passport</LP><LH1>Countries, without the guesswork.</LH1>
        <LP>Learn the country. Keep its color. Let <LB lang="de">aus</LB> change the article.</LP></LDiv>
      <LButton type="button" className="study-secondary country-print" onClick={() => window.print()}>Print cheat sheet</LButton>
    </LHeader>
    <LNav className="country-jump" aria-label="Cheat sheet sections">
      <Link href="#country-overview">Map & flag overview</Link>
      <Link href="#country-patterns">The 4 patterns</Link><Link href="#country-passport">Build a sentence</Link><Link href="#country-index">All {countries.length} countries</Link><Link href="#country-practice">Test yourself</Link>
    </LNav>
    <CountryOverview countries={scopedCountries} selected={chosen} onSelect={setChosen} speech={speech}/>
    <LSection id="country-patterns" className="country-patterns" aria-labelledby="patterns-title">
      <LDiv className="study-section-heading"><LDiv><LP className="study-eyebrow">One rule, four paths</LP><LH2 id="patterns-title">Pass through the AUS gate.</LH2></LDiv><LSpan className="country-rule-stamp">AUS + DATIVE</LSpan></LDiv>
      <LP>Imagine the article showing its passport at <LB lang="de">aus</LB>. It changes into the dative form. The country’s grammatical gender stays the same.</LP>
      <LDiv className="country-gate-map">
        {groups.map(group => <LDiv key={group} className={`country-gate study-tone-${group}`}>
          <LSmall>{countryGroups[group].label}</LSmall>
          <LDiv role="group" className="country-gate-path" aria-label={`${countryGroups[group].example} becomes aus ${countryGroups[group].after}`}>
            <LB>{group === "neuter" ? "∅" : group === "male" ? "der" : "die"}</LB><LSpan aria-hidden="true">→</LSpan><LStrong>{countryGroups[group].from}</LStrong>
          </LDiv>
          <LP lang="de">{countryGroups[group].from} {group === "neuter" ? "Deutschland" : group === "female" ? "Schweiz" : group === "male" ? "Iran" : "USA"}</LP>
          <LSpan>{countryGroups[group].memory}</LSpan>
        </LDiv>)}
      </LDiv>
      <LP className="country-trap"><LB>Don’t let “der” trick you.</LB> <LSpan className="study-tone-female" lang="de">aus der Schweiz</LSpan> is still feminine. Pink follows the country, not the letters of its article. Purple marks plural, which is a number category, not a fourth gender.</LP>
    </LSection>

    <LSection id="country-passport" className="country-passport-layout" aria-labelledby="passport-title">
      <LDiv className={`country-passport study-tone-${current.group}`}>
        <StudyScopeNotice tags={countryStudyTags(current,study?.dictionary)} subject="This country"/>
        <LDiv className="country-passport-top"><LSpan>MY LANGUAGE PASSPORT</LSpan><svg width="42" height="42" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20"/><ellipse cx="24" cy="24" rx="9" ry="20"/><path d="M4 24h40M8 12h32M8 36h32"/></svg></LDiv>
        <LLabel className="study-field">Choose a country<LSelect aria-label="Choose a country" value={chosen} onChange={event => setChosen(event.target.value)}>{countries.map(c => <LOption key={c.id} value={c.id}>{countryName(c)} · {c.en}{matches(countryStudyTags(c,study?.dictionary))?"":" · outside selection"}</LOption>)}</LSelect></LLabel>
        <LH2 id="passport-title" lang="de"><CountryFlag id={current.id} label={current.en}/>{countryName(current)}</LH2><LP className="country-passport-type">{countryGroups[current.group].label}</LP>
        <LDiv className="country-passport-line"><LSpan>01 / WHERE FROM?</LSpan><LP><GermanText text={`Ich komme ${countryFrom(current)}.`}/>{clip(`Ich komme ${countryFrom(current)}.`)}</LP></LDiv>
        <LDiv className="country-passport-line"><LSpan>02 / A LANGUAGE EXAMPLE</LSpan><LP><GermanText text={`Ich spreche ${spokenLanguage(current.languages[0]!)}.`}/>{clip(`Ich spreche ${spokenLanguage(current.languages[0]!)}.`)}</LP></LDiv>
        <SaveButton item={{...savedCountry(current), audio:speech[`Ich komme ${countryFrom(current)}.`] ?? null}} />
      </LDiv>
      <LDiv className="country-memory-notes">
        <LP className="study-eyebrow">Make it stick</LP><LH2>Three questions. Three directions.</LH2>
        <LDiv className="country-direction"><LB>↗</LB><LDiv><LH3>Woher? <LSpan>Where from?</LSpan></LH3><LP><GermanText text={`Ich komme ${countryFrom(current)}.`}/></LP><LSmall>Origin → aus + dative</LSmall></LDiv></LDiv>
        <LDiv className="country-direction"><LB>●</LB><LDiv><LH3>Wo? <LSpan>Where?</LSpan></LH3><LP><GermanText text={`Ich wohne ${countryWhere(current)}.`}/>{clip(`Ich wohne ${countryWhere(current)}.`)}</LP><LSmall>Location → in + dative</LSmall></LDiv></LDiv>
        <LDiv className="country-direction"><LB>↘</LB><LDiv><LH3>Wohin? <LSpan>Where to?</LSpan></LH3><LP><GermanText text={`Ich fahre ${countryTo(current)}.`}/>{clip(`Ich fahre ${countryTo(current)}.`)}</LP><LSmall>No article → nach. With an article → in + accusative.</LSmall></LDiv></LDiv>
        {current.note && <LP className="country-note">{current.note}</LP>}
        {current.id === "IR" && <LP className="country-source-note">Iran also works without an article: <LB lang="de">aus Iran · in Iran · nach Iran</LB>. <LA href="https://www.duden.de/rechtschreibung/Iran" target="_blank" rel="noreferrer">Duden ↗</LA></LP>}
      </LDiv>
    </LSection>

    <LSection className="country-language-rule" aria-labelledby="languages-title">
      <LDiv><LP className="study-eyebrow">Your mouth speaks a language, not a passport</LP><LH2 id="languages-title">Country ≠ language.</LH2><LP>After <LB lang="de">sprechen</LB>, use the language name with a capital letter and normally no article.</LP></LDiv>
      <LDiv className="country-language-examples"><LP><LSpan lang="de">Iran</LSpan><LSpan aria-hidden="true">→</LSpan><LStrong lang="de">Ich spreche Persisch.</LStrong></LP><LP><LSpan lang="de">Österreich</LSpan><LSpan aria-hidden="true">→</LSpan><LStrong lang="de">Ich spreche Deutsch.</LStrong></LP><LP><LSpan lang="de">Brasilien</LSpan><LSpan aria-hidden="true">→</LSpan><LStrong lang="de">Ich spreche Portugiesisch.</LStrong></LP></LDiv>
      <LP className="country-wide-note">Language names such as <LB lang="de">Deutsch</LB> are neuter nouns, but we usually say <LB lang="de">Ich spreche Deutsch</LB>, not <s lang="de">Ich spreche das Deutsch</s>. A country can have many languages; the lists below give useful examples, not everyone’s personal language.</LP>
      <LP className="country-wide-note">Also in your book: <GermanText text="Russisch"/> — Russian. {clip("Russisch")}</LP>
    </LSection>

    <LSection id="country-index" aria-labelledby="index-title">
      <LDiv className="study-section-heading"><LDiv><LP className="study-eyebrow">Keep this close while you practise</LP><LH2 id="index-title">Your country index</LH2></LDiv><LButton type="button" className="study-secondary" aria-pressed={recall} onClick={() => {setRecall(!recall);setRevealed([]);}}>{recall ? "Show all answers" : "Hide answers & recall"}</LButton></LDiv>
      <LDiv className="country-controls"><LLabel className="study-field">Find a country or language<LInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Iran, Switzerland, Deutsch…" /></LLabel><LLabel className="study-field">Book coverage<LSelect aria-label="Book coverage" value={scope} onChange={e=>setScope(e.target.value)}><LOption value="all">All {countries.length} country names</LOption><LOption value="core">28 study-card countries</LOption></LSelect></LLabel></LDiv>
      <LDiv className="study-chips" role="group" aria-label="Country article filter">
        {(["all",...groups,"saved"] as const).map(group => <LButton type="button" key={group} aria-pressed={filter===group} onClick={()=>setFilter(group)}>{group==="all" ? "All patterns" : group==="saved" ? "Saved for review" : countryGroups[group].label}</LButton>)}
      </LDiv>
      <LP className="muted" role="status">{visible.length} {visible.length===1?"country":"countries"} · Tap a word for meaning; save the patterns you want to revisit.</LP>
      <LDiv className="country-ledger-head" aria-hidden="true"><LSpan>COUNTRY / GENDER</LSpan><LSpan>WHERE FROM? · AUS</LSpan><LSpan>LANGUAGE EXAMPLES</LSpan><LSpan>REVIEW</LSpan></LDiv>
      <LDiv className="country-ledger">
        {visible.map(c => {const hidden = recall && !revealed.includes(c.id); return <LArticle key={c.id} id={`country-${c.id}`} data-country={c.id} className={`country-row study-tone-${c.group}`}>
          <LDiv><CountryFlag id={c.id} label={c.en}/><LH3><GermanText text={countryName(c)}/></LH3><LP>{c.en}</LP><LSmall>{countryGroups[c.group].label}{c.extra ? " · Other book mention" : ""}</LSmall></LDiv>
          <LDiv className="country-answer">{hidden ? <LButton type="button" className="study-secondary" onClick={()=>setRevealed([...revealed,c.id])} aria-label={`Reveal ${c.name}`}>Reveal origin & language</LButton> : <><LStrong><GermanText text={countryFrom(c)}/></LStrong>{clip(`Ich komme ${countryFrom(c)}.`)}<LSmall>Ich komme …</LSmall></>}</LDiv>
          <LDiv className="country-languages">{hidden ? <LSpan className="muted">Try saying it first.</LSpan> : c.languages.map(language => <LSpan key={language}><GermanText text={language}/>{clip(spokenLanguage(language))}</LSpan>)}</LDiv>
          <LDiv className="country-row-save"><SaveButton compact item={{...savedCountry(c),audio:speech[`Ich komme ${countryFrom(c)}.`] ?? null}} /></LDiv>
          {!hidden && <LDetails className="country-row-more"><LSummary>Memory cue & more</LSummary><LP>{c.note ?? `No article in ordinary use: ${countryFrom(c)}. The country name is neuter, but you normally leave das out.`}</LP><LP lang="de">{countryWhere(c)} · {countryTo(c)}</LP>{cardLinks[c.id] && <Link href={cardHref(c.id)}>Open vocabulary card →</Link>}</LDetails>}
        </LArticle>;})}
        {!visible.length && <LP className="country-empty">No countries match. Try another search or choose All patterns.</LP>}
      </LDiv>
    </LSection>

    <LSection id="country-practice" className="country-practice" aria-labelledby="practice-title">
      <LDiv><LP className="study-eyebrow">A two-minute check</LP><LH2 id="practice-title">Can you get through the gate?</LH2><LP>This short set follows your study selection and country-index filters. Choose an answer, hear it, then save any country you want to revisit.</LP></LDiv>
      <SheetRecall key={questions.map(q=>q.id).join("|")} prefix="country" questions={questions} speech={speech}/>
    </LSection>
    <LDetails className="country-sources"><LSummary>Coverage, sources & pronunciation</LSummary>
      <LP>{countries.length} country names: all 28 country cards from the existing study collection, including Iran, plus 13 additional country names found in the supplied coursebook and workbook. Includes geographical names used in the book, such as England and Great Britain. Momente course material © Hueber Verlag. Grammar explanations, memory cues and English teaching translations were written for this sheet.</LP>
      <LP>The language lists are learning examples, not exhaustive official-language lists. Audio is synthesized German speech.</LP>
      <LUl><LLi><LA href="https://grammis.ids-mannheim.de/fragen/5" target="_blank" rel="noreferrer">Leibniz Institute for the German Language: country names and grammatical gender</LA></LLi><LLi><LA href="https://www.duden.de/rechtschreibung/Iran" target="_blank" rel="noreferrer">Duden: Iran with and without an article</LA></LLi><LLi><LA href="https://gfds.de/heisst-es-im-iran-oder-in-iran/" target="_blank" rel="noreferrer">GfdS: im Iran / in Iran</LA></LLi><LLi><LA href="https://www.plurilingua.admin.ch/dam/en/sd-web/wgN8O5waA2LA/20240717_Swiss%20plurilingulism%20%E2%80%93%20a%20brief%20guide.pdf" target="_blank" rel="noreferrer">Swiss Confederation: four national languages</LA></LLi><LLi><LA href="https://home.eritreaembassy.ch/discover-eritrea/fact-and-figures" target="_blank" rel="noreferrer">Eritrean Embassy: multilingualism and working languages</LA></LLi><LLi><LA href="https://www.statssa.gov.za/publications/03-00-22/03-00-222024.pdf" target="_blank" rel="noreferrer">Statistics South Africa: languages</LA></LLi></LUl>
      <Link href="/references">Course sources & credits →</Link>
    </LDetails>
    <LP className="country-credit">Country coverage: Momente coursebook, workbook and study collection · © Hueber Verlag. Explanations and memory cues created for your study sheet.</LP>
    <CountryPrintSummary/>
  </LDiv>;
}
