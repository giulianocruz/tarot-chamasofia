import type { TarotCard } from "@/lib/tarot";

type PreviewDashboardProps = {
  cards: TarotCard[];
  category: string;
  question: string;
  preview: string;
};

function score(cards: TarotCard[], salt: number) {
  const base = cards.reduce((total, card, index) => total + (card.number + 3) * (index + salt + 1), 0);
  return 44 + (base % 47);
}

function tone(value: number) {
  if (value >= 76) return "forte";
  if (value >= 60) return "presente";
  return "em formação";
}

export default function PreviewDashboard({ cards, category, question, preview }: PreviewDashboardProps) {
  const clarity = score(cards, 1);
  const movement = score(cards, 2);
  const tension = score([...cards].reverse(), 3);
  const autonomy = score([cards[2], cards[0], cards[1]].filter(Boolean), 4);
  const indicators = [
    ["Clareza", clarity, "O quanto o jogo convida a enxergar fatos e padrões."],
    ["Movimento", movement, "Quanto existe de impulso para sair do ponto atual."],
    ["Tensão", tension, "Onde a leitura pede mais cuidado, pausa ou limite."],
    ["Autonomia", autonomy, "Quanto o próximo passo depende de uma escolha sua."],
  ] as const;

  return (
    <section className="preview-dashboard" aria-label="Prévia simbólica da leitura">
      <div className="preview-dashboard-head">
        <div>
          <p className="eyebrow">Painel simbólico · prévia da leitura</p>
          <h2>O desenho inicial das suas cartas</h2>
          <p className="preview-dashboard-sub">Uma primeira camada sobre <strong>{category.toLowerCase()}</strong>. A leitura completa conecta as três cartas à sua pergunta e aprofunda tendência, conselho e síntese.</p>
        </div>
        <div className="preview-completion" style={{ "--preview-progress": "31%" } as React.CSSProperties}>
          <strong>31%</strong><span>da análise<br/>aberta</span>
        </div>
      </div>

      <div className="preview-indicators">
        {indicators.map(([label, value, description], index) => (
          <article key={label} style={{ "--meter": `${value}%`, "--delay": `${index * 90}ms` } as React.CSSProperties}>
            <div><span>{label}</span><b>{value}</b></div>
            <div className="preview-meter"><i /></div>
            <small>{tone(value)} · {description}</small>
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
          <p>As outras duas cartas mudam o sentido desta primeira impressão quando são lidas em conjunto.</p>
        </article>
      </div>

      <div className="preview-locked-zone">
        <div className="preview-locked-title"><img src="/assets/tarot/ui/insight-lock.svg" alt=""/><div><span>Na leitura completa</span><strong>4 camadas ainda serão conectadas</strong></div></div>
        <div className="preview-locked-grid">
          {["Influência da segunda carta", "Tendência e conselho da terceira", "Como as 3 cartas conversam", "Síntese + reflexão final no PDF"].map((item) => <span key={item}>✦ {item}</span>)}
        </div>
      </div>
    </section>
  );
}
