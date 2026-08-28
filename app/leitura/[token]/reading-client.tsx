"use client";
import { useEffect, useState } from "react";

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
  createdAt: string;
  cards: Card[] | null;
  reading: Reading | null;
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
    if (!order || !order.reading || !["paid", "reading_generated", "delivered"].includes(order.paymentStatus)) return;
    const key = `cs_purchase_${order.orderNumber}`;
    if (localStorage.getItem(key)) return;
    void fetch("/api/config")
      .then((response) => response.json())
      .then((config) => {
        if (!config.metaPixelId) return;
        const w = window as typeof window & { fbq?: (...args: unknown[]) => void };
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
        w.fbq("track", "Purchase", { value: order.price / 100, currency: "BRL", order_id: order.orderNumber }, { eventID: `purchase-${order.orderNumber}` });
        localStorage.setItem(key, "1");
      })
      .catch(() => undefined);
  }, [order]);
  async function copyPix() {
    if (!order?.pixPayload) return;
    await navigator.clipboard.writeText(order.pixPayload);
    setCopied(true);
    event("pix_copied", order.id);
    setTimeout(() => setCopied(false), 3500);
  }
  function begin() {
    setStage("cards");
    event("reading_started", order?.id);
  }
  function reveal(index: number) {
    if (index !== revealed) return;
    const next = revealed + 1;
    setRevealed(next);
    event("card_revealed", order?.id);
    if (next === 3) setTimeout(() => setStage("result"), 850);
  }
  function share() {
    const url = location.href;
    const text = "Fiz uma leitura no Tarot Chama Sofia 🔮";
    if (navigator.share)
      void navigator.share({ title: "Tarot Chama Sofia", text, url });
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
        <a className="primary-button" href="/">
          VOLTAR AO INÍCIO
        </a>
      </main>
    );
  if (!order)
    return (
      <main className="reading-shell center-state">
        <div className="status-orb pulse">✦</div>
        <p>Preparando seu espaço...</p>
      </main>
    );
  const released = Boolean(order.reading && order.cards);
  if (!released)
    return (
      <main className="reading-shell checkout-shell">
        <header className="reading-header">
          <a className="brand" href="/">
            <span className="brand-mark">✦</span>
            <span>CHAMA SOFIA</span>
          </a>
          <span>Pedido {order.orderNumber}</span>
        </header>
        <section className="checkout-card">
          <p className="eyebrow">Sua leitura está reservada</p>
          <h1>Conclua o Pix para liberar suas cartas</h1>
          <div className="order-summary">
            <span>Leitura automática de 3 cartas</span>
            <strong>{formatBRL(order.price)}</strong>
          </div>
          {order.pixPayload ? (
            <>
              <img
                className="qr"
              src={`/api/qr/${token}`}
                alt="QR Code Pix"
              />
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
            A leitura nunca é liberada apenas pelo clique em “Copiar Pix”.
          </p>
        </section>
      </main>
    );
  if (stage === "intro")
    return (
      <main className="reading-shell ritual center-state">
        <div className="breath-circle">
          <span>☾</span>
        </div>
        <p className="eyebrow">Sua leitura foi liberada</p>
        <h1>
          Respire e pense
          <br />
          na sua pergunta.
        </h1>
        <blockquote>“{order.question}”</blockquote>
        <button className="primary-button" onClick={begin}>
          REVELAR MINHAS CARTAS <span>→</span>
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
                    <small>{String(card.number).padStart(2, "0")}</small>
                    <b>{card.symbol}</b>
                    <strong>{card.name}</strong>
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
        <a className="brand" href="/">
          <span className="brand-mark">✦</span>
          <span>CHAMA SOFIA</span>
        </a>
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
      <section className="result-cards">
        {order.cards!.map((card, index) => (
          <article key={card.id}>
            <div className="result-card-art">
              <small>{String(card.number).padStart(2, "0")}</small>
              <b>{card.symbol}</b>
              <strong>{card.name}</strong>
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
          <h2>Sua leitura e seu presente</h2>
          <p>Baixe a leitura organizada e o livro completo de 276 páginas.</p>
        </div>
        <div className="download-actions">
          <a
            className="primary-button"
            href={`/api/pdf/${token}`}
            onClick={() => event("pdf_download", order.id)}
          >
            BAIXAR MINHA LEITURA EM PDF <span>⇩</span>
          </a>
          <a
            className="secondary-button"
            href={`/api/ebook/${token}`}
            onClick={() => event("ebook_claim", order.id)}
          >
            BAIXAR E-BOOK TAROT PARA INICIANTES <span>⇩</span>
          </a>
        </div>
      </section>
      <section className="share-row">
        <button onClick={share}>Compartilhar leitura</button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Fiz uma leitura no Tarot Chama Sofia 🔮\n${typeof location !== "undefined" ? location.href : ""}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
      </section>
      <section className="new-reading">
        <p>Surgiu outra pergunta?</p>
        <h2>Faça uma nova leitura quando sentir que é o momento.</h2>
        <a
          className="primary-button"
          href="/#pergunta"
          onClick={() => event("new_reading_click", order.id)}
        >
          FAZER OUTRA PERGUNTA AO TAROT <span>→</span>
        </a>
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
