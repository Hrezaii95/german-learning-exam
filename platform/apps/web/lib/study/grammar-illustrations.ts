/**
 * Small, original concept drawings for vocabulary that cannot be pictured as an
 * everyday object. They share HomeIllustration's 100 × 100 line-art canvas.
 * No word fragment is used as a substitute for an illustration.
 */
function circle(x:number,y:number,r:number):string{
  return `M${x-r} ${y}a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 ${-r*2} 0`;
}

function person(x:number,y:number,size=1):string{
  const r=8*size;
  return `${circle(x,y,r)}M${x-14*size} ${y+38*size}v${-9*size}q0 ${-16*size} ${14*size} ${-16*size}t${14*size} ${16*size}v${9*size}`;
}

function dots(points:readonly (readonly [number,number])[],r=3):string{
  return points.map(([x,y])=>circle(x,y,r)).join("");
}

const sparkle="M76 10v18m-9-9h18M18 24v10m-5-5h10";
const tick="M27 52l15 15 32-37";
const cross="M29 29l42 42M71 29 29 71";
const smile="M50 15a35 35 0 1 0 .1 0M36 42h.1M64 42h.1M32 60q18 18 36 0";
const frown="M50 15a35 35 0 1 0 .1 0M36 42h.1M64 42h.1M33 69q17-18 34 0";
const star="M50 14l11 23 26 4-19 18 4 26-22-12-22 12 4-26-19-18 26-4Z";
const thumb="M17 43h15v41H17ZM32 47l17-18 3-17q16-3 13 14l-3 16h17q12 0 8 12l-9 27H32";
const rings="M38 32a23 23 0 1 0 .1 0M62 32a23 23 0 1 0 .1 0M25 25l6-9 7 9M62 25l7-9 6 9";
const suitcase="M16 33h68v51H16ZM36 33V19h28v14M16 49q34 16 68 0M44 51h12v13H44Z";
const plate="M50 35a25 25 0 1 0 .1 0M50 43a17 17 0 1 0 .1 0M13 34v24m7-24v24M13 48h7m-4 10v30M88 34q-10 9-7 24h7V34v54";
const bowl="M17 58h66q-5 27-33 27T17 58ZM29 88h42";
const threeDots=dots([[33,44],[50,44],[67,44]]);
const manyDots=dots([[29,24],[43,24],[57,24],[71,24],[22,37],[36,37],[50,37],[64,37],[78,37],[29,50],[43,50],[57,50],[71,50]]);
const apple="M50 39q-23-15-25 11-3 26 15 30 6 1 10-2 4 3 10 2 18-4 15-30-2-26-25-11ZM50 39V23M51 33q5-14 20-9-3 12-20 9";
const clock="M50 17a33 33 0 1 0 .1 0M50 26v6m0 36v6M26 50h6m36 0h6M50 35v17l14 8";
const question="M72 24q0-9 9-9t9 9q0 6-7 10-3 2-3 7M80 50h.1";
const receiver=`${person(24,35,.8)}${person(74,35,.8)}M38 43h20m-7-7 7 7-7 7`;
const giving=`${person(21,32,.7)}${person(79,32,.7)}M34 55h32m-7-7 7 7-7 7M42 23h16v16H42ZM50 23v16m-8-9h16`;
const myPossession=`${person(27,27,1)}M54 52h29v29H54ZM63 52v-8h11v8M40 48l17 12m-10 1 10-1-3-9`;
const yourPossession=`${person(74,27,1)}M17 52h29v29H17ZM26 52v-8h11v8M60 48 44 60m3-10-3 10 10 1`;
const mapPin="M50 16C21 16 23 43 50 74c27-31 29-58 0-58ZM50 28a10 10 0 1 0 .1 0M23 82q27 12 54 0";
const joinedPeople=`${person(29,29,.9)}${person(71,29,.9)}M15 76q35 15 70 0M41 59h18`;
const twoPeople=`${person(28,28,1)}${person(72,28,1)}M11 81h78`;
const threePeople=`${person(19,28,.75)}${person(50,28,.75)}${person(81,28,.75)}M10 78h80`;
const openDoor="M23 15h52v72H23ZM23 15l34 12v60l-34-9ZM47 52v10M57 87h24M65 26h10";
const closedDoor="M23 14h54v74H23ZM31 22h38v58H31ZM57 52h6M16 88h68";
const tinyHouse="M12 49 38 28 64 49M19 44v40h38V44M31 84V63h14v21";

