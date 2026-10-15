import {ShellLayout} from "@/components/shell/ShellLayout";
import {SubjectInfographic} from "@/components/study/SubjectInfographic";
import {loadSubjectSheets} from "@/lib/study/subject-sheets.server";
import "../subjects/subjects.css";
import "../subjects/plurals.css";

export const metadata={title:"Gender × plural patterns",description:"German noun plurals in a grid: singular der, die and das against plural endings, umlauts and other recorded changes."};

export default function Page(){
  const items=[...new Map(loadSubjectSheets().flatMap(sheet=>sheet.items).filter(item=>item.tone!=="plain").map(item=>[item.id,item])).values()];
  return <ShellLayout current="cheat-sheets"><SubjectInfographic allNouns sheet={{id:"objects",label:"Gender × plural patterns",items}}/></ShellLayout>;
}
