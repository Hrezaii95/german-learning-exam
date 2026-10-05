"use client";
import NextLink from 'next/link';
import type {ComponentProps} from 'react';
import {useLocale} from './LocaleProvider';
import {localizeChildren} from './LocalizedElements';
import {translate} from '@/lib/i18n/catalog';
export default function LocalizedLink(props:ComponentProps<typeof NextLink>){const {locale}=useLocale();return <NextLink {...props} aria-label={props['aria-label']?translate(props['aria-label'],locale):undefined} title={props.title?translate(props.title,locale):undefined}>{props.lang==='de'||props.translate==='no'?props.children:localizeChildren(props.children,locale)}</NextLink>}