const paths=new Map<string,string>();
function register(path:string,...words:string[]):void{
  for(const word of words)paths.set(word,path);
}

// Descriptive qualities. Contrasts use objects or a visible change in state.
register(`M24 41 49 28l27 13v37L50 91 24 78ZM24 41l26 13 26-13M50 54v37M37 34l26 13v14${sparkle}`,"neu");
register("M22 23h51v64H22ZM22 23l9 7-4 13 8 9-7 13 6 12-12 10M40 32h22M40 45h22M40 58h13M59 71l4-6 6 8M73 23l7 5v55l-7 4","alt");
register("M50 40q-16-30-28-11-9 15 13 22-30 12-12 26 14 10 27-11 13 21 27 11 18-14-12-26 22-7 13-22-12-19-28 11ZM50 41a11 11 0 1 0 .1 0M50 65v27M50 82q14-14 25-8M82 9v16m-8-8h16","schön");
register("M36 20q28-12 30 13M66 33q-17-18-27-3l5 14q13 7 22-11ZM52 44q18 30 0 46M58 69q-18-13-26-4 9 15 26 11M68 16l9-7m-3 18h13M20 40l8-7m-8 18h9","hässlich");
register("M13 87h76M19 87V31l25-16v72M44 87V44l36-12v55M27 35v12m9-18v12M27 59v12m9-18v12M54 50h16M54 63h16M54 76h16M64 12v10m-5-5h10","modern");
register("M20 43 58 15l14 16-38 28ZM34 59l43 19-6 12-43-19ZM44 51l29-6 3 13-30 7M29 48a5 5 0 1 0 .1 0M73 45v-9M58 15l-4-6","praktisch");
register("M31 60l19-26 12 7-3 14 23 12q10 6 6 16H31l-8-10 8-13ZM31 73h54M42 48l13 9M9 36h24M5 49h19M10 62h11","schnell");
register("M35 30a15 15 0 0 1 30 0M39 30a11 11 0 0 1 22 0M29 30h42l15 57H14ZM37 48h26M44 41v14m12-14v14M23 16l-8-7m62 7 8-7","schwer");
register(`${star}M18 15l6 9M82 15l-6 9M8 70l11-3m62 0 11 3`,"toll","prima","super");
register("M14 39h18v36H14ZM41 39h18v36H41ZM68 39h18v36H68ZM11 84h78M17 24h12m15 0h12m15 0h12","normal");
register("M50 27q-29 0-29 29t29 29q29 0 29-29T50 27ZM32 47l8-4m22 5 6 5M36 66q8-6 15 2t14-2M26 28l41-13 9 17-40 9M32 25l3-13 21-6 11 9","komisch");
register(`M23 89V75q-13-12-10-30 4-25 28-25 24 0 28 25v17l10 12H64v15M29 35q-11 15 4 18 14 2 12-13-1-10-12-5-14 9 4 18 17 8 18-10M75 19l10-8m-8 23h13`,"blöd");
register(`${smile}M17 15l-8-7m74 7 8-7M8 35l7 2m70 0 7-2`,"lustig");
register(`${frown}M11 82l7 7m64 0 7-7`,"schlecht");
register("M50 13l7 15 17 3-12 12 2 17-14-8-14 8 2-17-12-12 17-3ZM12 69a8 8 0 1 0 .1 0M88 69a8 8 0 1 0 .1 0M50 60v27M12 85h76M50 4v3m-28 8 5 5m46 0 5-5","besonders");
register(`${plate}M38 13q-5 7 0 13m12-17q-5 8 0 16m12-12q-5 7 0 13`,"lecker");
register("M14 35h10v30H14ZM24 43h12v14H24ZM36 49h28M64 43h12v14H64ZM76 35h10v30H76ZM40 74l8 8 19-22M50 11v13m-6-6h12","fit");
register("M25 89V73q-13-11-12-28 2-25 28-25 25 0 28 24v17l11 12H65v16M32 37q-10-4-10 7 0 8 10 7m0-14q4-10 13-4 11-4 13 6 12 4 5 15-1 11-12 8-9 7-15-2-11 3-13-7M43 34v29m-9-21 9 7 11-7M76 13v13m-6-7h12","intelligent");
register(`${person(47,38,1)}M25 84q22 12 44 0M39 55q8 7 16 0M69 33q-5-10 5-12 2-12 13-7 9-2 10 7M78 45l12-9m-9 0 9 0-2 9M15 20v13m-6-6h12`,"sorgenfrei");
register("M50 14a36 36 0 1 0 .1 0M50 23a27 27 0 1 0 .1 0M31 50l13 13 27-29M50 8v8M50 84v8M8 50h8m68 0h8","perfekt");
register(`${person(28,43,1)}M57 11h24q8 0 8 8v22q0 8-8 8H57q-8 0-8-8V19q0-8 8-8ZM59 28l8 8 13-16M48 56a3 3 0 1 0 .1 0M42 63a2 2 0 1 0 .1 0`,"sicher");
register("M17 27h51v41q0 17-25 17T17 68ZM68 34h9q17 16-9 23M48 27l-9 17 13 10-15 21M12 91h64","kaputt");
register(`${bowl}${threeDots}`,"wenig");
register(`${bowl}${manyDots}`,"viel");
register("M11 67h20v20H11ZM40 49h20v38H40ZM69 31h20v56H69ZM14 43h40m-9-9 9 9-9 9M74 12h14m-6-6 6 6-6 6","nächst-");
register(`${openDoor}M66 52h25m-7-7 7 7-7 7`,"geöffnet");
register(`${closedDoor}M38 34h23v12H38Z`,"geschlossen");
register("M14 68a36 36 0 0 1 72 0M22 68a28 28 0 0 1 56 0M50 68l22-23M17 73v7m66-7v7M31 39l4 6m15-16v8m19 2-4 6M46 68a4 4 0 1 0 8 0M31 87h38","ziemlich");
register("M14 38h28l3 25q-13 13-27-1ZM58 38h28l-4 24q-14 14-27 1ZM42 44q8-7 16 0M14 41 8 31m78 10 6-10M32 76q18 10 36 0","cool");
register("M14 44h28l3 22q-13 12-27-1ZM58 44h28l-4 21q-14 13-27 1ZM42 49q8-7 16 0M32 78q18 10 36 0M50 8v20m-10-10h20M19 22l4 7m54 0 4-7","supercool");
register(rings,"verheiratet");
register("M34 32a23 23 0 1 0-5 45M29 77l8-8-5-11M66 32a23 23 0 0 1 6 45M72 77l-9-8 5-11M47 17l8 15-10 14 11 14-10 15 7 12","geschieden");
register(joinedPeople,"zusammen","mit");
register(tick,"richtig","ja");
register(cross,"falsch","nein");
register(`${person(50,29,1.3)}M16 88h68M13 38v17m74-17v17`,"allein");
register(`${suitcase}M50 36v8M24 84v6m52-6v6M78 8v15m-7-8h14`,"beruflich");
register(`${clock}M50 6v11M50 83v11M8 89h84M50 79v10m-6-6 6 6 6-6`,"jetzt");
register(`M17 50h66M24 32a6 6 0 1 0 .1 0M44 32a6 6 0 1 0 .1 0M64 32a6 6 0 1 0 .1 0M24 76a6 6 0 1 0 .1 0M44 76a6 6 0 1 0 .1 0M65 69l12 12m0-12L65 81`,"minus");
register("M50 20v60M20 50h60M20 20a5 5 0 1 0 .1 0M80 80a5 5 0 1 0 .1 0","plus");
register("M14 53h72m-9-9 9 9-9 9M26 24a17 17 0 1 0 .1 0M26 29v13l8 5M15 77h12m9 0h12m9 0h12m9 0h9","noch");
register(`${mapPin}M50 5v10m-5-6 5 6 5-6M14 87h10m52 0h10`,"hier");
register(`${apple}M14 26V14h16M70 14h16v12M14 74v12h16m40 0h16V74`,"nur");
register("M14 69h72M19 62v14m15-14v14m15-14v14m15-14v14m15-14v14M26 28q12-10 24 0t24 0M26 43q12-10 24 0t24 0M44 80h11","etwa","so");
register("M9 26 36 17 63 26l28-9v62L63 88 36 79 9 88ZM36 17v62M63 26v62M24 31q-14 0-10 12l10 13 10-13q4-12-10-12ZM52 43q-12 0-9 10l9 11 9-11q3-10-9-10ZM79 27q-12 0-9 10l9 11 9-11q3-10-9-10","überall");
register("M11 14h78v53H48L28 84V67H11ZM41 24l10-2 5 8 11 3-4 9 3 11-12 5-12-3-5-10-9-5 6-10 7 2Z","deutschsprachig");
register(`M22 83q0-17 18-17t18 17${person(40,47,.6)}M13 13h71v31H60L47 56V44H13ZM28 29h16m-6-6 6 6-6 6M54 29h15m-6-6 6 6-6 6M47 17v8`,"warum");
register(`${person(24,40,.75)}M59 32q-17-19-26-1-6 13 26 36 32-23 26-36-9-18-26 1Z`,"gern");
register("M26 71V45q0-8 7-8t7 8V24q0-8 7-8t7 8v24q0-8 7-8t7 8v4q0-8 7-8t7 8v16q0 20-25 20-17 0-24-13L16 60q-4-9 3-11 4-1 7 6M14 20h12m-6-6v12","mal");
register("M8 55q42-46 84 0-42 46-84 0ZM50 39a16 16 0 1 0 .1 0M50 47a8 8 0 1 0 .1 0M50 7v13M22 15l7 10m42 0 7-10M12 31l8 4m60 0 8-4","interessant");
register(`${person(27,29,1)}M72 45a18 18 0 1 0 .1 0M64 38l8-12 8 12M54 84h36`,"ledig");
register("M14 19h18v18H14ZM14 63h18v18H14ZM32 28h13v22h17M32 72h13V50M57 43l7 7-7 7M80 37a13 13 0 1 0 .1 0","also");
register(`${suitcase}M11 12l78 78M15 89h19m32 0h19`,"arbeitslos");
register("M13 30l19-9 14 6 14-5 27 12-4 18-18 7-8 19-19-5-12-17-13-6ZM70 34q-19 3-15 18 4 13 17 9-21-3-13-16M76 50l2 3 3-1-2 3 1 3-3-2-3 1 1-3-2-3 3 1","türkisch");

