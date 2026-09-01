"use client";
import { useCallback, useEffect, useState } from "react";
import { BOOK_CATALOG } from "@/lib/book-catalog";
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
  dashboard: {
    salesToday: number;
    totalSales: number;
    revenue: number;
    averageTicket: number;
    pending: number;
    generated: number;
    conversion: number;
    ebooks: { sales:number; revenue:number; offerViews:number; selected:number; checkoutStarted:number; purchases:number };
    delivery: { email:number; whatsapp:number };
    pricing: { formatted: string; remaining: number | null };
    traffic: { paidSessions:number; paidSales:number; paidRevenue:number; paidConversion:number };
    campaigns: Array<{ source:string; campaign:string; sessions:number; offers:number; pix:number; sales:number; revenue:number; conversion:number }>;
    funnel: { sessions:number; started:number; categories:number; questions:number; cards:number; contacts:number; offers:number; pix:number; paid:number };
    behavior: { depth25:number; depth50:number; depth75:number; depth90:number; faqOpened:number; contactClicks:number; exits:number; step2:number };
  };
};
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
    alert("Link privado copiado. Agora vocÃª pode enviÃ¡-lo ao cliente.");
  }
  function sendByWhatsApp(order: Order) {
    const phone = (order.customer_whatsapp || "").replace(/\D/g, "");
    const firstName = order.customer_name.trim().split(/\s+/)[0] || "OlÃ¡";
    const message = `${firstName}, sua leitura de Tarot Chama Sofia estÃ¡ pronta âœ¨\n\nAcesse seu link privado:\n${readingUrl(order.public_token)}\n\nNeste link vocÃª pode revelar suas cartas, ler a interpretaÃ§Ã£o e baixar o PDF e o e-book.`;
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
          <span className="brand-mark">âœ¦</span>
          <p className="eyebrow">Chama Sofia</p>
          <h1>Acesso Ã  gestÃ£o</h1>
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
  const funnelStages = [
    ['SessÃµes', d.funnel.sessions], ['Tema', d.funnel.categories], ['Pergunta', d.funnel.questions], ['Cartas', d.funnel.cards], ['E-mail/contato', d.funnel.contacts], ['Oferta', d.funnel.offers], ['Pix', d.funnel.pix], ['Pagamento', d.funnel.paid],
  ] as const;
  const stageDrops = funnelStages.slice(1).map((stage,index) => { const previous=funnelStages[index][1]; const current=stage[1]; return { from:funnelStages[index][0], to:stage[0], previous, current, rate:previous ? current/previous : 0, drop:previous ? 1-current/previous : 0 }; }).filter((item)=>item.previous>0);
  const biggestDrop = stageDrops.sort((a,b)=>b.drop-a.drop)[0];
  return (
    <main className="admin-shell">
      <header>
        <div>
          <p className="eyebrow">Painel administrativo</p>
          <h1>Tarot Chama Sofia</h1>
        </div>
        <div className="admin-actions">
          <a className="admin-download" href="/assets/social/anuncio-tarot-livro-v2.png" download>Baixar arte do anÃºncio</a>

          <button onClick={() => void load()}>Atualizar pedidos</button>
          {bookStatus && <small>{bookStatus}</small>}
        </div>
      </header>
      <section className="library-admin-panel">
        <div className="panel-title"><div><p className="eyebrow">Acervo digital</p><h2>Biblioteca Chama Sofia</h2></div><span>PDFs entregues automaticamente apÃ³s o pagamento</span></div>
        <div className="library-admin-grid">
          {BOOK_CATALOG.map((book) => (
            <article key={book.slug}>
              <img src={book.cover} alt={`Capa ${book.shortTitle}`} />
              <div><strong>{book.shortTitle}</strong><small>{book.slug}</small></div>
              <label className="admin-upload">Enviar PDF<input type="file" accept="application/pdf" onChange={(event) => void uploadBook(book.slug,event)} /></label>
            </article>
          ))}
        </div>
        {bookStatus && <p className="library-admin-status">{bookStatus}</p>}
      </section>
      <section className="metrics">
        {[
          ["Vendas hoje", d.salesToday],
          ["Vendas totais", d.totalSales],
          ["SessÃµes de anÃºncios", d.traffic.paidSessions],
          ["Vendas de anÃºncios", d.traffic.paidSales],
          ["ConversÃ£o anÃºncios", `${(d.traffic.paidConversion * 100).toFixed(1)}%`],
          ["Faturamento anÃºncios", money(d.traffic.paidRevenue)],
          ["Faturamento", money(d.revenue)],
          ["Ticket mÃ©dio", money(d.averageTicket)],
          ["PreÃ§o atual", d.pricing.formatted],
          ["Restam na faixa", d.pricing.remaining ?? "âˆž"],
          ["ConversÃ£o", `${(d.conversion * 100).toFixed(1)}%`],
          ["Pendentes", d.pending],
          ["Leituras geradas", d.generated],
          ["E-books vendidos", d.ebooks.sales],
          ["Receita e-books", money(d.ebooks.revenue)],
          ["Entrega por e-mail", d.delivery.email],
          ["Entrega por WhatsApp", d.delivery.whatsapp],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="behavior-panel">
        <div className="panel-title"><h2>Comportamento na pÃ¡gina</h2><span>visitantes Ãºnicos por evento</span></div>
        <div className="behavior-grid">
          <div><span>Chegaram a 25%</span><strong>{d.behavior.depth25}</strong></div><div><span>Chegaram a 50%</span><strong>{d.behavior.depth50}</strong></div>
          <div><span>Chegaram a 75%</span><strong>{d.behavior.depth75}</strong></div><div><span>Chegaram a 90%</span><strong>{d.behavior.depth90}</strong></div>
          <div><span>Escolheram um tema</span><strong>{d.behavior.step2}</strong></div><div><span>Abriram FAQ</span><strong>{d.behavior.faqOpened}</strong></div>
          <div><span>Clicaram no suporte</span><strong>{d.behavior.contactClicks}</strong></div><div><span>SaÃ­ram da pÃ¡gina</span><strong>{d.behavior.exits}</strong></div>
        </div>
        <p className="behavior-tip">A maior queda entre etapas aponta o gargalo: mensagem/CTA, formulÃ¡rio ou objeÃ§Ã£o antes do pagamento.</p>
      </section>
      <section className="funnel-panel premium-funnel">
        {funnelStages.map(([label,value], index) => <div key={label}><span>{label}</span><strong>{value}</strong>{index>0 && <small>{funnelStages[index-1][1] ? `${((value/funnelStages[index-1][1])*100).toFixed(1)}% da etapa anterior` : 'â€”'}</small>}</div>)}
      </section>
      {biggestDrop && <div className="funnel-alert"><strong>Maior gargalo:</strong> {biggestDrop.from} â†’ {biggestDrop.to} Â· queda de {(biggestDrop.drop*100).toFixed(1)}%</div>}
      <p className="behavior-tip" style={{maxWidth:1400, margin:"-14px auto 28px"}}>Funil deduplicado por sessÃ£o. Eventos e pedidos marcados como teste nÃ£o entram nas mÃ©tricas de conversÃ£o.</p>
      <section className="orders-panel ebook-panel">
        <div className="panel-title"><h2>E-books / downsell</h2><span>oferta alternativa apÃ³s captura do contato</span></div>
        <div className="behavior-grid ebook-metrics">
          <div><span>Viram oferta</span><strong>{d.ebooks.offerViews}</strong></div>
          <div><span>Selecionaram</span><strong>{d.ebooks.selected}</strong></div>
          <div><span>Iniciaram checkout</span><strong>{d.ebooks.checkoutStarted}</strong></div>
          <div><span>Compraram</span><strong>{d.ebooks.sales}</strong></div>
          <div><span>SeleÃ§Ã£o â†’ compra</span><strong>{d.ebooks.selected ? `${((d.ebooks.sales/d.ebooks.selected)*100).toFixed(1)}%` : '0,0%'}</strong></div>
          <div><span>Receita</span><strong>{money(d.ebooks.revenue)}</strong></div>
        </div>
      </section>
      <section className="orders-panel campaign-panel">
        <div className="panel-title">
          <h2>Resultado por campanha paga</h2>
          <span>UTM/origem Â· testes excluÃ­dos</span>
        </div>
        {d.campaigns.length === 0 ? (
          <p className="campaign-empty">Ainda nÃ£o hÃ¡ sessÃµes pagas atribuÃ­das nesta base.</p>
        ) : (
          <div className="table-wrap"><table><thead><tr>
            <th>Origem</th><th>Campanha</th><th>SessÃµes</th><th>Oferta</th><th>Pix</th><th>Vendas</th><th>ConversÃ£o</th><th>Faturamento</th>
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
                <th>AÃ§Ãµes</th>
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
