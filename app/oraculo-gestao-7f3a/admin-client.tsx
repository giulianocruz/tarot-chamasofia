"use client";
import { useCallback, useEffect, useState } from "react";
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
  recovery_first_sent_at?: string;
  recovery_second_sent_at?: string;
  recovery_error?: string;
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
    pricing: { formatted: string; remaining: number | null };
    funnel: { sessions:number; started:number; questions:number; offers:number; pix:number; paid:number };
    behavior: { depth25:number; depth50:number; depth75:number; depth90:number; faqOpened:number; contactClicks:number; exits:number; step2:number };
    recovery: { openForms:number; formFirst:number; pixFirst:number; second:number; resumed:number };
    growth: { referrals:number; upsellClicks:number };
  };
};
const adVariants = [
  {
    id:'livro', label:'Variação A · foco no livro', headline:'Aprenda Tarot com um guia completo para começar',
    primary:'Conheça Tarot para Iniciantes: um livro digital de 276 páginas para estudar os Arcanos Maiores com calma. Na compra, você ainda recebe uma leitura personalizada de 3 cartas.',
    description:'Livro digital + leitura bônus.',
  },
  {
    id:'personalizada', label:'Variação B · foco na leitura personalizada', headline:'Sua pergunta. Três cartas. Uma leitura só sua.',
    primary:'Faça uma pergunta ao Tarot e receba uma leitura personalizada de 3 cartas, conectada ao tema que você quer compreender. O livro Tarot para Iniciantes acompanha a experiência.',
    description:'Resultado privado após a confirmação do Pix.',
  },
  {
    id:'bonus-pdf', label:'Variação C · foco no bônus e no PDF', headline:'Revele suas cartas e guarde a leitura em PDF',
    primary:'Leve o livro Tarot para Iniciantes e ganhe uma leitura de 3 cartas com interpretação personalizada e PDF para baixar, guardar e reler quando quiser.',
    description:'Livro, leitura bônus e PDF em uma única jornada.',
  },
];
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
    const d = await r.json() as Data;
    setData(d);
    setLogin(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json() as {error?:string};
    if (!r.ok) {
      setError(d.error || 'Credenciais inválidas.');
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
    const d = await r.json() as {error?:string};
    if (!r.ok) alert(d.error);
    setBusy("");
    void load();
  }
  async function uploadBook(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setBookStatus("Selecione um arquivo PDF."); return; }
    setBookStatus("Enviando livro...");
    const response = await fetch("/api/admin/ebook", { method:"PUT", headers:{"Content-Type":"application/pdf"}, body:file });
    const result = await response.json() as {error?:string};
    setBookStatus(response.ok ? `Livro atualizado (${(file.size/1024/1024).toFixed(1)} MB).` : result.error || "Falha no envio.");
    event.target.value = "";
  }
  function readingUrl(token: string) {
    return `${window.location.origin}/leitura/${token}`;
  }
  async function copyReadingLink(token: string) {
    await navigator.clipboard.writeText(readingUrl(token));
    alert("Link privado copiado. Agora você pode enviá-lo ao cliente.");
  }
  async function copyAd(variant: typeof adVariants[number]) {
    const url = `${window.location.origin}/?utm_source=meta&utm_medium=paid_social&utm_campaign=tarot_lancamento&utm_content=${variant.id}`;
    await navigator.clipboard.writeText(`${variant.primary}\n\n${variant.headline}\n${variant.description}\n\n${url}`);
    void fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'ad_variant_copied',metadata:{variant:variant.id}})});
    alert('Texto e link rastreável copiados.');
  }
  function sendByWhatsApp(order: Order) {
    const phone = (order.customer_whatsapp || "").replace(/\D/g, "");
    const firstName = order.customer_name.trim().split(/\s+/)[0] || "Olá";
    const message = `${firstName}, sua leitura de Tarot Chama Sofia está pronta ✨\n\nAcesse seu link privado:\n${readingUrl(order.public_token)}\n\nNeste link você pode revelar suas cartas, ler a interpretação e baixar o PDF e o e-book.`;
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
  const diagnosis = d.funnel.sessions > 0 && d.behavior.depth25 / d.funnel.sessions < .45
    ? 'Muitas visitas e pouca rolagem: revise o anúncio ou o primeiro bloco.'
    : d.behavior.depth50 > 0 && d.funnel.questions / d.behavior.depth50 < .3
      ? 'Há rolagem, mas poucas perguntas: o CTA ou a oferta ainda podem ganhar clareza.'
      : d.funnel.questions > 0 && d.funnel.pix / d.funnel.questions < .35
        ? 'Há perguntas, mas poucos Pix: investigue o formulário e a percepção de preço.'
        : d.funnel.pix > 0 && d.funnel.paid / d.funnel.pix < .35
          ? 'Há Pix sem compra: reforce confiança, pagamento e objeções de valor.'
          : 'O funil ainda não mostra um gargalo dominante; acompanhe mais sessões.';
  return (
    <main className="admin-shell">
      <header>
        <div>
          <p className="eyebrow">Painel administrativo</p>
          <h1>Tarot Chama Sofia</h1>
        </div>
        <div className="admin-actions">
          <a className="admin-download" href="/assets/social/anuncio-tarot-livro-v2.png" download>Baixar arte do anúncio</a>
          <label className="admin-upload">Atualizar e-book<input type="file" accept="application/pdf" onChange={uploadBook} /></label>
          <button onClick={() => void load()}>Atualizar pedidos</button>
          {bookStatus && <small>{bookStatus}</small>}
        </div>
      </header>
      <section className="metrics">
        {[
          ["Vendas hoje", d.salesToday],
          ["Vendas totais", d.totalSales],
          ["Faturamento", money(d.revenue)],
          ["Ticket médio", money(d.averageTicket)],
          ["Preço atual", d.pricing.formatted],
          ["Restam na faixa", d.pricing.remaining ?? "∞"],
          ["Conversão", `${(d.conversion * 100).toFixed(1)}%`],
          ["Pendentes", d.pending],
          ["Leituras geradas", d.generated],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="behavior-panel">
        <div className="panel-title"><h2>Comportamento na página</h2><span>visitantes únicos por evento</span></div>
        <div className="behavior-grid">
          <div><span>Chegaram a 25%</span><strong>{d.behavior.depth25}</strong></div><div><span>Chegaram a 50%</span><strong>{d.behavior.depth50}</strong></div>
          <div><span>Chegaram a 75%</span><strong>{d.behavior.depth75}</strong></div><div><span>Chegaram a 90%</span><strong>{d.behavior.depth90}</strong></div>
          <div><span>Avançaram no formulário</span><strong>{d.behavior.step2}</strong></div><div><span>Abriram FAQ</span><strong>{d.behavior.faqOpened}</strong></div>
          <div><span>Clicaram no suporte</span><strong>{d.behavior.contactClicks}</strong></div><div><span>Saíram da página</span><strong>{d.behavior.exits}</strong></div>
        </div>
        <p className="behavior-tip"><strong>Leitura automática:</strong> {diagnosis}</p>
      </section>
      <section className="growth-panel">
        <article><span>Formulários recuperáveis</span><strong>{d.recovery.openForms}</strong><small>com contato e sem Pix</small></article>
        <article><span>1º lembrete enviado</span><strong>{d.recovery.formFirst+d.recovery.pixFirst}</strong><small>formulário + Pix</small></article>
        <article><span>2º lembrete enviado</span><strong>{d.recovery.second}</strong><small>mensagem curta</small></article>
        <article><span>Jornadas retomadas</span><strong>{d.recovery.resumed}</strong><small>via link de recuperação</small></article>
        <article><span>Indicações confirmadas</span><strong>{d.growth.referrals}</strong><small>compras atribuídas</small></article>
        <article><span>Interesse em upsell</span><strong>{d.growth.upsellClicks}</strong><small>cliques pós-compra</small></article>
      </section>
      <section className="funnel-panel">
        <div><span>Sessões</span><strong>{d.funnel.sessions}</strong></div>
        <b>→</b><div><span>Iniciaram</span><strong>{d.funnel.started}</strong></div>
        <b>→</b><div><span>Pergunta</span><strong>{d.funnel.questions}</strong></div>
        <b>→</b><div><span>Viram oferta</span><strong>{d.funnel.offers}</strong></div>
        <b>→</b><div><span>Geraram Pix</span><strong>{d.funnel.pix}</strong></div>
        <b>→</b><div><span>Pagaram</span><strong>{d.funnel.paid}</strong></div>
      </section>
      <section className="ad-tests-panel">
        <div className="panel-title"><div><p className="eyebrow">Teste A/B/C</p><h2>Variações de anúncio prontas</h2></div><span>cada link identifica a variação em utm_content</span></div>
        <div className="ad-tests-grid">
          {adVariants.map((variant)=><article key={variant.id}>
            <span>{variant.label}</span><h3>{variant.headline}</h3><p>{variant.primary}</p><small>{variant.description}</small>
            <button onClick={()=>void copyAd(variant)}>Copiar anúncio + link</button>
          </article>)}
        </div>
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
                    {order.recovery_first_sent_at && <small>1º lembrete enviado</small>}
                    {order.recovery_second_sent_at && <small>2º lembrete enviado</small>}
                    {order.recovery_error && <small className="status-error">Falha na recuperação</small>}
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
