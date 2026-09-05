import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Gestão | Chama Sofia',
  robots: { index: false, follow: false },
};

export default function AdminEntryPage() {
  redirect('/oraculo-gestao-7f3a');
}
