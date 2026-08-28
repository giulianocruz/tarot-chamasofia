"use client";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/tarot";

type Price = {
  cents: number;
  formatted: string;
  remaining: number | null;
  nextFormatted: string | null;
  confirmedSales: number;
};

function getAnonymousId() {
  let id = localStorage.getItem("cs_anon");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("cs_anon", id);
  }
  return id;
}

function track(event: string, metadata?: unknown) {
  const anonymousId = getAnonymousId();
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, anonymousId, metadata }),
  });
  const w = window as typeof window & { fbq?: (...args: unknown[]) => void };
  const map: Record<string, string> = {
    landing_view: "PageView",
    start_question: "ViewContent",
    question_completed: "Lead",
    checkout_started: "InitiateCheckout",
  };
  if (map[event] && w.fbq) w.fbq("track", map[event], metadata ?? {});
}

export default function LandingClient() {
  const [price, setPrice] = useState<Price>({
    cents: 990,
    formatted: "R$ 9,90",
    remaining: 5,
    nextFormatted: "R$ 12,90",
    confirmedSales: 0,
  });
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [contactMethod, setContactMethod] = useState<"whatsapp" | "email">(
    "whatsapp",
  );
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const utms = useMemo(
    () =>
      typeof window === "undefined"
        ? {}
        : Object.fromEntries(
            [
              "utm_source",
              "utm_medium",
              "utm_campaign",
              "utm_content",
              "utm_term",
            ].map((key) => [
              key,
              new URLSearchParams(location.search).get(key) ||
                localStorage.getItem(`cs_${key}`) ||
                "",
            ]),
          ),
    [],
  );
  useEffect(() => {
    Object.entries(utms).forEach(([key, value]) => {
      if (value) localStorage.setItem(`cs_${key}`, String(value));
    });
    fetch("/api/pricing")
      .then((r) => r.json())
      .then(setPrice)
      .catch(() => undefined);
    fetch("/api/config")
      .then((r) => r.json())
      .then((config) => {
        if (
          config.metaPixelId &&
          !(window as typeof window & { fbq?: unknown }).fbq
        ) {
          const w = window as typeof window & {
            fbq?: (...args: unknown[]) => void;
            _fbq?: unknown;
          };
          const queue: unknown[][] = [];
          w.fbq = (...args: unknown[]) => queue.push(args);
          (w.fbq as unknown as { queue: unknown[][] }).queue = queue;
          const script = document.createElement("script");
          script.async = true;
          script.src = "https://connect.facebook.net/en_US/fbevents.js";
          document.head.appendChild(script);
          w.fbq("init", config.metaPixelId);
          w.fbq("track", "PageView");
        }
      })
      .catch(() => undefined);
    track("landing_view");
    const revealObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    document
      .querySelectorAll("[data-reveal]")
      .forEach((item) => revealObserver.observe(item));
    return () => revealObserver.disconnect();
  }, [utms]);
  const start = () => {
    track("start_question");
    document.getElementById("pergunta")?.scrollIntoView({ behavior: "smooth" });
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    track("question_completed");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          whatsapp,
          category,
          question,
          anonymousId: getAnonymousId(),
          ...utms,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível criar o pedido.");
      track("checkout_started", {
        value: price.cents / 100,
        currency: "BRL",
        order_id: data.orderNumber,
      });
      location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tente novamente.");
      setLoading(false);
    }
  }
  return (
    <main className="site-shell">
      <nav className="nav">
        <a className="brand" href="#top">
          <img
            className="brand-logo"
            src="/assets/brand/chama-sofia-logo.png"
            alt=""
            width="38"
            height="38"
          />
          <span>CHAMA SOFIA</span>
        </a>
        <div className="nav-menu">
          <a href="#como-funciona">Como funciona</a>
          <a href="#presente">Seu presente</a>
          <button onClick={start}>Começar leitura</button>
        </div>
      </nav>
      <section className="hero" id="top">
        <img
          className="hero-art"
          src="/assets/tarot/backgrounds/hero-oraculo-premium.jpg"
          alt=""
          width="1600"
          height="900"
          fetchPriority="high"
          aria-hidden="true"
        />
        <div className="hero-aura" aria-hidden="true" />
        <div className="stars" aria-hidden="true">
          ✦ · ✧ · ✦
        </div>
        <p className="eyebrow">Uma pausa para ouvir sua intuição</p>
        <h1>
          FAÇA SUA PERGUNTA
          <br />
          AO TAROT
        </h1>
        <p className="hero-copy">
          Receba uma leitura automática de 3 cartas, interpretação personalizada
          e sua leitura completa em PDF.
        </p>
        <p className="bonus-line">
          <span>✦</span> E ainda ganhe o e-book Tarot para Iniciantes.
        </p>
        <PriceBox price={price} />
        <button className="primary-button" onClick={start}>
          QUERO FAZER MINHA LEITURA <span>→</span>
        </button>
        <p className="secure-note">
          Pagamento via Pix · Resultado privado · Sem cadastro
        </p>
        <div className="hero-card-fan" aria-hidden="true">
          <img src="/assets/tarot/cards/sacerdotisa.webp" alt="" />
          <img src="/assets/tarot/cards/estrela.webp" alt="" />
          <img src="/assets/tarot/cards/sol.webp" alt="" />
        </div>
      </section>
      <aside className="trust-strip" aria-label="Benefícios da compra">
        <span>
          <b>✦</b> Liberação após confirmação
        </span>
        <span>
          <b>◈</b> Leitura privada e personalizada
        </span>
        <span>
          <b>⇩</b> PDF + e-book de 276 páginas
        </span>
      </aside>
      <section className="steps" id="como-funciona" data-reveal>
        <p className="eyebrow">Simples, íntimo e especial</p>
        <h2>Sua leitura em poucos minutos</h2>
        <div className="step-grid">
          {[
            ["01", "Faça sua pergunta"],
            ["02", "Realize o Pix"],
            ["03", "Revele suas 3 cartas"],
            ["04", "Receba sua interpretação"],
            ["05", "Baixe o PDF e o e-book"],
          ].map(([n, label]) => (
            <div className="step" key={n}>
              <span>{n}</span>
              <p>{label}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="question-section" id="pergunta" data-reveal>
        <div className="question-intro">
          <p className="eyebrow">Sua pergunta, sua jornada</p>
          <h2>O que você gostaria de compreender?</h2>
          <p>
            Prefira perguntas abertas que ajudem na reflexão. Em vez de “Vou
            voltar com essa pessoa?”, experimente “O que preciso compreender
            sobre essa relação neste momento?”
          </p>
          <ul>
            <li>3 cartas sem repetição</li>
            <li>Narrativa conectada à sua pergunta</li>
            <li>Resultado privado + PDF</li>
          </ul>
        </div>
        <form className="reading-form" onSubmit={submit}>
          <div className="form-progress">
            <span>1</span>
            <b>Conte sua pergunta</b>
            <small>Leva menos de 2 minutos</small>
          </div>
          <label className="field-label">Escolha o tema</label>
          <div className="category-grid">
            {CATEGORIES.map((item) => (
              <button
                type="button"
                className={category === item ? "selected" : ""}
                onClick={() => setCategory(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="field-label" htmlFor="question">
            Qual pergunta você gostaria de fazer ao Tarot?
          </label>
          <textarea
            id="question"
            required
            minLength={10}
            maxLength={500}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Escreva sua pergunta com calma..."
          />
          <div className="char-count">{question.length}/500</div>
          <label>
            Seu nome
            <input
              required
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como podemos te chamar?"
            />
          </label>
          <fieldset className="contact-choice">
            <legend>Como prefere receber o acesso?</legend>
            <div>
              <button
                type="button"
                className={contactMethod === "whatsapp" ? "selected" : ""}
                aria-pressed={contactMethod === "whatsapp"}
                onClick={() => setContactMethod("whatsapp")}
              >
                <span>◉</span> WhatsApp
              </button>
              <button
                type="button"
                className={contactMethod === "email" ? "selected" : ""}
                aria-pressed={contactMethod === "email"}
                onClick={() => setContactMethod("email")}
              >
                <span>✉</span> E-mail
              </button>
            </div>
          </fieldset>
          {contactMethod === "whatsapp" ? (
            <label>
              Seu WhatsApp
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(14) 99999-9999"
              />
              <small className="field-help">
                Usaremos este número somente para identificar e liberar sua
                leitura.
              </small>
            </label>
          ) : (
            <label>
              Seu e-mail
              <input
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={120}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
              />
              <small className="field-help">
                Confira o endereço antes de continuar.
              </small>
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-button form-submit"
            disabled={loading || !category}
          >
            {loading
              ? "CRIANDO SEU PEDIDO..."
              : `CONTINUAR POR ${price.formatted}`}{" "}
            <span>→</span>
          </button>
          <div className="checkout-confidence">
            <span>✓ Pix seguro</span>
            <span>✓ Sem assinatura</span>
            <span>✓ Acesso privado</span>
          </div>
          <p className="form-privacy">
            Seus dados e sua pergunta não serão publicados.
          </p>
        </form>
      </section>
      <section className="receive" data-reveal>
        <p className="eyebrow">Uma experiência completa</p>
        <h2>O que você recebe</h2>
        <div className="receive-grid">
          {[
            ["✦", "Três cartas", "Situação, influências e tendência/conselho."],
            [
              "☾",
              "Leitura personalizada",
              "As cartas conversam entre si e com sua pergunta.",
            ],
            [
              "⇩",
              "PDF completo",
              "Sua leitura organizada para guardar e reler.",
            ],
            [
              "◈",
              "Reflexão final",
              "Um convite acolhedor para seus próximos passos.",
            ],
          ].map(([icon, title, text]) => (
            <article key={title}>
              <span>{icon}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="ebook" id="presente" data-reveal>
        <div className="book-visual">
          <img
            src="/assets/books/tarot-para-iniciantes-oficial.jpg"
            alt="Capa oficial do livro Tarot para Iniciantes, SofIA Labs"
            width="1024"
            height="1536"
            loading="lazy"
          />
        </div>
        <div>
          <p className="eyebrow">Seu presente</p>
          <h2>Você acabou de ganhar um guia completo de Tarot.</h2>
          <h3>Tarot para Iniciantes</h3>
          <p>
            Livro digital da SofIA Labs com aproximadamente{" "}
            <strong>276 páginas</strong>, entregue para download depois da
            confirmação do pagamento.
          </p>
          <p className="ebook-note">
            Bônus separado da leitura e disponibilizado com autorização do
            titular.
          </p>
        </div>
      </section>
      <section className="price-section" data-reveal>
        <p className="eyebrow">Valor progressivo e transparente</p>
        <h2>Comece sua leitura hoje</h2>
        <PriceBox price={price} />
        <p>
          O valor muda somente conforme pagamentos realmente confirmados. Sem
          escassez falsa.
        </p>
        <button className="primary-button" onClick={start}>
          FAZER MINHA PERGUNTA <span>→</span>
        </button>
      </section>
      <section className="faq" data-reveal>
        <p className="eyebrow">Perguntas frequentes</p>
        <h2>Antes de começar</h2>
        {[
          [
            "O Tarot prevê exatamente o futuro?",
            "Não. A leitura é uma ferramenta simbólica de reflexão e autoconhecimento, sem garantia de acontecimentos futuros.",
          ],
          [
            "Quando recebo minha leitura?",
            "Depois da confirmação do Pix no sistema, as três cartas são sorteadas e a leitura é liberada na sua URL privada.",
          ],
          [
            "As cartas podem se repetir?",
            "Não. O sorteio usa três cartas distintas entre os 22 Arcanos Maiores.",
          ],
          [
            "O e-book está incluso?",
            "Sim. O livro Tarot para Iniciantes, com 276 páginas, fica disponível para download após a confirmação do pagamento.",
          ],
          [
            "Minha pergunta é pública?",
            "Não. Ela aparece somente na página protegida pelo token longo e não indexada por buscadores.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span>+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <section className="final-cta">
        <span>✦</span>
        <h2>
          Respire. Pense na sua pergunta.
          <br />
          As cartas convidam você a olhar por outro ângulo.
        </h2>
        <button className="primary-button" onClick={start}>
          QUERO FAZER MINHA LEITURA <span>→</span>
        </button>
      </section>
      <footer>
        <a className="brand" href="#top">
          <img
            className="brand-logo"
            src="/assets/brand/chama-sofia-logo.png"
            alt=""
            width="38"
            height="38"
          />
          <span>CHAMA SOFIA</span>
        </a>
        <p>
          O Tarot apresentado nesta plataforma possui finalidade de
          entretenimento, reflexão e autoconhecimento. As interpretações não
          representam garantia de acontecimentos futuros.
        </p>
        <small>
          © {new Date().getFullYear()} Chama Sofia · tarot.chamasofia.com.br
        </small>
      </footer>
      <button className="mobile-sticky-cta" onClick={start}>
        FAZER MINHA LEITURA · {price.formatted}
      </button>
    </main>
  );
}

function PriceBox({ price }: { price: Price }) {
  return (
    <div className="price-card">
      <span>PREÇO ATUAL</span>
      <strong>{price.formatted}</strong>
      <small>
        {price.remaining
          ? `Restam ${price.remaining} leituras neste valor.`
          : "Valor atual da leitura."}
        {price.nextFormatted && (
          <>
            {" "}
            <b>Próximo valor: {price.nextFormatted}</b>
          </>
        )}
      </small>
    </div>
  );
}
