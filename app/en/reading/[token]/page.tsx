import type { Metadata } from 'next';
import ReadingEnClient from './reading-en-client';
import '../../en.css';

export const metadata: Metadata = { title:'Your Private Reading | Chama Sofia', robots:{index:false,follow:false} };

export default async function EnglishReadingPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  return <ReadingEnClient token={token}/>;
}
