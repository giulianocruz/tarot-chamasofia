"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ATTRIBUTION_KEYS, normalizeTestFlag, type AnalyticsContext } from "@/lib/analytics-context";
import { createReading } from "@/lib/reading";
import { TAROT_DECK, getCards, type Category } from "@/lib/tarot";
import { DEFAULT_SPREAD_ID, TAROT_SPREADS, getSpread, type TarotSpreadId } from "@/lib/spreads";
import { formatBrazilPhoneInput } from "@/lib/phone";

type Price = { cents: number; formatted: string };

const CATEGORY_MAP = [
  ["Amor e relacionamentos", "♡", "Amor", "Vínculos, reciprocidade, desejo e relações"],
  ["Trabalho e carreira", "✦", "Trabalho", "Carreira, reconhecimento e próximos movimentos"],
  ["Dinheiro", "◈", "Dinheiro", "Prosperidade, recursos e escolhas materiais"],
  ["Energia do momento", "☾", "Espiritualidade", "Energia, intuição e o que pede atenção agora"],
  ["Vida pessoal", "◎", "Autoconhecimento", "Padrões, emoções e compreensão de si"],
  ["Decisões", "⚖", "Decisões", "Dúvidas, escolhas e caminhos possíveis"],
  ["Caminhos", "✧", "Futuro & caminhos", "Tendências, ciclos e possibilidades adiante"],
  ["Pergunta livre", "∞", "Pergunta livre", "Traga o tema que estiver ocupando sua mente"],
] as const;

const QUESTION_PRESETS: Record<string, string[]> = {
  "Amor e relacionamentos": [
    "O que preciso compreender sobre esta relação agora?",
    "O que existe entre nós que ainda não estou enxergando?",
    "Como posso agir com mais clareza nesta relação?",
  ],
  "Trabalho e carreira": [
    "O que preciso compreender sobre minha carreira agora?",
    "Qual movimento profissional merece minha energia neste momento?",
    "O que pode estar limitando meu crescimento profissional?",
  ],
  Dinheiro: [
    "O que preciso compreender sobre minha vida financeira agora?",
    "Onde está minha maior oportunidade de crescimento material?",
    "Que padrão merece atenção para eu lidar melhor com meus recursos?",
  ],
  "Energia do momento": [
    "Qual é a principal energia que atravessa meu momento atual?",
    "O que minha intuição está tentando me mostrar agora?",
    "Onde preciso colocar mais consciência neste ciclo?",
  ],
  "Vida pessoal": [
    "O que preciso compreender sobre mim neste momento?",
    "Que padrão pessoal está pedindo transformação?",
    "O que pode me ajudar a recuperar mais clareza e equilíbrio?",
  ],
  Decisões: [
    "O que preciso enxergar antes de tomar esta decisão?",
    "O que diferencia os caminhos que estão diante de mim?",
    "Que aspecto ainda não estou considerando nesta escolha?",
  ],
  Caminhos: [
    "Que tendência merece minha atenção nos próximos passos?",
    "O que está se abrindo no meu caminho agora?",
    "Como posso atravessar este ciclo com mais consciência?",
  ],
  "Pergunta livre": [],
};

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

type AmbientEngine = {
  context: AudioContext;
  gain: GainNode;
  nodes: OscillatorNode[];
};

