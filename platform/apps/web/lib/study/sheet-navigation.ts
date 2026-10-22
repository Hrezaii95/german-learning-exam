import {subjectSheetHref,subjectSheets} from "./subject-sheets";
import {sheetLinks,type SheetId} from "./sheet-topics";
import type {StudyConcept} from "./scope";
import {VOCABULARY_SHEET_PATH} from "./sheet-routes";

export type SheetDestinationId=SheetId|"vocabulary"|`subject:${StudyConcept}`;
export type SheetDestination={id:SheetDestinationId;label:string;href:string;kind:"vocabulary"|"subject"|"workshop";subject:StudyConcept};

const workshopSubjects:Record<SheetId,StudyConcept>={
  countries:"countries",home:"home",people:"people",verbs:"verbs",numbers:"numbers",
  conversation:"conversation",questions:"questions",objects:"objects",office:"office",
  hobbies:"hobbies",time:"time",food:"food",travel:"travel",past:"past",journeys:"seasons",
};

/** One named destination list for the directory and every sheet chooser. */
export const sheetDestinations:SheetDestination[]=[
  {id:"vocabulary",label:"All vocabulary",href:VOCABULARY_SHEET_PATH,kind:"vocabulary",subject:"objects"},
  ...subjectSheets.map(subject=>({id:`subject:${subject.id}` as const,label:subject.label,href:subjectSheetHref(subject.id),kind:"subject" as const,subject:subject.id})),
  ...sheetLinks.map(sheet=>({id:sheet.id,label:sheet.title,href:sheet.href,kind:"workshop" as const,subject:workshopSubjects[sheet.id]})),
];

export function sheetDestination(id:SheetDestinationId):SheetDestination {
  return sheetDestinations.find(destination=>destination.id===id)!;
}
