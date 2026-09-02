import type { Metadata } from 'next';
import Link from 'next/link';
import FreeBirthChartClient from './free-birth-chart-client';
import styles from './page.module.css';

export const metadata: Metadata = {
  title:'Mapa Astral Grátis Online: Sol, Lua e Ascendente | Chama Sofia',
  description:'Faça seu mapa astral grátis online e veja uma prévia com Sol, Lua, Mercúrio, Vênus, Marte e Ascendente quando o horário de nascimento for conhecido.',
  alternates:{ canonical:'/mapa-astral-gratis' },
  keywords:['mapa astral grátis','mapa astral gratuito','mapa astral online grátis','mapa astral completo grátis'],
  openGraph:{
    title:'Mapa Astral Grátis Online | Chama Sofia',
    description:'Informe seus dados de nascimento e descubra os principais pontos do seu mapa astral gratuitamente.',
    url:'/mapa-astral-gratis', type:'website',
    images:[{url:'/assets/tarot/cards/estrela.webp',alt:'A Estrela, imagem simbólica de astrologia'}],
  },
  twitter:{card:'summary_large_image',title:'Mapa Astral Grátis Online | Chama Sofia',description:'Descubra Sol, Lua, planetas pessoais e Ascendente gratuitamente.',images:['/assets/tarot/cards/estrela.webp']},
};

const faq=[
  ['O mapa astral é realmente grátis?','Sim. A prévia com os principais pontos natais é gratuita e não exige pagamento. A análise AstroTarot completa, com sua pergunta, três cartas, céu do momento e PDF, é opcional.'],
  ['Preciso saber o horário de nascimento?','Não para ver Sol e vários planetas. Porém o horário é necessário para calcular Ascendente e casas com segurança. Se você não souber, a ferramenta deixa essa limitação explícita.'],
  ['O que aparece no mapa astral grátis?','A prévia mostra Sol, Lua, Mercúrio, Vênus e Marte. Quando o horário é conhecido, também exibimos o Ascendente calculado para o local e o fuso histórico do nascimento.'],
  ['Mapa astral prevê o futuro?','Não de forma garantida. O mapa natal é usado como linguagem simbólica para refletir sobre padrões, necessidades e formas de agir. Trânsitos podem contextualizar períodos, mas não substituem decisões ou orientação profissional.'],
];
export default function FreeBirthChartPage(){
  const appSchema={
    '@context':'https://schema.org','@type':'WebApplication',name:'Mapa Astral Grátis Chama Sofia',
    applicationCategory:'LifestyleApplication',operatingSystem:'Web',
    url:'https://tarot.chamasofia.com.br/mapa-astral-gratis',
    description:'Ferramenta gratuita para calcular os principais pontos do mapa natal.',
    offers:{'@type':'Offer',price:'0',priceCurrency:'BRL'},
  };
  const faqSchema={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([question,answer])=>({
    '@type':'Question',name:question,acceptedAnswer:{'@type':'Answer',text:answer},
  }))};
  return <main className={styles.shell}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(appSchema)}}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema)}}/>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><img src="/assets/brand/chama-sofia-logo.png" alt=""/><span>CHAMA SOFIA</span></Link>
      <nav><Link href="/artigos">Guias</Link><Link href="/consulta">AstroTarot</Link></nav>
    </header>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}>MAPA NATAL · PRÉVIA GRATUITA</p>
        <h1>Faça seu <em>mapa astral grátis</em> e descubra os pontos que moldam sua leitura.</h1>
        <p>Informe data, horário e cidade de nascimento. Você recebe uma prévia com Sol, Lua, Mercúrio, Vênus, Marte e, quando houver horário confiável, seu Ascendente.</p>
        <div className={styles.trust}><span>✓ grátis</span><span>✓ sem cadastro</span><span>✓ cálculo com fuso histórico</span></div>
      </div>
      <FreeBirthChartClient/>
    </section>
    <section className={styles.explainer}>
      <p className={styles.eyebrow}>ENTENDA SUA PRÉVIA</p><h2>O que cada ponto do mapa ajuda a observar?</h2>
      <div className={styles.infoGrid}>
        <article><b>☉ Sol</b><p>Identidade, direção e a forma como você busca expressar propósito.</p></article>
        <article><b>☾ Lua</b><p>Necessidades emocionais, segurança, hábitos e respostas mais automáticas.</p></article>
        <article><b>☿ Mercúrio</b><p>Comunicação, raciocínio, aprendizado e maneira de organizar ideias.</p></article>
        <article><b>♀ Vênus</b><p>Valores, trocas afetivas, prazer, atração e critérios de relacionamento.</p></article>
        <article><b>♂ Marte</b><p>Iniciativa, desejo, ação, impulso e modo de lidar com conflito.</p></article>
        <article><b>ASC Ascendente</b><p>O horizonte do nascimento; depende diretamente de horário e local precisos.</p></article>
      </div>
    </section>
    <section className={styles.articleSection}>
      <div><p className={styles.eyebrow}>MAPA ASTRAL ONLINE GRÁTIS</p><h2>Por que data, hora e cidade fazem diferença?</h2>
        <p>O mapa natal representa o céu para um momento e um lugar específicos. A data posiciona os planetas; a cidade permite localizar o horizonte e calcular o fuso histórico; o horário determina pontos sensíveis como Ascendente e casas.</p>
        <p>Quando a hora de nascimento não é conhecida, ainda podemos mostrar diversos planetas com utilidade. O que não fazemos é inventar precisão: Ascendente e casas ficam fora da prévia. Se esse é o seu caso, veja também nosso <Link href="/artigos/mapa-astral-sem-horario-de-nascimento">guia sobre mapa sem horário de nascimento</Link>.</p>
      </div>
      <aside><strong>Uma prévia, não uma sentença.</strong><p>Astrologia é apresentada aqui como ferramenta simbólica de reflexão. O resultado não garante acontecimentos futuros nem substitui orientação em saúde, finanças, direito ou segurança.</p></aside>
    </section>
    <section className={styles.nextStep}>
      <div><p className={styles.eyebrow}>DEPOIS DO MAPA</p><h2>Quer aplicar esses símbolos a uma pergunta real?</h2><p>O AstroTarot cruza sua pergunta com 3 cartas, seu mapa natal e o céu do momento. Você vê uma prévia da tiragem antes de decidir se quer liberar a análise completa.</p></div>
      <Link href="/consulta?utm_source=organic&utm_medium=free_tool&utm_campaign=mapa_astral_gratis&utm_content=page_cta" className={styles.mainCta}>FAZER MINHA PERGUNTA <span>→</span></Link>
    </section>
    <section className={styles.faq}><p className={styles.eyebrow}>PERGUNTAS FREQUENTES</p><h2>Dúvidas sobre o mapa astral grátis</h2>
      {faq.map(([question,answer])=><details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}
    </section>
    <section className={styles.related}><h2>Continue explorando</h2><div>
      <Link href="/artigos/casa-7-mapa-astral"><span>Relacionamentos</span><strong>Casa 7 no mapa astral →</strong></Link>
      <Link href="/artigos/mapa-astral-2026"><span>Ciclos</span><strong>Como ler seu mapa em 2026 →</strong></Link>
      <Link href="/artigos/mapa-astral-sem-horario-de-nascimento"><span>Dados incompletos</span><strong>Mapa sem horário →</strong></Link>
    </div></section>
    <footer className={styles.footer}><Link href="/artigos">Artigos</Link><Link href="/consulta">AstroTarot</Link><Link href="/biblioteca">Biblioteca</Link><span>© {new Date().getFullYear()} Chama Sofia</span></footer>
  </main>;
}
