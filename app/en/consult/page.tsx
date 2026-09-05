import type { Metadata } from 'next';
import ConsultEnClient from './consult-en-client';
import '../en.css';

export const metadata: Metadata = {
  title: 'Start Your Tarot + Birth Chart Reading | Chama Sofia',
  description: 'Choose your focus, reveal three Tarot cards and unlock a private astrology + Tarot reading.',
  robots: { index: false, follow: false },
};

export default function EnglishConsultPage() {
  return <ConsultEnClient />;
}
