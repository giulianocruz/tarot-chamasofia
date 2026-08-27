import type { Metadata } from 'next';
import AdminClient from './admin-client';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Gestão | Chama Sofia',robots:{index:false,follow:false},openGraph:{images:[]},twitter:{images:[]}};
export default function AdminPage(){return <AdminClient/>}
