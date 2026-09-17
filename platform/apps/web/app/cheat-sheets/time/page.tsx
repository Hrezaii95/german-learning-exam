import type {Metadata} from 'next';
import {ShellLayout} from '@/components/shell/ShellLayout';
import {TimeCheatSheet} from '@/components/study/TimeCheatSheet';
import {loadWordCards} from '@/lib/content/word-cards';
import {loadStudySpeech} from '@/lib/study/catalog';
import '../collection.css';
import './time.css';
export const metadata:Metadata={title:'Time, weekdays & plans · Cheat sheet'};
export default function Page(){return <ShellLayout current="cheat-sheets"><TimeCheatSheet cards={loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(8))} speech={loadStudySpeech()}/></ShellLayout>;}
