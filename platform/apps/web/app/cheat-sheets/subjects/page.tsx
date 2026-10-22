import {ShellLayout} from "@/components/shell/ShellLayout";
import {StaticSheetRedirect} from "@/components/study/StaticSheetRedirect";
import {SHEET_DIRECTORY_PATH} from "@/lib/study/sheet-routes";

export const metadata={title:"Cheat sheets · Moved"};

export default function Page(){
  return <ShellLayout current="cheat-sheets"><StaticSheetRedirect href={SHEET_DIRECTORY_PATH} label="Cheat sheets"/></ShellLayout>;
}
