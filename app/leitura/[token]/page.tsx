import type { Metadata } from 'next';
import ReadingClient from './reading-client';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title:'Sua leitura privada | Chama Sofia', description:'Acesse sua leitura privada de Tarot.', robots:{index:false,follow:false}, openGraph:{images:[]}, twitter:{images:[]} };
export default async function ReadingPage({params}:{params:Promise<{token:string}>}) { const {token}=await params; return <ReadingClient token={token}/>; }