export default function ConsultaClient({ paidTraffic = false }: { paidTraffic?: boolean }) {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [question, setQuestion] = useState("");
  const [spreadId, setSpreadId] = useState<TarotSpreadId>(DEFAULT_SPREAD_ID);
  const [selected, setSelected] = useState<string[]>([]);
  const [deckOrder, setDeckOrder] = useState(() => [...TAROT_DECK]);
  const [shuffled, setShuffled] = useState(false);
  const [cut, setCut] = useState(2);
  const [ambientOn, setAmbientOn] = useState(false);
  const [price, setPrice] = useState<Price>({ cents: 990, formatted: "R$ 9,90" });
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [deliveryChannel, setDeliveryChannel] = useState<"email" | "whatsapp">("email");
  const [resumeNotice, setResumeNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const stepRef = useRef(0);
  const completedRef = useRef(false);
  const leadTokenRef = useRef("");
  const categoryRef = useRef("");
  const ambientRef = useRef<AmbientEngine | null>(null);

  const spread = useMemo(() => getSpread(spreadId), [spreadId]);
  const cards = useMemo(() => getCards(selected), [selected]);
  const questionPresets = QUESTION_PRESETS[category] ?? [];
  const preview = useMemo(() => {
    if (!category || cards.length !== spread.count) return null;
    return createReading(question, category as Category, cards, spread.id);
  }, [cards, category, question, spread]);
  const progress = Math.min(7, step + 1);

  useEffect(() => {
    fetch("/api/pricing?offer=consulta")
      .then((response) => response.json())
      .then(setPrice)
      .catch(() => undefined);
    emitEvent("landing_view", { surface: "tarot_ritual", paid_traffic: paidTraffic });
    trackMeta("PageView");
    trackMeta("ViewContent", { content_name: "Tarot Chama Sofia", content_category: "Tarot" });
    window.setTimeout(() => setEmail(localStorage.getItem("cs_email") || ""), 0);

    const resumeToken = new URLSearchParams(location.search).get("resume");
    if (resumeToken) {
      fetch(`/api/leads/${encodeURIComponent(resumeToken)}`, { cache: "no-store" })
        .then(async (response) => {
          const draft = await response.json();
          if (!response.ok) throw new Error(draft.error || "Jornada indisponível");
          return draft as { email?: string; whatsapp?: string; category?: string; question?: string };
        })
        .then((draft) => {
          const restoredCategory = String(draft.category || "");
          setEmail(String(draft.email || ""));
          setWhatsapp(formatBrazilPhoneInput(String(draft.whatsapp || "")));
          setDeliveryChannel(draft.whatsapp ? "whatsapp" : "email");
          setCategory(restoredCategory);
          setQuestion(String(draft.question || ""));
          categoryRef.current = restoredCategory;
          leadTokenRef.current = resumeToken;
          stepRef.current = 3;
          setStep(3);
          setResumeNotice(true);
          emitEvent("recovery_resumed", { kind: "form" }, { dedupe: resumeToken });
        })
        .catch(() => undefined);
    }

    const abandon = () => {
      if (completedRef.current) return;
      emitEvent(
        "onboarding_abandon",
        { step: stepRef.current + 1, category: categoryRef.current || undefined, spread_id: spreadId },
        { beacon: true },
      );
    };
    window.addEventListener("pagehide", abandon, { once: true });
    return () => {
      window.removeEventListener("pagehide", abandon);
      stopAmbient();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidTraffic]);

  function go(nextStep: number) {
    setError("");
    stepRef.current = nextStep;
    setStep(nextStep);
    emitEvent(
      "form_step_view",
      { step: nextStep + 1, category: categoryRef.current || undefined, spread_id: spreadId },
      { dedupe: `ritual-step-${nextStep + 1}` },
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startAmbient() {
    if (ambientRef.current || typeof window === "undefined") {
      setAmbientOn(Boolean(ambientRef.current));
      return;
    }
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      const context = new AudioCtor();
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 1.8);
      gain.connect(context.destination);
      const frequencies = [110, 164.81, 220];
      const nodes = frequencies.map((frequency, index) => {
        const oscillator = context.createOscillator();
        const localGain = context.createGain();
        oscillator.type = index === 1 ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        localGain.gain.value = index === 0 ? 0.38 : 0.2;
        oscillator.connect(localGain);
        localGain.connect(gain);
        oscillator.start();
        return oscillator;
      });
      ambientRef.current = { context, gain, nodes };
      setAmbientOn(true);
    } catch {
      setAmbientOn(false);
    }
  }

  function stopAmbient() {
    const engine = ambientRef.current;
    if (!engine) {
      setAmbientOn(false);
      return;
    }
    try {
      engine.gain.gain.cancelScheduledValues(engine.context.currentTime);
      engine.gain.gain.setTargetAtTime(0.0001, engine.context.currentTime, 0.18);
      window.setTimeout(() => {
        engine.nodes.forEach((node) => {
          try { node.stop(); } catch {}
        });
        void engine.context.close();
      }, 900);
    } catch {}
    ambientRef.current = null;
    setAmbientOn(false);
  }

  function toggleAmbient() {
    if (ambientRef.current) stopAmbient();
    else startAmbient();
  }

  function startOnboarding() {
    if (!ambientRef.current) startAmbient();
    emitEvent("onboarding_started", { entry: paidTraffic ? "paid" : "organic", experience: "ritual" });
    go(1);
  }

  function chooseCategory(value: string) {
    categoryRef.current = value;
    setCategory(value);
    emitEvent("category_selected", { category: value }, { dedupe: value });
    go(2);
  }

  function chooseQuestion(value: string) {
    setQuestion(value);
    emitEvent("question_written", { category, length: value.length, mode: "preset" }, { dedupe: value });
    go(3);
  }

  function saveQuestion() {
    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 10) {
      setError("Escreva sua pergunta com pelo menos 10 caracteres.");
      return;
    }
    emitEvent("question_written", { category, length: cleanQuestion.length, mode: "custom" }, { dedupe: cleanQuestion });
    go(3);
  }

  function chooseSpread(id: TarotSpreadId) {
    const chosen = getSpread(id);
    setSpreadId(chosen.id);
    setSelected([]);
    setShuffled(false);
    emitEvent("spread_selected", { spread_id: chosen.id, card_count: chosen.count }, { dedupe: chosen.id });
    go(4);
  }

  function shuffleDeck() {
    const next = [...TAROT_DECK];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setDeckOrder(next);
    setSelected([]);
    setShuffled(true);
    emitEvent("deck_shuffled", { spread_id: spread.id, card_count: spread.count }, { dedupe: `${spread.id}-shuffle` });
  }

  function continueAfterCut() {
    if (!shuffled) {
      setError("Embaralhe o baralho antes de continuar.");
      return;
    }
    const cutAt = Math.floor((deckOrder.length * cut) / 4);
    setDeckOrder([...deckOrder.slice(cutAt), ...deckOrder.slice(0, cutAt)]);
    emitEvent("deck_cut", { cut, spread_id: spread.id }, { dedupe: `${spread.id}-cut-${cut}` });
    go(5);
  }

  function toggleCard(id: string) {
    setError("");
    setSelected((current) => {
      if (current.includes(id)) return current.filter((cardId) => cardId !== id);
      if (current.length >= spread.count) return current;
      return [...current, id];
    });
  }

  function confirmCards() {
    if (selected.length !== spread.count) {
      setError(`Escolha exatamente ${spread.count} ${spread.count === 1 ? "carta" : "cartas"}.`);
      return;
    }
    emitEvent(
      "cards_selected",
      { card_ids: selected, spread_id: spread.id, card_count: spread.count },
      { dedupe: `${spread.id}:${selected.join(",")}` },
    );
    emitEvent("reading_preview", { spread_id: spread.id, card_count: spread.count });
    go(6);
  }

  function selectDelivery(channel: "email" | "whatsapp") {
    setDeliveryChannel(channel);
    setError("");
    emitEvent("delivery_channel_selected", { channel }, { dedupe: channel });
  }

  async function persistLead(context = readAnalyticsContext()) {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return leadTokenRef.current;
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          whatsapp: deliveryChannel === "whatsapp" ? whatsapp.trim() : "",
          category,
          question: question.trim(),
          ...context,
        }),
      });
      const payload = await response.json();
      if (response.ok && payload.publicToken) leadTokenRef.current = String(payload.publicToken);
    } catch {}
    return leadTokenRef.current;
  }

  async function validateContact(context: AnalyticsContext) {
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

  async function checkout(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const context = readAnalyticsContext();
    if (!(await validateContact(context))) return;
    setLoading(true);
    emitEvent("checkout_started", {
      value: price.cents / 100,
      currency: "BRL",
      delivery_channel: deliveryChannel,
      category,
      spread_id: spread.id,
      card_count: spread.count,
    });
    trackMeta("InitiateCheckout", { value: price.cents / 100, currency: "BRL", content_name: "Tarot Chama Sofia" });
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Consulente",
          email: email.trim(),
          whatsapp: deliveryChannel === "whatsapp" ? whatsapp.trim() : "",
          deliveryChannel,
          category,
          question: question.trim(),
          cardIds: selected,
          spreadId: spread.id,
          offer: "consulta",
          leadToken: leadTokenRef.current,
          ...context,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar o Pix.");
      emitEvent(
        "pix_generated",
        { value: price.cents / 100, currency: "BRL", category, spread_id: spread.id, delivery_channel: deliveryChannel },
        { dedupe: String(data.orderNumber || data.url || "pix") },
      );
      completedRef.current = true;
      window.location.assign(data.url);
    } catch (checkoutError) {
      setLoading(false);
      setError(checkoutError instanceof Error ? checkoutError.message : "Tente novamente.");
    }
  }

  return (
    <main className={`ritual-consult-shell ritual-screen-${step}${paidTraffic ? " is-paid-entry" : ""}`}>
      <div className="ritual-stars" aria-hidden="true" />
      <section className="ritual-consult-card" aria-live="polite">
        <header className="ritual-topbar">
          <div className="ritual-brand">
            <img src="/assets/brand/chama-sofia-logo.png" alt="" width="34" height="34" />
            <span>CHAMA SOFIA <b>TAROT</b></span>
          </div>
          <button className="ritual-audio-toggle" type="button" aria-pressed={ambientOn} onClick={toggleAmbient}>
            <span>{ambientOn ? "♫" : "♪"}</span>{ambientOn ? "som ligado" : "som ambiente"}
          </button>
        </header>

        <div className="ritual-progress" aria-label={`Etapa ${progress} de 7`}>
          <span style={{ width: `${(progress / 7) * 100}%` }} />
        </div>

        {step === 0 && (
          <div className="ritual-screen ritual-intro">
            <div className="ritual-intro-art" aria-hidden="true">
              <div className="ritual-candle">✦</div>
              <div className="ritual-deck-stack">
                <img src="/assets/tarot/cards/verso-premium.jpg" alt="" />
                <img src="/assets/tarot/cards/verso-premium.jpg" alt="" />
                <img src="/assets/tarot/cards/verso-premium.jpg" alt="" />
              </div>
            </div>
            <p className="eyebrow">Uma pausa para ouvir sua própria pergunta</p>
            <h1>Respostas para o seu caminho.</h1>
            <p>Escolha o tema, o método e as cartas com suas próprias mãos. Todas as 78 cartas do Tarot participam desta experiência.</p>
            <button className="ritual-primary" onClick={startOnboarding}>INICIAR CONSULTA <span>→</span></button>
            <small>Tarot completo · método à sua escolha · leitura personalizada · PDF</small>
          </div>
        )}

        {step === 1 && (
          <div className="ritual-screen ritual-theme">
            <button className="ritual-back" onClick={() => go(0)}>← voltar</button>
            <p className="eyebrow">Tela 2 · escolha do tema</p>
            <h2>Qual é o tema da sua pergunta?</h2>
            <p className="ritual-muted">Escolha a área que mais se conecta ao que você realmente deseja compreender.</p>
            <div className="ritual-category-grid">
              {CATEGORY_MAP.map(([value, icon, label, description]) => (
                <button key={value} type="button" onClick={() => chooseCategory(value)}>
                  <span className="ritual-category-icon">{icon}</span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ritual-screen ritual-question">
            <button className="ritual-back" onClick={() => go(1)}>← voltar</button>
            <p className="eyebrow">Tela 3 · sua pergunta</p>
            <h2>Escreva o que você deseja compreender.</h2>
            <p className="ritual-muted">Perguntas abertas costumam produzir leituras mais úteis do que um simples “sim ou não”.</p>
            {questionPresets.length > 0 && (
              <div className="ritual-question-presets">
                {questionPresets.map((preset) => (
                  <button key={preset} type="button" onClick={() => chooseQuestion(preset)}>{preset}</button>
                ))}
              </div>
            )}
            <div className="ritual-question-box">
              <textarea
                maxLength={500}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ex.: O que preciso compreender sobre esta relação neste momento?"
              />
              <span>{question.length}/500</span>
            </div>
            <div className="ritual-question-tips">
              <span>✦ seja específica(o)</span><span>✦ conecte a pergunta ao que depende de você</span><span>✦ evite buscar uma sentença definitiva</span>
            </div>
            {error && <p className="ritual-error">{error}</p>}
            <button className="ritual-primary" onClick={saveQuestion}>CONTINUAR <span>→</span></button>
          </div>
        )}

        {step === 3 && (
          <div className="ritual-screen ritual-method">
            <button className="ritual-back" onClick={() => go(2)}>← voltar</button>
            <p className="eyebrow">Tela 4 · método de tiragem</p>
            <h2>Como deseja fazer a tiragem?</h2>
            <p className="ritual-muted">Cada método abre uma quantidade e uma organização diferente de cartas.</p>
            {resumeNotice && <p className="ritual-resume">Recuperamos sua pergunta. Escolha o método e continue de onde parou.</p>}
            <div className="ritual-method-grid">
              {TAROT_SPREADS.map((method) => (
                <button key={method.id} type="button" className={spreadId === method.id ? "selected" : ""} onClick={() => chooseSpread(method.id)}>
                  <div className={`spread-mini spread-mini-${method.count}`} aria-hidden="true">
                    {Array.from({ length: method.count }, (_, index) => <i key={index} />)}
                  </div>
                  <strong>{method.name}</strong>
                  <small>{method.short}</small>
                  <span>{method.count} {method.count === 1 ? "carta" : "cartas"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="ritual-screen ritual-shuffle">
            <button className="ritual-back" onClick={() => go(3)}>← trocar método</button>
            <p className="eyebrow">Tela 5 · preparar as cartas</p>
            <h2>Vamos embaralhar e cortar o baralho.</h2>
            <p className="ritual-muted">Mantenha sua pergunta em mente enquanto as 78 cartas são reorganizadas.</p>
            <button type="button" className={`ritual-shuffle-deck${shuffled ? " is-shuffled" : ""}`} onClick={shuffleDeck} aria-label="Embaralhar as 78 cartas">
              <img src="/assets/tarot/cards/verso-premium.jpg" alt="" />
              <img src="/assets/tarot/cards/verso-premium.jpg" alt="" />
              <img src="/assets/tarot/cards/verso-premium.jpg" alt="" />
              <span>{shuffled ? "Baralho embaralhado" : "Toque para embaralhar"}</span>
            </button>
            {shuffled && (
              <div className="ritual-cut">
                <strong>Onde você quer cortar?</strong>
                <div>
                  {[1, 2, 3].map((value) => (
                    <button key={value} type="button" className={cut === value ? "selected" : ""} onClick={() => setCut(value)}>
                      {value === 1 ? "início" : value === 2 ? "meio" : "fim"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="ritual-error">{error}</p>}
            <button className="ritual-primary" onClick={continueAfterCut} disabled={!shuffled}>ABRIR O BARALHO <span>→</span></button>
          </div>
        )}

        {step === 5 && (
          <div className="ritual-screen ritual-picker">
            <button className="ritual-back" onClick={() => go(4)}>← embaralhar novamente</button>
            <p className="eyebrow">Tela 6 · escolha das cartas</p>
            <h2>Escolha {spread.count === 1 ? "sua carta" : `suas ${spread.count} cartas`}.</h2>
            <p className="ritual-muted">As 78 cartas estão aqui. Deslize pelo baralho e toque apenas nas que chamarem sua atenção.</p>
            <div className="ritual-deck-status"><span>∞</span><strong>78 CARTAS DISPONÍVEIS</strong><em>{selected.length}/{spread.count} escolhidas</em></div>
            <div className="ritual-full-deck" role="list" aria-label="Baralho completo com 78 cartas">
              {deckOrder.map((card, index) => {
                const picked = selected.includes(card.id);
                const selectedIndex = selected.indexOf(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    role="listitem"
                    aria-label={picked ? `Carta escolhida na posição ${selectedIndex + 1}` : `Carta fechada ${index + 1}`}
                    aria-pressed={picked}
                    className={picked ? "picked" : ""}
                    onClick={() => toggleCard(card.id)}
                  >
                    <img src="/assets/tarot/cards/verso-premium.jpg" alt="" />
                    {picked && <span>{selectedIndex + 1}</span>}
                  </button>
                );
              })}
            </div>
            <p className="ritual-picker-hint">← deslize para percorrer todo o baralho →</p>
            {error && <p className="ritual-error">{error}</p>}
            <button className="ritual-primary" onClick={confirmCards} disabled={selected.length !== spread.count}>
              REVELAR {spread.count === 1 ? "MINHA CARTA" : "MINHAS CARTAS"} <span>→</span>
            </button>
          </div>
        )}

        {step === 6 && preview && (
          <div className="ritual-screen ritual-unlock">
            <button className="ritual-back" onClick={() => go(5)}>← escolher outras cartas</button>
            <p className="eyebrow">Tela 7 · revelação</p>
            <h2>{spread.name}</h2>
            <p className="ritual-muted">Estas foram as cartas que você escolheu. A interpretação completa é construída a partir das posições do método e da sua pergunta.</p>
            <div className={`ritual-reveal-grid ritual-reveal-${Math.min(cards.length, 10)}`}>
              {cards.map((card, index) => (
                <article key={card.id} style={{ "--reveal-delay": `${index * 90}ms` } as React.CSSProperties}>
                  <span>{spread.positions[index]?.title || `Carta ${index + 1}`}</span>
                  <img src={card.image} alt={card.name} />
                  <strong>{card.name}</strong>
                </article>
              ))}
            </div>
            <div className="ritual-preview-message">
              <p className="eyebrow">Primeira síntese</p>
              <p>{preview.summary}</p>
              <small>A leitura completa aprofunda cada posição, as conexões entre as cartas e entrega o PDF para guardar.</small>
            </div>

            <div className="ritual-offer">
              <div>
                <p className="eyebrow">Sua leitura completa</p>
                <h3>Interpretação + síntese + PDF personalizado</h3>
                <ul>
                  <li>✓ método {spread.name}</li>
                  <li>✓ {spread.count} {spread.count === 1 ? "carta interpretada" : "cartas interpretadas posição por posição"}</li>
                  <li>✓ conexão entre as cartas e reflexão final</li>
                  <li>✓ PDF privado para guardar</li>
                </ul>
              </div>
              <div className="ritual-price"><small>PAGAMENTO ÚNICO</small><strong>{price.formatted}</strong><span>via Pix · sem assinatura</span></div>
            </div>

            <form onSubmit={checkout} className="ritual-checkout-form">
              <label>E-mail para receber e recuperar sua leitura
                <input required type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => void persistLead()} autoComplete="email" placeholder="voce@email.com" />
              </label>
              <fieldset className="ritual-delivery">
                <legend>Como quer receber o acesso?</legend>
                <button type="button" aria-pressed={deliveryChannel === "email"} className={deliveryChannel === "email" ? "selected" : ""} onClick={() => selectDelivery("email")}>✉ <b>E-mail</b></button>
                <button type="button" aria-pressed={deliveryChannel === "whatsapp"} className={deliveryChannel === "whatsapp" ? "selected" : ""} onClick={() => selectDelivery("whatsapp")}>◉ <b>WhatsApp</b></button>
              </fieldset>
              {deliveryChannel === "whatsapp" && (
                <label>Seu WhatsApp
                  <input required type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(event) => setWhatsapp(formatBrazilPhoneInput(event.target.value))} placeholder="(14) 99999-9999" />
                </label>
              )}
              {error && <p className="ritual-error">{error}</p>}
              <button disabled={loading} className="ritual-primary">
                {loading ? "GERANDO PIX..." : `LIBERAR LEITURA — ${price.formatted}`} <span>→</span>
              </button>
              <small className="ritual-secure">Pagamento seguro via Pix · Próxima Digital · CNPJ 68.964.484/0001-22</small>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
