import type {Metadata} from 'next';
import {ShellLayout} from '@/components/shell/ShellLayout';
import {JourneyCheatSheet} from '@/components/study/JourneyCheatSheet';
import {loadWordCards} from '@/lib/content/word-cards';
import {loadStudySpeech,loadCollectionSpeech} from '@/lib/study/catalog';
import '../collection.css';
import './journeys.css';
export const metadata:Metadata={title:'Seasons, journeys & haben or sein · Cheat sheet'};
export default function Page(){return <ShellLayout current="cheat-sheets"><JourneyCheatSheet cards={loadWordCards().cards.filter(c=>c.studyTags?.lessons.includes(12))} speech={{...loadCollectionSpeech(),...loadStudySpeech()}}/></ShellLayout>;}
