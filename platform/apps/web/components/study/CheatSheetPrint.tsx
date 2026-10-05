
import { LArticle, LB, LCaption, LDiv, LFooter, LH2, LH3, LHeader, LP, LSection, LSpan, LStrong, LTable, LTbody, LTd, LTh, LThead, LTr } from "@/components/i18n/LocalizedElements";
import { countries, countryGroups, countryName, countryFrom, type CountryGroup } from "@/lib/study/countries";
import { homeWords, homeLabels, homePronouns } from "@/lib/study/home";
import { CountryFlag } from "./CountryFlag";
import { HomeIllustration } from "./HomeIllustration";
import "./CheatSheetPrint.css";

const countryOrder: CountryGroup[] = ["neuter", "female", "male", "plural"];
const homeOrder = ["male", "female", "neuter", "plural"] as const;

export function CountryPrintSummary() {
  return <LDiv className="sheet-print-summary" aria-label="Printable country summary">
    <LSection className="sheet-print-page">
      <LHeader><LSpan>01 · Countries & languages</LSpan><LH2>One country. One color. Four AUS paths.</LH2><LP>Color follows grammatical gender. The article changes after <LB lang="de">aus</LB> + dative.</LP></LHeader>
      <LDiv className="print-country-groups">
        {countryOrder.map(group => <LSection key={group} className={`print-country-group study-tone-${group}`}>
          <LH3>{countryGroups[group].label} <LStrong lang="de">{group === "plural" ? "die" : countryGroups[group].article} → {countryGroups[group].from}</LStrong></LH3>
          <LP>{countryGroups[group].memory}</LP>
          <LDiv className="print-country-flags">{countries.filter(country => country.group === group).map(country => <LDiv key={country.id}>
            <CountryFlag id={country.id} label={country.en} loading="eager"/><LSpan lang="de">{country.name}</LSpan>
          </LDiv>)}</LDiv>
        </LSection>)}
      </LDiv>
      <LDiv className="print-memory-notes">
        <LP><LB>Pink stays feminine:</LB> <LSpan lang="de">die Schweiz → aus der Schweiz.</LSpan> The dative <LB lang="de">der</LB> does not make the country masculine.</LP>
        <LP><LB>Purple means plural, not another gender:</LB> <LSpan lang="de">die Niederlande → aus den Niederlanden.</LSpan> But <LSpan lang="de">Polen, Italien, Schweden</LSpan> use no article despite their endings.</LP>
        <LP><LB>Iran has two accepted paths:</LB> <LSpan lang="de">der Iran → aus dem Iran</LSpan>; or no article: <LSpan lang="de">Iran → aus Iran.</LSpan></LP>
      </LDiv>
      <LTable className="print-direction-table"><LCaption>Three questions, three directions</LCaption><LThead><LTr><LTh>Pattern</LTh><LTh>Woher? · From</LTh><LTh>Wo? · In</LTh><LTh>Wohin? · To</LTh></LTr></LThead><LTbody>
        <LTr className="study-tone-neuter"><LTh>No article</LTh><LTd lang="de">aus Deutschland</LTd><LTd lang="de">in Deutschland</LTd><LTd lang="de">nach Deutschland</LTd></LTr>
        <LTr className="study-tone-female"><LTh>Feminine</LTh><LTd lang="de">aus der Schweiz</LTd><LTd lang="de">in der Schweiz</LTd><LTd lang="de">in die Schweiz</LTd></LTr>
        <LTr className="study-tone-male"><LTh>Masculine</LTh><LTd lang="de">aus dem Iran</LTd><LTd lang="de">im Iran</LTd><LTd lang="de">in den Iran</LTd></LTr>
        <LTr className="study-tone-plural"><LTh>Plural</LTh><LTd lang="de">aus den USA</LTd><LTd lang="de">in den USA</LTd><LTd lang="de">in die USA</LTd></LTr>
      </LTbody></LTable>
      <LP className="print-recall"><LB>Cover the answers:</LB> say “I come from” Switzerland, Iran, the Netherlands and Poland. Then check the colored paths.</LP>
      <LFooter>Momente © Hueber Verlag · Study collection + book mentions, including Iran. Flags: flag-icons. The Great Britain tile uses the UK Union flag. Learning notes created for this sheet.</LFooter>
    </LSection>
    <LSection className="sheet-print-page">
      <LHeader><LSpan>01 · Country & language reference</LSpan><LH2>Say where you come from. Say what you speak.</LH2><LP lang="de">Ich komme … · Ich spreche …</LP></LHeader>
      <LTable className="print-country-table"><LCaption>All {countries.length} study country names · * additional book mention</LCaption><LThead><LTr><LTh>Country / article</LTh><LTh>Origin · aus + dative</LTh><LTh>Language examples</LTh></LTr></LThead><LTbody>
        {countryOrder.flatMap(group => countries.filter(country => country.group === group)).map(country => <LTr key={country.id} className={`study-tone-${country.group}`}>
          <LTh lang="de">{countryName(country)}{country.extra ? " *" : ""}</LTh><LTd lang="de">{countryFrom(country)}</LTd><LTd lang="de">{country.languages.join(" · ")}</LTd>
        </LTr>)}
      </LTbody></LTable>
      <LP><LB>Country ≠ language.</LB> Use a capital letter and normally no article: <LSpan lang="de">Ich spreche Deutsch / Persisch / Portugiesisch.</LSpan> Also in the book: <LSpan lang="de">Russisch</LSpan> (Russian).</LP>
      <LP>These are language examples, not exhaustive lists or assumptions about an individual. Countries can be multilingual. Iran also permits <LSpan lang="de">aus Iran · in Iran · nach Iran</LSpan>.</LP>
      <LFooter>Momente coursebook, workbook and study collection © Hueber Verlag · Full explanations, sources, map, pronunciation and saved review are available in the interactive sheet.</LFooter>
    </LSection>
  </LDiv>;
}

