"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ATTRIBUTION_KEYS, normalizeTestFlag, type AnalyticsContext } from "@/lib/analytics-context";
import { createReading } from "@/lib/reading";
import { getCards, MAJOR_ARCANA, type Category } from "@/lib/tarot";
import { BOOK_CATALOG, discountPercent, formatBookPrice, type BookOffer } from "@/lib/book-catalog";
import PreviewDashboard from "./preview-dashboard";

type Price = { cents: number; formatted: string };

const CATEGORY_MAP = [
  ["Amor e relacionamentos", "♡", "Amor", "Vínculos, reciprocidade e o que você sente"],
  ["Dinheiro", "◇", "Dinheiro", "Segurança, escolhas e vida material"],
  ["Trabalho e carreira", "✦", "Trabalho", "Carreira, reconhecimento e próximos passos"],
  ["Decisões", "◉", "Decisão", "Caminhos, consequências e clareza para escolher"],
] as const;

const QUESTION_PRESETS: Record<string, string[]> = {
  "Amor e relacionamentos": [
    "O que preciso compreender sobre esta relação agora?",
    "Qual é a tendência entre nós neste momento?",
    "O que está impedindo minha vida amorosa de avançar?",
  ],
  Dinheiro: [
    "O que preciso compreender sobre minha vida financeira agora?",
    "Qual caminho pode favorecer minhas finanças?",
    "O que está bloqueando minha prosperidade neste momento?",
  ],
  "Trabalho e carreira": [
    "O que preciso compreender sobre minha carreira agora?",
    "Qual caminho profissional tende a ser mais favorável?",
    "O que está impedindo meu crescimento profissional?",
  ],
  Decisões: [
    "O que preciso enxergar antes de tomar esta decisão?",
    "Qual caminho tende a ser mais favorável para mim?",
    "O que ainda não estou considerando nesta escolha?",
  ],
};

const publicDeck = MAJOR_ARCANA.slice(0, 7);
const sentEventKeys = new Set<string>();

function storedId(storage: Storage, key: string) {
  let id = storage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(key, id);
  }
  return id;
}

function readAnalyticsContext(): AnalyticsContext {
  const query = new URLSearchParams(location.search);
  const context: AnalyticsContext = {
    anonymous_id: storedId(localStorage, "cs_anon"),
    session_id: storedId(sessionStorage, "cs_session"),
    is_test: false,
  };

  for (const key of ATTRIBUTION_KEYS) {
    const current = query.get(key)?.trim() ?? "";
    if (current) localStorage.setItem(`cs_${key}`, current);
    const value = current || localStorage.getItem(`cs_${key}`) || "";
    if (value) context[key] = value;
  }

  if (query.has("is_test") || query.has("test")) {
    const testValue = query.get("is_test") ?? query.get("test");
    sessionStorage.setItem("cs_is_test", normalizeTestFlag(testValue) ? "1" : "0");
  }
  context.is_test =
    sessionStorage.getItem("cs_is_test") === "1" ||
    ["localhost", "127.0.0.1"].includes(location.hostname);
  return context;
}

