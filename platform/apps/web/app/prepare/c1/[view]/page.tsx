import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import type {C1View} from '@lingovo/c1';
import {C1Workspace} from '@/components/lingovo/C1Workspace';
const views=['course','today','review','cheat-sheets','library','studio','book','practice','vocabulary','progress','notebook','teacher','about'];
export function generateStaticParams(){return views.map(view=>({view}))}
export const dynamicParams=false;
export const metadata={title:'C1 · TestDaF'};
export default async function Page({params}:{params:Promise<{view:string}>}){const {view}=await params;if(!views.includes(view))notFound();return <Suspense fallback={<p>Lingovo C1…</p>}><C1Workspace view={view as C1View}/></Suspense>}
