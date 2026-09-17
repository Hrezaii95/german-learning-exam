import {ShellLayout} from "@/components/shell/ShellLayout";
import {OfficeCheatSheet} from "@/components/study/OfficeCheatSheet";
import {loadStudySpeech} from "@/lib/study/catalog";
import {loadWordCards} from "@/lib/content/word-cards";
import "../collection.css";
import "../objects/objects.css";
import "./office.css";
export const metadata={title:"Office, plurals & accusative",description:"An interactive German article switchboard, plural map and phone-call practice for Lesson 6."};
export default function Page(){return <ShellLayout current="cheat-sheets"><OfficeCheatSheet cards={loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(6))} speech={loadStudySpeech()}/></ShellLayout>;}
