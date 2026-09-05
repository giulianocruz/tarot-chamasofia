import type { Metadata } from 'next';
import ConsultEnClient from './consult-en-client';
import '../en.css';

export const metadata: Metadata = {
  title: 'Start Your Tarot + Birth Chart Reading | Chama Sofia',
  description: 'Choose your focus, reveal three Tarot cards and unlock a private astrology + Tarot reading.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/en/consult' },
  openGraph: { title: 'Start Your Tarot + Birth Chart Reading | Chama Sofia', description: 'Choose your focus, reveal three Tarot cards and unlock a private astrology + Tarot reading.', url: '/en/consult', locale: 'en_US', type: 'website' },
};

export default function EnglishConsultPage() {
  return <ConsultEnClient />;
}
