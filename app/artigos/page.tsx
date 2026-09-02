import type { Metadata } from 'next';
import Link from 'next/link';
import { ARTICLES } from '@/lib/articles';
import styles from './articles.module.css';

export const metadata: Metadata = {
  title: 'Tarot e Astrologia: Guias Práticos | Chama Sofia',
  description: 'Guias de Tarot, relacionamentos e mapa astral para transformar dúvidas em perguntas melhores e reflexões mais claras.',
  alternates: { canonical: '/artigos' },
  openGraph: { title: 'Guias de Tarot e Astrologia | Chama Sofia', description: 'Conteúdo prático sobre Tarot, mapa astral, relacionamentos e decisões.', url: '/artigos', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Guias de Tarot e Astrologia | Chama Sofia', description: 'Conteúdo prático sobre Tarot, mapa astral, relacionamentos e decisões.' },
};

export default function ArticlesPage() {
  return <main className={styles.shell}>
    <header className={styles.header}><Link href="/consulta" className={styles.brand}><img src="/assets/brand/chama-sofia-logo.png" alt="" /> <span>CHAMA SOFIA</span></Link><Link href="/consulta" className={styles.headerCta}>Fazer uma leitura</Link></header>
    <section className={styles.hubHero}><p className={styles.eyebrow}>Biblioteca editorial Chama Sofia</p><h1>Perguntas melhores.<br />Leituras mais claras.</h1><p>Guias para usar Tarot e astrologia como ferramentas de reflexão — com contexto, limites e aplicações práticas para amor, trabalho e decisões.</p></section>
    <section className={styles.grid} aria-label="Artigos publicados">
      {ARTICLES.map((article, index) => <article className={index === 0 ? styles.featuredCard : styles.card} key={article.slug}>
        <Link href={`/artigos/${article.slug}`} className={styles.cardImage}><img src={article.heroImage} alt={article.heroAlt} /></Link>
        <div className={styles.cardBody}><span>{article.eyebrow}</span><h2><Link href={`/artigos/${article.slug}`}>{article.title}</Link></h2><p>{article.description}</p><Link href={`/artigos/${article.slug}`} className={styles.readLink}>Ler o guia <b>→</b></Link></div>
      </article>)}
    </section>
    <section className={styles.hubCta}><p className={styles.eyebrow}>Quer aplicar isso à sua pergunta?</p><h2>Escolha 3 cartas e veja uma prévia antes de decidir.</h2><p>O AstroTarot combina sua pergunta, as cartas e — se você quiser aprofundar — o mapa natal e o céu do momento.</p><Link href="/consulta?utm_source=organic&utm_medium=article_hub&utm_campaign=seo_cluster" className={styles.primaryButton}>VER MINHA PRÉVIA <span>→</span></Link></section>
    <footer className={styles.footer}><Link href="/consulta">AstroTarot</Link><Link href="/biblioteca">Biblioteca</Link><span>© {new Date().getFullYear()} Chama Sofia</span></footer>
  </main>;
}
