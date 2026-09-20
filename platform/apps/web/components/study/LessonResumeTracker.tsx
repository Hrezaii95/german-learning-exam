"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {useStudy} from "./StudyProvider";

/** Record the lesson actually visited; saved quiz state supplies the section and position. */
export function LessonResumeTracker() {
  const pathname=usePathname();
  const study=useStudy();
  const ready=study?.ready;
  const update=study?.update;
  useEffect(()=>{
    const match=pathname?.match(/(?:^|\/)lessons\/(0[1-9]|1[0-2])(?:\/|$)/);
    if(ready && update && match) update(old=>old.lastLesson===Number(match[1])?old:{...old,lastLesson:Number(match[1])});
  },[pathname,ready,update]);
  return null;
}
