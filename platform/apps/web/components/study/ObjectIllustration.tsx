import type {ObjectShape} from "@/lib/study/object-learning";

/** Original SVG objects: physical paint color is separate from the surrounding article color. */
export function ObjectIllustration({index,colour,shape="plain"}:{index:number;colour:string;shape?:ObjectShape}){
 return <svg className="object-illustration" viewBox="0 0 200 150" fill="none" stroke="#283740" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <ellipse cx="100" cy="136" rx="76" ry="7" fill="#283740" opacity=".08" stroke="none"/>
  {index===0&&<><path d="M42 77v52h12V80M146 77v52h12V80" fill={colour}/>{shape==="rund"?<ellipse cx="100" cy="63" rx="78" ry="29" fill={colour}/>:<path d="M40 34h119l24 42H17Z" fill={colour}/>}<path d="M18 76v8h164v-8M54 51h90"/></>}
  {index===1&&<><path d="M48 30h108v102H48Q35 126 35 117V42Q35 30 48 30Z" fill={colour}/><path d="M49 31v88h107M36 117h119M59 46h77M59 55h52"/><path d="M55 123h90" stroke="#fff"/></>}
  {index===2&&<><path d="M80 9h40l7 39H73ZM73 99h54l-7 43H80Z" fill={colour}/>{shape==="eckig"?<rect x="66" y="42" width="68" height="65" rx="8" fill={colour}/>:<circle cx="100" cy="74" r="38" fill={colour}/>}<circle cx="100" cy="74" r="29" fill="#fffdf5"/><path d="M100 53v22l16 10M100 46v4M100 99v4M71 74h4M125 74h4M140 70v10"/></>}
  {index===3&&<><path d="M85 15h30v32q22 13 22 33v50q0 8-8 8H71q-8 0-8-8V80q0-20 22-33Z" fill={colour}/><path d="M84 13h32v10H84Z" fill="#ddd"/><path d="M74 84h52v31H74Z" fill="#fffdf5"/><path d="M77 57q-7 7-7 21" stroke="#fffdf5"/></>}
  {index===4&&<><path d="M45 32a31 31 0 1 0 36 48l49 46 14-14-10-10 9-9-12-12-9 9-21-20A31 31 0 0 0 45 32Z" fill={colour}/><circle cx="62" cy="53" r="9" fill="#fffdf5"/></>}
 </svg>;
}

const officePaths=[
 "M22 23h56v63H22ZM22 38h56M35 16v15M65 16v15M33 49h7m12 0h7m-26 12h7m12 0h7m-26 12h7m12 0h7",
 "M24 12h53v78H24ZM30 20h41v58H30ZM48 84h6",
 "M50 20c-21 0-27 17-27 39s10 29 27 29 27-7 27-29-6-39-27-39ZM50 20v29M24 49h52M50 26v12M50 20V8",
 "M27 72 65 17l14 10-38 55-17 8ZM60 24l14 10M28 72l13 10M68 15l5-7 14 10-5 7",
 "M16 38h68v48H16ZM33 38V25a17 17 0 0 1 34 0v13M32 60h1m17 0h1m17 0h1M27 72h46",
 "M13 24h74v52H13ZM14 25l36 27 36-27M15 75l25-28M85 75 60 47",
 "M27 38V12h47v26M27 69H13V37h75v32H74M27 57h47v33H27ZM36 67h29M36 76h29M74 47h3",
];
export function OfficeIllustration({index}:{index:number}){return <svg className="office-illustration" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={officePaths[index]}/></svg>;}
