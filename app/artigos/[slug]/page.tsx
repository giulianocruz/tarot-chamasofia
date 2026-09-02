import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ARTICLES, articleCtaUrl, articleUrl, getArticle } from '@/lib/articles';
import styles from '../articles.module.css';

type PageProps = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return ARTICLES.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params; const article = getArticle(slug); if (!article) return {};
  return {
    title: article.seoTitle, description: article.description, keywords: [article.primaryKeyword, 'tarot', 'mapa astral', 'Chama Sofia'], alternates: { canonical: `/artigos/${slug}` },
    openGraph: { title: article.seoTitle, description: article.description, url: `/artigos/${slug}`, siteName: 'Chama Sofia', locale: 'pt_BR', type: 'article', publishedTime: article.publishedAt, modifiedTime: article.updatedAt, images: [{ url: article.heroImage, alt: article.heroAlt }] },
    twitter: { card: 'summary_large_image', title: article.seoTitle, description: article.description, images: [article.heroImage] },
  };
}
function wordCount(article: NonNullable<ReturnType<typeof getArticle>>) { return [...article.intro, ...article.sections.flatMap(s => [...s.paragraphs, ...(s.bullets || [])]), ...article.faq.flatMap(f => [f.question, f.answer])].join(' ').split(/\s+/).length; }
export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params; const article = getArticle(slug); if (!article) notFound();
  const related = article.relatedSlugs.map(getArticle).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const schema = { '@context':'https://schema.org', '@type':'Article', headline:article.title, description:article.description, image:[`https://tarot.chamasofia.com.br${article.heroImage}`], datePublished:article.publishedAt, dateModified:article.updatedAt, author:{'@type':'Organization',name:'Chama Sofia'}, publisher:{'@type':'Organization',name:'Chama Sofia',logo:{'@type':'ImageObject',url:'https://tarot.chamasofia.com.br/assets/brand/chama-sofia-logo.png'}}, mainEntityOfPage:articleUrl(slug) };
  const faqSchema = { '@context':'https://schema.org', '@type':'FAQPage', mainEntity:article.faq.map(f => ({ '@type':'Question', name:f.question, acceptedAnswer:{'@type':'Answer',text:f.answer} })) };
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl(slug))}`;
  return <main className={styles.shell}><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema)}}/>
    <header className={styles.header}><Link href="/artigos" className={styles.brand}><img src="/assets/brand/chama-sofia-logo.png" alt=""/><span>CHAMA SOFIA</span></Link><Link href="/artigos" className={styles.headerCta}>Todos os guias</Link></header>
    <article className={styles.article}><nav className={styles.breadcrumb}><Link href="/artigos">Artigos</Link><span>›</span><span>{article.eyebrow}</span></nav>
    <header className={styles.articleHero}><div><p className={styles.eyebrow}>{article.eyebrow}</p><h1>{article.title}</h1><p className={styles.deck}>{article.description}</p><div className={styles.meta}><span>Atualizado em 2 de setembro de 2026</span><span>≈ {Math.max(5, Math.round(wordCount(article)/210))} min de leitura</span></div></div><figure><img src={article.heroImage} alt={article.heroAlt}/><figcaption>Imagem simbólica do acervo Chama Sofia.</figcaption></figure></header>
    <div className={styles.articleLayout}><div className={styles.content}>
      <div className={styles.intro}>{article.intro.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
      {article.sections.map((section,index)=><section key={section.heading} id={`secao-${index+1}`}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph,pIndex)=><p key={pIndex}>{paragraph}</p>)}{section.bullets&&<ul>{section.bullets.map(item=><li key={item}>{item}</li>)}</ul>}</section>)}
      <aside className={styles.inlineCta}><span>AstroTarot Chama Sofia</span><h2>Leve uma pergunta real para a prática.</h2><p>Escolha três cartas e veja uma prévia gratuitamente. Se fizer sentido, você decide se quer liberar a análise completa com mapa natal, céu do momento e PDF.</p><Link href={articleCtaUrl(slug)} className={styles.primaryButton}>FAZER MINHA PERGUNTA <b>→</b></Link><small>Pagamento único de R$ 9,90 somente se você decidir aprofundar.</small></aside>
      <section className={styles.faq}><p className={styles.eyebrow}>Perguntas frequentes</p><h2>Respostas rápidas</h2>{article.faq.map(item=><details key={item.question}><summary>{item.question}<span>+</span></summary><p>{item.answer}</p></details>)}</section>
      <p className={styles.disclaimer}>Tarot e astrologia são apresentados como ferramentas simbólicas de reflexão e autoconhecimento. Não representam garantia de acontecimentos futuros e não substituem orientação profissional em saúde, direito, finanças ou segurança.</p>
      <div className={styles.share}><span>Este guia ajudou?</span><a href={shareUrl} target="_blank" rel="noreferrer">Compartilhar no Facebook</a></div>
    </div>
    <aside className={styles.sidebar}><div><span className={styles.sideLabel}>Continue explorando</span>{related.map(item=><Link href={`/artigos/${item.slug}`} key={item.slug}><small>{item.eyebrow}</small><strong>{item.title}</strong></Link>)}</div><Link href={articleCtaUrl(slug)} className={styles.sideCta}><small>PRÉVIA GRÁTIS</small><strong>3 cartas para a sua pergunta</strong><span>Começar →</span></Link></aside></div>
    </article>
    <footer className={styles.footer}><Link href="/artigos">Artigos</Link><Link href="/consulta">AstroTarot</Link><Link href="/biblioteca">Biblioteca</Link><span>© {new Date().getFullYear()} Chama Sofia</span></footer>
  </main>;
}
