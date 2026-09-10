import {ShellLayout} from "@/components/shell/ShellLayout";
import {CollectionCheatSheet} from "@/components/study/CollectionCheatSheet";
import {loadWordCards} from "../content/word-cards";
import {loadCollectionSpeech} from "./catalog";
import {cardsForSheet} from "./sheet-cards";
import type {ExtendedSheetId} from "./sheet-topics";
import "../../app/cheat-sheets/collection.css";
export function SheetPage({sheet}:{sheet:ExtendedSheetId}){
  return <ShellLayout current="cheat-sheets"><CollectionCheatSheet sheet={sheet} cards={cardsForSheet(loadWordCards().cards,sheet)} speech={loadCollectionSpeech()}/></ShellLayout>;
}
