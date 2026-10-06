"use client";
import NextLink from 'next/link';
import {useContext,type ComponentProps} from 'react';
import {useLocale} from './LocaleProvider';
import {ProtectedText,textProtection,localizeChildren} from './LocalizedElements';
import {translate} from '@/lib/i18n/catalog';
export default function LocalizedLink(props:ComponentProps<typeof NextLink>){
 const {locale}=useLocale();const inherited=useContext(ProtectedText);
 const protection=textProtection(props,inherited);const protect=protection!=='none';
 const link=<NextLink {...props} aria-label={props['aria-label']?(protect?props['aria-label']:translate(props['aria-label'],locale)):undefined} title={props.title?(protect?props.title:translate(props.title,locale)):undefined}>{protect?props.children:localizeChildren(props.children,locale)}</NextLink>;
 return protection!==inherited?<ProtectedText.Provider value={protection}>{link}</ProtectedText.Provider>:link;
}
