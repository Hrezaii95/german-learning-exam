export type CountryGroup = "neuter" | "female" | "male" | "plural";
export type Country = {
  id: string; name: string; en: string; group: CountryGroup;
  languages: string[]; note?: string; extra?: boolean; dative?: string;
};

// The inventory combines the 28 existing country cards with country mentions
// in the supplied coursebook and workbook. Languages are examples, not an
// exhaustive inventory of languages or a claim about an individual's speech.
export const countries: Country[] = [
  {id:"IR",name:"Iran",en:"Iran",group:"male",languages:["Persisch (Farsi)"],note:"Both der Iran → aus dem Iran and Iran → aus Iran are correct. This sheet practises the article form. Persian is a language; iranisch means Iranian. Iran is multilingual."},
  {id:"DE",name:"Deutschland",en:"Germany",group:"neuter",languages:["Deutsch"]},
  {id:"CH",name:"Schweiz",en:"Switzerland",group:"female",languages:["Deutsch","Französisch","Italienisch","Rätoromanisch"],note:"Four national languages. There is no single language called Schweizerisch."},
  {id:"TR",name:"Türkei",en:"Turkey",group:"female",languages:["Türkisch"],note:"Turkish is the main language; other languages, including Kurdish, are also spoken."},
  {id:"US",name:"USA",en:"United States",group:"plural",languages:["Englisch","Spanisch"],note:"USA is plural in German. Keep den after aus; do not add -n to the abbreviation."},
  {id:"NL",name:"Niederlande",en:"Netherlands",group:"plural",languages:["Niederländisch"],dative:"Niederlanden",note:"Dative plural adds -n: aus den Niederlanden. The language is Niederländisch, not Deutsch."},
  {id:"ER",name:"Eritrea",en:"Eritrea",group:"neuter",languages:["Tigrinya","Arabisch","Englisch"],note:"A multilingual country. These are widely used working languages; they are not the only languages spoken."},
  {id:"ES",name:"Spanien",en:"Spain",group:"neuter",languages:["Spanisch"],note:"Other languages, including Catalan, Galician and Basque, are also spoken."},
  {id:"FR",name:"Frankreich",en:"France",group:"neuter",languages:["Französisch"]},
  {id:"AT",name:"Österreich",en:"Austria",group:"neuter",languages:["Deutsch"],note:"Country: Österreich. Language: Deutsch. Österreichisch describes Austrian varieties, not a separate national language here."},
  {id:"ZA",name:"Südafrika",en:"South Africa",group:"neuter",languages:["Englisch","Afrikaans","Zulu","Xhosa"],note:"Examples from a multilingual country with 12 official languages, including South African Sign Language."},
  {id:"MX",name:"Mexiko",en:"Mexico",group:"neuter",languages:["Spanisch"],note:"Spanish and many Indigenous languages are spoken. Mexikanisch is not the name of Spanish."},
  {id:"PT",name:"Portugal",en:"Portugal",group:"neuter",languages:["Portugiesisch"]},
  {id:"PL",name:"Polen",en:"Poland",group:"neuter",languages:["Polnisch"],note:"Polen ends in -en but is not a plural country name. Say aus Polen, not aus den Polen."},
  {id:"IT",name:"Italien",en:"Italy",group:"neuter",languages:["Italienisch"]},
  {id:"SE",name:"Schweden",en:"Sweden",group:"neuter",languages:["Schwedisch"],note:"An -en ending does not mean plural: aus Schweden."},
  {id:"CN",name:"China",en:"China",group:"neuter",languages:["Chinesisch (Mandarin)"],note:"Chinesisch is the beginner-level language name. China has many languages and varieties."},
  {id:"GB-ENG",name:"England",en:"England",group:"neuter",languages:["Englisch"],note:"England is part of the United Kingdom."},
  {id:"AU",name:"Australien",en:"Australia",group:"neuter",languages:["Englisch"],note:"English and many other languages, including Indigenous languages, are spoken."},
  {id:"CA",name:"Kanada",en:"Canada",group:"neuter",languages:["Englisch","Französisch"]},
  {id:"DK",name:"Dänemark",en:"Denmark",group:"neuter",languages:["Dänisch"]},
  {id:"SG",name:"Singapur",en:"Singapore",group:"neuter",languages:["Englisch","Chinesisch (Mandarin)","Malaiisch","Tamil"]},
  {id:"LI",name:"Liechtenstein",en:"Liechtenstein",group:"neuter",languages:["Deutsch"]},
  {id:"IE",name:"Irland",en:"Ireland",group:"neuter",languages:["Englisch","Irisch"]},
  {id:"GR",name:"Griechenland",en:"Greece",group:"neuter",languages:["Griechisch"]},
  {id:"PE",name:"Peru",en:"Peru",group:"neuter",languages:["Spanisch","Quechua","Aymara"]},
  {id:"AF",name:"Afghanistan",en:"Afghanistan",group:"neuter",languages:["Dari","Paschto"],note:"Dari is a variety of Persian. Afghanistan is multilingual."},
  {id:"MG",name:"Madagaskar",en:"Madagascar",group:"neuter",languages:["Malagasy","Französisch"]},
  {id:"BR",name:"Brasilien",en:"Brazil",group:"neuter",languages:["Portugiesisch"],extra:true,note:"Brazil → Portuguese, not Spanish."},
  {id:"HU",name:"Ungarn",en:"Hungary",group:"neuter",languages:["Ungarisch"],extra:true},
  {id:"AR",name:"Argentinien",en:"Argentina",group:"neuter",languages:["Spanisch"],extra:true},
  {id:"IN",name:"Indien",en:"India",group:"neuter",languages:["Hindi","Englisch"],extra:true,note:"Two useful examples among many languages. There is no single language called Indisch."},
  {id:"NO",name:"Norwegen",en:"Norway",group:"neuter",languages:["Norwegisch"],extra:true},
  {id:"MA",name:"Marokko",en:"Morocco",group:"neuter",languages:["Arabisch","Amazigh","Französisch"],extra:true},
  {id:"MV",name:"Malediven",en:"Maldives",group:"plural",languages:["Dhivehi"],extra:true,note:"A plural country name: die Malediven → aus den Malediven. The name already ends in -n."},
  {id:"UG",name:"Uganda",en:"Uganda",group:"neuter",languages:["Englisch","Swahili","Luganda"],extra:true},
  {id:"AD",name:"Andorra",en:"Andorra",group:"neuter",languages:["Katalanisch"],extra:true},
  {id:"MC",name:"Monaco",en:"Monaco",group:"neuter",languages:["Französisch"],extra:true},
  {id:"MU",name:"Mauritius",en:"Mauritius",group:"neuter",languages:["Mauritius-Kreolisch","Französisch","Englisch"],extra:true},
  {id:"BE",name:"Belgien",en:"Belgium",group:"neuter",languages:["Niederländisch","Französisch","Deutsch"],extra:true},
  {id:"GB",name:"Großbritannien",en:"Great Britain",group:"neuter",languages:["Englisch"],extra:true,note:"Great Britain includes England, Scotland and Wales. England and Great Britain are not interchangeable names; the United Kingdom also includes Northern Ireland."},
];

