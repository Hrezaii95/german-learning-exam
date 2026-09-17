import {ShellLayout} from "@/components/shell/ShellLayout";
import {ObjectCheatSheet} from "@/components/study/ObjectCheatSheet";
import {loadWordCards} from "@/lib/content/word-cards";
import {loadStudySpeech} from "@/lib/study/catalog";
import {studyUnits} from "@/lib/study/course-lessons";
import "../collection.css";
import "./objects.css";
export const metadata={title:"Objects, colours & articles",description:"A colour-coded map of ein, eine, kein and keine, materials and everyday objects from Lesson 5."};
export default function Page(){return <ShellLayout current="cheat-sheets"><ObjectCheatSheet cards={loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(5))} speech={loadStudySpeech()} unit={studyUnits.find(u=>u.number===5)!}/></ShellLayout>;}
