import {buildPluralMatrix} from "./plural-patterns";
import {studyConcepts,type StudyConcept} from "./scope";
import {subjectVocabularyGroups,type SubjectVocabularyItem} from "./subject-sheets";

export type SheetGrouping="subject"|"gender"|"plural";
export const DEFAULT_GROUP_ORDER:readonly SheetGrouping[]=["subject","gender","plural"];

/** Store every dimension, including disabled ones, so re-enabling restores its place. */
export function normalizeGroupOrder(value:unknown):SheetGrouping[]|undefined{
  if(!Array.isArray(value)||value.length!==DEFAULT_GROUP_ORDER.length)return undefined;
  if(!value.every((entry):entry is SheetGrouping=>DEFAULT_GROUP_ORDER.includes(entry)))return undefined;
  return new Set(value).size===DEFAULT_GROUP_ORDER.length?[...value]:undefined;
}

export function getActiveGroupOrder(browse:{subjects?:boolean;gender?:boolean;view?:"illustrated"|"plurals";groupOrder?:readonly SheetGrouping[]}):SheetGrouping[]{
  const order=normalizeGroupOrder(browse.groupOrder)??DEFAULT_GROUP_ORDER;
  return order.filter(group=>group==="subject"?browse.subjects===true:group==="gender"?browse.gender!==false:browse.view==="plurals");
}

export type SheetItemGroup={
  id:string;
  label:string;
  explanation?:string;
  tone?:SubjectVocabularyItem["tone"];
  subject?:StudyConcept;
  items:SubjectVocabularyItem[];
};

const sortItems=(items:readonly SubjectVocabularyItem[])=>[...items].sort((a,b)=>a.de.localeCompare(b.de,"de")||a.id.localeCompare(b.id));

/**
 * Every level partitions its input: one source row occurs once, with all its forms.
 * A multi-tag word uses the first selected matching subject, then catalogue order.
 * A word with several plural patterns uses the first observed pattern in the
 * canonical pattern order. Its other supplied forms remain on the word card.
 */
export function groupSheetItems(items:readonly SubjectVocabularyItem[],dimension:SheetGrouping,preferredSubjects:readonly StudyConcept[]=[]):SheetItemGroup[]{
  const unique=[...new Map(items.map(item=>[item.id,item])).values()];
  if(dimension==="gender")return subjectVocabularyGroups(unique);
  if(dimension==="subject"){
    const ordered=[...new Set([...preferredSubjects,...studyConcepts.map(subject=>subject.id)])];
    const grouped=new Map<StudyConcept|"other",SubjectVocabularyItem[]>();
    for(const item of unique){
      const subject=ordered.find(id=>item.studyTags.concepts.includes(id))??"other";
      const group=grouped.get(subject)??[];
      group.push(item);
      grouped.set(subject,group);
    }
    const definitions:SheetItemGroup[]=ordered.flatMap(id=>{
      const group=grouped.get(id);
      const definition=studyConcepts.find(subject=>subject.id===id);
      return group?.length&&definition?[{id,label:definition.label,subject:id,items:sortItems(group)}]:[];
    });
    const other=grouped.get("other");
    if(other?.length)definitions.push({id:"other",label:"Other subjects",items:sortItems(other)});
    return definitions;
  }
  const matrix=buildPluralMatrix(unique);
  const assigned=new Set<string>();
  const groups:SheetItemGroup[]=matrix.rows.flatMap(row=>{
    const candidates=Object.values(row.cells).flat().map(entry=>entry.item);
    const members=candidates.filter(item=>{
      if(assigned.has(item.id))return false;
      assigned.add(item.id);
      return true;
    });
    return members.length?[{id:row.id,label:row.label,explanation:row.explanation,items:sortItems(members)}]:[];
  });
  if(matrix.pluralFormItems.length)groups.push({id:"already-plural",label:"Already shown as plural",explanation:"These cards supply a plural form; no singular-to-plural change is inferred.",tone:"plural",items:sortItems(matrix.pluralFormItems)});
  groups.push(...subjectVocabularyGroups(unique.filter(item=>item.tone==="plain")));
  return groups;
}
