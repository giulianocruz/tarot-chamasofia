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
type PublicConfig = { metaPixelId?:string; whatsappNumber?:string };
type SavedLead = { publicToken?:string; error?:string };
type ResumeDraft = { name?:string;email?:string;whatsapp?:string;category?:string;question?:string;error?:string };
type CreatedOrder = { orderNumber:string;publicToken:string;url:string;error?:string };
type Offer={code:string;name:string;cents:number;formatted:string;available:boolean;books:string[]};
type Offers={essential:Offer;complete:Offer;upsell:Offer;pricing:Price};
type PublicReview={rating:number;comment:string;display_name:string;created_at:string};

function getAnonymousId() {
  let id = localStorage.getItem("cs_anon");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("cs_anon", id);
  }
  return id;
}

function getSessionId() {
  const now = Date.now();
  const raw = localStorage.getItem('cs_session');
  try {
    const saved = raw ? JSON.parse(raw) as {id?:string;last?:number} : {};
    if (saved.id && saved.last && now-saved.last < 30*60*1000) {
      localStorage.setItem('cs_session',JSON.stringify({id:saved.id,last:now}));
      return saved.id;
    }
  } catch { /* inicia uma sessão limpa */ }
  const id = crypto.randomUUID();
  localStorage.setItem('cs_session',JSON.stringify({id,last:now}));
  return id;
}

function getLandingVariant() {
  const requested = new URLSearchParams(location.search).get('landing_variant');
  const variant = requested === 'B' ? 'B' : requested === 'A' ? 'A' : (sessionStorage.getItem('cs_landing_variant')==='B'?'B':'A');
  sessionStorage.setItem('cs_landing_variant',variant);
  return variant;
}

function getDeviceType() {
  const width = window.innerWidth;
  return width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
}

function getAttribution() {
  return Object.fromEntries(['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].map((key)=>[
    key,new URLSearchParams(location.search).get(key)||localStorage.getItem(`cs_${key}`)||'',
  ]));
}

