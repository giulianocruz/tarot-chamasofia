export const TAROT_SPREADS = [
  {
    id: "single",
    name: "Carta Única",
    short: "Uma resposta direta para o ponto central.",
    count: 1,
    icon: "✦",
    positions: [
      { title: "Mensagem central", description: "A energia principal da sua pergunta." },
    ],
  },
  {
    id: "three",
    name: "3 Cartas",
    short: "Passado, presente e tendência.",
    count: 3,
    icon: "☾",
    positions: [
      { title: "Passado", description: "O que trouxe você até este ponto." },
      { title: "Presente", description: "A força dominante no momento." },
      { title: "Tendência / conselho", description: "O caminho possível a partir daqui." },
    ],
  },
  {
    id: "love",
    name: "Tiragem do Amor",
    short: "Cinco posições para vínculos e vida afetiva.",
    count: 5,
    icon: "♡",
    positions: [
      { title: "Você", description: "Sua energia e intenção nesta relação." },
      { title: "A outra pessoa", description: "A energia que vem do outro lado do vínculo." },
      { title: "Entre vocês", description: "O campo de conexão, atração ou tensão." },
      { title: "O desafio", description: "O que pede consciência e cuidado." },
      { title: "Conselho", description: "Uma direção simbólica para agir com clareza." },
    ],
  },
  {
    id: "decision",
    name: "Tiragem da Decisão",
    short: "Cinco cartas para comparar caminhos.",
    count: 5,
    icon: "⚖",
    positions: [
      { title: "Situação", description: "O ponto de partida da decisão." },
      { title: "Caminho A", description: "A energia e consequência provável do primeiro caminho." },
      { title: "Caminho B", description: "A energia e consequência provável do segundo caminho." },
      { title: "O que você ainda não vê", description: "Um fator que merece entrar na escolha." },
      { title: "Conselho", description: "Como preservar autonomia e coerência." },
    ],
  },
  {
    id: "horseshoe",
    name: "Ferradura",
    short: "Sete cartas para panorama e orientação.",
    count: 7,
    icon: "◡",
    positions: [
      { title: "Passado", description: "Uma influência que ainda reverbera." },
      { title: "Presente", description: "A situação como ela se apresenta agora." },
      { title: "Influência oculta", description: "O que atua sem estar totalmente evidente." },
      { title: "Obstáculo", description: "O principal ponto de tensão ou cuidado." },
      { title: "Ambiente", description: "Pessoas, circunstâncias e forças externas." },
      { title: "Próximo movimento", description: "Uma tendência para o curto prazo." },
      { title: "Conselho", description: "A síntese prática da tiragem." },
    ],
  },
  {
    id: "celtic-cross",
    name: "Cruz Celta",
    short: "Dez cartas para uma leitura profunda e completa.",
    count: 10,
    icon: "✣",
    positions: [
      { title: "Situação atual", description: "O coração da questão." },
      { title: "O que cruza", description: "A força que desafia ou intensifica o tema." },
      { title: "Base", description: "O fundamento profundo desta situação." },
      { title: "Passado recente", description: "O que está ficando para trás." },
      { title: "Possibilidade", description: "O que pode se desenvolver conscientemente." },
      { title: "Próximo passo", description: "O movimento mais próximo no caminho." },
      { title: "Sua postura", description: "Como você se posiciona diante da questão." },
      { title: "Ambiente", description: "Influências externas e relacionais." },
      { title: "Esperanças e receios", description: "Desejos e medos que atravessam a leitura." },
      { title: "Síntese", description: "A direção simbólica que reúne toda a tiragem." },
    ],
  },
] as const;

export type TarotSpreadId = typeof TAROT_SPREADS[number]["id"];
export type TarotSpread = typeof TAROT_SPREADS[number];

export const DEFAULT_SPREAD_ID: TarotSpreadId = "three";

export function getSpread(id: unknown): TarotSpread {
  const found = TAROT_SPREADS.find((spread) => spread.id === id);
  return found ?? TAROT_SPREADS.find((spread) => spread.id === DEFAULT_SPREAD_ID)!;
}
