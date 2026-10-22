/** Actual colour words share one palette across vocabulary and object descriptions. */
export const colourSwatches = [
  ["weiß","white","#ffffff"],["schwarz","black","#17212c"],["grau","grey","#818896"],
  ["rot","red","#da3848"],["blau","blue","#2866be"],["grün","green","#248149"],
  ["gelb","yellow","#f2cf37"],["orange","orange","#ee8834"],["braun","brown","#875439"],
] as const;

export function colourSwatchFor(word:string):string|undefined {
  return colourSwatches.find(([de])=>de===word)?.[2];
}