function track(event: string, metadata?: unknown) {
  const anonymousId = getAnonymousId();
  const isTest = new URLSearchParams(location.search).get('test')==='1';
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive:true,
    body: JSON.stringify({ event, anonymousId,sessionId:getSessionId(),metadata,isTest,landingVariant:getLandingVariant(),deviceType:getDeviceType(),attribution:getAttribution() }),
  });
  if (isTest) return;
  const w = window as typeof window & { fbq?: (...args: unknown[]) => void };
  const map: Record<string, string> = {
    cta_click: "ViewContent",
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
  const [question, setQuestion] = useState("");
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [showSticky, setShowSticky] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [leadToken, setLeadToken] = useState("");
  const [offers,setOffers]=useState<Offers|null>(null);
  const [offerCode,setOfferCode]=useState<'essential'|'complete'>('essential');
  const [reviews,setReviews]=useState<PublicReview[]>([]);
  const landingVariant = useMemo(()=>typeof window==='undefined'?'A':getLandingVariant(),[]);
  const isTest = useMemo(()=>typeof window!=='undefined'&&new URLSearchParams(location.search).get('test')==='1',[]);
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
              "fbclid",
            ].map((key) => [
              key,
              new URLSearchParams(location.search).get(key) ||
                localStorage.getItem(`cs_${key}`) ||
                "",
            ]),
          ),
    [],
  );
  const referralCode = useMemo(() => typeof window === 'undefined' ? '' : (
    new URLSearchParams(location.search).get('ref') || localStorage.getItem('cs_ref') || ''
  ),[]);
  useEffect(() => {
    Object.entries(utms).forEach(([key, value]) => {
      if (value) localStorage.setItem(`cs_${key}`, String(value));
    });
    if (referralCode) localStorage.setItem('cs_ref',referralCode);
    const resumeToken = new URLSearchParams(location.search).get('resume');
    if (resumeToken) {
      fetch(`/api/leads/${encodeURIComponent(resumeToken)}`,{cache:'no-store'})
        .then(async (response)=>{const draft=await response.json() as ResumeDraft;if(!response.ok) throw new Error(draft.error);return draft;})
        .then((draft)=>{
          setName(String(draft.name||''));setEmail(String(draft.email||''));setWhatsapp(String(draft.whatsapp||''));
          setCategory(String(draft.category||''));setQuestion(String(draft.question||''));setFormStep(2);setLeadToken(resumeToken);
          localStorage.setItem('cs_form_active','1');track('recovery_resumed',{kind:'form'});
          requestAnimationFrame(()=>document.getElementById('pergunta')?.scrollIntoView({behavior:'smooth'}));
        }).catch(()=>undefined);
    }
    fetch("/api/offers")
      .then((r) => r.json() as Promise<Offers>)
      .then((data)=>{setOffers(data);setPrice(data.pricing);})
      .catch(() => undefined);
    fetch("/api/config")
      .then((r) => r.json() as Promise<PublicConfig>)
      .then((config) => {
        if (
          config.metaPixelId && !isTest &&
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
    fetch('/api/reviews').then(response=>response.json() as Promise<{reviews:PublicReview[]}>).then(data=>setReviews(data.reviews||[])).catch(()=>undefined);
    track("landing_view");
    const scrollMarks = new Set<number>();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const depth = Math.min(100, Math.round((window.scrollY / max) * 100));
      [25, 50, 75, 90].forEach((mark) => {
        if (depth >= mark && !scrollMarks.has(mark)) {
          scrollMarks.add(mark);
          track(`scroll_${mark}`);
        }
      });
    };
    const onHidden = () => {
      if (document.visibilityState!=='hidden') return;
      track("page_hidden");
      if (localStorage.getItem('cs_form_active')==='1') track('form_abandon');
    };
    const activityTimer = window.setInterval(()=>track('last_activity'),30000);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHidden);
    const hero = document.querySelector(".hero");
    const stickyObserver = hero
      ? new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting), {
          threshold: 0.12,
        })
      : null;
    if (hero) stickyObserver?.observe(hero);
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
    return () => {
      revealObserver.disconnect();
      stickyObserver?.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHidden);
      window.clearInterval(activityTimer);
    };
  }, [utms,referralCode,isTest]);
  const start = () => {
    localStorage.setItem('cs_form_active','1');
    track("cta_click");
    document.getElementById("pergunta")?.scrollIntoView({ behavior: "smooth" });
  };
  function continueToContact() {
    setError("");
    if (!category || question.trim().length < 10) {
      setError("Escolha um tema e escreva uma pergunta com pelo menos 10 caracteres.");
      return;
    }
    setFormStep(2);
    localStorage.setItem('cs_form_active','1');
    track("question_completed");
    track("offer_viewed", { value: price.cents / 100, currency: "BRL" });
    requestAnimationFrame(() =>
      document.getElementById("dados-entrega")?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }
  async function saveLead() {
    if (formStep!==2 || (!email.trim() && !whatsapp.trim())) return leadToken;
    try {
      const response = await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        anonymousId:getAnonymousId(),sessionId:getSessionId(),isTest,name,email,whatsapp,category,question,
      })});
      const data = await response.json() as SavedLead;
      if (response.ok && data.publicToken) { setLeadToken(data.publicToken); return String(data.publicToken); }
    } catch { /* a criação do pedido continua disponível */ }
    return leadToken;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const savedLeadToken = await saveLead();
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
          sessionId:getSessionId(),
          landingVariant,
          deviceType:getDeviceType(),
          isTest,
          leadToken:savedLeadToken,
          referralCode,
          offerCode,
          ...utms,
        }),
      });
      const data = await response.json() as CreatedOrder;
      if (!response.ok)
        throw new Error(data.error || "Não foi possível criar o pedido.");
      const checkoutCents = offerCode==='complete'&&offers ? offers.complete.cents : price.cents;
      track("checkout_started", {
        value: checkoutCents / 100,
        currency: "BRL",
        order_id: data.orderNumber,
        offer_code: offerCode,
      });
      localStorage.removeItem('cs_form_active');
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
          <a href="#presente">Seu e-book</a>
          <a href="/biblioteca">Biblioteca</a>
          <button onClick={start}>Começar leitura</button>
        </div>
      </nav>
      {isTest && <div className="test-mode-banner landing-test-banner">MODO DE TESTE · pedidos e eventos não entram nas métricas comerciais</div>}
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
        <div className="hero-conversion-copy">
        <p className="eyebrow">Leitura personalizada + e-book completo</p>
        <h1>{landingVariant==='B'?`Sua leitura de Tarô + e-book completo por ${price.formatted}`:`Sua leitura de Tarô personalizada + e-book por ${price.formatted}`}</h1>
        <p className="hero-copy">
          Faça uma tiragem personalizada de 3 cartas, receba sua interpretação em PDF e leve também o e-book Tarot para Iniciantes.
        </p>
        <ul className="hero-benefits">
          <li>3 cartas escolhidas para sua pergunta</li><li>Interpretação personalizada</li><li>Resultado privado em PDF</li>
          <li>E-book completo incluído</li><li>Pagamento único via Pix</li><li>Sem assinatura</li>
        </ul>
        <PriceBox price={price} />
        <button className="primary-button" onClick={start}>
          FAZER MINHA LEITURA AGORA <span>→</span>
        </button>
        <p className="secure-note">
          Pagamento único · Sem assinatura · Entrega digital após confirmação
        </p>
        </div>
        <div className="hero-card-fan" aria-hidden="true">
          <img src="/assets/tarot/cards/sacerdotisa.webp" alt="" />
          <img className="hero-book" src="/assets/books/tarot-para-iniciantes-oficial.jpg" alt="" />
          <img src="/assets/tarot/cards/sol.webp" alt="" />
        </div>
      </section>
      <aside className="trust-strip" aria-label="Benefícios da compra">
        <span>
          <b>✦</b> Leitura personalizada de 3 cartas
        </span>
        <span>
          <b>◈</b> E-book completo de 276 páginas incluído
        </span>
        <span>
          <b>⇩</b> Acesso liberado após confirmação do Pix
        </span>
      </aside>
      <section className="demo-section" id="demonstracao" data-reveal>
        <div className="demo-heading"><p className="eyebrow">Demonstração da experiência</p><h2>Veja como sua leitura chega</h2><p>Este é um exemplo ilustrativo. Sua leitura real usa as cartas sorteadas para a sua pergunta.</p></div>
        <div className="demo-grid">
          <div className="demo-cards" aria-label="Exemplo de tiragem de três cartas">
            {[
              ['/assets/tarot/cards/sacerdotisa.webp','Carta 1 · Seu momento','Perceba o que já sabe, mesmo antes de encontrar todas as palavras.'],
              ['/assets/tarot/cards/mago.webp','Carta 2 · O caminho','Organize os recursos disponíveis e transforme intenção em ação consciente.'],
              ['/assets/tarot/cards/sol.webp','Carta 3 · Conselho','Procure clareza e converse com honestidade sobre o que deseja construir.'],
            ].map(([image,title,text])=><article key={title}><img src={image} alt="" width="220" height="350" loading="lazy"/><div><span>EXEMPLO</span><h3>{title}</h3><p>{text}</p></div></article>)}
          </div>
          <div className="delivery-preview">
            <div className="pdf-preview"><span>PDF PERSONALIZADO</span><strong>Sua pergunta + 3 cartas + interpretação conectada</strong><small>Um arquivo privado para baixar, guardar e reler.</small></div>
            <img src="/assets/books/tarot-para-iniciantes-oficial.jpg" alt="Capa real do e-book Tarot para Iniciantes" width="320" height="480" loading="lazy"/>
          </div>
        </div>
        <button className="primary-button" onClick={start}>QUERO RECEBER MINHA LEITURA <span>→</span></button>
      </section>
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
            <span>{formStep}</span>
            <b>{formStep === 1 ? "Conte sua pergunta" : "Receba sua leitura"}</b>
            <small>Leva menos de 2 minutos</small>
          </div>
          {formStep === 1 ? (
            <>
          <label className="field-label">Escolha o tema</label>
          <div className="category-grid">
            {CATEGORIES.map((item) => (
              <button
                type="button"
                className={category === item ? "selected" : ""}
                onClick={() => {setCategory(item);track('question_started',{category:item});}}
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
            onFocus={()=>track('question_started')}
            placeholder="Escreva sua pergunta com calma..."
          />
          <div className="char-count">{question.length}/500</div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="button" className="primary-button form-submit" onClick={continueToContact}>
            CONTINUAR MINHA LEITURA <span>→</span>
          </button>
            </>
          ) : (
            <div id="dados-entrega">
          <div className="offer-picker" aria-label="Escolha sua oferta">
            <button type="button" className={offerCode==='essential'?'selected':''} onClick={()=>{setOfferCode('essential');track('offer_selected',{offerCode:'essential'});}}>
              <span>ESSENCIAL</span><strong>{offers?.essential.formatted||price.formatted}</strong><small>3 cartas + interpretação + PDF + e-book Tarot para Iniciantes</small>
            </button>
            <button type="button" disabled={!offers?.complete.available} className={offerCode==='complete'?'selected recommended':''} onClick={()=>{if(offers?.complete.available){setOfferCode('complete');track('offer_selected',{offerCode:'complete'});}}}>
              <span>MELHOR CUSTO-BENEFÍCIO</span><strong>{offers?.complete.formatted||'R$ 19,90'}</strong><small>{offers?.complete.available?'Tudo da Essencial + Pomba Gira + Preto Velho':'Biblioteca ampliada em preparação'}</small>
            </button>
          </div>
          <div className="offer-includes">
            <strong>Sua compra inclui</strong>
            <span>✓ leitura personalizada com 3 cartas e interpretação</span>
            <span>✓ PDF privado para guardar e reler</span>
            <span>✓ e-book Tarot para Iniciantes, 276 páginas</span>
            {offerCode==='complete'&&<span>✓ livros Pomba Gira + Preto Velho</span>}
          </div>
          <button type="button" className="edit-question" onClick={() => setFormStep(1)}>← Editar minha pergunta</button>
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
              onBlur={() => void saveLead()}
              placeholder="voce@email.com"
            />
            <small className="field-help">
              Usado para gerar o Pix seguro e recuperar sua leitura.
            </small>
          </label>
          <label>
              WhatsApp <small>(opcional)</small>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                onBlur={() => void saveLead()}
                placeholder="(14) 99999-9999"
              />
              <small className="field-help">
                Informe para receber o link da sua jornada. Se você pausar, podemos enviar até dois lembretes desta compra, sem pressão.
              </small>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-button form-submit"
            disabled={loading}
          >
            {loading
              ? "GERANDO SEU PIX..."
              : `IR PARA O PIX · ${offerCode==='complete'&&offers?offers.complete.formatted:price.formatted}`}{" "}
            <span>→</span>
          </button>
          <div className="checkout-confidence">
            <span>✓ Pagamento seguro</span>
            <span>✓ Compra única</span>
            <span>✓ Acesso privado</span>
          </div>
          <p className="form-privacy">
            Seus dados e sua pergunta não serão publicados.
          </p>
            </div>
          )}
        </form>
      </section>
      <section className="receive" data-reveal>
        <p className="eyebrow">Uma experiência completa</p>
        <h2>O que você recebe</h2>
        <div className="receive-grid">
          {[
            ["☾", "Leitura personalizada", "Três cartas que conversam entre si e com a pergunta que você trouxe."],
            [
              "⇩",
              "Interpretação conectada",
              "Uma narrativa personalizada para ajudar você a refletir sobre seu momento.",
            ],
            [
              "◈",
              "PDF da sua leitura",
              "Sua experiência organizada em um arquivo privado para guardar e reler.",
            ],
            ["✦", "E-book completo incluído", "Tarot para Iniciantes, edição digital com 276 páginas para continuar explorando o Tarot."],
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
          <p className="eyebrow">Seu guia para continuar</p>
          <h2>A leitura termina. Seu aprendizado pode continuar.</h2>
          <h3>Tarot para Iniciantes</h3>
          <p>
            Além da experiência personalizada, você recebe o livro digital da SofIA Labs com{" "}
            <strong>276 páginas</strong>, liberado para download depois da
            confirmação do pagamento.
          </p>
          <p className="ebook-note">
            Use o e-book para conhecer melhor os Arcanos, aprofundar o significado das cartas e continuar sua jornada depois da leitura. Também publicado no Google Play Books.
          </p>
        </div>
      </section>
      <section className="price-section" data-reveal>
        <p className="eyebrow">Condição especial de lançamento</p>
        <h2>Faça sua leitura e leve o e-book junto</h2>
        <PriceBox price={price} />
        <p>
          O valor muda somente conforme pagamentos realmente confirmados. Sem
          escassez falsa.
        </p>
        <button className="primary-button" onClick={start}>
          FAZER MINHA LEITURA <span>→</span>
        </button>
      </section>
      {reviews.length>0&&<section className="social-proof" data-reveal><p className="eyebrow">Experiências reais</p><h2>Avaliações de quem já viveu a jornada</h2><div className="review-grid">{reviews.map((review,index)=><article key={`${review.display_name}-${index}`}><span className="stars-real">{'★'.repeat(review.rating)}</span><blockquote>“{review.comment}”</blockquote><small>{review.display_name} · compra verificada</small></article>)}</div></section>}
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
            "O que estou comprando?",
            "Você compra uma experiência digital de Tarô: uma leitura personalizada de 3 cartas, interpretação conectada à sua pergunta e PDF privado. O e-book Tarot para Iniciantes, com 276 páginas, também está incluído para você continuar explorando o Tarot depois da leitura.",
          ],
          [
            "Minha pergunta é pública?",
            "Não. Ela aparece somente na página protegida pelo token longo e não indexada por buscadores.",
          ],
          ].map(([q, a]) => (
          <details key={q} onToggle={(event) => event.currentTarget.open && track("faq_opened", { question: q })}>
            <summary>
              {q}
              <span>+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <section className="collection" data-reveal>
        <p className="eyebrow">Coleção Chama Sofia</p>
        <h2>A jornada está apenas começando</h2>
        <p>Além do e-book de Tarot incluído na oferta Essencial, você pode ampliar sua biblioteca com os títulos Pomba Gira e Preto Velho na oferta Completa ou após a compra.</p>
        <div className="collection-grid">
          <article className="available"><img src="/assets/books/tarot-para-iniciantes-oficial.jpg" alt="Capa Tarot para Iniciantes" loading="lazy" /><h3>Tarot para Iniciantes</h3><span>Incluído na Essencial</span></article>
          <article><img src="/assets/books/pomba-gira.jpg" alt="Capa do livro Pomba Gira" loading="lazy" /><h3>Pomba Gira</h3><span>Pacote Completo</span></article>
          <article><img src="/assets/books/preto-velho.jpg" alt="Capa do livro Preto Velho" loading="lazy" /><h3>Preto Velho</h3><span>Pacote Completo</span></article>
        </div>
      </section>
      <section className="final-cta">
        <span>✦</span>
        <h2>
          Respire. Pense na sua pergunta.
          <br />
          As cartas convidam você a olhar por outro ângulo.
        </h2>
        <button className="primary-button" onClick={start}>
          FAZER MINHA LEITURA <span>→</span>
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
        <a className="support-link" href="https://wa.me/5514996428874?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20Tarot%20Chama%20Sofia" target="_blank" rel="noreferrer" onClick={() => track("support_clicked", { channel: "whatsapp" })}>
          Atendimento pelo WhatsApp · (14) 99642-8874
        </a>
      </footer>
      <button className={`mobile-sticky-cta ${showSticky ? "is-visible" : ""}`} onClick={start}>
        FAZER MINHA LEITURA · {price.formatted}
      </button>
    </main>
  );
}

function PriceBox({ price }: { price: Price }) {
  return (
    <div className="price-card">
      <span>VALOR ESPECIAL DE LANÇAMENTO</span>
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
