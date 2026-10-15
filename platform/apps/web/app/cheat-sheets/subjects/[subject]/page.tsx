import {notFound} from "next/navigation";
import {ShellLayout} from "@/components/shell/ShellLayout";
import {SubjectInfographic} from "@/components/study/SubjectInfographic";
import {subjectSheets} from "@/lib/study/subject-sheets";
import {loadSubjectSheets,loadSubjectVocabulary} from "@/lib/study/subject-sheets.server";
import "../subjects.css";
import "../plurals.css";

export const dynamicParams=false;
export function generateStaticParams(){return subjectSheets.map(sheet=>({subject:sheet.id}));}

type Props={params:Promise<{subject:string}>};
export async function generateMetadata({params}:Props){
  const {subject}=await params;
  const sheet=subjectSheets.find(item=>item.id===subject);
  if(!sheet)return {};
  return {title:`${sheet.label} · Illustrated vocabulary`,description:`German ${sheet.label.toLocaleLowerCase()} vocabulary, illustrated and grouped by article, with plurals, audio and examples.`};
}

export default async function Page({params}:Props){
  const {subject}=await params;
  const sheet=loadSubjectSheets().find(item=>item.id===subject);
  if(!sheet)notFound();
  return <ShellLayout current="cheat-sheets"><SubjectInfographic sheet={sheet} allItems={loadSubjectVocabulary()}/></ShellLayout>;
}
