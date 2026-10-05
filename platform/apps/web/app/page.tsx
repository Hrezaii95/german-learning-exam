import type {Metadata} from 'next';
import {LingovoLanding} from '@/components/lingovo/LingovoLanding';
export const metadata:Metadata={title:{absolute:'Lingovo — Գերմաներեն՝ քո լեզվով'},description:'Գերմաներեն՝ հայերեն բացատրություններով։ Սկսիր A1-ից և շարունակիր դեպի C1 ու TestDaF։'};
export default function HomePage(){return <LingovoLanding/>}
