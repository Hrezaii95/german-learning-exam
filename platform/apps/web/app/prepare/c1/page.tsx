import {Suspense} from 'react';
import {C1Workspace} from '@/components/lingovo/C1Workspace';
export const metadata={title:'C1 · TestDaF'};
export default function Page(){return <Suspense fallback={<p>Lingovo C1…</p>}><C1Workspace/></Suspense>}