function emitEvent(
  event: string,
  metadata: Record<string, unknown> = {},
  options: { dedupe?: string; beacon?: boolean } = {},
) {
  const context = readAnalyticsContext();
  const eventKey = `${context.session_id}:${event}:${options.dedupe ?? event}`;
  if (sentEventKeys.has(eventKey)) return;
  sentEventKeys.add(eventKey);

  const payload = JSON.stringify({ event, ...context, metadata });
  if (options.beacon && navigator.sendBeacon) {
    navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}

export default function ConsultaClient({ paidTraffic = false }: { paidTraffic?: boolean }) {
  const [step, setStep] = useState(paidTraffic ? 1 : 0);
  const [category, setCategory] = useState("");
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [price, setPrice] = useState<Price>({ cents: 990, formatted: "R$ 9,90" });
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [deliveryChannel, setDeliveryChannel] = useState<"email" | "whatsapp">("email");
  const [ebookLoading, setEbookLoading] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const stepRef = useRef(0);
  const completedRef = useRef(false);
  const categoryRef = useRef("");

  const cards = useMemo(() => getCards(selected), [selected]);
  const questionPresets = QUESTION_PRESETS[category] ?? [];
  const preview = useMemo(() => {
    if (cards.length !== 3 || !category) return "";
    return createReading(question, category as Category, cards).cardReadings[0].text;
  }, [cards, category, question]);

  useEffect(() => {
    fetch("/api/pricing?offer=astro-tarot")
      .then((response) => response.json())
      .then(setPrice)
      .catch(() => undefined);
    emitEvent("onboarding_started");
    window.setTimeout(() => setEmail(localStorage.getItem("cs_email") || ""), 0);

    const abandon = () => {
      if (completedRef.current) return;
      emitEvent(
        "onboarding_abandon",
        { step: stepRef.current, category: categoryRef.current || undefined },
        { beacon: true },
      );
    };
    window.addEventListener("pagehide", abandon, { once: true });
    return () => window.removeEventListener("pagehide", abandon);
  }, []);

  function go(nextStep: number) {
    setError("");
    stepRef.current = nextStep;
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseCategory(value: string) {
    categoryRef.current = value;
    setCategory(value);
    emitEvent("category_selected", { category: value }, { dedupe: value });
    go(2);
  }

  function chooseQuestion(value: string) {
    setQuestion(value);
    emitEvent(
      "question_written",
      { category, length: value.length, mode: "preset" },
      { dedupe: value },
    );
    go(3);
  }

  function saveQuestion() {
    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 10) {
      setError("Escreva sua pergunta com pelo menos 10 caracteres.");
      return;
    }
    emitEvent(
      "question_written",
      { category, length: cleanQuestion.length, mode: "custom" },
      { dedupe: cleanQuestion },
    );
    go(3);
  }

  function toggleCard(id: string) {
    setError("");
    setSelected((current) =>
      current.includes(id)
        ? current.filter((cardId) => cardId !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  }

  function confirmCards() {
    if (selected.length !== 3) {
      setError("Escolha exatamente 3 cartas.");
      return;
    }
    emitEvent("cards_selected", { card_ids: selected }, { dedupe: selected.join(",") });
    go(4);
    window.setTimeout(() => {
      emitEvent("reading_preview", { card_ids: selected }, { dedupe: selected.join(",") });
      go(5);
    }, 1200);
  }

  function showOffer() {
    emitEvent("offer_viewed", { value: price.cents / 100, currency: "BRL" });
    emitEvent("ebook_offer_viewed", { products: BOOK_CATALOG.map((book) => book.slug) });
    go(6);
  }

  function selectDelivery(channel: "email" | "whatsapp") {
    setDeliveryChannel(channel);
    setError("");
    emitEvent("delivery_channel_selected", { channel }, { dedupe: channel });
  }

  function validateContact() {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Informe um e-mail válido para gerar o Pix e recuperar seu pedido.");
      return false;
    }
    if (deliveryChannel === "whatsapp" && whatsapp.replace(/\D/g, "").length < 10) {
      setError("Informe um WhatsApp válido para receber seu acesso.");
      return false;
    }
    localStorage.setItem("cs_email", email.trim());
    emitEvent("contact_captured", { channel: deliveryChannel }, { dedupe: email.trim().toLowerCase() });
    return true;
  }

  async function checkout(event: React.FormEvent) {    event.preventDefault();
    setError("");
    if (!validateContact()) return;
    setLoading(true);
    const context = readAnalyticsContext();
    emitEvent("checkout_started", { value: price.cents / 100, currency: "BRL", delivery_channel: deliveryChannel });
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Consulente", email: email.trim(),
          whatsapp: deliveryChannel === "whatsapp" ? whatsapp.trim() : "",
          deliveryChannel, category, question: question.trim(), cardIds: selected,
          offer: "astro-tarot", ...context,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar o Pix.");
      completedRef.current = true;
      window.location.assign(data.url);
    } catch (checkoutError) {
      setLoading(false);
      setError(checkoutError instanceof Error ? checkoutError.message : "Tente novamente.");
    }
  }

  async function checkoutBook(book: BookOffer) {    setError("");
    if (!validateContact()) return;
    setEbookLoading(book.slug);
    const context = readAnalyticsContext();
    emitEvent("ebook_selected", { product_slug: book.slug, value: book.promoCents / 100, currency: "BRL" }, { dedupe: book.slug });
    emitEvent("ebook_checkout_started", { product_slug: book.slug, value: book.promoCents / 100, currency: "BRL", delivery_channel: deliveryChannel });
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Consulente", email: email.trim(),
          whatsapp: deliveryChannel === "whatsapp" ? whatsapp.trim() : "",
          deliveryChannel, offer: "ebook", productSlug: book.slug, ...context,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar o Pix.");
      completedRef.current = true;
      window.location.assign(data.url);
    } catch (checkoutError) {
      setEbookLoading("");
      setError(checkoutError instanceof Error ? checkoutError.message : "Tente novamente.");
    }
  }
  return (
    <main className="consult-shell">
      <section className="consult-card" aria-live="polite">
        <header className="consult-brand">
          <img src="/assets/brand/chama-sofia-logo.png" alt="" width="36" height="36" />
          <span>CHAMA SOFIA · ASTROTAROT</span>
        </header>

        {step === 0 && (
          <div className="consult-step hero-consult">
            <p className="eyebrow">Seu céu, sua pergunta e três cartas em uma leitura só.</p>
            <h1>Descubra o que o seu momento está pedindo de você.</h1>
            <p>Comece pela sua pergunta e por 3 cartas. Depois do Pix, seu Mapa Astral Express e os trânsitos atuais entram na análise para ampliar a leitura.</p>
            <button className="primary-button" onClick={() => go(1)}>COMEÇAR MINHA ANÁLISE <span>→</span></button>
            <small>Mapa Astral Express · 3 cartas · céu atual · PDF + e-book bônus</small>
          </div>
        )}

        {step === 1 && (
          <div className="consult-step">
            <p className="consult-progress">1 de 5</p>
            <button className="consult-back" onClick={() => go(0)}>← voltar</button>
            <h2>O que está pesando mais hoje?</h2>
            <div className="consult-options">
              {CATEGORY_MAP.map(([value, icon, label, description]) => (
                <button key={value} className={category === value ? "selected" : ""} onClick={() => chooseCategory(value)}>
                  <b aria-hidden="true">{icon}</b><span>{label}<small>{description}</small></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="consult-step">
            <p className="consult-progress">2 de 5</p>
            <button className="consult-back" onClick={() => go(1)}>← voltar</button>
            <h2>Escolha uma pergunta pronta</h2>
            <p className="consult-muted">Um toque é suficiente. Se preferir, você também pode escrever com suas palavras.</p>
            <div className="consult-question-options">
              {questionPresets.map((preset) => (
                <button type="button" key={preset} onClick={() => chooseQuestion(preset)}>{preset}</button>
              ))}
            </div>
            <details className="consult-custom-question" open={question !== "" && !questionPresets.includes(question)}>
              <summary>Quero escrever minha própria pergunta</summary>
              <textarea maxLength={240} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ex.: O que preciso compreender sobre esta relação agora?" />
              <small>{question.length}/240</small>
              <button className="primary-button" onClick={saveQuestion}>CONTINUAR <span>→</span></button>
            </details>
          </div>
        )}

        {step === 3 && (
          <div className="consult-step">
            <p className="consult-progress">3 de 5</p>
            <button className="consult-back" onClick={() => go(2)}>← voltar</button>
            <h2>Escolha 3 cartas pela sua intuição</h2>
            <p className="consult-muted">Não existe escolha certa. Toque nas três cartas que mais chamarem sua atenção.</p>
            <div className="consult-deck">
              {publicDeck.map((card) => (
                <button
                  type="button"
                  aria-label={`Carta virada${selected.includes(card.id) ? `, escolha ${selected.indexOf(card.id) + 1}` : ""}`}
                  aria-pressed={selected.includes(card.id)}
                  className={selected.includes(card.id) ? "picked" : ""}
                  key={card.id}
                  onClick={() => toggleCard(card.id)}
                >
                  <img src="/assets/tarot/cards/verso-premium.jpg" alt="" width="180" height="270" />
                  <span>{selected.includes(card.id) ? selected.indexOf(card.id) + 1 : ""}</span>
                </button>
              ))}
            </div>
            <p className="consult-count">{selected.length}/3 escolhidas</p>
            <button className="primary-button" onClick={confirmCards}>REVELAR MINHAS CARTAS <span>→</span></button>
          </div>
        )}

        {step === 4 && (
          <div className="consult-step consult-loading">
            <div className="orb" aria-hidden="true">✦</div>
            <h2>Preparando sua leitura...</h2>
            <p>Conectando sua pergunta aos símbolos e à posição de cada carta.</p>
          </div>
        )}

        {step === 5 && (
          <div className="consult-step consult-preview-step">
            <p className="consult-progress">4 de 5 · sua prévia</p>
            <button className="consult-back" onClick={() => go(3)}>← escolher outras cartas</button>
            <div className="preview-reveal-heading">
              <p className="eyebrow">As três cartas responderam de formas diferentes</p>
              <h2>Seu mapa inicial está pronto.</h2>
              <p className="consult-muted">Veja a primeira camada antes de decidir se quer aprofundar.</p>
            </div>
            <div className="consult-reveal premium-reveal">
              {cards.map((card, index) => (
                <article key={card.id} style={{ "--card-delay": `${index * 120}ms` } as React.CSSProperties}>
                  <span className="reveal-position">{index === 0 ? "Agora" : index === 1 ? "Influência" : "Direção"}</span>
                  <img src={card.image} alt={card.name} width="240" height="360" />
                  <strong>{card.name}</strong>
                  <small>{card.keywords.slice(0, 2).join(" · ")}</small>
                </article>
              ))}
            </div>
            <PreviewDashboard cards={cards} category={category} question={question} preview={preview} />
            <div className="preview-conversion-cta">
              <img src="/assets/tarot/ui/reading-seal.svg" alt="" aria-hidden="true" />
              <div><span>Leitura completa preparada para esta pergunta</span><strong>Conecte as 3 cartas ao seu céu e receba sua análise em PDF</strong></div>
            </div>
            <button className="primary-button premium-unlock" onClick={showOffer}>QUERO LIBERAR MINHA ANÁLISE <span>→</span></button>
            <small className="preview-honesty">Você viu uma prévia simbólica. O pagamento libera Mapa Astral Express, trânsitos atuais, interpretação completa, PDF e e-book bônus.</small>
          </div>
        )}

        {step === 6 && (
          <div className="consult-step consult-offer">
            <p className="consult-progress">5 de 5</p>
            <button className="consult-back" onClick={() => go(5)}>← voltar à prévia</button>
            <p className="eyebrow">Seu Mapa Astral Express + Tarot está pronto para ser liberado</p>
            <h2>Receba uma análise do seu momento, não apenas uma tiragem</h2>
            <p className="consult-muted">Pagamento único via Pix. Sem assinatura e sem cadastro.</p>
            <div className="consult-offer-summary">
              <ul>
                <li>✓ Mapa Astral Express com Sol, Lua e Ascendente*</li>
                <li>✓ trânsitos atuais cruzados com seu mapa natal</li>
                <li>✓ 3 cartas integradas à sua situação + PDF premium</li>
                <li>✓ Tarot para Iniciantes de bônus</li>
              </ul>
              <div className="consult-price">
                <small>VALOR TOTAL NO PIX</small>
                <strong>{price.formatted}</strong>
                <span>pagamento único · sem assinatura</span>
              </div>
            </div>
            <form onSubmit={checkout} className="consult-checkout-form">
              <label>
                {deliveryChannel === "email" ? "E-mail para receber a leitura" : "E-mail para gerar o Pix e recuperar seu pedido"}
                <input required type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="voce@email.com" />
              </label>              <fieldset className="delivery-choice">
                <legend>Como quer receber?</legend>
                <button type="button" aria-pressed={deliveryChannel === "email"} className={deliveryChannel === "email" ? "selected" : ""} onClick={() => selectDelivery("email")}>
                  <span aria-hidden="true">✉</span><b>E-mail</b><small>Mais rápido, sem outro dado</small>
                </button>
                <button type="button" aria-pressed={deliveryChannel === "whatsapp"} className={deliveryChannel === "whatsapp" ? "selected" : ""} onClick={() => selectDelivery("whatsapp")}>
                  <span aria-hidden="true">◉</span><b>WhatsApp</b><small>Receba o link no celular</small>
                </button>
              </fieldset>
              {deliveryChannel === "whatsapp" && (
                <label>Seu WhatsApp
                  <input required type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="(14) 99999-9999" />
                </label>
              )}
              {error && <p className="consult-error">{error}</p>}
              <button disabled={loading || ebookLoading !== ""} className="primary-button">
                {loading ? "GERANDO PIX..." : `LIBERAR MAPA + TAROT — ${price.formatted}`}
              </button>
              <small className="consult-payment-note">Pagamento seguro via Pix. Nenhuma cobrança acontece antes da sua confirmação.</small>
            </form>

            <section className="ebook-downsell" aria-labelledby="ebook-offer-title">
              <span className="ebook-offer-kicker">OFERTA ESPECIAL DA BIBLIOTECA CHAMA SOFIA</span>
              <h3 id="ebook-offer-title">Ainda não quer liberar a análise completa?</h3>
              <p>Você pode começar por um e-book. Escolha apenas se fizer sentido para você — nada é adicionado automaticamente.</p>              <div className="ebook-offer-grid">
                {BOOK_CATALOG.map((book) => (
                  <article className="ebook-offer-card" key={book.slug}>
                    <img src={book.cover} alt={`Capa ${book.title}`} loading="lazy" />
                    <div className="ebook-offer-copy">
                      {book.badge && <span className="ebook-badge">{book.badge}</span>}
                      <h4>{book.shortTitle}</h4>
                      <p className="ebook-pricing"><del>{formatBookPrice(book.originalCents)}</del><strong>{formatBookPrice(book.promoCents)}</strong><span>{discountPercent(book)}% OFF</span></p>
                      <button type="button" disabled={loading || ebookLoading !== ""} onClick={() => void checkoutBook(book)}>
                        {ebookLoading === book.slug ? "GERANDO PIX..." : `QUERO POR ${formatBookPrice(book.promoCents)}`}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <small>*Se você não souber o horário de nascimento, ainda entregamos uma análise útil, mas Ascendente e casas ficam limitados. O e-book continua incluído como bônus.</small>
              <a className="library-inline-link" href="/biblioteca">Ver Biblioteca Chama Sofia completa →</a>
            </section>
          </div>
        )}

        {error && step < 6 && <p className="consult-error">{error}</p>}
      </section>
    </main>
  );
}
