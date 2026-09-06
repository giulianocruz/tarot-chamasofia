"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ATTRIBUTION_KEYS, normalizeTestFlag, type AnalyticsContext } from "@/lib/analytics-context";
import { createReading } from "@/lib/reading";
import { getCards, MAJOR_ARCANA, type Category } from "@/lib/tarot";
import { BOOK_CATALOG, discountPercent, formatBookPrice, type BookOffer } from "@/lib/book-catalog";
import { formatBrazilPhoneInput } from "@/lib/phone";
import PreviewDashboard from "./preview-dashboard";

type Price = { cents: number; formatted: string };

const CATEGORY_MAP = [
  ["Amor e relacionamentos", "♡", "Amor", "Desejo, atração, reciprocidade e o que existe entre vocês"],
  ["Dinheiro", "◇", "Dinheiro", "Prosperidade, poder de escolha e expansão material"],
  ["Trabalho e carreira", "✦", "Trabalho", "Reconhecimento, ambição e o próximo salto"],
  ["Decisões", "◉", "Decisão", "O caminho que pode mudar o rumo da sua história"],
] as const;

const QUESTION_PRESETS: Record<string, string[]> = {
  "Amor e relacionamentos": [
    "O que preciso compreender sobre esta relação agora?",
    "Existe desejo e reciprocidade entre nós?",
    "O que essa pessoa sente, mas ainda não demonstra?",
  ],
  Dinheiro: [
    "O que preciso compreender sobre minha vida financeira agora?",
    "Onde está minha maior oportunidade de crescimento financeiro?",
    "O que pode estar me impedindo de prosperar mais?",
  ],
  "Trabalho e carreira": [
    "O que preciso compreender sobre minha carreira agora?",
    "Qual movimento pode elevar meu reconhecimento profissional?",
    "Onde está meu potencial de crescimento que ainda não estou usando?",
  ],
  Decisões: [
    "O que preciso enxergar antes de tomar esta decisão?",
    "Qual caminho tende a ser mais favorável para mim?",
    "O que ainda não estou considerando nesta escolha?",
  ],
};

const publicDeck = MAJOR_ARCANA.slice(0, 7);
const sentEventKeys = new Set<string>();

type MetaFacebookWindow = typeof window & {
  fbq?: (...args: unknown[]) => void;
  _fbq?: unknown;
  __csMetaConsultaPixelId?: string;
};
let metaPixelPromise: Promise<MetaFacebookWindow["fbq"] | undefined> | null = null;

function ensureMetaPixel() {
  if (typeof window === "undefined") return Promise.resolve(undefined);
  if (metaPixelPromise) return metaPixelPromise;
  metaPixelPromise = fetch("/api/config")
    .then((response) => response.json())
    .then((config: { metaPixelId?: string }) => {
      if (!config.metaPixelId) return undefined;
      const w = window as MetaFacebookWindow;
      if (!w.fbq) {
        const queue: unknown[][] = [];
        w.fbq = (...args: unknown[]) => queue.push(args);
        (w.fbq as unknown as { queue: unknown[][] }).queue = queue;
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(script);
      }
      if (w.__csMetaConsultaPixelId !== config.metaPixelId) {
        w.fbq?.("init", config.metaPixelId);
        w.__csMetaConsultaPixelId = config.metaPixelId;
      }
      return w.fbq;
    })
    .catch(() => undefined);
  return metaPixelPromise;
}

