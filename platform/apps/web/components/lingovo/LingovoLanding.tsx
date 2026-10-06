"use client";
import {useEffect,useRef,useState} from 'react';
import type {Locale} from '@/lib/i18n/catalog';
import {landingCopy,launchVideoForLocale} from './launch-video';
import './illustrated-landing.css';
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
type MotionAPI = {mount:(el:HTMLElement,type:string)=>void;set:(el:HTMLElement,progress:number)=>void};
declare global {interface Window {LingovoArt?:MotionAPI}}
let motionReady:Promise<void>|undefined;
function loadMotion(){
  return motionReady??=new Promise<void>((resolve,reject)=>{
    if(window.LingovoArt){resolve();return;}
    const script=document.createElement('script');
    script.src=withPagesBaseAssetPath('/lingovo/motion.js');
    script.onload=()=>resolve();
    script.onerror=()=>{motionReady=undefined;script.remove();reject(new Error('Artwork could not load'));};
    document.head.appendChild(script);
  });
}

function MotionArt({type,locale}:{type:'portal'|'learning'|'skills';locale:Locale}){
  const stage=useRef<HTMLDivElement>(null);
  const copy=landingCopy(locale);
  const image={portal:'portal',learning:'learning-path',skills:'c1'}[type];
  const alt={portal:copy.portalAlt,learning:copy.loopAlt,skills:copy.skillsAlt}[type];
  useEffect(()=>{
    let disposed=false,frame=0;
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const el=stage.current;if(disposed||!el)return;
      const rect=el.getBoundingClientRect();
      window.LingovoArt?.set(el,media.matches?1:(innerHeight-rect.top)/(innerHeight+rect.height)*1.5);
    });};
    void loadMotion().then(()=>{
      const el=stage.current;if(disposed||!el)return;
      window.LingovoArt?.mount(el,type);
      el.dataset.ready='true';
      const portalLabels=el.querySelectorAll('.portal-leaf small');
      [copy.firstStep,copy.newBeginning,copy.yourLanguage].forEach((text,index)=>{if(portalLabels[index])portalLabels[index].textContent=text;});
      const chapter=el.querySelector('.motion-caption span:last-child');if(chapter)chapter.textContent=copy.nextChapter;
      const letters=el.querySelector('.portal-leaf.leaf-b strong');if(letters)letters.textContent=locale==='hy'?'Բ → ü':locale==='ru'?'Я → ü':'A → ü';
      el.querySelectorAll('.process-leaf h3').forEach((node,index)=>node.textContent=[entryText('understand',locale),entryText('try',locale),entryText('review',locale)][index]??'');
      el.querySelectorAll('.process-leaf p').forEach((node,index)=>node.textContent=[entryText('understandBody',locale),entryText('tryBody',locale),entryText('reviewBody',locale)][index]??'');
      el.querySelectorAll('.skill-leaf small').forEach((node,index)=>node.textContent=copy.skillLabels[index]??'');
      update();void document.fonts.ready.then(()=>{if(!disposed)update();});
    }).catch(()=>{/* The original illustration remains visible if motion cannot load. */});
    addEventListener('scroll',update,{passive:true});addEventListener('resize',update);media.addEventListener('change',update);
    return()=>{disposed=true;cancelAnimationFrame(frame);removeEventListener('scroll',update);removeEventListener('resize',update);media.removeEventListener('change',update);};
  },[type,locale,copy.skillLabels,copy.firstStep,copy.newBeginning,copy.yourLanguage,copy.nextChapter]);
  return <div className={`landing-art landing-art-${type}`} role="img" aria-label={alt}>
    <div ref={stage} className="landing-art-stage" data-scroll-art aria-hidden="true"/>
    <img className="landing-art-fallback" src={withPagesBaseAssetPath(`/lingovo/${image}-illustration.png`)} alt="" width={768} height={768}/>
  </div>;
}

export function LaunchVideo(){
  const {locale}=useLocale();const copy=landingCopy(locale);const film=launchVideoForLocale(locale);
  const [failedSource,setFailedSource]=useState<string>();
  const label=film.language==='hy'?copy.videoHy:copy.videoEn;
  const src=withPagesBaseAssetPath(film.src);
  return <section className="launch-section" aria-labelledby="launch-heading">
    <div className="launch-copy"><p className="kicker">{copy.videoKicker}</p><h2 id="launch-heading">{copy.watch}</h2><p className="lead">{copy.videoBody}</p>
      <Link href="/lessons/01" className="button primary">{entryText('beginnerAction',locale)}<span aria-hidden="true">↗</span></Link>
      <p className="launch-note">{copy.previewNote}</p>
    </div>
    <figure className="launch-film"><video key={film.language} src={src} poster={withPagesBaseAssetPath(film.poster)} controls playsInline preload="none" width={1080} height={1920} aria-label={label} data-video-language={film.language} onError={()=>setFailedSource(film.src)} onLoadedData={()=>setFailedSource(undefined)}>
      <track kind="captions" src={withPagesBaseAssetPath(film.captions)} srcLang={film.language} label={film.language==='hy'?'Հայերեն':'English'}/>
      <a href={src}>{copy.openVideo}</a>
    </video><figcaption><span>{label}</span><a href={src}>{copy.openVideo}<span aria-hidden="true"> ↗</span></a></figcaption>
    {failedSource===film.src&&<p className="launch-error" role="alert">{copy.videoError}</p>}</figure>
  </section>;
}

