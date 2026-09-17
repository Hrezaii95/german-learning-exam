import type {Metadata} from "next";
import {ShellLayout} from "@/components/shell/ShellLayout";
import {HobbiesCheatSheet} from "@/components/study/HobbiesCheatSheet";
import {loadWordCards} from "@/lib/content/word-cards";
import {loadStudySpeech} from "@/lib/study/catalog";
import "../collection.css";
import "./hobbies.css";
export const metadata:Metadata={title:"Hobbies, abilities & frequency · Cheat sheet"};
export default function Page(){return <ShellLayout current="cheat-sheets"><HobbiesCheatSheet cards={loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(7))} speech={loadStudySpeech()}/></ShellLayout>;}
