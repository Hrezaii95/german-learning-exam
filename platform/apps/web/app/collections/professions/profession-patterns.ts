import type {ExtraProfessionRow} from "../../../lib/content/extra-professions";

export const professionPatterns = [
  {id:"same", title:"Same noun", cue:"Change the article", example:"13"},
  {id:"e", title:"Add -e", cue:"One extra ending", example:"24"},
  {id:"en", title:"Add -n / -en", cue:"Keep the ending audible", example:"46"},
  {id:"umlaut", title:"Vowel changes", cue:"Look for the umlaut", example:"23"},
  {id:"other", title:"Other changes", cue:"Learn the whole pair", example:"37"},
] as const;
export type ProfessionPattern = typeof professionPatterns[number]["id"];

const noun = (text:string) => text.replace(/^(der|die|das)\s+/u, "");
const plainVowels = (text:string) => text.replaceAll("ä","a").replaceAll("ö","o").replaceAll("ü","u").replaceAll("Ä","A").replaceAll("Ö","O").replaceAll("Ü","U");

/** These groups describe the supplied masculine plural forms, not universal rules. */
export function professionPatternIds(row:ExtraProfessionRow):ProfessionPattern[] {
  return [...new Set(row.masculine.map(form => {
    const one=noun(form.singular), many=noun(form.plural);
    if(one===many) return "same";
    if(many===`${one}e`) return "e";
    if(many===`${one}n` || many===`${one}en`) return "en";
    if(plainVowels(many)!==many && plainVowels(many).startsWith(plainVowels(one)) && !many.startsWith(one)) return "umlaut";
    return "other";
  }))];
}
