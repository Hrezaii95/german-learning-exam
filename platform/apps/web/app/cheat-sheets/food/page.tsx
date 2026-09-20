import type {Metadata} from 'next';
import {ShellLayout} from '@/components/shell/ShellLayout';
import {FoodCheatSheet} from '@/components/study/FoodCheatSheet';
import {loadWordCards} from '@/lib/content/word-cards';
import {loadStudySpeech,loadCollectionSpeech} from '@/lib/study/catalog';
import '../collection.css';
import './food.css';
export const metadata:Metadata={title:'Food, preferences & ordering · Cheat sheet'};
export default function Page(){return <ShellLayout current="cheat-sheets"><FoodCheatSheet cards={loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(9))} speech={{...loadCollectionSpeech(),...loadStudySpeech()}}/></ShellLayout>;}
