import type {SubjectVocabularyItem} from "./subject-sheets";

/** Keep the same source cue on an entry and its expanded word card. */
export function vocabularySourceQualifier(item:SubjectVocabularyItem):string{
  return (item.studyTags.sources??[item.studyTags.source])
    .filter(source=>source!=="course")
    .map(source=>source==="teacher-extra"?"Teacher extra":"Study extra").join(" · ");
}
