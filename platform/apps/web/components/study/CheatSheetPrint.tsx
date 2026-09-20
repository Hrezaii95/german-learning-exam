import { countries, countryGroups, countryName, countryFrom, type CountryGroup } from "@/lib/study/countries";
import { homeWords, homeLabels, homePronouns } from "@/lib/study/home";
import { CountryFlag } from "./CountryFlag";
import { HomeIllustration } from "./HomeIllustration";
import "./CheatSheetPrint.css";

const countryOrder: CountryGroup[] = ["neuter", "female", "male", "plural"];
const homeOrder = ["male", "female", "neuter", "plural"] as const;

export function CountryPrintSummary() {
  return <div className="sheet-print-summary" aria-label="Printable country summary">
    <section className="sheet-print-page">
      <header><span>01 · Countries & languages</span><h2>One country. One color. Four AUS paths.</h2><p>Color follows grammatical gender. The article changes after <b lang="de">aus</b> + dative.</p></header>
      <div className="print-country-groups">
        {countryOrder.map(group => <section key={group} className={`print-country-group study-tone-${group}`}>
          <h3>{countryGroups[group].label} <strong lang="de">{group === "plural" ? "die" : countryGroups[group].article} → {countryGroups[group].from}</strong></h3>
          <p>{countryGroups[group].memory}</p>
          <div className="print-country-flags">{countries.filter(country => country.group === group).map(country => <div key={country.id}>
            <CountryFlag id={country.id} label={country.en} loading="eager"/><span lang="de">{country.name}</span>
          </div>)}</div>
        </section>)}
      </div>
      <div className="print-memory-notes">
        <p><b>Pink stays feminine:</b> <span lang="de">die Schweiz → aus der Schweiz.</span> The dative <b lang="de">der</b> does not make the country masculine.</p>
        <p><b>Purple means plural, not another gender:</b> <span lang="de">die Niederlande → aus den Niederlanden.</span> But <span lang="de">Polen, Italien, Schweden</span> use no article despite their endings.</p>
        <p><b>Iran has two accepted paths:</b> <span lang="de">der Iran → aus dem Iran</span>; or no article: <span lang="de">Iran → aus Iran.</span></p>
      </div>
      <table className="print-direction-table"><caption>Three questions, three directions</caption><thead><tr><th>Pattern</th><th>Woher? · From</th><th>Wo? · In</th><th>Wohin? · To</th></tr></thead><tbody>
        <tr className="study-tone-neuter"><th>No article</th><td lang="de">aus Deutschland</td><td lang="de">in Deutschland</td><td lang="de">nach Deutschland</td></tr>
        <tr className="study-tone-female"><th>Feminine</th><td lang="de">aus der Schweiz</td><td lang="de">in der Schweiz</td><td lang="de">in die Schweiz</td></tr>
        <tr className="study-tone-male"><th>Masculine</th><td lang="de">aus dem Iran</td><td lang="de">im Iran</td><td lang="de">in den Iran</td></tr>
        <tr className="study-tone-plural"><th>Plural</th><td lang="de">aus den USA</td><td lang="de">in den USA</td><td lang="de">in die USA</td></tr>
      </tbody></table>
      <p className="print-recall"><b>Cover the answers:</b> say “I come from” Switzerland, Iran, the Netherlands and Poland. Then check the colored paths.</p>
      <footer>Momente © Hueber Verlag · Study collection + book mentions, including Iran. Flags: flag-icons. The Great Britain tile uses the UK Union flag. Learning notes created for this sheet.</footer>
    </section>
    <section className="sheet-print-page">
      <header><span>01 · Country & language reference</span><h2>Say where you come from. Say what you speak.</h2><p lang="de">Ich komme … · Ich spreche …</p></header>
      <table className="print-country-table"><caption>All {countries.length} study country names · * additional book mention</caption><thead><tr><th>Country / article</th><th>Origin · aus + dative</th><th>Language examples</th></tr></thead><tbody>
        {countryOrder.flatMap(group => countries.filter(country => country.group === group)).map(country => <tr key={country.id} className={`study-tone-${country.group}`}>
          <th lang="de">{countryName(country)}{country.extra ? " *" : ""}</th><td lang="de">{countryFrom(country)}</td><td lang="de">{country.languages.join(" · ")}</td>
        </tr>)}
      </tbody></table>
      <p><b>Country ≠ language.</b> Use a capital letter and normally no article: <span lang="de">Ich spreche Deutsch / Persisch / Portugiesisch.</span> Also in the book: <span lang="de">Russisch</span> (Russian).</p>
      <p>These are language examples, not exhaustive lists or assumptions about an individual. Countries can be multilingual. Iran also permits <span lang="de">aus Iran · in Iran · nach Iran</span>.</p>
      <footer>Momente coursebook, workbook and study collection © Hueber Verlag · Full explanations, sources, map, pronunciation and saved review are available in the interactive sheet.</footer>
    </section>
  </div>;
}

export function HomePrintSummary() {
  return <div className="sheet-print-summary" aria-label="Printable home summary">
    <section className="sheet-print-page">
      <header><span>02 · Home & furniture</span><h2>A home for every word.</h2><p>See the object → say its article → remember its plural. Cover the labels to practise.</p></header>
      <div className="print-home-trails">{homeOrder.map(tone => <div className={`study-tone-${tone}`} key={tone}><span>{homeLabels[tone]}</span><strong lang="de">{tone === "male" ? "der" : tone === "neuter" ? "das" : "die"} → {homePronouns[tone]}</strong></div>)}</div>
      <div className="print-home-grid">{homeOrder.flatMap(tone => homeWords.filter(word => word.tone === tone)).map(word => <article key={word.id} className={`study-tone-${word.tone}`} data-print-home-word={word.id}>
        <HomeIllustration id={word.id}/><h3 lang="de">{word.de}</h3><span>{word.en}</span><p className="study-tone-plural" lang={word.plural ? "de" : "en"}>{word.plural ?? (word.tone === "plural" ? "Plural only · sind" : "Usually singular")}</p>
      </article>)}</div>
      <div className="print-home-notes">
        <p><b>Follow the noun:</b> <span lang="de">Der Stuhl ist schön. → Er ist schön.</span> <span lang="de">Die Möbel sind schön. → Sie sind schön.</span> Plural <span lang="de">die</span> is not feminine.</p>
        <p><b>Plural memory groups:</b> <span lang="de">Stuhl → Stühle; Sofa → Sofas; Zimmer → Zimmer.</span> Learn each noun with its plural; these examples are not universal rules.</p>
        <p><b>The last noun sets the gender:</b> <span lang="de">die Möbel + das Geschäft → das Möbelgeschäft.</span></p>
        <p><b>Use it:</b> <span lang="de">sehr klein</span> = very small; <span lang="de">zu klein</span> = too small. <span lang="de">Wie viel kostet das?</span> = How much is that?</p>
        <p><b>Home, two ways:</b> <span lang="de">das Zuhause</span> = home (noun); <span lang="de">Ich bin zu Hause.</span> = I am at home.</p>
      </div>
      <footer>Reference: easydeutsch image + Momente A1.1 Lessons 1–4, © Hueber Verlag. Original illustrations. Audio and full sources in the interactive sheet.</footer>
    </section>
  </div>;
}
