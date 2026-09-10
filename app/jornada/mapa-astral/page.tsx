import type { Metadata } from 'next';
import Link from 'next/link';
import JornadaMapClient from './jornada-map-client';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Mapa Astral Grátis | Jornada Sofia',
  description: 'Descubra gratuitamente seu Sol, Lua, Ascendente, planetas pessoais e uma leitura resumida para começar sua Jornada Sofia.',
  alternates: { canonical: 'https://jornada.chamasofia.com.br/mapa-astral' },
  keywords: ['mapa astral grátis', 'mapa astral completo grátis', 'ascendente grátis', 'jornada sofia'],
  openGraph: {
    title: 'Descubra quem você é além do seu signo | Jornada Sofia',
    description: 'Seu mapa astral resumido, gratuito e imediato. Sem cartão.',
    url: 'https://jornada.chamasofia.com.br/mapa-astral',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Jornada Sofia — Mapa Astral Grátis' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mapa Astral Grátis | Jornada Sofia',
    description: 'Descubra Sol, Lua, Ascendente e seus planetas pessoais. Resultado imediato.',
    images: ['/og.png'],
  },
};

const benefits = [
  ['☉', 'Seu centro', 'Sol e identidade'],
  ['☾', 'Seu mundo emocional', 'Lua e necessidades'],
  ['ASC', 'Como você chega', 'Ascendente, com horário'],
  ['♀', 'Como você se vincula', 'Vênus e afetos'],
  ['♂', 'Como você age', 'Marte e impulso'],
  ['✦', 'Sua síntese', 'Uma leitura em linguagem humana'],
];

export default function JornadaMapaAstralPage() {
  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Mapa Astral Grátis — Jornada Sofia',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    url: 'https://jornada.chamasofia.com.br/mapa-astral',
    description: 'Experiência gratuita de mapa natal resumido da Jornada Sofia.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    provider: { '@type': 'Organization', name: 'Chama Sofia', url: 'https://chamasofia.com.br' },
  };

  return (
    <main className={styles.shell}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <header className={styles.header}>
        <Link className={styles.brand} href="/jornada/mapa-astral" aria-label="Jornada Sofia">
          <span className={styles.brandMark}>✦</span>
          <span><b>JORNADA</b><small>SOFIA</small></span>
        </Link>
        <span className={styles.freeBadge}>100% GRÁTIS · SEM CARTÃO</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>SUA JORNADA COMEÇA NO CÉU</p>
          <h1>Seu signo é só o começo.<br/><em>Descubra quem você é além dele.</em></h1>
          <p className={styles.lead}>Crie seu mapa astral gratuitamente e receba uma leitura resumida dos pontos mais importantes do seu céu de nascimento.</p>
          <div className={styles.promises}>
            <span>✓ resultado imediato</span><span>✓ sem cartão</span><span>✓ cálculo com local e fuso</span>
          </div>
          <div className={styles.socialProof}><strong>Uma experiência para se reconhecer, não para se rotular.</strong><span>Astrologia apresentada como linguagem simbólica de reflexão.</span></div>
        </div>
        <JornadaMapClient />
      </section>

      <section className={styles.discovery}>
        <p className={styles.eyebrow}>O QUE VOCÊ VAI DESCOBRIR</p>
        <h2>Um retrato do seu céu em poucos minutos.</h2>
        <p>Você recebe valor antes de qualquer oferta. Depois, decide se quer aprofundar alguma parte da sua Jornada.</p>
        <div className={styles.benefitGrid}>
          {benefits.map(([icon, title, text]) => <article key={title}><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div></article>)}
        </div>
      </section>

      <section className={styles.journeyPreview}>
        <div>
          <p className={styles.eyebrow}>DEPOIS DO MAPA</p>
          <h2>Você escolhe até onde quer ir.</h2>
          <p>Seu resultado gratuito abre a Jornada Sofia. Amor, prosperidade, chakras, propósito, arquétipos e Tarot aparecem como próximos caminhos — sem interromper sua descoberta inicial.</p>
        </div>
        <div className={styles.pathRail} aria-label="Etapas da Jornada Sofia">
          <span className={styles.done}>Mapa Astral <b>✓</b></span>
          <span>Amor <b>◇</b></span>
          <span>Chakras <b>◇</b></span>
          <span>Propósito <b>◇</b></span>
          <span>Tarot <b>◇</b></span>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Jornada Sofia · uma experiência Chama Sofia</span>
        <nav><a href="https://chamasofia.com.br">Chama Sofia</a><a href="https://tarot.chamasofia.com.br">Tarot</a></nav>
      </footer>
    </main>
  );
}
