export type AstroPlanet = {
  name: string;
  sign: string;
  house?: number;
  degree?: number;
  retrograde?: boolean;
};

export type AstroTransitHighlight = {
  transitPlanet: string;
  natalPlanet: string;
  aspectType: string;
  transitSign: string;
  natalHouse?: number;
  retrograde: boolean;
  exactTime?: string;
  meaning: string;
};

export type AstroSolutionStep = {
  title: string;
  text: string;
};
export type AstroTarotLayer = {
  generatedAt: string;
  transitDate: string;
  birth: {
    date: string;
    time: string;
    place: string;
    resolvedPlace: string;
    timeKnown: boolean;
  };
  natal: {
    sun?: AstroPlanet;
    moon?: AstroPlanet;
    mercury?: AstroPlanet;
    venus?: AstroPlanet;
    mars?: AstroPlanet;
    jupiter?: AstroPlanet;
    saturn?: AstroPlanet;
    ascendantSign?: string;
    ascendantDegree?: number;
  };
  current: {
    ascendant?: string;
    highlights: AstroTransitHighlight[];
  };
  situation: string;
  cardsBridge: string;
  solution: {
    title: string;
    steps: AstroSolutionStep[];
  };
  reflection: string;
  precisionNote: string;
  provider?: {
    core: 'local';
    enrichment?: 'prokerala';
    enrichmentStatus?: 'ok' | 'unavailable';
    attributionRequired?: boolean;
  };
  advanced?: {
    houses: Array<{ number: number; startDegree?: number; endDegree?: number; sign?: string }>;
    planets: Array<{ name: string; sign: string; degree?: number; longitude?: number; house?: number; retrograde?: boolean }>;
    aspects: Array<{ planetOne: string; planetTwo: string; type: string; orb?: number }>;
  };
};

export type BirthInput = {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timeKnown: boolean;
};

export type FreeNatalPreview = {
  generatedAt: string;
  birth: {
    date: string;
    time: string;
    place: string;
    resolvedPlace: string;
    timeKnown: boolean;
  };
  natal: {
    sun?: AstroPlanet;
    moon?: AstroPlanet;
    mercury?: AstroPlanet;
    venus?: AstroPlanet;
    mars?: AstroPlanet;
    ascendantSign?: string;
    ascendantDegree?: number;
  };
  precisionNote: string;
};
