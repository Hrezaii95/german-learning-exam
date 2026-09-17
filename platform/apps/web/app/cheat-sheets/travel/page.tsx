import type {Metadata} from 'next';
import {ShellLayout} from '@/components/shell/ShellLayout';
import {TravelCheatSheet} from '@/components/study/TravelCheatSheet';
import {loadWordCards} from '@/lib/content/word-cards';
import {loadStudySpeech} from '@/lib/study/catalog';
import '../collection.css';
import './travel.css';
export const metadata:Metadata={title:'Travel & separable verbs · Cheat sheet'};
export default function Page(){return <ShellLayout current="cheat-sheets"><TravelCheatSheet cards={loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(10))} speech={loadStudySpeech()}/></ShellLayout>;}