export function LingovoLanding({view='home'}:{view?:'home'|'catalog'}){
  const {locale}=useLocale();const copy=landingCopy(locale);const t=(key:EntryKey)=>entryText(key,locale);
  if(view==='catalog')return <CouncilEntry view="catalog"/>;
  return <div className="lingovo-site lingovo-illustrated"><LingovoFonts/><LingovoAppHeader/>
    <main id="main-content" tabIndex={-1}>
      <div className="wrap"><section className="hero"><div className="hero-copy"><p className="kicker">{copy.kicker}</p><h1>{copy.heroFirst}<br/><em>{copy.heroSecond}</em></h1><p className="lead">{copy.heroBody}</p><div className="actions"><Link className="button primary" href="/lessons/01">{t('beginnerAction')}<span aria-hidden="true">↗</span></Link><a className="text-link" href="#learning-tracks">{copy.choose} ↓</a></div></div><div className="hero-art"><MotionArt type="portal" locale={locale}/></div></section>
        <section id="learning-tracks" className="landing-tracks" aria-labelledby="tracks-heading"><p className="kicker">A1 → C1</p><h2 id="tracks-heading">{t('courseTitle')}</h2><LandingTracks/><p className="entry-availability">{t('available')}</p></section>
        <LaunchVideo/>
      </div>
      <section className="how-section landing-loop"><div className="wrap split"><div><p className="kicker">01 / LINGOVO</p><h2>{t('practice')}</h2><ol className="landing-loop-steps">{(['understand','try','review'] as const).map((key,index)=><li key={key}><span aria-hidden="true">0{index+1}</span><div><h3>{t(key)}</h3><p>{t(`${key}Body` as EntryKey)}</p></div></li>)}</ol></div><MotionArt type="learning" locale={locale}/></div></section>
      <section className="skills-section landing-skills"><div className="wrap split"><MotionArt type="skills" locale={locale}/><div><p className="kicker">C1 / TESTDAF</p><h2>{t('advanced')}</h2><p className="lead">{t('advancedBody')}</p><Link className="button light" href="/prepare/c1">{t('advancedAction')}<span aria-hidden="true">↗</span></Link><p className="landing-skill-note">{t('advancedEvidence')}</p></div></div></section>
      <div className="wrap landing-support"><section className="entry-support"><section><h2>{t('language')}</h2><p>{t('languageBody')}</p></section><details><summary>{t('helpTitle')}</summary><p>{t('helpBody')}</p></details><details><summary>{t('honestTitle')}</summary><p>{t('honestBody')}</p></details></section></div>
    </main><LingovoFooter/>
  </div>;
}

function CouncilEntry({view='home'}:{view?:'home'|'catalog'}){
  const {locale}=useLocale();const t=(key:EntryKey)=>entryText(key,locale);
  const title=t(view==='home'?'title':'courseTitle');
  return <div className="lingovo-entry"><LingovoFonts/><LingovoAppHeader current="learn"/>
    <main id="main-content" className="lingovo-entry-main" tabIndex={-1}>
      <header className="entry-intro"><p className="entry-kicker">{t('kicker')}</p><h1>{title}</h1><p>{t(view==='home'?'intro':'courseIntro')}</p></header>
      <nav className="entry-quick-choice" aria-label={t('courseTitle')}><a href="#track-a1">{t('a1Short')}<span aria-hidden="true">↓</span></a><a href="#track-c1">{t('c1Short')}<span aria-hidden="true">↓</span></a></nav>
      <LandingTracks/>
      <p className="entry-availability">{t('available')}</p>
      <section className="entry-loop" aria-labelledby="entry-loop-title"><h2 id="entry-loop-title">{t('practice')}</h2><ol>{([['understand','understandBody'],['try','tryBody'],['review','reviewBody']] as const).map(([heading,body],i)=><li key={heading}><span aria-hidden="true">0{i+1}</span><div><h3>{t(heading)}</h3><p>{t(body)}</p></div></li>)}</ol></section>
      <div className="entry-support"><section><h2>{t('language')}</h2><p>{t('languageBody')}</p></section><details><summary>{t('helpTitle')}</summary><p>{t('helpBody')}</p></details><details><summary>{t('honestTitle')}</summary><p>{t('honestBody')}</p></details></div>
    </main><LingovoFooter/>
  </div>;
}

function LandingTracks(){const {locale}=useLocale();const t=(key:EntryKey)=>entryText(key,locale);return (<section className="entry-tracks" aria-label={t('courseTitle')}>
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
      </section>);}
