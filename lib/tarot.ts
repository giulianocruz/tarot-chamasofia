export const CATEGORIES = [
  'Amor e relacionamentos', 'Trabalho e carreira', 'Dinheiro', 'Caminhos',
  'Decisões', 'Vida pessoal', 'Energia do momento', 'Pergunta livre',
] as const;

export type Category = typeof CATEGORIES[number];

type CardSeed = {
  id: string; number: number; name: string; symbol: string; keywords: string[];
  general: string; constructive: string; alert: string;
};

const seeds: CardSeed[] = [
  { id:'louco',number:0,name:'O Louco',symbol:'✦',keywords:['começo','liberdade','confiança'],general:'Um chamado para experimentar o novo com presença e curiosidade.',constructive:'Espontaneidade, coragem e abertura para aprender no caminho.',alert:'Impulsividade ou fuga das consequências práticas.' },
  { id:'mago',number:1,name:'O Mago',symbol:'✧',keywords:['iniciativa','talento','manifestação'],general:'Recursos já disponíveis podem ser organizados em uma ação consciente.',constructive:'Autonomia, comunicação e capacidade de começar.',alert:'Dispersão, artifício ou promessas sem continuidade.' },
  { id:'sacerdotisa',number:2,name:'A Sacerdotisa',symbol:'☾',keywords:['intuição','silêncio','mistério'],general:'Nem toda resposta precisa ser forçada; parte dela amadurece no silêncio.',constructive:'Escuta interior, observação e percepção sutil.',alert:'Passividade, segredos ou dificuldade de nomear o que sente.' },
  { id:'imperatriz',number:3,name:'A Imperatriz',symbol:'❀',keywords:['criação','cuidado','abundância'],general:'Algo pede nutrição, tempo e um ambiente fértil para florescer.',constructive:'Criatividade, afeto e expansão sustentável.',alert:'Excesso de proteção, dependência ou gasto de energia sem limites.' },
  { id:'imperador',number:4,name:'O Imperador',symbol:'♜',keywords:['estrutura','limites','liderança'],general:'Clareza de limites e organização tornam o próximo passo mais seguro.',constructive:'Responsabilidade, estabilidade e decisão prática.',alert:'Rigidez, controle excessivo ou resistência a adaptar-se.' },
  { id:'hierofante',number:5,name:'O Hierofante',symbol:'⌘',keywords:['valores','tradição','aprendizado'],general:'A questão toca valores, referências e aprendizados transmitidos.',constructive:'Mentoria, coerência ética e sabedoria compartilhada.',alert:'Conformismo ou seguir regras que já não fazem sentido.' },
  { id:'enamorados',number:6,name:'Os Enamorados',symbol:'♡',keywords:['escolha','vínculo','alinhamento'],general:'Uma escolha revela o que realmente está alinhado ao coração e aos valores.',constructive:'Encontro, reciprocidade e decisão consciente.',alert:'Indecisão, idealização ou terceirizar uma escolha pessoal.' },
  { id:'carro',number:7,name:'O Carro',symbol:'➶',keywords:['direção','movimento','determinação'],general:'Forças diferentes podem avançar quando recebem uma direção comum.',constructive:'Foco, autonomia e superação de obstáculos.',alert:'Pressa, disputa de controle ou avanço sem escuta.' },
  { id:'justica',number:8,name:'A Justiça',symbol:'⚖',keywords:['equilíbrio','verdade','consequência'],general:'A situação pede fatos, proporcionalidade e responsabilidade pelas escolhas.',constructive:'Discernimento, honestidade e acordos claros.',alert:'Julgamento severo ou tentativa de racionalizar emoções.' },
  { id:'eremita',number:9,name:'O Eremita',symbol:'✺',keywords:['recolhimento','sabedoria','busca'],general:'Um passo para dentro pode iluminar melhor o caminho de fora.',constructive:'Maturidade, pesquisa e autonomia interior.',alert:'Isolamento, demora excessiva ou medo de pedir apoio.' },
  { id:'roda',number:10,name:'A Roda da Fortuna',symbol:'◉',keywords:['ciclo','mudança','oportunidade'],general:'O cenário está em movimento e pode abrir uma nova configuração.',constructive:'Flexibilidade, timing e aproveitamento de oportunidades.',alert:'Depender apenas da sorte ou resistir ao fim de um ciclo.' },
  { id:'forca',number:11,name:'A Força',symbol:'∞',keywords:['coragem','presença','autodomínio'],general:'A força mais útil agora é firme e gentil, não agressiva.',constructive:'Resiliência, paciência e confiança serena.',alert:'Repressão emocional ou provar força pelo confronto.' },
  { id:'enforcado',number:12,name:'O Enforcado',symbol:'◇',keywords:['pausa','entrega','perspectiva'],general:'Uma pausa voluntária permite enxergar o que a pressa esconde.',constructive:'Nova perspectiva, desapego e maturação.',alert:'Estagnação, sacrifício automático ou espera sem propósito.' },
  { id:'morte',number:13,name:'A Morte',symbol:'✣',keywords:['fim','transformação','renovação'],general:'Uma forma antiga precisa terminar para liberar energia de renovação.',constructive:'Desapego, limpeza e passagem consciente.',alert:'Apego ao que já cumpriu seu papel ou rupturas precipitadas.' },
  { id:'temperanca',number:14,name:'A Temperança',symbol:'≈',keywords:['integração','cura','ritmo'],general:'A resposta nasce da combinação paciente entre elementos diferentes.',constructive:'Moderação, conciliação e progresso constante.',alert:'Adiar conversas necessárias ou diluir demais a própria vontade.' },
  { id:'diabo',number:15,name:'O Diabo',symbol:'♢',keywords:['desejo','apego','sombra'],general:'Desejos e vínculos intensos pedem consciência sobre o preço que cobram.',constructive:'Vitalidade, verdade sobre desejos e recuperação de poder pessoal.',alert:'Compulsão, dependência ou acordos baseados em medo.' },
  { id:'torre',number:16,name:'A Torre',symbol:'ϟ',keywords:['revelação','ruptura','verdade'],general:'Uma verdade pode abalar estruturas frágeis e abrir espaço para algo mais autêntico.',constructive:'Libertação, lucidez e reconstrução honesta.',alert:'Reatividade, drama ou insistir em bases que não sustentam.' },
  { id:'estrela',number:17,name:'A Estrela',symbol:'★',keywords:['esperança','inspiração','autenticidade'],general:'Há espaço para recuperar confiança e seguir com mais verdade.',constructive:'Renovação, inspiração e generosidade.',alert:'Expectativa idealizada sem participação prática.' },
  { id:'lua',number:18,name:'A Lua',symbol:'☽',keywords:['sensibilidade','inconsciente','incerteza'],general:'Emoções e imagens internas estão fortes; é preciso distinguir intuição de medo.',constructive:'Imaginação, percepção e acolhimento emocional.',alert:'Confusão, projeções ou decisões tomadas sob ansiedade.' },
  { id:'sol',number:19,name:'O Sol',symbol:'☼',keywords:['clareza','vitalidade','alegria'],general:'A luz favorece transparência, expressão e reconhecimento do que é simples.',constructive:'Confiança, verdade e energia compartilhada.',alert:'Excesso de exposição, orgulho ou ignorar nuances.' },
  { id:'julgamento',number:20,name:'O Julgamento',symbol:'♬',keywords:['chamado','revisão','despertar'],general:'O passado pode ser revisto com maturidade para responder a um novo chamado.',constructive:'Consciência, perdão e decisão renovadora.',alert:'Culpa, autocobrança ou repetir antigas narrativas.' },
  { id:'mundo',number:21,name:'O Mundo',symbol:'◎',keywords:['conclusão','integração','plenitude'],general:'Um ciclo encontra integração e permite ocupar um lugar mais inteiro.',constructive:'Realização, pertencimento e visão ampla.',alert:'Dificuldade de concluir ou buscar perfeição antes de celebrar.' },
];