export function HomePrintSummary() {
  return <LDiv className="sheet-print-summary" aria-label="Printable home summary">
    <LSection className="sheet-print-page">
      <LHeader><LSpan>02 · Home & furniture</LSpan><LH2>A home for every word.</LH2><LP>See the object → say its article → remember its plural. Cover the labels to practise.</LP></LHeader>
      <LDiv className="print-home-trails">{homeOrder.map(tone => <LDiv className={`study-tone-${tone}`} key={tone}><LSpan>{homeLabels[tone]}</LSpan><LStrong lang="de">{tone === "male" ? "der" : tone === "neuter" ? "das" : "die"} → {homePronouns[tone]}</LStrong></LDiv>)}</LDiv>
      <LDiv className="print-home-grid">{homeOrder.flatMap(tone => homeWords.filter(word => word.tone === tone)).map(word => <LArticle key={word.id} className={`study-tone-${word.tone}`} data-print-home-word={word.id}>
        <HomeIllustration id={word.id}/><LH3 lang="de">{word.de}</LH3><LSpan>{word.en}</LSpan><LP className="study-tone-plural" lang={word.plural ? "de" : "en"}>{word.plural ?? (word.tone === "plural" ? "Plural only · sind" : "Usually singular")}</LP>
      </LArticle>)}</LDiv>
      <LDiv className="print-home-notes">
        <LP><LB>Follow the noun:</LB> <LSpan lang="de">Der Stuhl ist schön. → Er ist schön.</LSpan> <LSpan lang="de">Die Möbel sind schön. → Sie sind schön.</LSpan> Plural <LSpan lang="de">die</LSpan> is not feminine.</LP>
        <LP><LB>Plural memory groups:</LB> <LSpan lang="de">Stuhl → Stühle; Sofa → Sofas; Zimmer → Zimmer.</LSpan> Learn each noun with its plural; these examples are not universal rules.</LP>
        <LP><LB>The last noun sets the gender:</LB> <LSpan lang="de">die Möbel + das Geschäft → das Möbelgeschäft.</LSpan></LP>
        <LP><LB>Use it:</LB> <LSpan lang="de">sehr klein</LSpan> = very small; <LSpan lang="de">zu klein</LSpan> = too small. <LSpan lang="de">Wie viel kostet das?</LSpan> = How much is that?</LP>
        <LP><LB>Home, two ways:</LB> <LSpan lang="de">das Zuhause</LSpan> = home (noun); <LSpan lang="de">Ich bin zu Hause.</LSpan> = I am at home.</LP>
      </LDiv>
      <LFooter>Reference: easydeutsch image + Momente A1.1 Lessons 1–4, © Hueber Verlag. Original illustrations. Audio and full sources in the interactive sheet.</LFooter>
    </LSection>
  </LDiv>;
}
