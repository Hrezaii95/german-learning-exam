import {SheetPage} from "@/lib/study/sheet-page";
import {sheetTitles} from "@/lib/study/sheet-topics";
export const metadata={title:sheetTitles.conversation.title,description:sheetTitles.conversation.subtitle};
export default function Page(){return <SheetPage sheet="conversation"/>;}