function categoryAngle(card: CardSeed, category: Category) {
  const lens: Record<Category, string> = {
    'Amor e relacionamentos': 'Nos vínculos, observe reciprocidade, limites e a qualidade da presença.',
    'Trabalho e carreira': 'Na carreira, traduza esse símbolo em prioridades, acordos e próximos passos verificáveis.',
    'Dinheiro': 'No campo material, prefira consciência, planejamento e escolhas proporcionais à realidade.',
    'Caminhos': 'Para o caminho, repare no que amplia sua autonomia sem ignorar o tempo necessário.',
    'Decisões': 'Diante da decisão, compare valores, consequências e o que depende de você.',
    'Vida pessoal': 'Na vida pessoal, acolha a experiência sem perder seus próprios limites.',
    'Energia do momento': 'Como energia do momento, use esta carta como clima simbólico, não como sentença.',
    'Pergunta livre': 'Aplique este símbolo ao que está sob seu alcance e mantenha abertura para novas informações.',
  };
  return `${card.general} ${lens[category]}`;
}

export const MAJOR_ARCANA = seeds.map((card) => ({
  ...card,
  image: `/assets/tarot/cards/${card.id}.webp`,
  interpretationByCategory: Object.fromEntries(CATEGORIES.map((category) => [category, categoryAngle(card, category)])) as Record<Category, string>,
}));

type SuitConfig = {
  id: "wands" | "cups" | "swords" | "pentacles";
  name: string;
  symbol: string;
  element: string;
  theme: string;
  constructive: string;
  alert: string;
};

