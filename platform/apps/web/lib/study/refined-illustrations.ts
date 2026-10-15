/** Exact source meanings that need a more specific picture than a topic symbol. */
const drawings={
  station:"M13 40 50 17 87 40M18 37v49h64V37M11 87h78M43 24h14v11H43ZM28 49h12v13H28Zm32 0h12v13H60ZM43 52h14v25H43ZM46 59h8m-8 8h8M42 86l-4 8m20-8 4 8M40 91h20",
  platform:"M9 24h53l8 9H9ZM18 33v33M9 67h53v9H9ZM14 76v14m43-14v14M27 47h23v13H27ZM32 60v7m13-7v7M72 28h18v55H72ZM76 34h10v24H76ZM72 69h18M76 77h1m8 0h1M69 91h24",
  rails:"M42 10 17 91m42-81 25 81M42 10h17M36 25h29M31 40h39M27 55h48M22 71h58M17 87h68M46 11 26 91m29-80 20 80",
  blueprint:"M14 23h59v58H23q-11 0-11-9t11-9h50M23 23v40M31 34h26v20H31ZM44 34v20M31 44h26M66 15l21 9-25 59-21-9ZM64 29l7 3m-11 7 7 3m-11 7 7 3m-11 7 7 3m-11 7 7 3",
  classroom:"M13 13h74v43H13ZM22 24h33m-33 11h46M24 55v10m52-10v10M10 73h34v9H10Zm46 0h34v9H56ZM16 82v10m22-10v10m24-10v10m22-10v10M21 66h12m34 0h12",
  restaurant:"M17 37h66v52H17ZM11 24h78l-6 14q-8 7-16 0-8 7-17 0-9 7-17 0-8 7-16 0ZM26 12h48v12M28 48v13m7-13v13m-7-7h7m-3 7v13M47 49q-10 6-4 13h4V49v25M59 52h15v37H59ZM21 89h66M61 69h2",
  newspaper:"M15 19h62v64q0 7-7 7H19q-7 0-7-7V32h3M24 29h43v9H24ZM24 47h17v19H24Zm24 0h18m-18 9h18M24 76h37M72 77l-3-9 13-38 10 4-13 38ZM78 41l9 3",
  writing:"M18 12h40l15 15v62H18ZM58 12v16h15M28 36h28m-28 11h20M28 75h27M28 82h37M44 66l5-14 31-32 9 9-31 32ZM49 52l9 9M79 21l9 9",
  secretary:"M10 68h80v10H10ZM17 78v14m66-14v14M17 22h44v33H17ZM23 28h32v21H23ZM39 55v12M29 63h20M70 35h18v30H70ZM75 40h8v7h-8ZM75 53h2m5 0h2m-9 6h2m5 0h2M72 31q-5-14 3-16h8q8 2 3 16",
  register:"M16 57h68v31H16ZM22 39h51l11 18H16ZM28 31V12h35v19H28ZM34 19h23v7H34ZM28 46h5m6 0h5m6 0h5m6 0h5M23 67h54v14H23ZM45 71h11M72 38V25h13v13M73 18h10",
  mill:"M66 34a25 25 0 1 0 .1 0M66 43a16 16 0 1 0 .1 0M66 34v50m-25-25h50M49 42l34 34m0-34L49 76M66 54a5 5 0 1 0 .1 0M17 88V21M17 61Q1 56 8 43q11 3 9 18M17 46Q2 41 9 28q11 3 8 18M18 68q16-5 10-18-11 3-10 18M18 39q16-5 10-18-11 3-10 18M17 24V11M8 89h23",
  parent:"M35 14a12 12 0 1 0 .1 0M13 84V63q0-24 22-24t22 24v21M25 53v31m20-31v31M74 43a9 9 0 1 0 .1 0M59 89V78q0-17 15-17t15 17v11M57 63l9 8M70 75v14m10-14v14",
  elder:"M47 13a14 14 0 1 0 .1 0M21 89V69q0-24 26-24t26 24v20M35 58v31m24-31v31M37 26h8v7h-8Zm12 0h8v7h-8Zm-4 3h4M73 66q13-4 13 7v18M40 50l7 8 7-8",
  olderPair:"M29 17a12 12 0 1 0 .1 0M71 17a12 12 0 1 0 .1 0M11 85V66q0-22 18-22t18 22v19M53 85V66q0-22 18-22t18 22v19M21 27h6v6h-6Zm10 0h6v6h-6Zm-4 3h4M63 27h6v6h-6Zm10 0h6v6h-6Zm-4 3h4M21 54v31m16-31v31m26-31v31m16-31v31M82 65q13-4 13 7v18",
  siblings:"M28 20a12 12 0 1 0 .1 0M72 20a12 12 0 1 0 .1 0M9 87V66q0-23 19-23t19 23v21M53 87V66q0-23 19-23t19 23v21M19 55v32m18-32v32m26-32v32m18-32v32M47 64h6",
  child:"M29 15a11 11 0 1 0 .1 0M12 76V58q0-21 17-21t17 21v18M21 50v26m16-26v11M69 43a10 10 0 1 0 .1 0M52 90V76q0-16 17-16t17 16v14M61 73v17m16-17v17M45 60l12 8M69 22v9m-5-5 5 5 5-5",
  spouse:"M62 13a13 13 0 1 0 .1 0M42 83V64q0-22 20-22t20 22v19M54 55v28m17-28v28M24 57a14 14 0 1 0 .1 0M39 69a14 14 0 1 0 .1 0M21 41l3-6 4 6",
  adult:"M50 13a16 16 0 1 0 .1 0M20 89V73q0-27 30-27t30 27v16M34 61v28m32-28v28M40 48l10 11 10-11",
  parents:"M28 15a11 11 0 1 0 .1 0M72 15a11 11 0 1 0 .1 0M10 82V61q0-22 18-22t18 22M54 61q0-22 18-22t18 22v21M50 51a8 8 0 1 0 .1 0M36 91V79q0-15 14-15t14 15v12M20 52v30m60-30v30M45 76v15m10-15v15",
} as const;

const terms=new Map<string,keyof typeof drawings>();
function register(icon:keyof typeof drawings,...words:string[]){for(const word of words)terms.set(word,icon);}
register("station","der Bahnhof","der Hauptbahnhof");
register("platform","der Bahnsteig");
register("rails","das Gleis");
register("blueprint","der Architekt","die Architektin");
register("classroom","der Kursraum","die Klasse","der Unterricht");
register("restaurant","das Restaurant");
register("newspaper","der Journalist","die Journalistin");
register("writing","der Schriftsteller","die Schriftstellerin");
register("secretary","der Sekretär","die Sekretärin");
register("register","der Kassierer","die Kassiererin");
register("mill","der Müller","die Müllerin");
register("parent","die Mutter","der Vater","die Mama","der Papa");
register("elder","die Oma","der Opa","die Großmutter","der Großvater");
register("olderPair","die Großeltern");
register("siblings","die Schwester","der Bruder","die Geschwister");
register("child","der Sohn","die Tochter","das Enkelkind","der Enkel","die Enkelin");
register("spouse","der Ehemann","die Ehefrau");
register("adult","der Mann","die Frau");
register("parents","die Eltern");

/** Each refinement is explicitly registered; spelling fragments never infer a picture. */
export function refinedIllustrationPath(word:string):string|undefined{
  const icon=terms.get(word.normalize("NFC").trim().replace(/\s+/gu," "));
  return icon?drawings[icon]:undefined;
}
