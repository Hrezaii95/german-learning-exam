import {withPagesBaseAssetPath} from "@/lib/content/pages-base-path";
import {countries} from "@/lib/study/countries";

/** A fine-line flagpole keeps the original flag colours within the Home icon system. */
export function CountryVocabularyIllustration({id}:{id:string}){
  const country=countries.find(country=>country.id===id);
  if(!country)return null;
  return <svg className="subject-vocabulary-illustration country-vocabulary-illustration" data-country-illustration={country.id} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx="50" cy="51" r="43" fill="currentColor" opacity=".055" stroke="none"/>
    <image href={withPagesBaseAssetPath(`/flags/${country.id.toLowerCase()}.svg`)} x="26" y="26" width="59" height="44.25" preserveAspectRatio="xMidYMid meet"/>
    <path d="M22 20v69M22 24h65v48H22M13 90h34M31 80v9"/>
    <circle cx="22" cy="15" r="3"/>
  </svg>;
}
