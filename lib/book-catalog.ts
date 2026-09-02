export type BookSlug =
  | "pomba-gira"
  | "exu-guardioes"
  | "preto-velho"
  | "tarot-iniciantes";

export type BookOffer = {
  slug: BookSlug;
  title: string;
  shortTitle: string;
  originalCents: number;
  promoCents: number;
  r2Key: string;
  cover: string;
  description: string;
  badge?: string;
};

export const BOOK_CATALOG: BookOffer[] = [
  {
    slug: "pomba-gira",
    title: "Pomba Gira — O Grande Livro das Falanges Femininas da Umbanda",
    shortTitle: "Pomba Gira",
    originalCents: 2190,
    promoCents: 499,
    r2Key: "pomba-gira-premium.pdf",
    cover: "/assets/books/pomba-gira.jpg",
    description: "Guardiãs, falanges, símbolos e caminhos da espiritualidade umbandista.",
  },
  {
    slug: "exu-guardioes",
    title: "Exu — O Grande Livro dos Guardiões da Umbanda",
    shortTitle: "Exu — Guardiões",
    originalCents: 2190,
    promoCents: 499,
    r2Key: "exu-guardioes-premium.pdf",
    cover: "/assets/books/exu-guardioes-premium.jpg",
    description: "Uma edição premium sobre Guardiões, símbolos, caminhos, ética e devoção.",
  },
  {
    slug: "preto-velho",
    title: "Preto Velho e suas Falanges",
    shortTitle: "Preto Velho",
    originalCents: 2190,
    promoCents: 499,
    r2Key: "preto-velho-premium.pdf",
    cover: "/assets/books/preto-velho-premium.jpg",
    description: "Sabedoria, tradição e ensinamentos em uma edição digital ampliada.",
  },
  {
    slug: "tarot-iniciantes",
    title: "Tarot para Iniciantes",
    shortTitle: "Cartomancia & Tarot",
    originalCents: 2990,
    promoCents: 990,
    r2Key: "tarot-para-iniciantes.pdf",
    cover: "/assets/books/tarot-para-iniciantes-oficial.jpg",
    description: "Tarot para Iniciantes — também incluído como brinde na leitura completa.",
    badge: "BRINDE NA LEITURA",
  },
];

export const formatBookPrice = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export const discountPercent = (book: Pick<BookOffer, "originalCents" | "promoCents">) =>
  Math.round((1 - book.promoCents / book.originalCents) * 100);

export function getBook(slug: unknown) {
  return BOOK_CATALOG.find((book) => book.slug === slug);
}
