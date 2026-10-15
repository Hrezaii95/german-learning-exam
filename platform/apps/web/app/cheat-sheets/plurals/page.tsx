import {ShellLayout} from "@/components/shell/ShellLayout";
import {SubjectInfographic} from "@/components/study/SubjectInfographic";
import {loadSubjectVocabulary} from "@/lib/study/subject-sheets.server";
import "../subjects/subjects.css";
import "../subjects/plurals.css";

export const metadata={title:"All vocabulary · Illustrated cheat sheet",description:"The complete German vocabulary catalogue with lesson and subject filters, illustrations, article colours and optional gender and plural grouping."};

export default function Page(){
  const items=loadSubjectVocabulary();
  return <ShellLayout current="cheat-sheets"><SubjectInfographic allNouns sheet={{id:"objects",label:"All vocabulary",items}}/></ShellLayout>;
}
