import type { Metadata } from "next";
import BibliotecaClient from "./biblioteca-client";
import { BOOK_CATALOG } from "@/lib/book-catalog";

export const metadata: Metadata = {
  title: "Biblioteca Chama Sofia | E-books digitais",
  description: "E-books digitais sobre Tarot, Exu, Pomba Gira e Preto Velho com pagamento via Pix e acesso privado.",
  alternates: { canonical: "/biblioteca" },
  openGraph: {
    title: "Biblioteca Chama Sofia",
    description: "E-books digitais para continuar sua jornada de estudo e reflexão.",
    url: "/biblioteca",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Biblioteca Chama Sofia" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Biblioteca Chama Sofia | E-books digitais",
    description: "Tarot, Exu, Pomba Gira e Preto Velho em edições digitais com acesso privado.",
    images: ["/og.png"],
  },
};

export default function BibliotecaPage() {
  const collectionSchema = { '@context':'https://schema.org', '@type':'CollectionPage', name:'Biblioteca Chama Sofia', url:'https://tarot.chamasofia.com.br/biblioteca', description:'Acervo digital de e-books sobre Tarot e tradições da Umbanda.' };
  const booksSchema = { '@context':'https://schema.org', '@type':'ItemList', numberOfItems:BOOK_CATALOG.length, itemListElement:BOOK_CATALOG.map((book,index)=>({ '@type':'ListItem', position:index+1, item:{ '@type':'Book', name:book.title, description:book.description, image:`https://tarot.chamasofia.com.br${book.cover}`, publisher:{'@type':'Organization',name:'Chama Sofia'} } })) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(collectionSchema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(booksSchema)}}/><BibliotecaClient /></>;
}
