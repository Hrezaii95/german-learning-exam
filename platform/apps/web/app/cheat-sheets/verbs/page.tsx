import {SheetPage} from "@/lib/study/sheet-page";
import {sheetTitles} from "@/lib/study/sheet-topics";
export const metadata={title:sheetTitles.verbs.title,description:sheetTitles.verbs.subtitle};
export default function Page(){return <SheetPage sheet="verbs"/>;}