// Function words use small relationship diagrams instead of arbitrary badges.
register("M20 18a10 10 0 1 0 .1 0M20 62a10 10 0 1 0 .1 0M30 28h17v22h22M30 72h17V50M62 43l7 7-7 7M81 40a10 10 0 1 0 .1 0","und");
register("M15 20h43v64H15ZM15 20l15 12v40L15 84M42 51h46m-10-10 10 10-10 10","aus");
register("M26 28a12 12 0 1 0 .1 0M26 66a12 12 0 1 0 .1 0M59 47h27m-13-13v27M40 40l10 10-10 10","auch");
register("M27 26h46v48H27ZM17 16l66 68M16 84l17-17","nicht");
register("M18 68h14v18H18ZM43 46h14v40H43ZM68 17h14v69H68ZM12 88h76M18 30h20m-8-8 8 8-8 8","sehr");
register(thumb,"gut");
register(`${smile}M68 14h22v21H78l-7 7V35h-3M75 20q3-5 6 0 3-5 6 0 1 4-6 9-7-5-6-9Z`,"Gut, danke.");
register(`${frown}M15 87h21m7 0h10`,"Nicht so gut.");
register(`${smile}M50 5v7m-27 3-5-6m59 6 5-6M67 79q5-9 11 0 5-9 11 0 2 7-11 15-13-8-11-15Z`,"Sehr gut, danke.");
register("M32 20l8 16 18 2-13 13 3 18-16-8-16 8 3-18-13-13 18-2ZM74 48l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2ZM70 10v17m-8-8h16","Auch super.");
register("M15 16h43v28H41L31 54V44H15ZM45 66l20-11 21 11v21L65 97 45 87ZM45 66l20 10 21-10M65 76v21M37 50l14 9m-11 1 11-1-4-10","es");
register("M12 68l20-13 17 4 16-7q9-1 10 7l-24 9M12 83l21 7 42-16 15-19q6-9-2-12l-21 19M12 68v15M40 28q-14-17-23-2-5 10 23 28 28-18 23-28-9-15-23 2Z","bitte");
register(`${giving}M74 43l5 6 5-6M79 49v8`,"Ihnen");
register("M18 39h64L73 84H27ZM31 39l8-20m22 0 8 20M23 55h54M12 14l76 76","kein","keine");
register("M33 16h51v70H33M33 16l16 13v44L33 86M9 51h51m-10-10 10 10-10 10","in");
register(`${threePeople}M15 10h70m-8-6 8 6-8 6M50 12v9`,"ihr");
register(`${threePeople}M8 71q42 27 84 0M12 59l-4 12 13-1m58 0 13 1-4-12`,"wir");
register("M13 26h24v20h25M13 74h24V54h25M75 39a12 12 0 1 0 .1 0M52 40l-9 10 9 10M63 42l7 8-7 8M17 26h9m-9 48h9","aber");
register(`${mapPin}${question}`,"wo");
register("M11 13h77v47H63L49 74V60H11ZM29 29l20-9 20 9v18l-20 9-20-9ZM29 29l20 9 20-9M49 38v18","was");
register("M13 25h25v25H13ZM62 25h25v25H62ZM38 37h24M13 73h74M25 61v24m50-24v24M43 67h14m-14 11h14","als");
register(`${tinyHouse}${person(79,52,.7)}M67 88h22M62 52h4m-4 10h4`,"bei");
register("M21 29a12 12 0 1 0 .1 0M33 41h50m-10-10 10 10-10 10M21 62v20h61M74 74l8 8-8 8","von");
register("M50 88V54M50 54 22 26M50 54l28-28M22 26h18M22 26v18M78 26H60M78 26v18M44 88h12","oder");
register(`${giving}M42 82h16M50 74v16`,"für");
register("M12 35a4 4 0 1 0 .1 0M24 35a4 4 0 1 0 .1 0M36 47h20m-7-7 7 7-7 7M65 22a4 4 0 1 0 .1 0M81 22a4 4 0 1 0 .1 0M65 38a4 4 0 1 0 .1 0M81 38a4 4 0 1 0 .1 0M65 54a4 4 0 1 0 .1 0M81 54a4 4 0 1 0 .1 0M65 70a4 4 0 1 0 .1 0M81 70a4 4 0 1 0 .1 0M8 83h84","mehr");
register("M21 15h58v74H21ZM32 34l6 6 12-14M57 34h11M32 56l6 6 12-14M57 56h11M32 77l6 6 12-14M57 77h11","fertig");
register(`${clock}M17 78l12 12 25-29M76 9l10 10m-10 0 10-10`,"schon");
register(yourPossession,"dein","deine");
register("M16 28l15 15m0-15L16 43M33 15h29q21 0 21 21v7M74 35l9 8 8-8M36 68l13 13 29-32M9 61v19h14","doch");
register("M12 56h18v24H12ZM41 44h18v36H41ZM70 56h18v24H70ZM50 9v24m-8-8 8 8 8-8M10 89h80","welche");
register("M35 12h30v17l9 15v44H26V44l9-15ZM35 29h30M27 72h46M35 80h8m13 0h8M82 26v46m-4-36h8m-8 12h8m-8 12h8","ein bisschen");
register(`${bowl}M17 16l66 68M30 38h40`,"gar nicht");
register(apple,"ein","eine");
register("M12 34h21v21H12ZM39 34h21v21H39ZM67 34h21v21H67ZM14 72h39m-8-8 8 8-8 8M71 63v18m-7-9h14","dann");
register("M23 28q13-17 34-13 25 5 28 31M23 28v-17m0 17h17M77 74q-13 17-34 13-25-5-28-31M77 74v17m0-17H60M35 43h30v22H35ZM42 43v22","noch einmal");
register("M14 81l16-30 21 8 33-38M67 21h17v17M18 30h24M18 39h15M53 81h27m-8-8 8 8-8 8","weiter");
register(twoPeople,"zu zweit");
register(threePeople,"zu dritt");
register(`${person(27,35,.9)}M55 14h30v74H55ZM69 26a6 6 0 1 0 .1 0M60 63v-8q0-12 9-12t9 12v8M44 37h11m-6-5 6 5-6 5M42 80q10 10 20 0`,"selbst");
register("M14 16h72v39H61L48 69V55H14ZM24 73q12-7 26 2 14-9 27-2v18q-14-6-27 2-14-8-26-2ZM50 75v18M29 30h39M29 41h28","über");
register("M34 22h32v32H34ZM13 54h74v10H13ZM21 64v23m58-23v23M50 10v9m-4-4 4 4 4-4","auf");
register("M28 20a18 18 0 1 0 .1 0M28 25v14l10 5M46 38h36m-8-8 8 8-8 8M51 83 71 64l20 19M57 77v14h28V77M66 91V80h10v11","nach");

