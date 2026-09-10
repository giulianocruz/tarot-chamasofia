import type { FreeNatalPreview } from './astrology-types';

export type JourneyInterest = 'amor' | 'carreira' | 'espiritualidade' | 'autoconhecimento';

export type JourneyModule = {
  id: string;
  title: string;
  eyebrow: string;
  teaser: string;
  icon: string;
  priceCents: number;
  interest?: JourneyInterest;
};

export type JourneySummary = {
  greeting: string;
  identity: string;
  emotional: string;
  expression: string;
  attraction: string;
  action: string;
  synthesis: string;
  element: string;
  elementLabel: string;
};

const SIGN_PT: Record<string, string> = {
  Aries: 'Áries', Taurus: 'Touro', Gemini: 'Gêmeos', Cancer: 'Câncer',
  Leo: 'Leão', Virgo: 'Virgem', Libra: 'Libra', Scorpio: 'Escorpião',
  Sagittarius: 'Sagitário', Capricorn: 'Capricórnio', Aquarius: 'Aquário', Pisces: 'Peixes',
};

const SIGN_ELEMENT: Record<string, 'fogo' | 'terra' | 'ar' | 'água'> = {
  Aries: 'fogo', Leo: 'fogo', Sagittarius: 'fogo',
  Taurus: 'terra', Virgo: 'terra', Capricorn: 'terra',
  Gemini: 'ar', Libra: 'ar', Aquarius: 'ar',
  Cancer: 'água', Scorpio: 'água', Pisces: 'água',
};

const SIGN_VOICE: Record<string, { core: string; heart: string; mind: string; love: string; drive: string }> = {
  Aries: { core: 'precisa sentir que está abrindo caminho', heart: 'reage com intensidade e precisa de movimento emocional', mind: 'pensa rápido e prefere ir direto ao ponto', love: 'valoriza espontaneidade, desejo e presença', drive: 'age por impulso, coragem e conquista' },
  Taurus: { core: 'cresce quando constrói algo sólido e verdadeiro', heart: 'busca segurança, constância e vínculos confiáveis', mind: 'organiza ideias de forma prática e paciente', love: 'valoriza lealdade, toque, conforto e reciprocidade', drive: 'age com persistência e dificilmente abandona o que considera importante' },
  Gemini: { core: 'se renova por ideias, encontros e novas possibilidades', heart: 'precisa nomear o que sente para compreender a própria emoção', mind: 'conecta assuntos, pessoas e referências com rapidez', love: 'se aproxima por conversa, curiosidade e leveza', drive: 'age melhor quando existe variedade, troca e estímulo mental' },
  Cancer: { core: 'encontra força quando existe pertencimento e significado emocional', heart: 'sente profundamente e protege aquilo que ama', mind: 'pensa também pela memória, pelo clima e pela intuição', love: 'valoriza cuidado, intimidade e sensação de lar', drive: 'age para proteger pessoas, vínculos e territórios afetivos' },
  Leo: { core: 'floresce quando pode criar, expressar e colocar coração no que faz', heart: 'precisa sentir calor, reconhecimento e lealdade', mind: 'comunica com convicção e presença', love: 'valoriza demonstrações claras, admiração e generosidade', drive: 'age com coragem quando sente que algo merece sua entrega' },
  Virgo: { core: 'ganha sentido ao melhorar, organizar e tornar as coisas úteis', heart: 'processa emoções observando detalhes e tentando compreender o que pode ajustar', mind: 'analisa, compara e percebe nuances que passam despercebidas', love: 'demonstra afeto por cuidado concreto, atenção e presença', drive: 'age com estratégia, precisão e desejo de aperfeiçoamento' },
  Libra: { core: 'busca equilíbrio entre identidade, parceria e beleza nas escolhas', heart: 'precisa de harmonia e tende a processar sentimentos pela relação com o outro', mind: 'enxerga vários lados antes de concluir', love: 'valoriza parceria, elegância, diálogo e reciprocidade', drive: 'age melhor por composição, negociação e alianças' },
  Scorpio: { core: 'se transforma quando encara o que é profundo sem fugir', heart: 'vive emoções intensas e dificilmente se satisfaz com vínculos superficiais', mind: 'investiga o que está por trás das palavras e dos gestos', love: 'valoriza profundidade, confiança e entrega real', drive: 'age com foco, resistência e grande capacidade de regeneração' },
  Sagittarius: { core: 'precisa de horizonte, sentido e liberdade para crescer', heart: 'se recompõe quando reencontra esperança, espaço e perspectiva', mind: 'pensa grande e procura o significado por trás dos fatos', love: 'valoriza verdade, aventura e espaço para continuar crescendo', drive: 'age movido por propósito, descoberta e expansão' },
  Capricorn: { core: 'se fortalece ao transformar intenção em construção concreta', heart: 'tende a proteger sentimentos até confiar na estabilidade do vínculo', mind: 'pensa em consequência, estrutura e longo prazo', love: 'valoriza compromisso, consistência e maturidade', drive: 'age com disciplina, ambição e resistência' },
  Aquarius: { core: 'precisa preservar autenticidade e enxergar possibilidades além do óbvio', heart: 'processa sentimentos com certa distância antes de conseguir compartilhá-los', mind: 'pensa de forma independente, inventiva e pouco convencional', love: 'valoriza amizade, liberdade e conexão intelectual', drive: 'age por ideias, causas, inovação e desejo de mudança' },
  Pisces: { core: 'ganha sentido quando imaginação, sensibilidade e propósito se encontram', heart: 'absorve atmosferas e sente camadas que nem sempre são fáceis de explicar', mind: 'pensa por imagens, associações e intuição', love: 'valoriza empatia, conexão sutil e entrega emocional', drive: 'age melhor quando existe inspiração, compaixão ou significado' },
};

