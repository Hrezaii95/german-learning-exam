import {ShellLayout} from "@/components/shell/ShellLayout";
import {QuestionCheatSheet} from "@/components/study/QuestionCheatSheet";
import {loadCollectionSpeech} from "@/lib/study/catalog";
import "../collection.css";
import "./questions.css";

export const metadata={title:"Questions: W-words, word order & answers",description:"A visual German question map, interactive sentence builder, ja/nein/doch practice, audio and saved review."};
export default function Page(){return <ShellLayout current="cheat-sheets"><QuestionCheatSheet speech={loadCollectionSpeech()}/></ShellLayout>;}