const SUITS: SuitConfig[] = [
  { id:"wands", name:"Paus", symbol:"♜", element:"fogo", theme:"ação, desejo e iniciativa", constructive:"coragem para agir com intenção", alert:"pressa, desgaste ou agir sem direção" },
  { id:"cups", name:"Copas", symbol:"♢", element:"água", theme:"emoções, vínculos e sensibilidade", constructive:"escuta emocional e reciprocidade", alert:"idealização, dependência ou excesso de expectativa" },
  { id:"swords", name:"Espadas", symbol:"⚔", element:"ar", theme:"pensamento, verdade e decisões", constructive:"clareza mental e conversas honestas", alert:"ansiedade, conflito ou rigidez de pensamento" },
  { id:"pentacles", name:"Ouros", symbol:"◈", element:"terra", theme:"recursos, corpo e realidade material", constructive:"constância, segurança e construção prática", alert:"apego, lentidão ou preocupação material excessiva" },
];

const RANKS = [
  { id:"ace", number:1, name:"Ás", keywords:["início","potencial"], general:"Uma semente de possibilidade se apresenta e pede presença para ganhar forma." },
  { id:"two", number:2, name:"Dois", keywords:["dualidade","escolha"], general:"Duas forças precisam ser percebidas e relacionadas antes do próximo passo." },
  { id:"three", number:3, name:"Três", keywords:["expansão","expressão"], general:"Algo começa a sair do campo individual e ganhar movimento, troca ou crescimento." },
  { id:"four", number:4, name:"Quatro", keywords:["estrutura","estabilidade"], general:"O momento pede base, limites e atenção ao que sustenta a situação." },
  { id:"five", number:5, name:"Cinco", keywords:["tensão","mudança"], general:"Uma instabilidade revela o que precisa ser revisto, negociado ou fortalecido." },
  { id:"six", number:6, name:"Seis", keywords:["harmonia","travessia"], general:"Há possibilidade de reorganização e passagem para uma condição mais equilibrada." },
  { id:"seven", number:7, name:"Sete", keywords:["avaliação","estratégia"], general:"Nem tudo está evidente; observe padrões, escolhas e o que merece energia." },
  { id:"eight", number:8, name:"Oito", keywords:["movimento","domínio"], general:"A situação ganha intensidade e pede uso consciente de habilidade, ritmo e direção." },
  { id:"nine", number:9, name:"Nove", keywords:["maturidade","limiar"], general:"Você está perto de compreender ou concluir uma etapa, mas ainda há um ajuste importante." },
  { id:"ten", number:10, name:"Dez", keywords:["culminação","ciclo"], general:"Um ciclo mostra seus resultados e convida a reconhecer tanto conquistas quanto excessos." },
  { id:"page", number:11, name:"Pajem", keywords:["curiosidade","mensagem"], general:"Uma notícia, aprendizado ou postura mais aberta pode renovar sua relação com o tema." },
  { id:"knight", number:12, name:"Cavaleiro", keywords:["movimento","busca"], general:"Há impulso para avançar; o desafio é alinhar velocidade, intenção e consequência." },
  { id:"queen", number:13, name:"Rainha", keywords:["maturidade","presença"], general:"A resposta pede domínio interno, percepção e expressão madura desta energia." },
  { id:"king", number:14, name:"Rei", keywords:["liderança","responsabilidade"], general:"A situação pede responsabilidade, decisão e capacidade de sustentar o que você escolhe." },
] as const;

const MINOR_ARCANA = SUITS.flatMap((suit) =>
  RANKS.map((rank) => {
    const seed: CardSeed = {
      id: `${suit.id}-${rank.id}`,
      number: rank.number,
      name: `${rank.name} de ${suit.name}`,
      symbol: suit.symbol,
      keywords: [rank.keywords[0], rank.keywords[1], suit.element],
      general: `${rank.general} No naipe de ${suit.name}, isso se manifesta por meio de ${suit.theme}.`,
      constructive: `${rank.name} de ${suit.name} favorece ${suit.constructive}.`,
      alert: `${rank.name} de ${suit.name} alerta para ${suit.alert}.`,
    };
    return {
      ...seed,
      arcana: "minor" as const,
      suit: suit.name,
      rank: rank.name,
      image: `/api/tarot/card/${seed.id}`,
      interpretationByCategory: Object.fromEntries(
        CATEGORIES.map((category) => [category, categoryAngle(seed, category)]),
      ) as Record<Category, string>,
    };
  }),
);

export const TAROT_DECK = [
  ...MAJOR_ARCANA.map((card) => ({ ...card, arcana: "major" as const })),
  ...MINOR_ARCANA,
];

export type TarotCard = typeof TAROT_DECK[number];

export function drawCards(count = 3) {
  const deck = [...TAROT_DECK];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const limit = Math.floor(0x100000000 / (i + 1)) * (i + 1);
    let value = values[0];
    while (value >= limit) {
      crypto.getRandomValues(values);
      value = values[0];
    }
    const j = value % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, Math.max(1, Math.min(count, deck.length)));
}

export function drawThreeCards() {
  return drawCards(3);
}

export function getCards(ids: string[]) {
  return ids
    .map((id) => TAROT_DECK.find((card) => card.id === id))
    .filter(Boolean) as TarotCard[];
}

export function getCard(id: string) {
  return TAROT_DECK.find((card) => card.id === id);
}
