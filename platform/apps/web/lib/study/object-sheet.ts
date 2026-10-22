import {colourSwatches} from "./colour-swatches";
export {colourSwatches} from "./colour-swatches";

export const objectModels = [
  {de:"der Tisch",noun:"Tisch",en:"table",gender:"male",article:"der",indefinite:"ein",negative:"kein",pronoun:"er",material:"Holz",colour:"braun",icon:"▰"},
  {de:"das Buch",noun:"Buch",en:"book",gender:"neuter",article:"das",indefinite:"ein",negative:"kein",pronoun:"es",material:"Papier",colour:"blau",icon:"▤"},
  {de:"die Uhr",noun:"Uhr",en:"watch",gender:"female",article:"die",indefinite:"eine",negative:"keine",pronoun:"sie",material:"Metall",colour:"schwarz",icon:"◷"},
  {de:"die Flasche",noun:"Flasche",en:"bottle",gender:"female",article:"die",indefinite:"eine",negative:"keine",pronoun:"sie",material:"Glas",colour:"grün",icon:"♙"},
  {de:"der Schlüssel",noun:"Schlüssel",en:"key",gender:"male",article:"der",indefinite:"ein",negative:"kein",pronoun:"er",material:"Metall",colour:"grau",icon:"⚿"},
] as const;

export const materialModels = [
  ["Holz","wood","Der Tisch ist aus Holz."], ["Papier","paper","Das Buch ist aus Papier."],
  ["Metall","metal","Die Uhr ist aus Metall."], ["Plastik","plastic","Die Flasche ist aus Plastik."],
  ["Glas","glass","Die Flasche ist aus Glas."], ["Kunststoff","plastic / synthetic material","Die Brille ist aus Kunststoff."],
] as const;
export function objectSentences(index:number){
  const item=objectModels[index]??objectModels[0];
  return [`Das ist ${item.indefinite} ${item.noun}.`,`Das ist ${item.negative} ${item.noun}.`,`${item.article.charAt(0).toUpperCase()+item.article.slice(1)} ${item.noun} ist aus ${item.material}.`,`${item.pronoun.charAt(0).toUpperCase()+item.pronoun.slice(1)} ist ${item.colour}.`];
}
export const objectSheetSpeech=[...objectModels.flatMap((_,i)=>objectSentences(i)),...colourSwatches.map(c=>c[0]),...materialModels.flatMap(m=>[`das ${m[0]}`,m[2]]).filter(t=>t!=="das Kunststoff"),"der Kunststoff","Wie heißt das auf Deutsch?","Wie schreibt man das?","Noch einmal, bitte.","Vielen Dank!","Bitte schön."];
