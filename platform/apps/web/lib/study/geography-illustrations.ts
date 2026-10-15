import {countries,countryName,type Country} from "./countries";

/** Only registered names may acquire a flag; bare names require a country row. */
export function countryForVocabularyIllustration(word:string,category:string):Country|undefined{
  const normalized=word.normalize("NFC").trim().replace(/\s+/gu," ");
  return countries.find(country=>countryName(country)===normalized)
    ??(category==="Country"?countries.find(country=>country.name===normalized):undefined);
}

const compassRing="M50 13a37 37 0 1 0 .1 0M50 13v8m37 29h-8M50 87v-8M13 50h8";
const directionNeedles:Readonly<Record<string,string>>={
  "der Norden":"M50 73V27m-11 13 11-13 11 13",
  "der Nordosten":"M34 66 67 33M50 34l17-1-1 17",
  "der Osten":"M27 50h46M60 39l13 11-13 11",
  "der Südosten":"M34 34 67 67M66 50l1 17-17-1",
  "der Süden":"M50 27v46M39 60l11 13 11-13",
  "der Südwesten":"M66 34 33 67M34 50l-1 17 17-1",
  "der Westen":"M73 50H27m13-11L27 50l13 11",
  "der Nordwesten":"M66 66 33 33m1 17-1-17 17 1",
};

const globe="M50 12a38 38 0 1 0 .1 0M13 50h74M21 28h58M21 72h58M50 12q-27 38 0 76M50 12q27 38 0 76";
const geographyPaths:Readonly<Record<string,string>>={
  "die Insel":"M9 81q10-7 20 0t20 0t20 0t20 0M14 91q9-6 18 0t18 0t18 0t18 0M17 70q30-20 66 0M50 65q-4-22 3-43M53 25Q28 7 20 30q18-9 31 0M54 25Q77 6 84 30q-17-9-29 1M53 25Q40 14 40 10M55 25q12-14 11-17",
  "die Halbinsel":"M12 15h25l7 24 22 8 16 22-12 14-17-9-8-20-20-2-13-15M58 18q9-6 18 0t15 0M62 30q9-6 18 0M12 88q9-6 18 0t18 0",
  "Europa":"M50 12a38 38 0 1 0 .1 0M17 64l8-20 12-4 3-13 12-11 8 3-8 14 9 4 8-4 13 8-7 10-11 1-8 12-7-4-3 12-8-8-3-13-10 2-4 12ZM34 29l-8 10-3-8 6-10M51 73l6 11M67 64l8 8",
  "Asien":"M50 12a38 38 0 1 0 .1 0M19 34l13-8 14 3 9-8 17 4 10 13-9 6 7 9-11 3-4 18-9-14-10 2-7-11-12-2-8-15ZM49 63l9 13 10 1M78 62l6 10M72 80l7 5",
  "Nordamerika":"M50 12a38 38 0 1 0 .1 0M22 31l16-10 15 3 10-6 12 8-4 12-12 1-5 13-11 2 1 12 16 12-1 9-12-13-13-6-5-20-12-9ZM73 17l6 8-5 7-7-7M64 64l9 3",
  "Südamerika":"M50 12a38 38 0 1 0 .1 0M35 22l16-3 9 11 13 6-7 16-8 8-5 18-7 8-5-15-2-14-9-12-1-14Z",
  "Afrika":"M50 12a38 38 0 1 0 .1 0M33 24l27-2 9 10 8 6-10 8-3 18-10 18-10-3-4-19-13-9-3-15ZM75 66l4 6-5 10",
  "der Kontinent":globe,
  "die Welt":globe,
};

/** Original line art uses the shared 100 × 100 Home illustration coordinate system. */
export function geographyIconPath(word:string):string|undefined{
  const normalized=word.normalize("NFC").trim().replace(/\s+/gu," ");
  const needle=Object.hasOwn(directionNeedles,normalized)?directionNeedles[normalized]:undefined;
  if(needle)return `${compassRing}${needle}`;
  return Object.hasOwn(geographyPaths,normalized)?geographyPaths[normalized]:undefined;
}
