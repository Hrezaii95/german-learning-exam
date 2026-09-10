import {SheetPage} from "@/lib/study/sheet-page";
import {sheetTitles} from "@/lib/study/sheet-topics";
export const metadata={title:sheetTitles.numbers.title,description:sheetTitles.numbers.subtitle};
export default function Page(){return <SheetPage sheet="numbers"/>;}
