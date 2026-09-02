"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBook } from "@/lib/book-catalog";
import type { AstroTarotLayer } from "@/lib/astrology-types";

type Card = {
  id: string;
  name: string;
  number: number;
  symbol: string;
  image: string;
  keywords: string[];
  general: string;
  constructive: string;
  alert: string;
};
type Reading = {
  cardReadings: Array<{
    cardId: string;
    cardName: string;
    position: string;
    positionDescription: string;
    text: string;
  }>;
  connections: string;
  summary: string;
  reflection: string;
  disclaimer: string;
};
type Order = {
  id: number;
  orderNumber: string;
  customerName: string;
  category: string;
  question: string;
  price: number;
  pixPayload: string;
  paymentStatus: string;
  readingStatus: string;
  offerCode?: string | null;
  productSlug?: string | null;
  deliveryChannel?: string | null;
  createdAt: string;
  cards: Card[] | null;
  reading: Reading | null;
  astrology?: AstroTarotLayer | null;
  astrologyStatus?: string | null;
};
const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
function event(name: string, orderId?: number) {
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: name, orderId }),
  });
}

export default function ReadingClient({ token }: { token: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [stage, setStage] = useState<"intro" | "cards" | "result">("intro");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [timeKnown, setTimeKnown] = useState(true);
  const [astroLoading, setAstroLoading] = useState(false);
  const [astroError, setAstroError] = useState("");
  const [skipAstro, setSkipAstro] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/orders/${token}`, { cache: "no-store" });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (active) {
          setOrder(d);
          if (d.reading && stage === "intro") setStage("intro");
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Não foi possível carregar.",
          );
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [token, stage]);
  useEffect(() => {
    if (
      !order ||
      !["paid", "reading_generated", "delivered"].includes(order.paymentStatus) ||
      (order.offerCode !== "ebook" && !order.reading)
    )
      return;
    const key = `cs_purchase_${order.orderNumber}`;
    if (localStorage.getItem(key)) return;
    void fetch("/api/config")
      .then((response) => response.json())
      .then((config) => {
        if (!config.metaPixelId) return;
        const w = window as typeof window & {
          fbq?: (...args: unknown[]) => void;
        };
        if (!w.fbq) {
          const queue: unknown[][] = [];
          w.fbq = (...args: unknown[]) => queue.push(args);
          (w.fbq as unknown as { queue: unknown[][] }).queue = queue;
          const script = document.createElement("script");
          script.async = true;
          script.src = "https://connect.facebook.net/en_US/fbevents.js";
          document.head.appendChild(script);
          w.fbq("init", config.metaPixelId);
        }
        w.fbq(
          "track",
          "Purchase",
          {
            value: order.price / 100,
            currency: "BRL",
            order_id: order.orderNumber,
          },
          { eventID: `purchase-${order.orderNumber}` },
        );
        localStorage.setItem(key, "1");
      })
      .catch(() => undefined);
  }, [order]);
  async function copyPix() {
    if (!order?.pixPayload) return;
    await navigator.clipboard.writeText(order.pixPayload);
    setCopied(true);
    event("pix_copy_clicked", order.id);
    setTimeout(() => setCopied(false), 3500);
  }
  async function submitAstrology(eventForm: React.FormEvent) {
    eventForm.preventDefault();
    setAstroError(""); setAstroLoading(true);
    try {
      const response = await fetch(`/api/orders/${token}/astrology`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ birthDate, birthTime, birthPlace, timeKnown }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível calcular seu mapa agora.");
      setOrder((current) => current ? { ...current, astrology:data.astrology, astrologyStatus:"generated" } : current);
      event("astrology_profile_completed", order?.id);
    } catch (e) { setAstroError(e instanceof Error ? e.message : "Tente novamente."); } finally { setAstroLoading(false); }
  }
  function begin() {
    setStage("cards");
    event("reading_started", order?.id);
  }
  function reveal(index: number) {
    if (index !== revealed) return;
    const next = revealed + 1;
    setRevealed(next);
    event("card_selected", order?.id);
    if (next === 3) setTimeout(() => setStage("result"), 850);
  }
  function share() {
    const url = location.href;
    const text = "Fiz uma análise AstroTarot no Chama Sofia ✨";
    if (navigator.share)
      void navigator.share({ title: "AstroTarot Chama Sofia", text, url });
    else
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
        "_blank",
        "noopener,noreferrer",
      );
  }
  if (error)
    return (
      <main className="reading-shell center-state">
        <div className="status-orb">✦</div>
        <h1>Não encontramos esta leitura</h1>
        <p>{error}</p>
        <Link className="primary-button" href="/">
          VOLTAR AO INÍCIO
        </Link>
      </main>
    );
  if (!order)
    return (
      <main className="reading-shell center-state">
        <div className="status-orb pulse">✦</div>
        <p>Preparando seu espaço...</p>
      </main>
    );
  const ebookBook = order.offerCode === "ebook" ? getBook(order.productSlug) : undefined;
  const isAstroTarot = order.offerCode === "astro-tarot";
  const orderPaid = ["paid", "reading_generated", "delivered"].includes(order.paymentStatus);
  if (ebookBook && orderPaid)
    return (
      <main className="reading-shell ebook-release-shell">
        <header className="reading-header"><Link className="brand" href="/"><span className="brand-mark">✦</span><span>CHAMA SOFIA</span></Link><span>Pedido {order.orderNumber}</span></header>
        <section className="ebook-release-card">
          <div className="ebook-release-cover"><img src={ebookBook.cover} alt={`Capa ${ebookBook.title}`} /></div>
          <div><p className="eyebrow">Pagamento confirmado ✨</p><h1>Seu e-book está liberado.</h1>
            <h2>{ebookBook.title}</h2><p>Seu acesso é privado e está vinculado a este pedido.</p>
            <a className="primary-button" href={`/api/ebook/${token}/${ebookBook.slug}`}>BAIXAR MEU E-BOOK <span>↓</span></a>
            <small>Se escolheu WhatsApp, o agente também envia este acesso automaticamente.</small>
          </div>
        </section>
      </main>
    );
  const released = Boolean(order.reading && order.cards);
  if (!released)
    return (
      <main className="reading-shell checkout-shell">
        <header className="reading-header">
          <Link className="brand" href="/">
            <span className="brand-mark">✦</span>
            <span>CHAMA SOFIA</span>
          </Link>
          <span>Pedido {order.orderNumber}</span>
        </header>
        <section className="checkout-card">
          <p className="eyebrow">{ebookBook ? "Seu e-book está reservado" : isAstroTarot ? "Seu AstroTarot está reservado" : "Sua leitura está reservada"}</p>
          <h1>{ebookBook ? "Conclua o Pix para liberar seu e-book" : isAstroTarot ? "Conclua o Pix para liberar seu Mapa Astral Express + Tarot" : "Conclua o Pix para receber seu livro e sua leitura"}</h1>
          <div className="order-summary">
            <span>{ebookBook ? ebookBook.title : isAstroTarot ? "Mapa Astral Express + Tarot + PDF premium" : "Tarot para Iniciantes + leitura bônus"}</span>
            <strong>{formatBRL(order.price)}</strong>
          </div>
          {isAstroTarot && (
            <div className="pix-next-steps">
              <span>1. Confirme o Pix</span><span>2. Informe seu nascimento</span><span>3. Receba Astro + Tarot</span>
            </div>
          )}
          {order.pixPayload ? (
            <>
              <img className="qr" src={`/api/qr/${token}`} alt="QR Code Pix" />
              <label>Pix Copia e Cola</label>
              <div className="pix-code">{order.pixPayload}</div>
              <button className="primary-button" onClick={copyPix}>
                {copied ? "PIX COPIADO!" : "COPIAR PIX"} <span>→</span>
              </button>
              <p className="pix-feedback">
                {copied
                  ? "Pix copiado! Abra seu banco e conclua o pagamento."
                  : "Após pagar, aguarde a confirmação. Esta página atualiza automaticamente."}
              </p>
            </>
          ) : (
            <div className="payment-warning">
              <strong>Pix em configuração</strong>
              <p>
                Seu pedido foi criado, mas a chave Pix ainda não foi cadastrada
                pela Chama Sofia. Não efetue nenhum pagamento fora desta página.
              </p>
            </div>
          )}
          <div className="pending">
            <span className="pulse-dot" /> Aguardando confirmação do pagamento
          </div>
          <p className="privacy-note">
            Nenhum conteúdo pago é liberado apenas pelo clique em “Copiar Pix”.
          </p>
        </section>
      </main>
    );
  if (order.offerCode === "astro-tarot" && !order.astrology && !skipAstro)
    return (
      <main className="reading-shell astro-onboarding-shell">
        <header className="reading-header"><Link className="brand" href="/"><span className="brand-mark">✦</span><span>CHAMA SOFIA</span></Link><span>Pedido {order.orderNumber}</span></header>
        <section className="astro-onboarding-card">
          <p className="eyebrow">Pagamento confirmado · personalização final</p>
          <h1>Agora vamos cruzar seu céu com as cartas.</h1>
          <p>Informe seus dados de nascimento. Usamos a cidade para localizar coordenadas e o fuso histórico automaticamente.</p>
          <form onSubmit={submitAstrology} className="astro-birth-form">
            <label>Data de nascimento<input required type="date" value={birthDate} onChange={(e)=>setBirthDate(e.target.value)} /></label>
            <label className={!timeKnown ? "is-disabled" : ""}>Horário de nascimento<input required={timeKnown} disabled={!timeKnown} type="time" value={birthTime} onChange={(e)=>setBirthTime(e.target.value)} /></label>
            <label className="astro-time-check"><input type="checkbox" checked={!timeKnown} onChange={(e)=>setTimeKnown(!e.target.checked)} /> Não sei meu horário de nascimento</label>
            <label>Cidade, estado e país<input required value={birthPlace} onChange={(e)=>setBirthPlace(e.target.value)} placeholder="Ex.: Botucatu, SP, Brasil" /></label>
            <div className="astro-data-note"><strong>O que acontece agora</strong><span>Mapa natal → trânsitos atuais → 3 cartas → orientação integrada.</span></div>
            {astroError && <p className="form-error">{astroError}</p>}
            <button disabled={astroLoading} className="primary-button">{astroLoading ? "CALCULANDO SEU CÉU..." : "GERAR MAPA + CRUZAR COM AS CARTAS"} <span>→</span></button>
            <small>Se o horário não for conhecido, a leitura continua útil, mas Ascendente e casas não serão tratados como precisos. Seus dados de nascimento ficam vinculados ao pedido privado e são usados para gerar esta análise.</small>
          </form>
          {astroError && <button className="secondary-button" onClick={()=>setSkipAstro(true)}>CONTINUAR COM O TAROT ENQUANTO ISSO</button>}
        </section>
      </main>
    );
  if (stage === "intro")
    return (
      <main className="reading-shell ritual center-state">
        <div className="breath-circle">
          <span>✦</span>
        </div>
        <p className="eyebrow">Pagamento confirmado ✨</p>
        <h1>
          Seu livro já está disponível.
        </h1>
        <p>Baixe o produto agora e, quando quiser, comece sua leitura bônus.</p>
        <a className="primary-button" href={`/api/ebook/${token}`}>
          BAIXAR TAROT PARA INICIANTES <span>↓</span>
        </a>
        <blockquote>“{order.question}”</blockquote>
        <button className="secondary-button ritual-secondary" onClick={begin}>
          COMEÇAR MINHA LEITURA BÔNUS <span>→</span>
        </button>
      </main>
    );
  if (stage === "cards")
    return (
      <main className="reading-shell ritual">
        <header className="reading-header">
          <span className="brand">
            <span className="brand-mark">✦</span>
            <span>CHAMA SOFIA</span>
          </span>
          <span>{revealed}/3 reveladas</span>
        </header>
        <section className="reveal-area">
          <p className="eyebrow">Toque em cada carta, na ordem</p>
          <h1>Suas três cartas</h1>
          <div className="reveal-grid">
            {order.cards!.map((card, index) => (
              <button
                key={card.id}
                onClick={() => reveal(index)}
                className={`flip-card ${index < revealed ? "is-revealed" : ""} ${index > revealed ? "locked" : ""}`}
                aria-label={
                  index < revealed ? card.name : `Revelar carta ${index + 1}`
                }
              >
                <span className="flip-inner">
                  <span className="flip-back">
                    <i>CHAMA SOFIA</i>
                    <b>✦</b>
                    <small>{index + 1}</small>
                  </span>
                  <span className="flip-front">
                    <img
                      src={`/assets/tarot/cards/${card.id}.webp`}
                      alt={card.name}
                    />
                    <em>{order.reading!.cardReadings[index].position}</em>
                  </span>
                </span>
              </button>
            ))}
          </div>
          {revealed < 3 && (
            <p className="tap-hint">
              {revealed === 0
                ? "Comece pela carta da esquerda."
                : "Continue para a próxima carta."}
            </p>
          )}
        </section>
      </main>
    );
  return (
    <main className="result-shell">
      <header className="reading-header">
        <Link className="brand" href="/">
          <span className="brand-mark">✦</span>
          <span>CHAMA SOFIA</span>
        </Link>
        <span>Leitura {order.orderNumber}</span>
      </header>
      <section className="result-hero">
        <p className="eyebrow">Sua leitura de Tarot</p>
        <h1>Olá, {order.customerName.split(" ")[0]}.</h1>
        <p>Veja o que as cartas podem trazer para sua reflexão.</p>
        <div className="question-quote">
          <small>SUA PERGUNTA · {order.category}</small>
          <blockquote>“{order.question}”</blockquote>
        </div>
      </section>
      {order.astrology && (
        <section className="astro-result">
          <div className="astro-result-head"><p className="eyebrow">Seu céu de nascimento + céu atual</p><h2>O que a astrologia acrescenta à sua pergunta</h2><p>{order.astrology.situation}</p></div>
          <div className="astro-natal-grid">
            {[['Sol',order.astrology.natal.sun],['Lua',order.astrology.natal.moon],['Ascendente',order.astrology.natal.ascendantSign ? { sign:order.astrology.natal.ascendantSign } : undefined]].map(([label,value]) => value && <article key={String(label)}><small>{String(label).toUpperCase()}</small><strong>{typeof value === 'object' && 'sign' in value ? String(value.sign) : ''}</strong></article>)}
          </div>
          {order.astrology.current.highlights.length > 0 && <div className="astro-transits"><h3>Movimentos que mais pesam agora</h3>{order.astrology.current.highlights.slice(0,3).map((item,index)=><article key={`${item.transitPlanet}-${item.natalPlanet}-${index}`}><span>{item.transitPlanet} · {item.aspectType}</span><p>{item.meaning}</p></article>)}</div>}
          <div className="astro-tarot-bridge"><p className="eyebrow">Astro + Tarot</p><h3>Onde o céu encontra suas cartas</h3><p>{order.astrology.cardsBridge}</p></div>
          <div className="astro-solution"><p className="eyebrow">Sua orientação integrada</p><h3>{order.astrology.solution.title}</h3>{order.astrology.solution.steps.map((step)=><article key={step.title}><strong>{step.title}</strong><p>{step.text}</p></article>)}</div>
          <p className="astro-precision">{order.astrology.precisionNote}</p>
        </section>
      )}
      <section className="result-cards">
        {order.cards!.map((card, index) => (
          <article key={card.id}>
            <div className="result-card-art">
              <img
                src={`/assets/tarot/cards/${card.id}.webp`}
                alt={card.name}
                loading="lazy"
              />
            </div>
            <div>
              <p className="eyebrow">
                Carta {index + 1} ·{" "}
                {order.reading!.cardReadings[index].position}
              </p>
              <h2>{card.name}</h2>
              <p>{order.reading!.cardReadings[index].text}</p>
              <div className="keywords">
                {card.keywords.map((k) => (
                  <span key={k}>{k}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
      <section className="combined-reading">
        <div>
          <p className="eyebrow">A leitura completa</p>
          <h2>Como as cartas conversam entre si</h2>
          <p>{order.reading!.connections}</p>
        </div>
        <div className="summary-box">
          <p className="eyebrow">Síntese da leitura</p>
          <p>{order.reading!.summary}</p>
        </div>
        <div className="reflection-box">
          <span>✦</span>
          <p className="eyebrow">Reflexão final</p>
          <blockquote>{order.reading!.reflection}</blockquote>
        </div>
      </section>
      <section className="downloads">
        <div>
          <p className="eyebrow">Guarde este momento</p>
          <h2>Sua análise e seu presente</h2>
          <p>Baixe sua análise organizada em PDF e o livro completo de 276 páginas.</p>
        </div>
        <div className="download-actions">
          <a
            className="primary-button"
            href={`/api/ebook/${token}`}
          >
            BAIXAR E-BOOK TAROT PARA INICIANTES <span>↓</span>
          </a>
          <a className="secondary-button" href={`/api/pdf/${token}`}>
            BAIXAR MINHA LEITURA EM PDF <span>↓</span>
          </a>
        </div>
      </section>
      <section className="share-row">
        <button onClick={share}>Compartilhar leitura</button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Fiz uma análise AstroTarot no Chama Sofia ✨\n${typeof location !== "undefined" ? location.href : ""}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
      </section>
      <section className="result-library-cta">
        <p className="eyebrow">Biblioteca Chama Sofia</p>
        <h2>Quer continuar estudando depois desta análise?</h2>
        <p>Exu, Pomba Gira e Preto Velho estão disponíveis em edições digitais a partir de R$ 4,99.</p>
        <Link className="secondary-button" href="/biblioteca">VER E-BOOKS <span>→</span></Link>
      </section>
      <section className="new-reading">
        <p>Surgiu outra pergunta?</p>
        <h2>Faça uma nova análise quando surgir outra questão.</h2>
        <Link
          className="primary-button"
          href="/consulta"
          onClick={() => event("new_reading_click", order.id)}
        >
          FAZER NOVA ANÁLISE ASTROTAROT <span>→</span>
        </Link>
      </section>
      <footer>
        <p>
          {order.reading!.disclaimer} Não substitui orientação médica,
          psicológica, jurídica, financeira ou profissional.
        </p>
      </footer>
    </main>
  );
}
