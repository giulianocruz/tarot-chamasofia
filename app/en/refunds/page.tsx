import type { Metadata } from 'next';
import Link from 'next/link';
import '../en.css';

export const metadata: Metadata = { title:'Refund Policy | Chama Sofia', description:'Refund and delivery policy for personalized digital Chama Sofia readings.', alternates:{canonical:'/en/refunds'} };

export default function RefundsPage(){return <main className="en-legal"><Link href="/en" className="en-brand"><img src="/assets/brand/chama-sofia-logo.png" alt=""/><span>CHAMA SOFIA</span></Link><p className="en-kicker">REFUND & DELIVERY POLICY</p><h1>Personalized digital delivery, with fair review of problems.</h1><p>Last updated September 5, 2026.</p>
<section><h2>Personalized digital product</h2><p>Your reading is generated specifically from your question, selected cards and, after payment, your birth information. Generation may begin immediately after payment confirmation.</p></section>
<section><h2>When a refund or correction may be appropriate</h2><p>Please request review if you were charged more than once for the same order, payment was confirmed but the product could not be accessed due to a technical failure, or a material delivery problem could not be resolved.</p></section>
<section><h2>Problems we can often fix first</h2><p>If an email does not arrive, the private access link or payment confirmation can often be recovered. If astrology calculation fails because a birthplace cannot be resolved, we may ask you to correct the location rather than create a new charge.</p></section>
<section><h2>Personalized content already generated</h2><p>Because the service creates individualized digital content, refund eligibility can depend on the circumstances and applicable law once generation or delivery has begun. This policy does not remove mandatory consumer rights available in your jurisdiction.</p></section>
<section><h2>How to request review</h2><p>Keep your order number and use the operational contact information available through proximaera.com.br. We may need the order identifier and email used at checkout to locate the transaction.</p></section>
<section><h2>Operator</h2><p>Chama Sofia is operated by Próxima Digital, CNPJ 68.964.484/0001-22, Brazil.</p></section>
<footer><Link href="/en/terms">Terms of Use</Link><Link href="/en/privacy">Privacy Policy</Link><Link href="/en">Back to Chama Sofia</Link></footer></main>}
