import type {Metadata} from 'next';
import {LingovoLanding} from '@/components/lingovo/LingovoLanding';
export const metadata:Metadata={title:{absolute:'Lingovo — German learning, one clear next step'},description:'A1 foundations and C1 German practice with Armenian, Russian, English and German interface options.'};
export default function HomePage(){return <LingovoLanding/>}
