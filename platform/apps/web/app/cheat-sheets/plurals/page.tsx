import {ShellLayout} from "@/components/shell/ShellLayout";
import {StaticSheetRedirect} from "@/components/study/StaticSheetRedirect";
import {VOCABULARY_SHEET_PATH} from "@/lib/study/sheet-routes";

export const metadata={title:"All vocabulary · Moved"};

export default function Page(){
  return <ShellLayout current="all-vocabulary"><StaticSheetRedirect href={VOCABULARY_SHEET_PATH} label="All vocabulary"/></ShellLayout>;
}
