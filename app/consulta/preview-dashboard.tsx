import type { TarotCard } from "@/lib/tarot";

type PreviewDashboardProps = {
  cards: TarotCard[];
  category: string;
  question: string;
  preview: string;
};

function symbolicBand(cards: TarotCard[], salt: number) {
  const base = cards.reduce((total, card, index) => total + (card.number + 3) * (index + salt + 1), 0);
  const value = 44 + (base % 47);
  if (value >= 76) return { label: "forte", level: 3 };
  if (value >= 60) return { label: "presente", level: 2 };
  return { label: "em formação", level: 1 };
}

export default function PreviewDashboard({ cards, category, question, preview }: PreviewDashboardProps) {
  const indicators = [
    ["Clareza", symbolicBand(cards, 1), "O jogo chama atenção para fatos e padrões."],
    ["Movimento", symbolicBand(cards, 2), "Há sinais de impulso para sair do ponto atual."],
    ["Tensão", symbolicBand([...cards].reverse(), 3), "Mostra onde vale desacelerar e observar limites."],
    ["Autonomia", symbolicBand([cards[2], cards[0], cards[1]].filter(Boolean), 4), "Destaca o que ainda depende de uma escolha sua."],
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

      <div className="preview-indicators">
        {indicators.map(([label, band, description], index) => (
          <article key={label} data-level={band.level} style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}>
            <div><span>{label}</span><b>{band.label}</b></div>
            <div className="preview-meter" aria-hidden="true"><i /></div>
            <small>{description}</small>
          </article>
        ))}
      </div>
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
