import type { TarotCard } from "@/lib/tarot";

type PreviewDashboardProps = {
  cards: TarotCard[];
  category: string;
  question: string;
  preview: string;
};

function compact(text: string | undefined, max = 132) {
  const clean = String(text || "").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

export default function PreviewDashboard({ cards, category, question, preview }: PreviewDashboardProps) {
  const signals = [
    ["Agora", cards[0]?.keywords.slice(0, 2).join(" · "), cards[0]?.general],
    ["Influência", cards[1]?.keywords.slice(0, 2).join(" · "), cards[1]?.alert],
    ["Direção", cards[2]?.keywords.slice(0, 2).join(" · "), cards[2]?.constructive],
  ] as const;
  const layers = [
    ["01", "Tarot inicial", "aberta", "Sua pergunta + a primeira leitura das 3 cartas."],
    ["02", "Mapa natal", "após o Pix", "Sol, Lua e Ascendente quando o horário estiver disponível."],
    ["03", "Céu atual", "após o Pix", "Trânsitos que ativam pontos do seu mapa neste momento."],
    ["04", "Síntese AstroTarot", "após o Pix", "O cruzamento do céu com as cartas e uma orientação prática."],
  ] as const;

  return (
    <section className="preview-dashboard" aria-label="Prévia simbólica da análise">
      <div className="preview-dashboard-head">
        <div>
          <p className="eyebrow">Painel do momento · prévia simbólica</p>
          <h2>O que suas cartas já mostram</h2>
          <p className="preview-dashboard-sub">Esta é a primeira camada sobre <strong>{category.toLowerCase()}</strong>. O mapa natal e o céu atual entram somente depois da confirmação do Pix.</p>
        </div>
        <div className="preview-completion preview-layer-count">
          <strong>1/4</strong><span>camadas<br/>abertas</span>
        </div>
      </div>

      <div className="preview-indicators" aria-label="Sinais extraídos das cartas escolhidas">
        {signals.map(([position, keywords, description]) => (
          <article key={position} data-level="2">
            <div><span>{position}</span><b>{keywords || "símbolo em leitura"}</b></div>
            <small>{compact(description)}</small>
          </article>
        ))}
      </div>
      <p className="preview-interpretation-note">Esses sinais vêm das próprias cartas que você escolheu. A relação entre elas, o mapa natal e os trânsitos fica reservada para a análise completa.</p>

      <div className="preview-focus-grid">
        <article className="preview-open-insight">
          <span className="preview-card-kicker">Primeiro sinal aberto</span>
          <div className="preview-open-card">
            <img src={cards[0]?.image} alt={cards[0]?.name || "Carta revelada"} />
            <div><small>SITUAÇÃO ATUAL</small><h3>{cards[0]?.name}</h3><p>{preview}</p></div>
          </div>
        </article>
        <article className="preview-question-card">
          <small>SUA PERGUNTA</small>
          <blockquote>“{question}”</blockquote>
          <img src="/assets/tarot/ui/constellation-divider.svg" alt="" />
          <p>As outras cartas mudam o sentido desta primeira impressão. O mapa natal e os trânsitos acrescentam outra lente à mesma situação.</p>
        </article>
      </div>

      <div className="preview-layer-roadmap" aria-label="Camadas da análise">
        {layers.map(([number, title, status, description], index) => (
          <article className={index === 0 ? "is-open" : "is-locked"} key={title}>
            <span className="layer-number">{number}</span>
            <div><small>{status}</small><strong>{title}</strong><p>{description}</p></div>
          </article>
        ))}
      </div>

      <div className="preview-locked-zone">
        <div className="preview-locked-title"><img src="/assets/tarot/ui/insight-lock.svg" alt=""/><div><span>No resultado completo</span><strong>Tarot + mapa natal + céu atual na mesma resposta</strong></div></div>
        <div className="preview-locked-grid">
          {["Leitura das 3 cartas em conjunto", "Sol, Lua e Ascendente*", "Principais trânsitos do momento", "Orientação integrada + PDF premium"].map((item) => <span key={item}>✦ {item}</span>)}
        </div>
        <small className="preview-precision-note">*Ascendente e casas dependem do horário de nascimento.</small>
      </div>
    </section>
  );
}
