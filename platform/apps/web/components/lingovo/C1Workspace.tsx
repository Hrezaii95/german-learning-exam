"use client";
import {useSearchParams} from 'next/navigation';
import {C1App, C1StudyProvider, type C1View} from '@lingovo/c1';
import {useLocale} from '@/components/i18n/LocaleProvider';
import {LingovoFooter,LingovoFonts} from './LingovoLanding';
import {LingovoAppHeader} from '@/components/shell/LingovoAppHeader';
import './c1.css';
export function C1Workspace({view='home'}:{view?:C1View}) {
  const query=useSearchParams(); const {locale,setLocale}=useLocale();
  const skill=query.get('skill') || 'lesen'; const collection=query.get('collection') || 'all';
  return <><LingovoFonts/><LingovoAppHeader track="c1" current={view} mainId="main"/><div className="c1-site"><C1StudyProvider><C1App key={view} embedded view={view} locale={locale} onLocaleChange={setLocale} initialSource={query.get('source')||''} initialSkill={['lesen','hoeren','schreiben','sprechen'].includes(skill)?skill:'lesen'} initialCollection={['book','course','mock-exam-1'].includes(collection)?collection:'all'}/></C1StudyProvider><div id="c1-modal-root"/></div><div className="lingovo-site"><LingovoFooter/></div></>;
}