export const countryGroups = {
  neuter: { label:"Neuter · no article", article:"∅", from:"aus", memory:"Travel light: no article to change.", example:"Deutschland", after:"Deutschland" },
  female: { label:"Feminine · die", article:"die", from:"aus der", memory:"The country stays feminine. Only the case changes.", example:"die Schweiz", after:"der Schweiz" },
  male: { label:"Masculine · der", article:"der", from:"aus dem", memory:"The M in deM reminds you of Masculine.", example:"der Iran", after:"dem Iran" },
  plural: { label:"Plural · die", article:"die (plural)", from:"aus den", memory:"A group travels with deN. Check the noun's ending too.", example:"die USA", after:"den USA" },
} as const;

export function countryName(country: Country): string {
  return `${country.group === "neuter" ? "" : country.group === "male" ? "der " : "die "}${country.name}`;
}
export function countryFrom(country: Country): string {
  return `${countryGroups[country.group].from} ${country.dative ?? country.name}`;
}
export function countryWhere(country: Country): string {
  const prefix = {neuter:"in",female:"in der",male:"im",plural:"in den"}[country.group];
  return `${prefix} ${country.dative ?? country.name}`;
}
export function countryTo(country: Country): string {
  const prefix = {neuter:"nach",female:"in die",male:"in den",plural:"in die"}[country.group];
  return `${prefix} ${country.name}`;
}
export function spokenLanguage(language: string): string {
  return language.replace(/ \(.+\)$/, "");
}
export function countryOriginMeaning(country: Country): string {
  return `I come from ${country.group === "plural" ? "the " : ""}${country.en}.`;
}

export const languageMeanings: Record<string,string> = {
  Persisch:"Persian / Farsi",Deutsch:"German",Französisch:"French",Italienisch:"Italian",Rätoromanisch:"Romansh",Türkisch:"Turkish",Englisch:"English",Spanisch:"Spanish",Niederländisch:"Dutch",Tigrinya:"Tigrinya",Arabisch:"Arabic",Afrikaans:"Afrikaans",Zulu:"Zulu",Xhosa:"Xhosa",Portugiesisch:"Portuguese",Polnisch:"Polish",Schwedisch:"Swedish",Chinesisch:"Chinese (Mandarin in these examples)",Dänisch:"Danish",Malaiisch:"Malay",Tamil:"Tamil",Irisch:"Irish",Griechisch:"Greek",Quechua:"Quechua",Aymara:"Aymara",Dari:"Dari (a variety of Persian)",Paschto:"Pashto",Malagasy:"Malagasy",Ungarisch:"Hungarian",Hindi:"Hindi",Norwegisch:"Norwegian",Amazigh:"Amazigh / Berber",Dhivehi:"Dhivehi / Maldivian",Swahili:"Swahili",Luganda:"Luganda",Katalanisch:"Catalan","Mauritius-Kreolisch":"Mauritian Creole",Russisch:"Russian",
};
