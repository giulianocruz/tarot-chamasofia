"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ATTRIBUTION_KEYS, normalizeTestFlag, type AnalyticsContext } from "@/lib/analytics-context";
import { createReading } from "@/lib/reading";
import { getCards, MAJOR_ARCANA, type Category } from "@/lib/tarot";

type Price = { cents: number; formatted: string };

const CATEGORY_MAP = [
  ["Amor e relacionamentos", "♡", "Amor"],
  ["Dinheiro", "◇", "Dinheiro"],
  ["Trabalho e carreira", "✦", "Trabalho"],
  ["Decisões", "◉", "Decisão importante"],
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
    fetch("/api/pricing?offer=consulta")
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
    go(6);
  }

  async function checkout(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Informe um e-mail válido para receber a leitura.");
      return;
    }

    setLoading(true);
    const context = readAnalyticsContext();
    localStorage.setItem("cs_email", email.trim());
    emitEvent("checkout_started", { value: price.cents / 100, currency: "BRL" });
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Consulente",
          email: email.trim(),
          whatsapp: "",
          category,
          question: question.trim(),
          cardIds: selected,
          offer: "consulta",
          ...context,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar o Pix.");
      completedRef.current = true;
      location.href = data.url;
    } catch (checkoutError) {
      setLoading(false);
      setError(checkoutError instanceof Error ? checkoutError.message : "Tente novamente.");
    }
  }

  return (
    <main className="consult-shell">
      <section className="consult-card" aria-live="polite">
        <header className="consult-brand">
          <img src="/assets/brand/chama-sofia-logo.png" alt="" width="36" height="36" />
          <span>CHAMA SOFIA · TAROT</span>
        </header>

        {step === 0 && (
          <div className="consult-step hero-consult">
            <p className="eyebrow">Uma pergunta. Três cartas. Uma nova perspectiva.</p>
            <h1>Existe uma pergunta que não sai da sua cabeça?</h1>
            <p>Em menos de 2 minutos, você prepara uma leitura feita a partir da sua pergunta e das cartas que escolher.</p>
            <button className="primary-button" onClick={() => go(1)}>COMEÇAR MINHA LEITURA <span>→</span></button>
            <small>Leitura privada · 3 cartas · PDF + e-book bônus</small>
          </div>
        )}

        {step === 1 && (
          <div className="consult-step">
            <p className="consult-progress">1 de 5</p>
            <button className="consult-back" onClick={() => go(0)}>← voltar</button>
            <h2>O que mais ocupa seus pensamentos agora?</h2>
            <div className="consult-options">
              {CATEGORY_MAP.map(([value, icon, label]) => (
                <button key={value} className={category === value ? "selected" : ""} onClick={() => chooseCategory(value)}>
                  <b aria-hidden="true">{icon}</b><span>{label}</span>
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
          <div className="consult-step">
            <p className="consult-progress">4 de 5</p>
            <button className="consult-back" onClick={() => go(3)}>← escolher outras cartas</button>
            <h2>Suas cartas foram reveladas</h2>
            <div className="consult-reveal">
              {cards.map((card) => (
                <article key={card.id}>
                  <img src={card.image} alt={card.name} width="240" height="360" />
                  <strong>{card.name}</strong>
                  <small>{card.keywords.slice(0, 2).join(" · ")}</small>
                </article>
              ))}
            </div>
            <div className="consult-preview">
              <span>PRÉVIA DA SUA LEITURA</span>
              <p><strong>{cards[0]?.name}</strong> — {preview}</p>
              <div className="consult-fade">A leitura continua conectando as três cartas à sua pergunta, com tendência e orientação final.</div>
            </div>
            <button className="primary-button" onClick={showOffer}>VER MINHA LEITURA COMPLETA <span>→</span></button>
          </div>
        )}

        {step === 6 && (
          <div className="consult-step consult-offer">
            <p className="consult-progress">5 de 5</p>
            <button className="consult-back" onClick={() => go(5)}>← voltar à prévia</button>
            <h2>Libere sua leitura completa</h2>
            <p className="consult-muted">Pagamento único. Você recebe tudo logo após a confirmação do Pix.</p>
            <ul>
              <li>✓ 3 cartas escolhidas por você</li>
              <li>✓ interpretação personalizada para sua pergunta</li>
              <li>✓ PDF da leitura para guardar</li>
              <li>✓ e-book Tarot para Iniciantes de bônus</li>
            </ul>
            <div className="consult-price">
              <small>VALOR TOTAL NO PIX</small>
              <strong>{price.formatted}</strong>
              <span>pagamento único · sem assinatura</span>
            </div>
            <form onSubmit={checkout}>
              <label>E-mail para receber a leitura<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
              {error && <p className="consult-error">{error}</p>}
              <button disabled={loading} className="primary-button">
                {loading ? "GERANDO PIX..." : `LIBERAR MINHA LEITURA — ${price.formatted}`}
              </button>
            </form>
            <small>Pagamento seguro via Pix. Nenhuma cobrança acontece antes da sua confirmação.</small>
          </div>
        )}

        {error && step < 6 && <p className="consult-error">{error}</p>}
      </section>
    </main>
  );
}
