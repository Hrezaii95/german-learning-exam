import {ShellLayout} from "@/components/shell/ShellLayout";
import {SubjectDirectory} from "@/components/study/SubjectInfographic";
import {loadSubjectSheets} from "@/lib/study/subject-sheets.server";
import "./subjects.css";
import "./plurals.css";

export const metadata={title:"Subject infographics",description:"Illustrated German vocabulary cheat sheets for every subject, with articles, plurals and audio."};

export default function Page(){
  const subjects=loadSubjectSheets().map(sheet=>({id:sheet.id,label:sheet.label,count:sheet.items.length,families:new Set(sheet.items.map(item=>item.cardId)).size}));
  return <ShellLayout current="subjects"><SubjectDirectory subjects={subjects}/></ShellLayout>;
}
