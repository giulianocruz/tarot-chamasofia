import type { Metadata } from 'next';
import ViabilityClient from './viability-client';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Viabilidade | Chama Sofia',robots:{index:false,follow:false},openGraph:{images:[]},twitter:{images:[]}};

export default function ViabilityPage(){return <ViabilityClient/>}
