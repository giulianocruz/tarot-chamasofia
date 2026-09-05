import type { Metadata } from 'next';
import Link from 'next/link';
import EnTracker from './en-tracker';
import './en.css';

export const metadata: Metadata = {
  title: 'Birth Chart + Tarot Reading | Chama Sofia',
  description: 'A personalized reading combining your birth chart, current transits and three Tarot cards. Private, reflective and made for your question.',
  alternates: { canonical: '/en', languages: { 'en-US': '/en', 'pt-BR': '/' } },
  openGraph: { title: 'Birth Chart + Tarot Reading | Chama Sofia', description: 'Your sky, your question and three cards in one personalized reading.', url: '/en', locale: 'en_US', type: 'website', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Birth Chart + Tarot Reading - Chama Sofia' }] },
  twitter: { card: 'summary_large_image', title: 'Birth Chart + Tarot Reading | Chama Sofia', description: 'Your sky, your question and three cards in one personalized reading.', images: ['/og.png'] },
};

export default function EnglishHome() {
  return <main className="en-shell" lang="en-US"><EnTracker />
    <header className="en-nav"><Link href="/en" className="en-brand"><img src="/assets/brand/chama-sofia-logo.png" alt=""/><span>CHAMA SOFIA</span></Link><Link href="/">Português</Link></header>
    <section className="en-hero">
      <p className="en-kicker">PERSONALIZED ASTROLOGY + TAROT</p>
      <h1>Your sky.<br/>Your question.<br/>Three cards.</h1>
      <p className="en-lead">A private reading that connects your birth chart, the current sky and Tarot to the question that matters to you right now.</p>
      <div className="en-price"><span>EARLY ACCESS PRICE</span><strong>$1.99</strong><small>One-time payment · no subscription</small></div>
      <a className="en-cta" href="/en/consult">START MY READING <span>→</span></a>
      <div className="en-trust"><span>✓ Private result</span><span>✓ No account required</span><span>✓ International checkout</span></div>
    </section>
    <section className="en-how" id="experience">
      <p className="en-kicker">HOW IT WORKS</p><h2>More than a random card pull</h2>
      <div className="en-grid">
        <article><b>01</b><h3>Choose what matters</h3><p>Love, money, career or a decision you cannot stop thinking about.</p></article>
        <article><b>02</b><h3>Reveal three cards</h3><p>Past influence, present tension and the direction that deserves your attention.</p></article>
        <article><b>03</b><h3>Add your birth sky</h3><p>Your birth chart and current transits add a second layer of context to the Tarot.</p></article>
      </div>
    </section>
    <section className="en-focus"><p className="en-kicker">BUILT AROUND YOUR QUESTION</p><h2>What is taking up space in your mind?</h2><div className="en-themes"><span>♡ Love & attraction</span><span>◇ Money & growth</span><span>✦ Career & ambition</span><span>◉ Decisions & direction</span></div><p>You will see a meaningful preview before deciding whether to unlock the complete reading.</p><a className="en-cta en-secondary" href="/en/consult">START MY READING <span>→</span></a><small>Complete the guided preview first. Card checkout activates when the international payment account is connected.</small></section>
    <section className="en-value"><p className="en-kicker">WHAT YOU RECEIVE</p><h2>A compact reading you can return to</h2><div className="en-grid"><article><h3>3-card Tarot reading</h3><p>Connected to your exact question instead of generic daily advice.</p></article><article><h3>Birth chart layer</h3><p>Your natal placements and current transits are used as context, not certainty.</p></article><article><h3>Private digital result</h3><p>A personal link and downloadable reading designed to be saved and revisited.</p></article></div></section>
    <section className="en-note"><strong>About the reading</strong><p>Tarot and astrology are offered for reflection, entertainment and self-knowledge. They do not guarantee future events and do not replace medical, legal, financial or psychological advice.</p></section>
    <footer className="en-footer"><div><strong>Chama Sofia</strong><span>Operated by Próxima Digital · CNPJ 68.964.484/0001-22 · Brazil</span><span><Link href="/en/terms">Terms</Link> · <Link href="/en/privacy">Privacy</Link> · <Link href="/en/refunds">Refunds</Link></span></div><div><span>Built with love by <a href="https://proximaera.com.br" target="_blank" rel="noreferrer">proximaera.com.br</a></span><Link href="/">Brazilian Portuguese version</Link></div></footer>
  </main>;
}
