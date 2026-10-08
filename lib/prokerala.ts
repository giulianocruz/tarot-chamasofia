export type ProkeralaCredentials = {
  clientId: string;
  clientSecret: string;
};

export type ProkeralaHouse = {
  number: number;
  startDegree?: number;
  endDegree?: number;
  sign?: string;
};

export type ProkeralaPlanet = {
  name: string;
  sign: string;
  degree?: number;
  longitude?: number;
  house?: number;
  retrograde?: boolean;
};

export type ProkeralaAspect = {
  planetOne: string;
  planetTwo: string;
  type: string;
  orb?: number;
};

export type ProkeralaNatalEnrichment = {
  provider: "prokerala";
  houses: ProkeralaHouse[];
  planets: ProkeralaPlanet[];
  aspects: ProkeralaAspect[];
  attributionRequired: true;
};

type RawPlanet = {
  name?: string;
  longitude?: number;
  degree?: number;
  house_number?: number;
  is_retrograde?: boolean;
  zodiac?: { name?: string };
};

type RawHouse = {
  number?: number;
  start_cusp?: { degree?: number; zodiac?: { name?: string } };
  end_cusp?: { degree?: number; zodiac?: { name?: string } };
};

type RawAspect = {
  planet_one?: { name?: string };
  planet_two?: { name?: string };
  aspect?: { name?: string };
  orb?: number;
};

type RawNatalResponse = {
  status?: string;
  data?: {
    houses?: RawHouse[];
    planet_positions?: RawPlanet[];
    aspects?: RawAspect[];
  };
};

const SIGN_PT: Record<string,string> = { Aries:'Áries',Taurus:'Touro',Gemini:'Gêmeos',Cancer:'Câncer',Leo:'Leão',Virgo:'Virgem',Libra:'Libra',Scorpio:'Escorpião',Sagittarius:'Sagitário',Capricorn:'Capricórnio',Aquarius:'Aquário',Pisces:'Peixes' };
const PLANET_PT: Record<string,string> = { Sun:'Sol',Moon:'Lua',Mercury:'Mercúrio',Venus:'Vênus',Mars:'Marte',Jupiter:'Júpiter',Saturn:'Saturno',Uranus:'Urano',Neptune:'Netuno',Pluto:'Plutão' };
const ASPECT_PT: Record<string,string> = { Conjunction:'Conjunção',Opposition:'Oposição',Square:'Quadratura',Trine:'Trígono',Sextile:'Sextil' };

let tokenCache: { token: string; expiresAt: number; clientId: string } | null = null;

async function getAccessToken(credentials: ProkeralaCredentials, forceRefresh = false) {
  if (!forceRefresh && tokenCache && tokenCache.clientId === credentials.clientId && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  });

  const response = await fetch("https://api.prokerala.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Falha ao autenticar o provedor astrológico premium.");

  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("O provedor astrológico premium não retornou um token válido.");

  tokenCache = {
    token: payload.access_token,
    clientId: credentials.clientId,
    expiresAt: Date.now() + Math.max(0, Number(payload.expires_in ?? 3600)) * 1000,
  };
  return payload.access_token;
}

export async function fetchProkeralaNatalEnrichment(
  credentials: ProkeralaCredentials,
  input: {
    datetime: string;
    latitude: number;
    longitude: number;
    timeKnown: boolean;
  },
): Promise<ProkeralaNatalEnrichment> {
  let token = await getAccessToken(credentials);
  const params = new URLSearchParams({
    "profile[datetime]": input.datetime,
    "profile[coordinates]": `${input.latitude},${input.longitude}`,
    "profile[birth_time_unknown]": input.timeKnown ? "false" : "true",
    house_system: "placidus",
    orb: "default",
    birth_time_rectification: "flat-chart",
    ayanamsa: "0",
    la: "en",
  });

  const fetchNatal = (accessToken: string) => fetch(`https://api.prokerala.com/v2/astrology/natal-planet-position?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });

  let response = await fetchNatal(token);
  if (response.status === 401) {
    // Um token revogado ou expirado não deve bloquear o cálculo pelo tempo restante do cache.
    if (tokenCache?.token === token) tokenCache = null;
    token = await getAccessToken(credentials, true);
    response = await fetchNatal(token);
  }

  if (response.status === 402 || response.status === 429) {
    throw new Error("Cota do provedor astrológico premium indisponível.");
  }
  if (!response.ok) {
    throw new Error(`Falha no enriquecimento astrológico premium (${response.status}).`);
  }

  const payload = await response.json() as RawNatalResponse;
  const data = payload.data;
  if (!data || !Array.isArray(data.planet_positions) || data.planet_positions.length === 0) {
    throw new Error("O provedor premium retornou um mapa natal incompleto.");
  }

  return {
    provider: "prokerala",
    attributionRequired: true,
    houses: (data.houses || []).map((house) => ({
      number: Number(house.number || 0),
      startDegree: Number.isFinite(Number(house.start_cusp?.degree)) ? Number(house.start_cusp?.degree) : undefined,
      endDegree: Number.isFinite(Number(house.end_cusp?.degree)) ? Number(house.end_cusp?.degree) : undefined,
      sign: SIGN_PT[String(house.start_cusp?.zodiac?.name || '')] || house.start_cusp?.zodiac?.name,
    })).filter((house) => house.number > 0),
    planets: (data.planet_positions || []).map((planet) => ({
      name: PLANET_PT[String(planet.name || '')] || String(planet.name || ""),
      sign: SIGN_PT[String(planet.zodiac?.name || '')] || String(planet.zodiac?.name || ""),
      degree: Number.isFinite(Number(planet.degree)) ? Number(planet.degree) : undefined,
      longitude: Number.isFinite(Number(planet.longitude)) ? Number(planet.longitude) : undefined,
      house: Number.isFinite(Number(planet.house_number)) ? Number(planet.house_number) : undefined,
      retrograde: Boolean(planet.is_retrograde),
    })).filter((planet) => planet.name),
    aspects: (data.aspects || []).map((aspect) => ({
      planetOne: PLANET_PT[String(aspect.planet_one?.name || '')] || String(aspect.planet_one?.name || ""),
      planetTwo: PLANET_PT[String(aspect.planet_two?.name || '')] || String(aspect.planet_two?.name || ""),
      type: ASPECT_PT[String(aspect.aspect?.name || '')] || String(aspect.aspect?.name || ""),
      orb: Number.isFinite(Number(aspect.orb)) ? Number(aspect.orb) : undefined,
    })).filter((aspect) => aspect.planetOne && aspect.planetTwo && aspect.type),
  };
}
