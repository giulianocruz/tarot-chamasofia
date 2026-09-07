"use client";
import { useCallback, useEffect, useState } from "react";
import { BOOK_CATALOG } from "@/lib/book-catalog";
import { normalizeBrazilPhone } from "@/lib/phone";
type Order = {
  id: number;
  order_number: string;
  public_token: string;
  customer_name: string;
  customer_email?: string;
  customer_whatsapp?: string;
  category: string;
  question: string;
  price: number;
  payment_status: string;
  reading_status: string;
  cards_json?: string;
  created_at: string;
  paid_at?: string;
  utm_source?: string;
  utm_campaign?: string;
  offer_code?: string;
  product_slug?: string;
  delivery_channel?: string;
};
type Data = {
  orders: Order[];
  bookInventory: Array<{slug:string;available:boolean}>;
  dashboard: {
    salesToday: number;
    totalSales: number;
    revenue: number;
    averageTicket: number;
    pending: number;
    generated: number;
    conversion: number;
    astro: { sales:number; revenue:number; profiles:number };
    ebooks: { sales:number; revenue:number; libraryViews:number; offerViews:number; selected:number; checkoutStarted:number; purchases:number; products:Array<{slug:string;sales:number;revenue:number}> };
    delivery: { email:number; whatsapp:number };
    pricing: { formatted: string; remaining: number | null };
    traffic: { sessionsObserved:number; paidSessionsObserved:number; lastVisit:string|null; paidSessions:number; paidSales:number; paidRevenue:number; paidConversion:number };
    campaigns: Array<{ source:string; campaign:string; sessions:number; offers:number; pix:number; sales:number; revenue:number; conversion:number }>;
    recentJourneys: Array<{ source:string; campaign:string; startedAt:string; lastAt:string; durationSeconds:number; lastStage:string; path:string[] }>;
    international: { orders:number; sales:number; revenue:number; pending:number; interests:Array<{product:string;count:number}>; readiness:{stripe:boolean;webhook:boolean;email:boolean;astrology:boolean;ready:boolean} };
    funnel: { sessions:number; started:number; categories:number; questions:number; cards:number; previews:number; offers:number; contacts:number; checkouts:number; pix:number; paid:number };
    paidFunnel: { sessions:number; started:number; categories:number; questions:number; cards:number; previews:number; offers:number; contacts:number; checkouts:number; pix:number; paid:number };
    behavior: { depth25:number; depth50:number; depth75:number; depth90:number; faqOpened:number; contactClicks:number; exits:number; step2:number };
  };
};
const usd = (c: number) => new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(c / 100);
const money = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    c / 100,
  );
