"use client";
import Link from 'next/link';
import {useLocale} from '@/components/i18n/LocaleProvider';
import {LingovoAppHeader} from '@/components/shell/LingovoAppHeader';
import {withPagesBaseAssetPath} from '@/lib/content/pages-base-path';
import {entryText,type EntryKey} from './entry-copy';
import './landing.css';

export function LingovoHeader(){return <LingovoAppHeader/>;}
export function LingovoFonts(){return <style dangerouslySetInnerHTML={{__html:`@font-face{font-family:AtlasSans;src:url('${withPagesBaseAssetPath('/lingovo/sans.ttf')}');font-display:swap}@font-face{font-family:AtlasSans;src:url('${withPagesBaseAssetPath('/lingovo/sans-bold.ttf')}');font-weight:700;font-display:swap}@font-face{font-family:AtlasSerif;src:url('${withPagesBaseAssetPath('/lingovo/serif.ttf')}');font-display:swap}`}}/>;}
export function LingovoFooter(){
  const {locale}=useLocale();const t=(key:EntryKey)=>entryText(key,locale);
  return <footer className="lingovo-entry-footer"><span>{t('footer')}</span><nav aria-label={t('resources')}><Link href="/references">{t('resources')}</Link><Link href="/settings">{t('settings')}</Link></nav></footer>;
}
export function LingovoLanding({view='home'}:{view?:'home'|'catalog'}){
  const {locale}=useLocale();const t=(key:EntryKey)=>entryText(key,locale);
  const title=t(view==='home'?'title':'courseTitle');
  return <div className="lingovo-entry"><LingovoFonts/><LingovoAppHeader current="learn"/>
    <main id="main-content" className="lingovo-entry-main" tabIndex={-1}>
      <header className="entry-intro"><p className="entry-kicker">{t('kicker')}</p><h1>{title}</h1><p>{t(view==='home'?'intro':'courseIntro')}</p></header>
      <nav className="entry-quick-choice" aria-label={t('courseTitle')}><a href="#track-a1">{t('a1Short')}<span aria-hidden="true">↓</span></a><a href="#track-c1">{t('c1Short')}<span aria-hidden="true">↓</span></a></nav>
      <section className="entry-tracks" aria-label={t('courseTitle')}>
        <article id="track-a1" className="entry-track entry-track-a1"><div className="entry-track-label"><span>A1</span><span lang="de">Hallo.</span></div><h2>{t('beginner')}</h2><p>{t('beginnerBody')}</p>
          <div className="entry-task"><span>{t('firstGoal')}</span><h3>{t('beginnerGoal')}</h3><p>{t('beginnerTime')}</p></div>
          <Link className="entry-primary" href="/lessons/01">{t('beginnerAction')}<span aria-hidden="true">↗</span></Link>
          <Link className="entry-secondary" href="/dashboard">{t('beginnerContinue')}<span aria-hidden="true">→</span></Link><p className="entry-evidence">{t('beginnerEvidence')}</p>
        </article>
        <article id="track-c1" className="entry-track entry-track-c1"><div className="entry-track-label"><span>C1 / TestDaF</span><span lang="de">Weiter.</span></div><h2>{t('advanced')}</h2><p>{t('advancedBody')}</p>
          <div className="entry-task"><span>{t('firstGoal')}</span><h3>{t('advancedGoal')}</h3><p>{t('advancedTime')}</p></div>
          <Link className="entry-primary" href="/prepare/c1">{t('advancedAction')}<span aria-hidden="true">↗</span></Link>
          <Link className="entry-secondary" href="/prepare/c1/today">{t('advancedContinue')}<span aria-hidden="true">→</span></Link><p className="entry-evidence">{t('advancedEvidence')}</p>
        </article>
      </section>
      <p className="entry-availability">{t('available')}</p>
      <section className="entry-loop" aria-labelledby="entry-loop-title"><h2 id="entry-loop-title">{t('practice')}</h2><ol>{([['understand','understandBody'],['try','tryBody'],['review','reviewBody']] as const).map(([heading,body],i)=><li key={heading}><span aria-hidden="true">0{i+1}</span><div><h3>{t(heading)}</h3><p>{t(body)}</p></div></li>)}</ol></section>
      <div className="entry-support"><section><h2>{t('language')}</h2><p>{t('languageBody')}</p></section><details><summary>{t('helpTitle')}</summary><p>{t('helpBody')}</p></details><details><summary>{t('honestTitle')}</summary><p>{t('honestBody')}</p></details></div>
    </main><LingovoFooter/>
  </div>;
}