export const JOURNEY_MODULES: JourneyModule[] = [
  { id: 'mapa-completo', title: 'Mapa Astral Completo', eyebrow: 'APROFUNDE SEU CÉU', teaser: 'Casas, aspectos, padrões recorrentes e uma leitura ampliada do seu mapa.', icon: '✦', priceCents: 990, interest: 'autoconhecimento' },
  { id: 'amor', title: 'Amor & Relacionamentos', eyebrow: 'SEUS VÍNCULOS', teaser: 'Vênus, Lua, Marte e os padrões que você tende a repetir ou buscar nos relacionamentos.', icon: '♡', priceCents: 490, interest: 'amor' },
  { id: 'prosperidade', title: 'Carreira & Prosperidade', eyebrow: 'SEU CAMINHO MATERIAL', teaser: 'Forças de realização, estilo de trabalho, ambição e pontos de atenção para escolhas profissionais.', icon: '◇', priceCents: 490, interest: 'carreira' },
  { id: 'chakras', title: 'Seus Chakras', eyebrow: 'ENERGIA PESSOAL', teaser: 'Uma leitura simbólica dos seus centros de energia e dos temas que merecem atenção.', icon: '◉', priceCents: 390, interest: 'espiritualidade' },
  { id: 'animal-poder', title: 'Animal de Poder', eyebrow: 'ARQUÉTIPO DE FORÇA', teaser: 'Descubra o arquétipo animal associado à sua jornada e como trabalhar essa simbologia.', icon: '△', priceCents: 390, interest: 'espiritualidade' },
  { id: 'proposito', title: 'Propósito & Potenciais', eyebrow: 'PRÓXIMA CAMADA', teaser: 'Uma síntese dos talentos, conflitos férteis e direções de desenvolvimento sugeridas pelo mapa.', icon: '☼', priceCents: 590, interest: 'autoconhecimento' },
  { id: 'tarot-momento', title: 'Tarot do Momento', eyebrow: 'AGORA', teaser: 'Três cartas para cruzar uma pergunta real com o momento que você está vivendo.', icon: '✧', priceCents: 990 },
];

function voice(sign?: string) {
  return (sign && SIGN_VOICE[sign]) || SIGN_VOICE.Pisces;
}

export function signPt(sign?: string) {
  return sign ? SIGN_PT[sign] || sign : 'não calculado';
}

export function journeyModulesFor(interest: JourneyInterest) {
  const preferred = JOURNEY_MODULES.filter((item) => item.interest === interest);
  const rest = JOURNEY_MODULES.filter((item) => item.interest !== interest);
  return [...preferred, ...rest];
}

export function buildJourneySummary(preview: FreeNatalPreview, firstName: string, interest: JourneyInterest): JourneySummary {
  const sun = preview.natal.sun?.sign;
  const moon = preview.natal.moon?.sign;
  const mercury = preview.natal.mercury?.sign;
  const venus = preview.natal.venus?.sign;
  const mars = preview.natal.mars?.sign;
  const asc = preview.natal.ascendantSign;
  const dominant = [sun, moon, mercury, venus, mars].filter(Boolean).map((sign) => SIGN_ELEMENT[String(sign)]).reduce<Record<string, number>>((acc, element) => {
    if (element) acc[element] = (acc[element] || 0) + 1;
    return acc;
  }, {});
  const element = Object.entries(dominant).sort((a, b) => b[1] - a[1])[0]?.[0] || 'misto';
  const elementLabel: Record<string, string> = { fogo: 'Fogo — impulso e expressão', terra: 'Terra — construção e realidade', ar: 'Ar — ideias e conexão', água: 'Água — sensibilidade e profundidade', misto: 'Equilíbrio entre elementos' };

  const interestClosing: Record<JourneyInterest, string> = {
    amor: 'Nos relacionamentos, vale observar como desejo, segurança emocional e liberdade negociam espaço entre si.',
    carreira: 'Na vida profissional, seu mapa ganha força quando talento natural e modo de agir encontram um objetivo concreto.',
    espiritualidade: 'Na espiritualidade, use estes símbolos como linguagem de reflexão e não como uma sentença sobre quem você deve ser.',
    autoconhecimento: 'O ponto mais interessante do mapa não é rotular você, mas mostrar contrastes que podem se tornar escolhas mais conscientes.',
  };

  const ascText = asc
    ? `Com Ascendente em ${signPt(asc)}, sua forma de chegar ao mundo acrescenta uma camada: você tende a ser percebido inicialmente por alguém que ${voice(asc).core}.`
    : 'Sem um horário confiável, não mostramos Ascendente: preferimos assumir o limite do cálculo a inventar precisão.';

  return {
    greeting: firstName ? `${firstName}, este é o começo da sua Jornada Sofia.` : 'Este é o começo da sua Jornada Sofia.',
    identity: `Seu Sol em ${signPt(sun)} sugere uma identidade que ${voice(sun).core}.`,
    emotional: `Sua Lua em ${signPt(moon)} mostra uma vida emocional que ${voice(moon).heart}.`,
    expression: `Mercúrio em ${signPt(mercury)} indica que você ${voice(mercury).mind}.`,
    attraction: `Vênus em ${signPt(venus)} sugere que, nos vínculos, você ${voice(venus).love}.`,
    action: `Marte em ${signPt(mars)} mostra uma forma de agir que ${voice(mars).drive}.`,
    synthesis: `${ascText} ${interestClosing[interest]}`,
    element,
    elementLabel: elementLabel[element] || elementLabel.misto,
  };
}

export function formatJourneyPrice(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
