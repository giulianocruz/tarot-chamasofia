import type { Metadata } from 'next';
import Link from 'next/link';
import '../en.css';

export const metadata: Metadata = { title:'Terms of Use | Chama Sofia', description:'Terms for Chama Sofia personalized digital Astrology + Tarot readings.', alternates:{canonical:'/en/terms'} };

export default function TermsPage(){return <main className="en-legal"><Link href="/en" className="en-brand"><img src="/assets/brand/chama-sofia-logo.png" alt=""/><span>CHAMA SOFIA</span></Link><p className="en-kicker">TERMS OF USE</p><h1>Clear terms for a personal digital reading.</h1><p>Last updated September 5, 2026.</p>
<section><h2>1. Operator</h2><p>Chama Sofia is operated by Próxima Digital, CNPJ 68.964.484/0001-22, Brazil. Technology and product development are supported by proximaera.com.br.</p></section>
<section><h2>2. The service</h2><p>The international product is a personalized digital Astrology + Tarot reading based on the information you provide, selected Tarot cards, birth-chart calculations and current transits. The displayed price is a one-time payment. There is no subscription unless a future offer explicitly says otherwise.</p></section>
<section><h2>3. Nature of the content</h2><p>Tarot and astrology are provided for reflection, entertainment and self-knowledge. They do not guarantee future events and are not a substitute for medical, psychological, legal, financial or other professional advice.</p></section>
<section><h2>4. Your information</h2><p>You are responsible for providing sufficiently accurate contact and birth information. If birth time is unknown, the product may use a technical reference time and will identify limits on Ascendant and house precision.</p></section>
<section><h2>5. Digital delivery</h2><p>Personalized content may begin generating immediately after payment confirmation. Access is delivered through a private link and, when available, transactional email. Keep your private access link secure.</p></section>
<section><h2>6. Payments and disputes</h2><p>International card payments are processed by Stripe when enabled. Chama Sofia does not need to store your full card number. Duplicate charges, technical failures and inaccessible delivery can be reviewed under the Refund Policy and applicable consumer law.</p></section>
<section><h2>7. Applicable rights</h2><p>Nothing in these terms removes mandatory consumer or data-protection rights that apply to you. Questions about the operation may be directed through proximaera.com.br.</p></section>
<footer><Link href="/en/privacy">Privacy Policy</Link><Link href="/en/refunds">Refund Policy</Link><Link href="/en">Back to Chama Sofia</Link></footer></main>}