// Pronouns distinguish speaker, receiver, third person, possession and reflexion.
register(`${person(46,27,1.25)}M84 47 59 63m3-13-3 13 13 1`,"ich");
register(receiver,"du");
register(`${person(19,24,.6)}${person(74,33,1.1)}M31 40h25m-8-8 8 8-8 8M13 69h14`,"er");
register(`${person(16,27,.6)}${person(59,26,.8)}${person(82,54,.6)}M28 41h16m-6-6 6 6-6 6M45 81h46`,"sie");
register(`${receiver}M67 47l7 8 7-8M74 55v9M68 64l6 11 6-11`,"Sie");
register(giving,"dir","Und dir?");
register("M19 51l29-14 31 14v30L49 95 19 81ZM19 51l30 15 30-15M49 66v29M49 8v23m-8-8 8 8 8-8","das");
register(myPossession,"mein","meine");
register(`${person(48,27,1.25)}M10 62h26m-8-8 8 8-8 8M67 80h19`,"mich");
register(`${yourPossession}M67 40l7 7 7-7M74 47v10`,"Ihr","Ihre");

// Questions and interjections keep the same fine line-art language.
register("M16 20h20v20H16ZM64 20h20v20H64ZM40 67h20v20H40ZM36 30h28m-7-7 7 7-7 7M26 40v13h24v14M74 40v13H50M44 22h12m-6-6v12","wie");
register(`${person(39,35,1.2)}${question}M17 88h48`,"wer");
register("M30 17C6 17 10 38 30 60c20-22 24-43 0-43ZM30 27a8 8 0 1 0 .1 0M30 63v17h53m-9-9 9 9-9 9M50 20h37M70 13h17v17","woher");
register("M50 13q-25 0-25 24 0 14 15 24v12h20V61q15-10 15-24 0-24-25-24ZM40 79h20M44 87h12M43 42l7 7 10-14M12 34h7m62 0h7M21 13l6 6m46 0 6-6","ah");
register("M50 12 91 84H9ZM50 34v25M47 70a3 3 0 1 0 6 0a3 3 0 1 0-6 0","Achtung!");

/** Exact registered vocabulary only; unknown words are left to other renderers. */
export function grammarIllustrationPath(word:string):string|undefined{
  return paths.get(word.normalize("NFC").trim().replace(/\s+/gu," "));
}
