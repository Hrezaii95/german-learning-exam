import type {WordCard,WordRow} from "../content/word-card-types";
import {studyUnits} from "./course-lessons";

export type ObjectVocabularyIcon = "watch" | "car" | "mobile" | "book" | "pencil" | "glasses" | "bottle" | "camera" | "necklace" | "pen" | "key" | "bag" | "thing" | "lighter" | "wallet" | "tissue" | "umbrella" | "rain" | "jacket" | "match" | "brush" | "soap" | "towel" | "hairdryer" | "sun" | "sunglasses" | "telephone" | "house";
export type ObjectVocabularyTone = "male" | "female" | "neuter" | "plural";
export type ObjectVocabularyEntry = {
  id:string;de:string;plural:string|null;meaning:string;tone:ObjectVocabularyTone;
  icon:ObjectVocabularyIcon;card:WordCard;row:WordRow;
};

const icons:Record<string,ObjectVocabularyIcon>={
  "l5-uhr":"watch","l5-auto":"car","l5-handy":"mobile","l5-buch":"book",
  "l5-bleistift":"pencil","l5-brille":"glasses","l5-flasche":"bottle","l5-kamera":"camera",
  "l5-kette":"necklace","l5-kugelschreiber":"pen","l5-schluessel":"key","l5-tasche":"bag",
  "l5-ding":"thing","l5-feuerzeug":"lighter","l5-geldbeutel":"wallet","l5-taschentuch":"tissue",
  "l5-regenschirm":"umbrella","l5-regen":"rain","l5-jacke":"jacket","l5-streichholz":"match",
  "l5-buerste":"brush","l5-seife":"soap","l5-handtuch":"towel","l5-foehn":"hairdryer",
  "l5-sonne":"sun","l5-sonnenbrille":"sunglasses","l5-telefon":"telephone","l5-haus":"house",
};

/** The Lesson 5 object collection, resolved against the supplied merged word cards. */
export function objectVocabulary(cards:WordCard[]):ObjectVocabularyEntry[]{
  const words=studyUnits.find(unit=>unit.number===5)?.words?.filter(word=>word.category==="Objects")??[];
  return words.flatMap(word=>{
    const card=cards.find(candidate=>candidate.rows.some(row=>row.singular.text===word.de));
    const row=card?.rows.find(candidate=>candidate.singular.text===word.de);
    const icon=icons[word.id];
    if(!card||!row||!icon||row.singular.tone==="plain")return [];
    return [{id:word.id,de:row.singular.text,plural:row.plurals.map(form=>form.text).join(" / ")||null,
      meaning:row.meaning,tone:row.singular.tone,icon,card,row}];
  });
}