export default function AdminClient() {
  const [data, setData] = useState<Data | null>(null);
  const [login, setLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [bookStatus, setBookStatus] = useState("");
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/orders", { cache: "no-store" });
    if (r.status === 401) {
      setLogin(true);
      return;
    }
    const d = await r.json();
    setData(d);
    setLogin(false);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setLogin(false);
    void load();
  }
  async function action(orderNumber: string, action: string) {
    setBusy(orderNumber + action);
    const r = await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, action }),
    });
    const d = await r.json();
    if (!r.ok) alert(d.error);
    setBusy("");
    void load();
  }
  async function uploadBook(bookSlug: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setBookStatus("Selecione um arquivo PDF."); return; }
    setBookStatus("Enviando livro...");
    const response = await fetch(`/api/admin/ebook?book=${encodeURIComponent(bookSlug)}`, { method:"PUT", headers:{"Content-Type":"application/pdf"}, body:file });
    const result = await response.json();
    setBookStatus(response.ok ? `${bookSlug}: atualizado (${(file.size/1024/1024).toFixed(1)} MB).` : result.error || "Falha no envio.");
    event.target.value = "";
  }
  function readingUrl(token: string) {
    return `${window.location.origin}/leitura/${token}`;
  }
  async function copyReadingLink(token: string) {
    await navigator.clipboard.writeText(readingUrl(token));
    alert("Link privado copiado. Agora você pode enviá-lo ao cliente.");
  }
  function sendByWhatsApp(order: Order) {
    const phone = normalizeBrazilPhone(order.customer_whatsapp);
    const firstName = order.customer_name.trim().split(/\s+/)[0] || "Olá";
    const product = order.offer_code === "astro-tarot" ? "sua análise AstroTarot Chama Sofia" : order.offer_code === "ebook" ? "seu e-book Chama Sofia" : "sua leitura Chama Sofia";
    const message = `${firstName}, ${product} está pronta ✨\n\nAcesse seu link privado:\n${readingUrl(order.public_token)}\n\nO acesso fica vinculado a este pedido e reúne os conteúdos liberados após o pagamento.`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  if (login)
    return (
      <main className="admin-login">
        <form onSubmit={signIn}>
          <span className="brand-mark">✦</span>
          <p className="eyebrow">Chama Sofia</p>
          <h1>Acesso à gestão</h1>
          <label>
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button">ENTRAR</button>
        </form>
      </main>
    );
  if (!data) return <main className="admin-login">Carregando...</main>;
  const d = data.dashboard;
  const inventory=new Map(data.bookInventory.map((book)=>[book.slug,book.available]));
  const usePaidFunnel = d.traffic.paidSessions > 0;
  const activeFunnel = usePaidFunnel ? d.paidFunnel : d.funnel;
  const funnelScope = usePaidFunnel ? "Funil de mídia paga" : "Funil geral";
  const journeyEventLabels: Record<string,string> = {
    landing_view:"Entrada",onboarding_started:"Início",category_selected:"Tema",question_written:"Pergunta",
    question_completed:"Pergunta",cards_selected:"Cartas",reading_preview:"Prévia",offer_view:"Oferta",offer_viewed:"Oferta",
    contact_captured:"Contato",checkout_started:"Checkout",pix_generated:"Pix",payment_confirmed:"Pagamento",purchase:"Pagamento",
    onboarding_abandon:"Saiu",form_abandon:"Saiu",page_exit:"Saiu",
  };
  const journeyDuration = (seconds:number) => seconds < 60 ? `${seconds}s` : `${Math.floor(seconds/60)}m ${seconds%60}s`;
  const funnelStages = [
    ["sessions", "Sessões", activeFunnel.sessions],
    ["category", "Tema", activeFunnel.categories],
    ["question", "Pergunta", activeFunnel.questions],
    ["cards", "Cartas", activeFunnel.cards],
    ["preview", "Prévia", activeFunnel.previews],
    ["offer", "Oferta", activeFunnel.offers],
    ["contact", "Contato", activeFunnel.contacts],
    ["checkout", "Checkout", activeFunnel.checkouts],
    ["pix", "Pix", activeFunnel.pix],
    ["paid", "Pagamento", activeFunnel.paid],
  ] as const;
  const stageDrops = funnelStages.slice(1).map((stage,index) => {
    const previous=funnelStages[index][2];
    const current=stage[2];
    return { fromId:funnelStages[index][0], toId:stage[0], from:funnelStages[index][1], to:stage[1], previous, current, drop:previous ? Math.max(0,1-current/previous) : 0 };
  }).filter((item)=>item.previous>0);
  const biggestDrop = [...stageDrops].sort((a,b)=>b.drop-a.drop)[0];
  const diagnosticByStage: Record<string,{title:string;text:string}> = {
    "sessions>category": {title:"A primeira decisão está travando.",text:"Revise a promessa do anúncio e a primeira tela. Deixe explícito: prévia antes do Pix, valor do completo e pagamento apenas se a pessoa quiser aprofundar."},
    "category>question": {title:"As perguntas prontas não estão puxando a pessoa adiante.",text:"Use opções mais específicas por tema e mantenha a escrita livre como alternativa secundária."},
    "question>cards": {title:"Há fricção antes da experiência mais envolvente.",text:"Reforce que não existe carta certa e leve a pessoa às três escolhas sem texto extra."},
    "cards>preview": {title:"A revelação precisa ser imediata e confiável.",text:"Essa queda aponta para carregamento, erro de renderização ou expectativa quebrada."},
    "preview>offer": {title:"A prévia interessa, mas o aprofundamento ainda não parece valioso.",text:"Mostre no CTA o preço e as camadas abertas: mapa natal, céu atual, síntese das três cartas e PDF."},
    "offer>contact": {title:"A objeção está na oferta final ou na confiança.",text:"Mantenha apenas e-mail obrigatório, WhatsApp opcional e prova clara de pagamento único."},
    "contact>checkout": {title:"O formulário está impedindo a geração do pedido.",text:"Verifique validação de contato, erros silenciosos e resposta da criação do pedido."},
    "checkout>pix": {title:"O problema está na criação ou apresentação do Pix.",text:"Audite gateway, QR Code, copia e cola e o tempo até a tela de pagamento."},
    "pix>paid": {title:"O Pix é gerado, mas a compra não fecha.",text:"Reforce segurança e valor entregue, e verifique a confirmação automática do pagamento."},
  };
  const diagnostic=biggestDrop
    ? diagnosticByStage[`${biggestDrop.fromId}>${biggestDrop.toId}`] || {title:`Gargalo principal: ${biggestDrop.from} → ${biggestDrop.to}`,text:"Acompanhe essa transição antes de alterar preço ou criativo; o funil é cumulativo por sessão."}
    : {title:"O funil ainda precisa de mais sessões para apontar um gargalo.",text:"Acompanhe as próximas visitas e priorize o funil da mídia paga quando houver campanhas ativas."};
  return (
    <main className="admin-shell">
      <header>
        <div>
          <p className="eyebrow">Painel administrativo</p>
          <h1>AstroTarot Chama Sofia</h1>
        </div>
        <div className="admin-actions">
          <a className="admin-download" href="/assets/social/anuncio-tarot-livro-v2.png" download>Baixar arte do anúncio</a>

          <button onClick={() => void load()}>Atualizar pedidos</button>
          {bookStatus && <small>{bookStatus}</small>}
        </div>
      </header>
      <section className="library-admin-panel">
        <div className="panel-title"><div><p className="eyebrow">Acervo digital</p><h2>Biblioteca Chama Sofia</h2></div><span>PDFs entregues automaticamente após o pagamento</span></div>
        <div className="library-admin-grid">
          {BOOK_CATALOG.map((book) => (
            <article key={book.slug}>
              <img src={book.cover} alt={`Capa ${book.shortTitle}`} />
              <div><strong>{book.shortTitle}</strong><small>{book.slug}</small><span className={inventory.get(book.slug)?"inventory-status is-ready":"inventory-status is-missing"}>{inventory.get(book.slug)?"Pronto para venda":"PDF pendente"}</span></div>
              <label className="admin-upload">Enviar PDF<input type="file" accept="application/pdf" onChange={(event) => void uploadBook(book.slug,event)} /></label>
            </article>
          ))}
        </div>
        {bookStatus && <p className="library-admin-status">{bookStatus}</p>}
      </section>
      <section className="metrics">
        {[
          ["Vendas hoje", d.salesToday, "pagamentos confirmados hoje"],
          ["Acessos registrados", d.traffic.sessionsObserved, "sessões reais registradas na base"],
          ["Acessos de anúncios", d.traffic.paidSessionsObserved, "sessões com origem paga identificada"],
          ["Vendas totais", d.totalSales, "pedidos pagos na base"],
          ["Sessões Ads", d.traffic.paidSessions, "visitas atribuídas às campanhas"],
          ["Vendas Ads", d.traffic.paidSales, "compras vindas de mídia paga"],
          ["Conversão Ads", `${(d.traffic.paidConversion * 100).toFixed(1)}%`, "vendas ÷ sessões pagas"],
          ["Receita Ads", money(d.traffic.paidRevenue), "receita atribuída às campanhas"],
          ["Receita total", money(d.revenue), "faturamento confirmado"],
          ["Ticket médio", money(d.averageTicket), "valor médio por venda"],
          ["Preço atual", d.pricing.formatted, "oferta vigente"],
          ["Restam na faixa", d.pricing.remaining ?? "∞", "antes da próxima faixa"],
          ["Conversão geral", `${(d.conversion * 100).toFixed(1)}%`, "vendas ÷ sessões"],
          ["Pendentes", d.pending, "Pix ainda não confirmado"],
          ["Leituras geradas", d.generated, "entregas produzidas"],
          ["E-books vendidos", d.ebooks.sales, "vendas da biblioteca"],
          ["Vendas AstroTarot", d.astro.sales, "pedidos pagos do produto principal"],
          ["Receita AstroTarot", money(d.astro.revenue), "receita do produto principal"],
          ["Perfis astrológicos", d.astro.profiles, "clientes que concluíram nascimento/cidade"],
          ["Receita e-books", money(d.ebooks.revenue), "receita da biblioteca"],
          ["Entrega por e-mail", d.delivery.email, "pedidos com e-mail"],
          ["Entrega WhatsApp", d.delivery.whatsapp, "pedidos com WhatsApp"],
        ].map(([label, value, hint]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            {hint && <small>{hint}</small>}
          </article>
        ))}
      </section>
      <section className="admin-insight">
        <div><p className="eyebrow">Operação internacional · EN/US</p><h2>{d.international.sales > 0 ? `${d.international.sales} venda(s) internacional(is)` : "Produto internacional pronto para validação"}</h2></div>
        <p>{d.international.orders} pedido(s) · {d.international.pending} pendente(s) · receita confirmada {usd(d.international.revenue)}. Oferta atual: US$ 1.99. {d.international.readiness.ready ? "Checkout internacional pronto para venda." : "Checkout protegido até todos os componentes estarem ativos."}</p><div className="behavior-grid" style={{marginTop:14}}>{[["Stripe",d.international.readiness.stripe],["Webhook",d.international.readiness.webhook],["E-mail",d.international.readiness.email],["Astrologia",d.international.readiness.astrology]].map(([label,ok])=><div key={String(label)}><span>{label}</span><strong>{ok?"OK":"PENDENTE"}</strong></div>)}</div>{d.international.interests.length>0&&<div className="behavior-grid" style={{marginTop:14}}>{d.international.interests.map(item=><div key={item.product}><span>Interesse · {item.product}</span><strong>{item.count}</strong></div>)}</div>}
      </section>
      <section className="admin-insight">
        <div><p className="eyebrow">Saúde da captação</p><h2>{d.traffic.sessionsObserved > 0 ? `${d.traffic.sessionsObserved} acessos reais já registrados` : "Ainda não há acessos reais registrados"}</h2></div>
        <p>{d.traffic.lastVisit ? `Último acesso registrado: ${new Date(d.traffic.lastVisit).toLocaleString("pt-BR")}. ${d.traffic.paidSessionsObserved} sessão(ões) foram atribuídas a anúncios.` : "A instrumentação está ativa e passará a registrar novas sessões com identificador próprio."}</p>
      </section>
      <section className="admin-insight">
        <div><p className="eyebrow">Leitura rápida do funil</p><h2>{diagnostic.title}</h2></div>
        <p>{diagnostic.text}</p>
      </section>
      <section className="behavior-panel">
        <div className="panel-title"><h2>Comportamento na página</h2><span>visitantes únicos por evento</span></div>
        <div className="behavior-grid">
          <div><span>Chegaram a 25%</span><strong>{d.behavior.depth25}</strong></div><div><span>Chegaram a 50%</span><strong>{d.behavior.depth50}</strong></div>
          <div><span>Chegaram a 75%</span><strong>{d.behavior.depth75}</strong></div><div><span>Chegaram a 90%</span><strong>{d.behavior.depth90}</strong></div>
          <div><span>Escolheram um tema</span><strong>{d.behavior.step2}</strong></div><div><span>Abriram FAQ</span><strong>{d.behavior.faqOpened}</strong></div>
          <div><span>Clicaram no suporte</span><strong>{d.behavior.contactClicks}</strong></div><div><span>Saíram da página</span><strong>{d.behavior.exits}</strong></div>
        </div>
        <p className="behavior-tip">A maior queda entre etapas aponta o gargalo: mensagem/CTA, formulário ou objeção antes do pagamento.</p>
      </section>
      <div className="panel-title" style={{maxWidth:1400, margin:"0 auto 12px"}}><h2>{funnelScope}</h2><span>{usePaidFunnel ? `${d.traffic.paidSessions} sessões atribuídas a mídia paga` : "todas as sessões não marcadas como teste"}</span></div>
      <section className="funnel-panel premium-funnel">
        {funnelStages.map(([id,label,value], index) => <div key={id}><span>{label}</span><strong>{value}</strong>{index>0 && <small>{funnelStages[index-1][2] ? `${((value/funnelStages[index-1][2])*100).toFixed(1)}% da etapa anterior` : '—'}</small>}</div>)}
      </section>
      {biggestDrop && <div className="funnel-alert"><strong>Maior gargalo:</strong> {biggestDrop.from} → {biggestDrop.to} · queda de {(biggestDrop.drop*100).toFixed(1)}%</div>}
      <p className="behavior-tip" style={{maxWidth:1400, margin:"-14px auto 28px"}}>Funil deduplicado por sessão. Eventos e pedidos marcados como teste não entram nas métricas de conversão.</p>
      <section className="orders-panel journey-panel">
        <div className="panel-title"><h2>Jornadas recentes</h2><span>ordem real do cliente · testes excluídos</span></div>
        {d.recentJourneys.length === 0 ? <p className="campaign-empty">Ainda não há jornadas recentes suficientes.</p> : <div className="table-wrap"><table><thead><tr>
          <th>Início</th><th>Origem</th><th>Último estágio</th><th>Duração</th><th>Caminho</th>
        </tr></thead><tbody>{d.recentJourneys.map((journey,index)=><tr key={`${journey.startedAt}:${index}`}>
          <td>{journey.startedAt ? new Date(journey.startedAt).toLocaleString("pt-BR") : "—"}</td>
          <td><strong>{journey.source}</strong><small>{journey.campaign}</small></td>
          <td><strong>{journey.lastStage}</strong></td><td>{journeyDuration(journey.durationSeconds)}</td>
          <td><small>{journey.path.map((event)=>journeyEventLabels[event]||event).join(" → ")}</small></td>
        </tr>)}</tbody></table></div>}
      </section>
      <section className="orders-panel ebook-panel">
        <div className="panel-title"><h2>Biblioteca / e-books</h2><span>canal de entrada, downsell e continuidade pós-compra</span></div>
        <div className="behavior-grid ebook-metrics">
          <div><span>Visitaram biblioteca</span><strong>{d.ebooks.libraryViews}</strong></div>
          <div><span>Viram oferta</span><strong>{d.ebooks.offerViews}</strong></div>
          <div><span>Selecionaram</span><strong>{d.ebooks.selected}</strong></div>
          <div><span>Iniciaram checkout</span><strong>{d.ebooks.checkoutStarted}</strong></div>
          <div><span>Compraram</span><strong>{d.ebooks.sales}</strong></div>
          <div><span>Visita → compra</span><strong>{d.ebooks.libraryViews ? `${((d.ebooks.sales/d.ebooks.libraryViews)*100).toFixed(1)}%` : '0,0%'}</strong></div>
          <div><span>Seleção → compra</span><strong>{d.ebooks.selected ? `${((d.ebooks.sales/d.ebooks.selected)*100).toFixed(1)}%` : '0,0%'}</strong></div>
          <div><span>Receita</span><strong>{money(d.ebooks.revenue)}</strong></div>
        </div>
        {d.ebooks.products.length > 0 && <div className="ebook-product-results">
          {d.ebooks.products.map((product) => {
            const book=BOOK_CATALOG.find((item)=>item.slug===product.slug);
            return <article key={product.slug}><span>{book?.shortTitle || product.slug}</span><strong>{product.sales} venda(s)</strong><small>{money(product.revenue)}</small></article>;
          })}
        </div>}
      </section>
      <section className="orders-panel campaign-panel">
        <div className="panel-title">
          <h2>Resultado por campanha paga</h2>
          <span>UTM/origem · testes excluídos</span>
        </div>
        {d.campaigns.length === 0 ? (
          <p className="campaign-empty">Ainda não há sessões pagas atribuídas nesta base.</p>
        ) : (
          <div className="table-wrap"><table><thead><tr>
            <th>Origem</th><th>Campanha</th><th>Sessões</th><th>Oferta</th><th>Pix</th><th>Vendas</th><th>Conversão</th><th>Faturamento</th>
          </tr></thead><tbody>
            {d.campaigns.map((campaign) => (
              <tr key={`${campaign.source}:${campaign.campaign}`}>
                <td><strong>{campaign.source}</strong></td><td>{campaign.campaign}</td>
                <td>{campaign.sessions}</td><td>{campaign.offers}</td><td>{campaign.pix}</td><td>{campaign.sales}</td>
                <td>{(campaign.conversion * 100).toFixed(1)}%</td><td><strong>{money(campaign.revenue)}</strong></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </section>
      <section className="orders-panel">
        <div className="panel-title">
          <h2>Pedidos recentes</h2>
          <span>{data.orders.length} exibidos</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente / Pergunta</th>
                <th>Origem</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.order_number}</strong>
                    <small>
                      {new Date(order.created_at).toLocaleString("pt-BR")}
                    </small>
                  </td>
                  <td>
                    <strong>{order.customer_name}</strong>
                    <small>
                      {order.customer_email || order.customer_whatsapp}
                    </small>
                    <p>
                      <b>{order.category}:</b> {order.question}
                    </p>
                  </td>
                  <td>
                    {order.utm_source || "direto"}
                    <small>{order.utm_campaign}</small>
                  </td>
                  <td>{money(order.price)}</td>
                  <td>
                    <span className={`status status-${order.payment_status}`}>
                      {order.payment_status}
                    </span>
                    <small>{order.reading_status}</small>
                  </td>
                  <td>
                    <div className="row-actions">
                      {["reading_generated", "delivered"].includes(
                        order.reading_status,
                      ) && (
                        <>
                          <button
                            onClick={() =>
                              window.open(
                                readingUrl(order.public_token),
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          >
                            Abrir leitura
                          </button>
                          <button
                            onClick={() =>
                              void copyReadingLink(order.public_token)
                            }
                          >
                            Copiar link privado
                          </button>
                          {order.customer_whatsapp && (
                            <>
                              <button disabled={busy !== ""} onClick={() => void action(order.order_number, "resend")}>Reenviar automaticamente</button>
                              <button onClick={() => sendByWhatsApp(order)}>Abrir envio manual</button>
                            </>
                          )}
                        </>
                      )}
                      {order.payment_status === "pending" && (
                        <button
                          disabled={busy !== ""}
                          onClick={() =>
                            void action(order.order_number, "mark_paid")
                          }
                        >
                          Confirmar Pix
                        </button>
                      )}
                      {order.reading_status === "reading_generated" && (
                        <button
                          disabled={busy !== ""}
                          onClick={() =>
                            void action(order.order_number, "deliver")
                          }
                        >
                          Entregue
                        </button>
                      )}
                      {order.payment_status === "paid" && (
                        <button
                          disabled={busy !== ""}
                          onClick={() =>
                            void action(order.order_number, "regenerate")
                          }
                        >
                          Gerar novamente
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
