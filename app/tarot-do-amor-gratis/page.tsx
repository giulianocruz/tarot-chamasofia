import type { Metadata } from 'next';
import Link from 'next/link';
import LoveTarotClient from './love-tarot-client';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Tarot do Amor Grátis: Tire 3 Cartas Online | Chama Sofia',
  description: 'Faça uma tiragem grátis de 3 cartas para refletir sobre amor, reciprocidade e próximos passos. Sem cadastro e com resultado imediato.',
  keywords: ['tarot do amor grátis','tarot grátis 3 cartas','o que ele sente por mim tarot','tarot amor online grátis'],
  alternates: { canonical: '/tarot-do-amor-gratis' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Tarot do Amor Grátis · 3 Cartas | Chama Sofia',
    description: 'Escolha 3 cartas e veja uma leitura simbólica para sua situação amorosa.',
    url: '/tarot-do-amor-gratis', type: 'website',
    images: [{ url: '/assets/tarot/cards/enamorados.webp', alt: 'Os Enamorados em uma leitura de Tarot do amor' }],
  },
  twitter: { card: 'summary_large_image', title: 'Tarot do Amor Grátis · 3 Cartas', description: 'Escolha 3 cartas e veja sua leitura gratuita.', images: ['/assets/tarot/cards/enamorados.webp'] },
};

const FAQ = [
  ['O Tarot consegue dizer exatamente o que outra pessoa sente?', 'Não de forma verificável. A tiragem ajuda a refletir sobre a dinâmica, sinais, expectativas e sua própria postura, mas não substitui conversa nem evidências sobre sentimentos de outra pessoa.'],
  ['A tiragem de 3 cartas é realmente grátis?', 'Sim. Você escolhe três cartas e vê a leitura sem cadastro e sem pagamento. A análise AstroTarot completa é opcional.'],
  ['Posso repetir a pergunta várias vezes?', 'Pode, mas repetir até aparecer uma resposta desejada tende a aumentar a confusão. Prefira registrar a primeira leitura e voltar quando houver fatos novos.'],
  ['Tarot do amor prevê reconciliação ou casamento?', 'Não com garantia. As cartas são usadas aqui como linguagem simbólica para observar padrões, possibilidades e limites, não como promessa de acontecimentos futuros.'],
] as const;
export default function LoveTarotPage() {
  const appSchema = {
    '@context':'https://schema.org', '@type':'WebApplication', name:'Tarot do Amor Grátis Chama Sofia',
    applicationCategory:'LifestyleApplication', operatingSystem:'Web',
    url:'https://tarot.chamasofia.com.br/tarot-do-amor-gratis',
    description:'Tiragem gratuita de três cartas para reflexão sobre relacionamentos.',
    offers:{ '@type':'Offer', price:'0', priceCurrency:'BRL' },
  };
  const faqSchema = {
    '@context':'https://schema.org', '@type':'FAQPage',
    mainEntity: FAQ.map(([question,answer]) => ({ '@type':'Question', name:question, acceptedAnswer:{ '@type':'Answer', text:answer } })),
  };

  return <main className={styles.shell}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(appSchema)}} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema)}} />
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><img src="/assets/brand/chama-sofia-logo.png" alt=""/><span>CHAMA SOFIA</span></Link>
      <nav><Link href="/mapa-astral-gratis">Mapa grátis</Link><Link href="/artigos">Guias</Link></nav>
    </header>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>TAROT DO AMOR · 3 CARTAS GRÁTIS</p>
        <h1>Uma pergunta de amor. <em>Três cartas.</em> Mais clareza para olhar o que está acontecendo.</h1>
        <p>Escolha uma pergunta ou escreva a sua. Depois selecione três cartas para observar a dinâmica, o ponto que pede atenção e uma orientação para você.</p>
        <div className={styles.trust}><span>✓ sem cadastro</span><span>✓ resultado imediato</span><span>✓ sem pagamento</span></div>
      </div>
      <LoveTarotClient />
    </section>
    <section className={styles.explainer}>
      <p className={styles.eyebrow}>COMO LER SEM SE ENGANAR</p>
      <h2>O foco não é “entrar na mente” de alguém.</h2>
      <div className={styles.infoGrid}>
        <article><b>1 · Dinâmica</b><p>O que aparece na relação e quais sinais merecem ser observados agora.</p></article>
        <article><b>2 · Ponto de atenção</b><p>O que pode estar confuso, idealizado, evitado ou exigindo limite.</p></article>
        <article><b>3 · Orientação</b><p>Uma lente simbólica para seu próximo passo — sem terceirizar sua decisão.</p></article>
      </div>
    </section>
    <section className={styles.articleSection}>
      <div>
        <p className={styles.eyebrow}>TAROT DO AMOR ONLINE GRÁTIS</p>
        <h2>“O que ele sente por mim?” pode virar uma pergunta melhor.</h2>
        <p>Quando existe silêncio, afastamento ou mensagens ambíguas, é natural querer uma resposta objetiva. Mas sentimento sem atitude é informação incompleta. Por isso, esta experiência usa as cartas para organizar sinais, expectativas e escolhas — não para declarar como fato o que outra pessoa pensa.</p>
        <p>Se quiser aprofundar essa forma de leitura, veja o guia <Link href="/artigos/tarot-do-amor-o-que-ele-sente-por-mim">Tarot do amor: o que ele sente por mim?</Link> e nosso artigo sobre <Link href="/artigos/quais-perguntas-fazer-no-tarot">quais perguntas fazer no Tarot</Link>.</p>
      </div>
      <aside><strong>Cartas mostram símbolos, não contratos.</strong><p>Use a leitura para comparar o simbolismo com comportamentos reais, reciprocidade, conversa e limites.</p></aside>
    </section>
    <section className={styles.nextStep}>
      <div><p className={styles.eyebrow}>OUTRA PORTA DE ENTRADA</p><h2>Quer conhecer primeiro o seu mapa natal?</h2><p>Descubra gratuitamente Sol, Lua, planetas pessoais e Ascendente quando houver horário confiável.</p></div>
      <Link href="/mapa-astral-gratis" className={styles.secondaryCta}>FAZER MAPA ASTRAL GRÁTIS <span>→</span></Link>
    </section>
    <section className={styles.faq}>
      <p className={styles.eyebrow}>PERGUNTAS FREQUENTES</p><h2>Dúvidas sobre o Tarot do amor grátis</h2>
      {FAQ.map(([question,answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}
    </section>
    <section className={styles.related}>
      <h2>Continue explorando</h2><div>
        <Link href="/artigos/casa-7-mapa-astral"><span>Relacionamentos</span><strong>Casa 7 no mapa astral →</strong></Link>
        <Link href="/artigos/quais-perguntas-fazer-no-tarot"><span>Leitura melhor</span><strong>Perguntas para fazer no Tarot →</strong></Link>
        <Link href="/mapa-astral-gratis"><span>Astrologia</span><strong>Mapa astral grátis →</strong></Link>
      </div>
    </section>
    <footer className={styles.footer}><Link href="/artigos">Artigos</Link><Link href="/consulta">AstroTarot</Link><Link href="/biblioteca">Biblioteca</Link><span>© {new Date().getFullYear()} Chama Sofia</span></footer>
  </main>;
}
