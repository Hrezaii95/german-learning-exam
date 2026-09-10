import {ShellLayout} from "@/components/shell/ShellLayout";
import {HomeCheatSheet} from "@/components/study/HomeCheatSheet";
import {homeWords} from "@/lib/study/home";
import {loadWordCards} from "@/lib/content/word-cards";
import {loadHomeSpeech} from "@/lib/study/catalog";
import "./home.css";
export const metadata={title:"Home & furniture cheat sheet",description:"An illustrated German home vocabulary sheet with gender, plurals, pronunciation, pronouns and Lesson 1–4 practice."};
export default function HomeSheetPage(){
  const cards=loadWordCards().cards;
  const cardLinks:Record<string,string>={},saveIds:Record<string,string>={};
  for(const word of homeWords){const card=cards.find(c=>c.rows.some(row=>row.singular.text===word.de));if(card){cardLinks[word.id]=card.path;saveIds[word.id]=`card-${card.id}`;}}
  return <ShellLayout current="cheat-sheets"><HomeCheatSheet speech={loadHomeSpeech()} cardLinks={cardLinks} saveIds={saveIds}/></ShellLayout>;
}
