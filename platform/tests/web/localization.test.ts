// @vitest-environment jsdom
import {createElement as h} from 'react';
import {render,screen,cleanup,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import {LocaleProvider,LanguageSelector} from '../../apps/web/components/i18n/LocaleProvider';
import {LDiv,LSpan,LSelect,LOption,LInput} from '../../apps/web/components/i18n/LocalizedElements';
import {LOCALE_KEY,translate} from '../../apps/web/lib/i18n/catalog';
import {assertPagesExportEnv} from '../../apps/web/lib/content/pages-export-env';
beforeEach(()=>localStorage.clear());afterEach(cleanup);
function ui(){return h(LocaleProvider,null,h(LanguageSelector),h(LDiv,null,'Lessons'),h(LSpan,{lang:'de'},'Name'),h(LSelect,{'aria-label':'Meaning',defaultValue:'Goodbye'},h(LOption,null,'Goodbye')),h(LInput,{'aria-label':'Your answer',value:'Hallo',readOnly:true}));}
describe('learner interface languages',()=>{
 it('defaults to Armenian and keeps German text and form values unchanged',()=>{render(ui());expect(document.documentElement.lang).toBe('hy');expect(screen.getByText('Դասեր')).toBeTruthy();expect(screen.getByText('Name')).toBeTruthy();expect((screen.getByDisplayValue('Ցտեսություն') as HTMLSelectElement).value).toBe('Goodbye');expect(screen.getByDisplayValue('Hallo')).toBeTruthy();});
 it('switches immediately, persists, and restores the selection',async()=>{const first=render(ui());fireEvent.change(screen.getByLabelText('Միջերեսի լեզու'),{target:{value:'ru'}});expect(screen.getByText('Уроки')).toBeTruthy();expect(localStorage.getItem(LOCALE_KEY)).toBe('ru');expect(document.documentElement.lang).toBe('ru');first.unmount();render(ui());await waitFor(()=>expect(screen.getByText('Уроки')).toBeTruthy());fireEvent.change(screen.getByLabelText('Язык интерфейса'),{target:{value:'en'}});expect(screen.getByText('Lessons')).toBeTruthy();expect(screen.getByText('Name')).toBeTruthy();});
 it('falls back safely for unsupported saved locales',()=>{localStorage.setItem(LOCALE_KEY,'xx');render(ui());expect(screen.getByText('Դասեր')).toBeTruthy();});
 it('retains unknown source strings and translates numbered labels',()=>{expect(translate('Guten Morgen','hy')).toBe('Guten Morgen');expect(translate('Lesson 12','ru')).toBe('Урок 12');expect(translate('Not in the catalog','hy')).toBe('Not in the catalog');});
 it('allows an explicitly selected Cloudflare root export but preserves the GitHub guard',()=>{expect(()=>assertPagesExportEnv({GL_PAGES_EXPORT:'1',GL_CLOUDFLARE_EXPORT:'1',NEXT_PUBLIC_GL_PAGES_BASE_PATH:''})).not.toThrow();expect(()=>assertPagesExportEnv({GL_PAGES_EXPORT:'1',NEXT_PUBLIC_GL_PAGES_BASE_PATH:''})).toThrow();});
});
