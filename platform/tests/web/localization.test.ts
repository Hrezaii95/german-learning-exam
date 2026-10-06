// @vitest-environment jsdom
import {createElement as h} from 'react';
import {render,screen,cleanup,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {LocaleProvider,LanguageSelector} from '../../apps/web/components/i18n/LocaleProvider';
import {LDiv,LSpan,LSelect,LOption,LInput,LP} from '../../apps/web/components/i18n/LocalizedElements';
import LocalizedLink from '../../apps/web/components/i18n/LocalizedLink';
import {DEFAULT_LOCALE,LOCALE_KEY,SUPPORTED_LOCALES,isLocale,translate,translateMessage,untranslatedSourceFragments} from '../../apps/web/lib/i18n/catalog';
import messages from '../../apps/web/lib/i18n/messages.json';
import germanMessages from '../../apps/web/lib/i18n/messages.de.json';
import learnerProjection from '../../apps/web/generated/learner-projection.json';
import {assertPagesExportEnv} from '../../apps/web/lib/content/pages-export-env';
beforeEach(()=>localStorage.clear());afterEach(()=>{cleanup();vi.restoreAllMocks();});
function ui(){return h(LocaleProvider,null,h(LanguageSelector),h(LDiv,null,'Lessons'),h(LSpan,{lang:'de'},'Name'),h(LSelect,{'aria-label':'Meaning',defaultValue:'Goodbye'},h(LOption,null,'Goodbye')),h(LInput,{'aria-label':'Your answer',value:'Hallo',readOnly:true}));}
describe('learner interface languages',()=>{
 it('defaults to Armenian and keeps German text and form values unchanged',()=>{render(ui());expect(document.documentElement.lang).toBe('hy');expect(screen.getByText('Դասեր')).toBeTruthy();expect(screen.getByText('Name')).toBeTruthy();expect((screen.getByDisplayValue('Ցտեսություն') as HTMLSelectElement).value).toBe('Goodbye');expect(screen.getByDisplayValue('Hallo')).toBeTruthy();});
 it('switches immediately, persists, and restores the selection',async()=>{const first=render(ui());fireEvent.change(screen.getByLabelText('Միջերեսի լեզու'),{target:{value:'ru'}});expect(screen.getByText('Уроки')).toBeTruthy();expect(localStorage.getItem(LOCALE_KEY)).toBe('ru');expect(document.documentElement.lang).toBe('ru');first.unmount();render(ui());await waitFor(()=>expect(screen.getByText('Уроки')).toBeTruthy());fireEvent.change(screen.getByLabelText('Язык интерфейса'),{target:{value:'en'}});expect(screen.getByText('Lessons')).toBeTruthy();expect(screen.getByText('Name')).toBeTruthy();});
 it('falls back safely for unsupported saved locales',()=>{localStorage.setItem(LOCALE_KEY,'xx');render(ui());expect(screen.getByText('Դասեր')).toBeTruthy();});
 it('retains unknown source strings and translates numbered labels',()=>{expect(translate('Guten Morgen','hy')).toBe('Guten Morgen');expect(translate('Lesson 12','ru')).toBe('Урок 12');expect(translate('Not in the catalog','hy')).toBe('Not in the catalog');});
 it('allows an explicitly selected Cloudflare root export but preserves the GitHub guard',()=>{expect(()=>assertPagesExportEnv({GL_PAGES_EXPORT:'1',GL_CLOUDFLARE_EXPORT:'1',NEXT_PUBLIC_GL_PAGES_BASE_PATH:''})).not.toThrow();expect(()=>assertPagesExportEnv({GL_PAGES_EXPORT:'1',NEXT_PUBLIC_GL_PAGES_BASE_PATH:''})).toThrow();});

 it('offers all four languages and restores German after remount',()=>{
  const first=render(ui());
  const selector=screen.getByLabelText('Միջերեսի լեզու') as HTMLSelectElement;
  expect([...selector.options].map(option=>[option.value,option.textContent])).toEqual([
   ['hy','Հայերեն'],['ru','Русский'],['en','English'],['de','Deutsch'],
  ]);
  fireEvent.change(selector,{target:{value:'de'}});
  expect(screen.getByText('Lektionen')).toBeTruthy();
  expect(document.documentElement.lang).toBe('de');
  expect(localStorage.getItem(LOCALE_KEY)).toBe('de');
  expect(screen.getByText('Name')).toBeTruthy();
  expect((screen.getByDisplayValue('Auf Wiedersehen') as HTMLSelectElement).value).toBe('Goodbye');
  first.unmount();render(ui());
  expect(screen.getByLabelText('Sprache der Oberfläche')).toBeTruthy();
  expect(screen.getByText('Lektionen')).toBeTruthy();
 });

 it('synchronizes language changes and clears from another tab',()=>{
  render(ui());
  fireEvent(window,new StorageEvent('storage',{key:LOCALE_KEY,newValue:'de'}));
  expect(screen.getByText('Lektionen')).toBeTruthy();
  expect(document.documentElement.lang).toBe('de');
  fireEvent(window,new StorageEvent('storage',{key:'unrelated',newValue:'ru'}));
  expect(document.documentElement.lang).toBe('de');
  fireEvent(window,new StorageEvent('storage',{key:LOCALE_KEY,newValue:'unsupported'}));
  expect(document.documentElement.lang).toBe(DEFAULT_LOCALE);
  fireEvent(window,new StorageEvent('storage',{key:LOCALE_KEY,newValue:'en'}));
  expect(screen.getByText('Lessons')).toBeTruthy();
  fireEvent(window,new StorageEvent('storage',{key:null,newValue:null}));
  expect(document.documentElement.lang).toBe(DEFAULT_LOCALE);
 });

 it('allows session language changes when browser storage fails',()=>{
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked');});
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked');});
  render(ui());
  fireEvent.change(screen.getByLabelText('Միջերեսի լեզու'),{target:{value:'de'}});
  expect(screen.getByText('Lektionen')).toBeTruthy();
  expect(document.documentElement.lang).toBe('de');
 });

 it('preserves target German and explicit no-translate boundaries through nested elements and links',()=>{
  render(h(LocaleProvider,null,h(LDiv,null,
   h('span',{lang:'de-DE',id:'german'},h(LSpan,null,'Name')),
   h(LDiv,{translate:'no',id:'verbatim'},h(LSpan,null,'Lessons')),
   h('span',{className:'no-translate',id:'protected-class'},h(LSpan,null,'Review')),
   h(LocalizedLink,{href:'/lessons',lang:'de',id:'protected-link'},h(LSpan,null,'Name')),
   h(LSpan,{className:'notranslate',id:'legacy-class'},'Grammar'),
  )));
  expect(document.getElementById('german')!.textContent).toBe('Name');
  expect(document.getElementById('verbatim')!.textContent).toBe('Lessons');
  expect(document.getElementById('protected-class')!.textContent).toBe('Review');
  expect(document.getElementById('protected-link')!.textContent).toBe('Name');
  expect(document.getElementById('legacy-class')!.textContent).toBe('Grammar');
 });

 it('localizes feedback with JSX counts without changing model answers or field values',()=>{
  localStorage.setItem(LOCALE_KEY,'de');
  render(h(LocaleProvider,null,
   h(LP,null,'Activity ',2,' of ',6),
   h(LP,null,2,' / ',6,' answers correct.'),
   h(LP,{role:'status'},'Correct. You completed all 6 source-backed questions.'),
   h(LInput,{'aria-label':'Your answer',value:'Ich heiße Anna.',readOnly:true}),
  ));
  expect(screen.getByText('Aktivität 2 von 6')).toBeTruthy();
  expect(screen.getByText('2 von 6 Antworten richtig.')).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('Richtig. Du hast alle 6 Fragen zum Kursmaterial bearbeitet.');
  expect((screen.getByLabelText('Deine Antwort') as HTMLInputElement).value).toBe('Ich heiße Anna.');
 });

 it('retains translation of text fragments around dynamic content',()=>{
  localStorage.setItem(LOCALE_KEY,'de');
  render(h(LocaleProvider,null,h(LP,null,'You worked through ',4,' items. Again brings an item back in 10 minutes; Remembered and Easy schedule it for a later day.')));
  expect(screen.getByText(/Du hast wiederholt:/).textContent).toBe('Du hast wiederholt: 4 Inhalte. „Noch einmal“ bringt einen Inhalt nach 10 Minuten zurück; „Gewusst“ und „Leicht“ planen ihn für einen späteren Tag.');
 });

 it('translates nested native accessibility attributes and protects literal code',()=>{
  localStorage.setItem(LOCALE_KEY,'de');
  render(h(LocaleProvider,null,h(LDiv,null,
   h('button',{'aria-label':'Show answer'},'Show answer'),
   h('code',null,'Name'),
  )));
  expect(screen.getByRole('button',{name:'Antwort anzeigen'}).textContent).toBe('Antwort anzeigen');
  expect(screen.getByText('Name').tagName).toBe('CODE');
 });

 it('localizes instructions for German answer fields and retains explicit verbatim boundaries',()=>{
  localStorage.setItem(LOCALE_KEY,'ru');
  render(h(LocaleProvider,null,h(LDiv,null,
   h(LInput,{lang:'de',value:'Ich heiße Anna.',readOnly:true,'aria-label':'Your answer',placeholder:'Your German answer…'}),
   h('input',{lang:'de',value:'Guten Tag',readOnly:true,'aria-label':'German answer'}),
   h(LDiv,{translate:'no'},h(LInput,{lang:'de',value:'Name',readOnly:true,'aria-label':'Your answer'})),
  )));
  expect(screen.getByLabelText(translate('Your answer','ru')).getAttribute('value')).toBe('Ich heiße Anna.');
  expect(screen.getByPlaceholderText(translate('Your German answer…','ru'))).toBeTruthy();
  expect(screen.getByLabelText(translate('German answer','ru')).getAttribute('value')).toBe('Guten Tag');
  expect(screen.getByLabelText('Your answer').getAttribute('value')).toBe('Name');
 });

 it('covers projected A1 activity titles, lesson labels and learning goals',()=>{
  const sources=[
   ...learnerProjection.activities.flatMap(activity=>[activity.promptPlainText,activity.stageTitleEn]),
   ...learnerProjection.lessons.flatMap(lesson=>[lesson.titleEn,...lesson.communicativeGoals,...lesson.stages.map(stage=>stage.titleEn)]),
  ];
  const known=new Set(Object.keys(messages).map(source=>source.toLowerCase()));
  expect(sources.filter(source=>!known.has(source.toLowerCase()))).toEqual([]);
  expect(translate('Alphabet listen-and-spell','hy')).toBe('Այբուբեն․ լսեք և ասեք տառ առ տառ');
 });

 it('provides all translated catalog keys in German and retains every placeholder',()=>{
  const german:Record<string,string>=germanMessages;
  expect(Object.keys(german).sort()).toEqual(Object.keys(messages).sort());
  for(const [source,entry] of Object.entries(messages)){
   const parameters=(source.match(/\{[a-z]+\}/gi)??[]).sort();
   for(const value of [entry.hy,entry.ru,german[source]!]){
    expect(value.trim(),source).not.toBe('');
    expect((value.match(/\{[a-z]+\}/gi)??[]).sort(),source).toEqual(parameters);
   }
   expect(translate(source,'en')).toBe(source);
  }
 });

 it('translates known templates while preserving substitutions and unknown source text',()=>{
  expect(SUPPORTED_LOCALES.every(isLocale)).toBe(true);
  expect(isLocale('de-DE')).toBe(false);
  expect(translate('  Lesson 12 · Practice  ','de')).toBe('  Lektion 12 · Üben  ');
  expect(translate('Correct. You completed 6 questions.','ru')).toBe('Правильно. Вы ответили на все вопросы: 6.');
  expect(translate('Choose the meaning of “Auf Wiedersehen”.','de')).toBe('Wähle die Bedeutung von „Auf Wiedersehen“.');
  expect(translateMessage('Answer: {answer}',{answer:'$& Name'},'hy')).toBe('Պատասխան՝ $& Name');
  expect(translate('  Guten  Morgen!  ','hy')).toBe('  Guten  Morgen!  ');
  expect(translate('__proto__','de')).toBe('__proto__');
  expect(translate('An uncatalogued source sentence.','de')).toBe('An uncatalogued source sentence.');
  expect(translate('Backup & restore','de')).toBe('Sichern & wiederherstellen');
  expect(translate('I am a businessman. / I am a businesswoman.','de')).toBe('Ich bin Geschäftsmann. / Ich bin Geschäftsfrau.');
  expect(untranslatedSourceFragments('How do you say “a brand new word”?')).toEqual(['a brand new word']);
  expect(untranslatedSourceFragments('I am a businessman. / I am a businesswoman.')).toEqual([]);
 });
});
