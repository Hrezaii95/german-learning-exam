"use client";

import { useSearchParams } from "next/navigation";
import {useEffect,useRef} from "react";
import {useStudyScope} from "@/components/study/StudyScope";
import {availableLessons} from "@/lib/study/scope";
import type {StudyUnit} from "@/lib/study/course-lessons";
import type { LearnerHubDefinition } from "@/lib/content/hub-types";
import { searchParamsToRecord } from "@/lib/content/search-params-record";
import { HubListView } from "./HubViews";

/**
 * Client boundary for hub filters: reads `q`/`lesson`/`category` via
 * useSearchParams so the server page stays static-export compatible.
 */
export function HubListViewWithParams({ hub,units,speech }: { hub: LearnerHubDefinition;units?:StudyUnit[];speech?:Record<string,string> }) {
  const params = useSearchParams();
  const {scope,setScope,ready,connected}=useStudyScope();
  const applied=useRef<string|null>(null);
  const lesson=params.get("lesson");
  useEffect(()=>{
    if(!ready||!connected||!lesson||applied.current===lesson)return;
    applied.current=lesson;
    if(availableLessons().includes(Number(lesson)))setScope({...scope,mode:"one",lessons:[Number(lesson)]});
    else if(lesson==="all")setScope({...scope,mode:"all",lessons:[]});
  },[ready,connected,lesson,scope,setScope]);
  return <HubListView hub={hub} {...(units?{units}:{})} {...(speech?{speech}:{})} searchParams={{...searchParamsToRecord(params),...(connected?{lesson:"all"}:{})}} />;
}
