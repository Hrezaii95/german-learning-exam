"use client";
import type {SheetId} from "@/lib/study/sheet-topics";
import {sheetTags} from "@/lib/study/sheet-scope";
import {CheatSheetNavigation} from "./CheatSheetFrame";
import {StudyScopeNotice} from "./StudyScope";

/** Compatibility entry point for the shared named sheet navigation. */
export function CheatSheetNav({current}:{current:SheetId}){
  return <><CheatSheetNavigation current={current}/><StudyScopeNotice tags={sheetTags[current]}/></>;
}
