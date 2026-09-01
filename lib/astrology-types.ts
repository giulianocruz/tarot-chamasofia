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
};

export type BirthInput = {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timeKnown: boolean;
};
