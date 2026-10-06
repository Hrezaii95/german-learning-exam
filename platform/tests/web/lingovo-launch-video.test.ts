// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {LanguageSelector,LocaleProvider} from '../../apps/web/components/i18n/LocaleProvider';
import {LaunchVideo} from '../../apps/web/components/lingovo/LingovoLanding';
import {LOCALE_KEY} from '../../apps/web/lib/i18n/catalog';

vi.mock('next/navigation',()=>({usePathname:()=>'/'}));
vi.mock('../../apps/web/components/i18n/LocaleDocumentTitle',()=>({LocaleDocumentTitle:()=>null}));
beforeEach(()=>localStorage.setItem(LOCALE_KEY,'en'));
afterEach(()=>{cleanup();localStorage.clear();});

function page(){return createElement(LocaleProvider,null,createElement(LanguageSelector),createElement(LaunchVideo));}
describe('launch video language selection',()=>{
  it('replaces the playing element when switching films and preserves the requested Armenian/Russian mapping',()=>{
    render(page());
    const language=screen.getByRole('combobox');
    const en=document.querySelector('video')!;
    expect(en.getAttribute('src')).toContain('Lingovo-Launch-English.mp4');
    fireEvent.change(language,{target:{value:'hy'}});
    const hy=document.querySelector('video')!;
    expect(hy).not.toBe(en);
    expect(hy.getAttribute('src')).toContain('Lingovo-Launch-Armenian.mp4');
    fireEvent.change(language,{target:{value:'ru'}});
    expect(document.querySelector('video')).toBe(hy);
    expect(hy.getAttribute('aria-label')).toBe('Стартовый ролик на армянском');
    fireEvent.change(language,{target:{value:'en'}});
    expect(document.querySelector('video')!.getAttribute('src')).toContain('Lingovo-Launch-English.mp4');
    fireEvent.change(language,{target:{value:'de'}});
    expect(document.querySelector('video')!.getAttribute('src')).toContain('Lingovo-Launch-English.mp4');
    expect(localStorage.getItem(LOCALE_KEY)).toBe('de');
  });
  it('does not autoplay or preload the large films and retains accessible native controls',()=>{
    render(page());
    const video=document.querySelector('video')!;
    expect(video.getAttribute('preload')).toBe('none');
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    fireEvent.error(video);
    expect(screen.getByRole('alert').textContent).toContain('could not load');
    expect(screen.getAllByRole('link',{name:/Open video/}).some(a=>a.getAttribute('href')===video.getAttribute('src'))).toBe(true);
    fireEvent.change(screen.getByRole('combobox'),{target:{value:'hy'}});
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.change(screen.getByRole('combobox'),{target:{value:'en'}});
    fireEvent.loadedData(document.querySelector('video')!);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
