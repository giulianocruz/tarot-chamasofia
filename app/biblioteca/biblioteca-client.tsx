"use client";

import { useEffect, useMemo, useState } from "react";
import { BOOK_CATALOG, discountPercent, formatBookPrice, type BookOffer } from "@/lib/book-catalog";

function storedId(storage: Storage, key: string) {
  let value = storage.getItem(key);
  if (!value) { value = crypto.randomUUID(); storage.setItem(key, value); }
  return value;
}

export default function BibliotecaClient() {
  const [selected, setSelected] = useState<BookOffer | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const attribution = useMemo(() => {
    if (typeof window === "undefined") return {};
    const query = new URLSearchParams(window.location.search);
    return Object.fromEntries(["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid"].map((key) => [key, query.get(key) || localStorage.getItem(`cs_${key}`) || ""]));
  }, []);

  function track(event: string, metadata: Record<string, unknown> = {}) {
    const anonymous_id = storedId(localStorage, "cs_anon");
    const session_id = storedId(sessionStorage, "cs_session");
    void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, anonymous_id, session_id, ...attribution, metadata }) });
  }

  useEffect(() => {
    Object.entries(attribution).forEach(([key, value]) => value && localStorage.setItem(`cs_${key}`, String(value)));
    track("library_view");
    track("ebook_offer_viewed", { products: BOOK_CATALOG.map((book) => book.slug), surface: "biblioteca" });
  }, [attribution]);

  function choose(book: BookOffer) {
    setSelected(book);
    setError("");
    track("ebook_selected", { product_slug: book.slug, value: book.promoCents / 100, currency: "BRL", surface: "biblioteca" });
    requestAnimationFrame(() => document.getElementById("biblioteca-checkout")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
  async function checkout(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setError("");
    if (name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Informe seu nome e um e-mail válido para gerar o Pix e receber o acesso.");
      return;
    }
    setLoading(true);
    track("ebook_checkout_started", { product_slug: selected.slug, value: selected.promoCents / 100, currency: "BRL", surface: "biblioteca" });
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(), offer: "ebook",
          productSlug: selected.slug, deliveryChannel: "email", ...attribution,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar o Pix.");
      window.location.assign(data.url);
    } catch (cause) {
      setLoading(false);
      setError(cause instanceof Error ? cause.message : "Tente novamente.");
    }
  }
  return (
    <main className="library-shell">
      <header className="library-header">
        <a className="brand" href="/consulta"><img className="brand-logo" src="/assets/brand/chama-sofia-logo.png" alt="" width="38" height="38" /><span>CHAMA SOFIA</span></a>
        <a href="/consulta">Mapa + Tarot</a>
      </header>

      <section className="library-hero">
        <p className="eyebrow">Biblioteca Chama Sofia</p>
        <h1>Continue sua jornada no seu ritmo.</h1>
        <p>Escolha um e-book, gere o Pix e receba um acesso privado. Sem assinatura e sem adicionar nada automaticamente ao pedido.</p>
        <div className="library-trust"><span>Pix seguro</span><span>Acesso privado</span><span>Download digital</span></div>
      </section>

      <section className="library-store" aria-label="E-books disponíveis">
        {BOOK_CATALOG.map((book) => (
          <article className={selected?.slug === book.slug ? "library-product is-selected" : "library-product"} key={book.slug}>
            <img src={book.cover} alt={`Capa ${book.title}`} />
            <div>{book.badge && <span className="ebook-badge">{book.badge}</span>}<h2>{book.shortTitle}</h2><p>{book.description}</p></div>
            <div className="library-product-buy">
              <small>de <del>{formatBookPrice(book.originalCents)}</del></small>
              <strong>{formatBookPrice(book.promoCents)}</strong>
              <span>{discountPercent(book)}% OFF</span>
              <button type="button" onClick={() => choose(book)}>ESCOLHER ESTE E-BOOK</button>
            </div>
          </article>
        ))}
      </section>

      {selected && (
        <section className="library-checkout" id="biblioteca-checkout">
          <div><p className="eyebrow">Seu e-book escolhido</p><h2>{selected.title}</h2><p>Você paga {formatBookPrice(selected.promoCents)} uma única vez. Após a confirmação, o download fica disponível no link privado do pedido.</p></div>
          <form onSubmit={checkout}>
            <label>Seu nome<input required value={name} onChange={(e)=>setName(e.target.value)} autoComplete="name" placeholder="Como podemos te chamar?" /></label>
            <label>Seu e-mail<input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" placeholder="voce@email.com" /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" disabled={loading}>{loading ? "GERANDO PIX..." : `GERAR PIX · ${formatBookPrice(selected.promoCents)}`}</button>
            <small>Pagamento único. Nenhum outro produto é adicionado automaticamente.</small>
          </form>
        </section>
      )}

      <section className="library-astro-cta">
        <p className="eyebrow">Quer uma resposta para o seu momento?</p>
        <h2>Mapa Astral Express + Tarot por R$ 9,90</h2>
        <p>Use seu mapa natal, os trânsitos atuais e três cartas para olhar uma pergunta específica por vários ângulos.</p>
        <a className="primary-button" href="/consulta">COMEÇAR MINHA ANÁLISE <span>→</span></a>
      </section>
    </main>
  );
}
