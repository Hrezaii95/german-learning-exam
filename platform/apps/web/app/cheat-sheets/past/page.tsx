import type {Metadata} from 'next';
import {ShellLayout} from '@/components/shell/ShellLayout';
import {PastCheatSheet} from '@/components/study/PastCheatSheet';
import {loadWordCards} from '@/lib/content/word-cards';
import {loadStudySpeech} from '@/lib/study/catalog';
import '../collection.css';
import './past.css';
export const metadata:Metadata={title:'Yesterday, Perfekt & opening hours · Cheat sheet'};
export default function Page(){return <ShellLayout current="cheat-sheets"><PastCheatSheet cards={loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(11))} speech={loadStudySpeech()}/></ShellLayout>;}
