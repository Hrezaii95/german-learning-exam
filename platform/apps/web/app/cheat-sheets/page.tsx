import { ShellLayout } from "@/components/shell/ShellLayout";
import { CountryCheatSheet } from "@/components/study/CountryCheatSheet";
import { countries, countryName } from "@/lib/study/countries";
import { loadWordCards } from "@/lib/content/word-cards";
import { loadStudySpeech, loadCountrySpeech } from "@/lib/study/catalog";
import "./countries.css";

export const metadata = {title:"Country cheat sheet",description:"Remember country gender, aus + dative, languages, and how to introduce yourself. Includes Iran and every country in your study books."};
export default function CheatSheetsPage() {
  const cards=loadWordCards().cards;
  const speech={...loadStudySpeech(),...loadCountrySpeech()};
  const cardLinks: Record<string,string>={};
  for(const c of countries){const card=cards.find(card=>card.rows.some(row=>row.singular.text===countryName(c)));if(card){cardLinks[c.id]=card.path;for(const row of card.rows)if(row.singular.audio)speech[row.singular.text]=row.singular.audio;for(const example of card.examples)if(example.audio)speech[example.de]=example.audio;}}
  return <ShellLayout current="cheat-sheets"><CountryCheatSheet speech={speech} cardLinks={cardLinks}/></ShellLayout>;
}
