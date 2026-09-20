"use client";
import {useSearchParams} from "next/navigation";
import type {StudyUnit} from "@/lib/study/course-lessons";
import {CoursePatterns} from "./CourseStudy";

export function CourseHubAdditions({units,section,speech}:{units:StudyUnit[];section:string;speech:Record<string,string>}){
  const params=useSearchParams();
  return <CoursePatterns units={units} section={section} speech={speech} query={params.get("q")??""}/>;
}
export {CourseListening} from "./ListeningWorkspace";
