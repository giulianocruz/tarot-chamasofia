import type { Metadata } from 'next';
import SuccessEnClient from './success-en-client';
import '../../en.css';

export const metadata: Metadata = { title:'Payment Confirmation | Chama Sofia', robots:{index:false,follow:false} };

export default function SuccessPage(){ return <SuccessEnClient/>; }
