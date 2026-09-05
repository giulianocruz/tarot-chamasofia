import type { Metadata } from 'next';
import Link from 'next/link';
import '../en.css';

export const metadata: Metadata = { title:'Privacy Policy | Chama Sofia', description:'How Chama Sofia handles information used to deliver personalized Astrology + Tarot readings.', alternates:{canonical:'/en/privacy'} };

export default function PrivacyPage(){return <main className="en-legal"><Link href="/en" className="en-brand"><img src="/assets/brand/chama-sofia-logo.png" alt=""/><span>CHAMA SOFIA</span></Link><p className="en-kicker">PRIVACY POLICY</p><h1>Your private reading starts with responsible data use.</h1><p>Last updated September 5, 2026.</p>
<section><h2>What we use</h2><p>To create and deliver your reading, we may process your name, email, question, selected cards, birth date, birth time, birthplace, order identifiers, payment status, campaign attribution and technical security data.</p></section>
<section><h2>Why we use it</h2><p>We use this information to provide the requested digital product, calculate astrology data, deliver private access, confirm payments, protect the service, measure funnel performance and improve the product.</p></section>
<section><h2>Service providers</h2><p>Relevant data may be processed by infrastructure, payment, astrology calculation, analytics and transactional email providers only as needed to operate the service. International card payments are designed to be handled by Stripe when enabled; full card details are handled by the payment processor rather than stored by Chama Sofia.</p></section>
<section><h2>Birth and question data</h2><p>Your question and birth information can be personal. They are used to personalize the reading and should not be shared publicly through your private result link.</p></section>
<section><h2>Retention and security</h2><p>Operational data is retained only as reasonably necessary for delivery, security, support, fraud prevention and legal or accounting obligations. We use access controls and private result tokens, but no internet service can promise absolute security.</p></section>
<section><h2>Your rights</h2><p>Depending on applicable law, you may have rights to access, correct, delete or obtain information about personal data processing. Brazilian data-protection rights, including those under the LGPD when applicable, remain respected.</p></section>
<section><h2>Contact</h2><p>Chama Sofia is operated by Próxima Digital, CNPJ 68.964.484/0001-22, Brazil. Operational contact and company information are available through proximaera.com.br.</p></section>
<footer><Link href="/en/terms">Terms of Use</Link><Link href="/en/refunds">Refund Policy</Link><Link href="/en">Back to Chama Sofia</Link></footer></main>}