function trackMeta(event: string, metadata: Record<string, unknown> = {}) {
  if (readAnalyticsContext().is_test) return;
  void ensureMetaPixel().then((fbq) => fbq?.("track", event, metadata));
}

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
  const [availableBooks, setAvailableBooks] = useState<BookOffer[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [resumeNotice, setResumeNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const stepRef = useRef(paidTraffic ? 1 : 0);
  const completedRef = useRef(false);
  const leadTokenRef = useRef("");
  const categoryRef = useRef("");

  const cards = useMemo(() => getCards(selected), [selected]);
  const questionPresets = QUESTION_PRESETS[category] ?? [];
  const preview = useMemo(() => {
    if (cards.length !== 3 || !category) return "";
    return createReading(question, category as Category, cards).cardReadings[0].text;
  }, [cards, category, question]);
  const visibleProgress = step <= 0 ? 0 : step <= 3 ? step : step <= 5 ? 4 : 5;
  const bonusAvailable=availableBooks.some((book)=>book.slug==="tarot-iniciantes");

  useEffect(() => {
    fetch("/api/pricing?offer=astro-tarot")
      .then((response) => response.json())
      .then(setPrice)
      .catch(() => undefined);
    fetch("/api/books/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { books?: Array<{ slug:string; available:boolean }> }) => {
        const enabled=new Set((data.books||[]).filter((book)=>book.available).map((book)=>book.slug));
        setAvailableBooks(BOOK_CATALOG.filter((book)=>enabled.has(book.slug)));
      })
      .catch(()=>setAvailableBooks([]))
      .finally(()=>setLibraryReady(true));
    emitEvent("landing_view", { surface: "consulta", paid_traffic: paidTraffic });
    trackMeta("PageView");
    trackMeta("ViewContent", { content_name: "AstroTarot Consulta", content_category: "AstroTarot" });
    if (paidTraffic) {
      emitEvent("onboarding_started", { entry: "paid" });
      emitEvent("form_step_view", { step: 1, entry: "paid" }, { dedupe: "paid-step-1" });
    }
    window.setTimeout(() => setEmail(localStorage.getItem("cs_email") || ""), 0);

    const resumeToken=new URLSearchParams(location.search).get("resume");
    if (resumeToken) {
      fetch(`/api/leads/${encodeURIComponent(resumeToken)}`,{cache:"no-store"})
        .then(async (response)=>{
          const draft=await response.json();
          if (!response.ok) throw new Error(draft.error||"Jornada indisponível");
          return draft as {email?:string;whatsapp?:string;category?:string;question?:string};
        })
        .then((draft)=>{
          const restoredCategory=String(draft.category||"");
          const restoredQuestion=String(draft.question||"");
          setEmail(String(draft.email||""));
          setWhatsapp(formatBrazilPhoneInput(String(draft.whatsapp||"")));
          setDeliveryChannel(draft.whatsapp?"whatsapp":"email");
          setCategory(restoredCategory);
          setQuestion(restoredQuestion);
          categoryRef.current=restoredCategory;
          leadTokenRef.current=resumeToken;
          stepRef.current=3;
          setStep(3);
          setResumeNotice(true);
          emitEvent("recovery_resumed",{kind:"form"},{dedupe:resumeToken});
        })
        .catch(()=>undefined);
    }

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
  }, [paidTraffic]);

  function go(nextStep: number) {
    setError("");
    stepRef.current = nextStep;
    setStep(nextStep);
    if (nextStep > 0 && nextStep <= 6) {
      emitEvent("form_step_view", { step: nextStep, category: categoryRef.current || undefined }, { dedupe: `step-${nextStep}` });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startOnboarding() {
    emitEvent("onboarding_started", { entry: paidTraffic ? "paid" : "organic" });
    emitEvent("form_step_view", { step: 1, entry: paidTraffic ? "paid" : "organic" }, { dedupe: "step-1" });
    go(1);
  }

  function chooseCategory(value: string) {
    emitEvent("onboarding_started", { entry: paidTraffic ? "paid" : "organic" });
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
    if (availableBooks.length)
      emitEvent("ebook_offer_viewed", { products: availableBooks.map((book) => book.slug) });
    go(6);
  }

  function selectDelivery(channel: "email" | "whatsapp") {
    setDeliveryChannel(channel);
    setError("");
    emitEvent("delivery_channel_selected", { channel }, { dedupe: channel });
  }

  async function persistLead(context=readAnalyticsContext()) {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return leadTokenRef.current;
    try {
      const response=await fetch("/api/leads",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          email:email.trim(),
          whatsapp:deliveryChannel==="whatsapp"?whatsapp.trim():"",
          category,
          question:question.trim(),
          ...context,
        }),
      });
      const payload=await response.json();
      if (response.ok&&payload.publicToken)
        leadTokenRef.current=String(payload.publicToken);
    } catch {
      // O checkout continua disponível mesmo se a recuperação não puder ser salva.
    }
    return leadTokenRef.current;
  }

  async function validateContact(context:AnalyticsContext) {
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
    await persistLead(context);
    return true;
  }

  async function checkout(event: React.FormEvent) {    event.preventDefault();
    setError("");
    const context = readAnalyticsContext();
    if (!(await validateContact(context))) return;
    const leadToken=leadTokenRef.current;
    setLoading(true);
    emitEvent("checkout_started", { value: price.cents / 100, currency: "BRL", delivery_channel: deliveryChannel, category });
    trackMeta("InitiateCheckout", { value: price.cents / 100, currency: "BRL", content_name: "AstroTarot" });
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Consulente", email: email.trim(),
          whatsapp: deliveryChannel === "whatsapp" ? whatsapp.trim() : "",
          deliveryChannel, category, question: question.trim(), cardIds: selected,
          offer: "astro-tarot", leadToken, ...context,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar o Pix.");
      emitEvent("pix_generated", { value: price.cents / 100, currency: "BRL", category, delivery_channel: deliveryChannel }, { dedupe: String(data.orderNumber || data.url || "pix") });
      completedRef.current = true;
      window.location.assign(data.url);
    } catch (checkoutError) {
      setLoading(false);
      setError(checkoutError instanceof Error ? checkoutError.message : "Tente novamente.");
    }
  }

  async function checkoutBook(book: BookOffer) {    setError("");
    const context = readAnalyticsContext();
    if (!(await validateContact(context))) return;
    const leadToken=leadTokenRef.current;
    setEbookLoading(book.slug);
    emitEvent("ebook_selected", { product_slug: book.slug, value: book.promoCents / 100, currency: "BRL" }, { dedupe: book.slug });
    emitEvent("ebook_checkout_started", { product_slug: book.slug, value: book.promoCents / 100, currency: "BRL", delivery_channel: deliveryChannel });
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Consulente", email: email.trim(),
          whatsapp: deliveryChannel === "whatsapp" ? whatsapp.trim() : "",
          deliveryChannel, offer: "ebook", productSlug: book.slug, leadToken, ...context,
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
    <main className={`consult-shell consult-step-${step}${paidTraffic ? " is-paid-entry" : ""}`}>
      <section className="consult-card" aria-live="polite">
        <header className="consult-brand">
          <img src="/assets/brand/chama-sofia-logo.png" alt="" width="36" height="36" />
          <span>CHAMA SOFIA · ASTROTAROT</span>
        </header>
        {visibleProgress>0&&(
          <div className="consult-progress-rail" aria-label={`Etapa ${visibleProgress} de 5`}>
            <span style={{width:`${visibleProgress*20}%`}} />
          </div>
        )}

        {step === 0 && (
          <div className="consult-step hero-consult">
            <p className="eyebrow">Seu céu, sua pergunta e três cartas em uma leitura só.</p>
            <h1>Descubra o que o seu momento está pedindo de você.</h1>
            <p>Comece pela sua pergunta e por 3 cartas. Depois do Pix, seu Mapa Astral Express e os trânsitos atuais entram na análise para ampliar a leitura.</p>
            <button className="primary-button" onClick={startOnboarding}>COMEÇAR MINHA ANÁLISE <span>→</span></button>
            <small>Mapa Astral Express · 3 cartas · céu atual · PDF{bonusAvailable?" + e-book bônus":""}</small>
          </div>
        )}

        {step === 1 && (
          <div className="consult-step consult-theme-step">
            <p className="consult-progress">1 de 5</p>
            {!paidTraffic && <button className="consult-back" onClick={() => go(0)}>← voltar</button>}
            <div className="consult-mini-deck" aria-hidden="true">
              <img src="/assets/tarot/cards/verso-premium.jpg" alt="" />
              <img src="/assets/tarot/cards/verso-premium.jpg" alt="" />
              <img src="/assets/tarot/cards/verso-premium.jpg" alt="" />
            </div>
            <p className="eyebrow">Esta leitura começa pelo que mais mexe com você</p>
            <h2>Escolha o tema da sua pergunta</h2>
            <p className="consult-muted consult-theme-guide">Toque em uma opção para continuar. Você poderá escolher uma pergunta pronta ou escrever a sua na próxima etapa.</p>
            <div className="consult-options">
              {CATEGORY_MAP.map(([value, icon, label, description]) => (
                <button key={value} className={category === value ? "selected" : ""} onClick={() => chooseCategory(value)}>
                  <b aria-hidden="true">{icon}</b><span>{label}<small>{description}</small></span>
                </button>
              ))}
            </div>
            <div className="consult-entry-trust" aria-label="Informações da experiência">
              <span>menos de 2 minutos</span><span>sem cadastro</span><span>prévia antes do Pix</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="consult-step">
            <p className="consult-progress">2 de 5</p>
            <button className="consult-back" onClick={() => go(1)}>← voltar</button>
            <p className="eyebrow">Agora torne a intenção específica</p>
            <h2>Qual resposta faria diferença para você hoje?</h2>
            <p className="consult-muted">Escolha a pergunta que provoca mais curiosidade. Se nenhuma disser exatamente o que você sente, escreva a sua.</p>
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
            <p className="eyebrow">Sua pergunta já tornou esta tiragem única</p>
            <h2>Três cartas vão revelar forças diferentes do seu momento</h2>
            {resumeNotice && <p className="resume-notice">Sua pergunta foi recuperada. Falta apenas escolher as 3 cartas.</p>}
            <p className="consult-muted">Não tente escolher racionalmente. Observe por alguns segundos e toque nas três que provocarem primeiro curiosidade, atração ou estranhamento.</p>
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
            <h2>Há uma combinação só sua se formando...</h2>
            <p>Cruzando sua intenção com as três posições para encontrar padrões, tensões e possibilidades que merecem sua atenção.</p>
          </div>
        )}

        {step === 5 && (
          <div className="consult-step consult-preview-step">
            <p className="consult-progress">4 de 5 · sua prévia</p>
            <button className="consult-back" onClick={() => go(3)}>← escolher outras cartas</button>
            <div className="preview-reveal-heading">
              <p className="eyebrow">Sua combinação não se repete nesta leitura</p>
              <h2>Existe uma tensão interessante entre o que você quer e o que está se formando.</h2>
              <p className="consult-muted">Esta é apenas a primeira camada. Observe o que ressoa — e principalmente o que desperta vontade de saber mais.</p>
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
            <button className="primary-button premium-unlock" onClick={showOffer}>LIBERAR MAPA + TAROT — {price.formatted} <span>→</span></button>
            <small className="preview-honesty">Você já viu a prévia sem pagar. O Pix libera mapa natal express, céu atual, síntese das 3 cartas e PDF personalizado{bonusAvailable?" + e-book bônus":""}.</small>
          </div>
        )}

        {step === 6 && (
          <div className="consult-step consult-offer">
            <p className="consult-progress">5 de 5</p>
            <button className="consult-back" onClick={() => go(5)}>← voltar à prévia</button>
            <p className="eyebrow">Seu Mapa Astral Express + Tarot está pronto para ser liberado</p>
            <h2>Receba uma análise do seu momento, não apenas uma tiragem</h2>
            <p className="consult-muted">Pagamento único via Pix. Sem assinatura e sem cadastro.</p>
            <div className="consult-offer-art" aria-hidden="true">
              <div className="consult-selected-fan">
                {cards.map((card) => <img key={card.id} src={card.image} alt="" />)}
              </div>
              {bonusAvailable && <img className="consult-bonus-book" src="/assets/books/tarot-para-iniciantes-mockup.jpg" alt="" />}
            </div>
            <div className="consult-offer-summary">
              <ul>
                <li>✓ Mapa Astral Express com Sol, Lua e Ascendente*</li>
                <li>✓ trânsitos atuais cruzados com seu mapa natal</li>
                <li>✓ 3 cartas integradas à sua situação + PDF premium</li>
                {bonusAvailable&&<li>✓ Tarot para Iniciantes de bônus</li>}
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
                <input required type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={()=>void persistLead()} autoComplete="email" placeholder="voce@email.com" />
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
                  <input required type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(event) => setWhatsapp(formatBrazilPhoneInput(event.target.value))} placeholder="(14) 99999-9999" />
                </label>
              )}
              {error && <p className="consult-error">{error}</p>}
              <button disabled={loading || ebookLoading !== ""} className="primary-button">
                {loading ? "GERANDO PIX..." : `LIBERAR MAPA + TAROT — ${price.formatted}`}
              </button>
              <small className="consult-payment-note">Pagamento seguro via Pix. Nenhuma cobrança acontece antes da sua confirmação.</small>
              <div className="checkout-operator-trust">
                <strong>Operação comercial identificada</strong>
                <span>Próxima Digital · CNPJ 68.964.484/0001-22</span>
                <span>Confira o nome do recebedor antes de confirmar o Pix no seu banco.</span>
              </div>
            </form>

            {availableBooks.length > 0 && <details className="ebook-downsell">
              <summary>Prefiro começar por um e-book a partir de R$ 4,99</summary>
              <div className="ebook-downsell-body">
              <span className="ebook-offer-kicker">ALTERNATIVA MAIS ECONÔMICA</span>
              <h3 id="ebook-offer-title">Ainda não quer liberar a análise completa?</h3>
              <p>Você pode começar por um e-book. Escolha apenas se fizer sentido para você — nada é adicionado automaticamente.</p>              <div className="ebook-offer-grid">
                {availableBooks.map((book) => (
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
              </div>
            </details>}
            {libraryReady && availableBooks.length === 0 && (
              <p className="library-safety-note">A Biblioteca está sendo atualizada. Por segurança, nenhum e-book avulso é oferecido sem o arquivo pronto para entrega.</p>
            )}
          </div>
        )}

        {error && step < 6 && <p className="consult-error">{error}</p>}
      </section>
    </main>
  );
}

