import type { Metadata } from 'next';
import { getCommercialOffers } from '@/lib/offers';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Biblioteca Espiritual | Chama Sofia',description:'Conheça os livros digitais oficiais da SofIA Labs: Tarot para Iniciantes, Pomba Gira e Preto Velho.',alternates:{canonical:'/biblioteca'}};

const bookDetails={
  'tarot-para-iniciantes':{theme:'Tarô e autoconhecimento',description:'Um guia visual dos 22 Arcanos Maiores, com significados, exemplos práticos, tiragens e exercícios para sua jornada.',play:'https://play.google.com/store/books/details?id=wmr9EQAAQBAJ'},
  'pomba-gira':{theme:'Espiritualidade brasileira',description:'Uma obra de estudo sobre história, símbolos, arquétipos e falanges femininas da Umbanda, apresentada com respeito e responsabilidade.',play:'https://play.google.com/store/books/details?id=n2btEQAAQBAJ'},
  'preto-velho':{theme:'Sabedoria e ancestralidade',description:'Uma leitura sobre caridade, orações e os caminhos dos guardiões mais velhos da Umbanda.',play:'https://play.google.com/store/books/details?id=du3vEQAAQBAJ'},
} as const;

export default async function LibraryPage(){
  const offers=await getCommercialOffers();
  return <main className="books-shell"><header className="reading-header"><a className="brand" href="/"><span className="brand-mark">✦</span><span>CHAMA SOFIA</span></a><a href="/">Fazer uma leitura</a></header>
    <section className="books-hero"><p className="eyebrow">Biblioteca Espiritual · SofIA Labs</p><h1>Três livros para aprofundar sua jornada</h1><p>Conheça os títulos oficiais da coleção. A campanha principal continua concentrada na Leitura Essencial de Tarô.</p><a className="primary-button" href="/#pergunta">FAZER MINHA LEITURA <span>→</span></a></section>
    <section className="books-catalog">{offers.books.map(book=>{const details=bookDetails[book.slug];return <article key={book.slug}><img src={book.cover} alt={`Capa do livro ${book.title}`} width="500" height="750"/><div><span>{details.theme}</span><h2>{book.title}</h2><p>{details.description}</p><small>{book.available?'Disponível na Biblioteca Completa':'Disponibilidade interna em atualização'}</small><div className="book-links">{book.slug==='tarot-para-iniciantes'?<a href="/#pergunta">Receber com minha leitura</a>:<a href="/#pergunta">Conhecer o Pacote Completo</a>}<a href={details.play} target="_blank" rel="noopener noreferrer">Ver versão oficial no Google Play</a></div></div></article>})}</section>
    <section className="books-complete"><p className="eyebrow">Melhor custo-benefício</p><h2>Biblioteca Completa</h2><p>Leitura personalizada, interpretação em PDF e os três livros oficiais por {offers.complete.formatted}.</p><a className="primary-button" href="/#pergunta">ESCOLHER PACOTE COMPLETO</a></section>
    <footer><p>Obras digitais da SofIA Labs. A espiritualidade é apresentada para estudo, reflexão e autoconhecimento.</p></footer>
  </main>;
}
