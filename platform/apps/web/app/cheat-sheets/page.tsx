import {ShellLayout} from "@/components/shell/ShellLayout";
import {SubjectDirectory} from "@/components/study/SubjectInfographic";
import {LegacyCountryRedirect} from "@/components/study/StaticSheetRedirect";
import {loadSubjectSheets} from "@/lib/study/subject-sheets.server";
import "./subjects/subjects.css";
import "./subjects/plurals.css";

export const metadata={title:"Cheat sheets",description:"Browse the complete illustrated German vocabulary catalogue, vocabulary by subject and topic workshops."};

export default function CheatSheetsPage(){
  const subjects=loadSubjectSheets().map(sheet=>({id:sheet.id,label:sheet.label,count:sheet.items.length,families:new Set(sheet.items.map(item=>item.cardId)).size}));
  return <><LegacyCountryRedirect/><ShellLayout current="cheat-sheets"><SubjectDirectory subjects={subjects} workshops/></ShellLayout></>;
}
