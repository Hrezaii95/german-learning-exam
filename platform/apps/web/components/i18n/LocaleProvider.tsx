"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {DEFAULT_LOCALE,LOCALE_KEY,isLocale,translate,type Locale} from '@/lib/i18n/catalog';
// Outside the app provider, isolated components retain their source-language API.
const Context=createContext<{locale:Locale;setLocale:(locale:Locale)=>void}>({locale:'en',setLocale:()=>{}});
export const useLocale=()=>useContext(Context);
export function LocaleProvider({children}:{children:ReactNode}){
 const [locale,setValue]=useState<Locale>(DEFAULT_LOCALE);
 useEffect(()=>{try{const saved=localStorage.getItem(LOCALE_KEY);if(isLocale(saved))setValue(saved);}catch{/* Session language still works without storage. */}
 const sync=(event:StorageEvent)=>{if(event.key===LOCALE_KEY)setValue(isLocale(event.newValue)?event.newValue:DEFAULT_LOCALE)};
 window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 useEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir='ltr';},[locale]);
 const setLocale=(next:Locale)=>{setValue(next);try{localStorage.setItem(LOCALE_KEY,next);}catch{/* Do not block the selector. */}};
 return <Context.Provider value={{locale,setLocale}}>{children}</Context.Provider>;
}
export function LanguageSelector(){const {locale,setLocale}=useLocale();return <label className="language-selector"><span>{translate('Interface language',locale)}</span><select aria-label={translate('Interface language',locale)} value={locale} onChange={event=>{if(isLocale(event.target.value))setLocale(event.target.value)}}><option value="hy" lang="hy">Հայերեն</option><option value="ru" lang="ru">Русский</option><option value="en" lang="en">English</option></select></label>}
