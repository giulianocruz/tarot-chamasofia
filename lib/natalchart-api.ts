import { env } from 'cloudflare:workers';

export type NatalChartPlanet = {
  name: string;
  longitude: number;
  sign: string;
  degreeInSign: number;
  speed?: number;
  retrograde?: boolean;
  house?: number;
};

export type NatalChartResponse = {
  input?: { date?: string; time?: string | null; latitude?: number; longitude?: number; timeKnown?: boolean };
  time?: { timezone?: string; offsetHours?: number; julianDayUT?: number };
  planets?: NatalChartPlanet[];
  angles?: {
    ascendant?: { longitude?: number; sign?: string };
    midheaven?: { longitude?: number; sign?: string };
    vertex?: { longitude?: number; sign?: string };
    partOfFortune?: { longitude?: number; sign?: string };
  };
  houses?: Array<{ number: number; cusp: number; sign: string }>;
  aspects?: Array<{ planet1: string; planet2: string; aspect: string; angle: number; orb: number; phase?: string }>;
  elements?: Record<string, number>;
  qualities?: Record<string, number>;
};

export type NatalSkyResponse = {
  date?: string;
  positions?: Array<{
    name: string;
    longitude: number;
    sign: string;
    degreeInSign?: number;
    speed?: number;
    retrograde?: boolean;
  }>;
};

export type NatalBirthRequest = {
  date: string;
  time: string | null;
  latitude: number;
  longitude: number;
  timezone?: string;
};

const BASE_URL = 'https://api.natalchart.ai';

export function natalChartApiConfigured() {
  return Boolean(env.NATALCHART_API_KEY);
}

async function natalRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!env.NATALCHART_API_KEY) throw new Error('NATALCHART_API_KEY não configurada.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.NATALCHART_API_KEY}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({})) as T & {
      error?: { code?: string; message?: string; details?: unknown };
    };
    if (!response.ok) {
      const code = body.error?.code ? ` [${body.error.code}]` : '';
      const message = body.error?.message || `HTTP ${response.status}`;
      throw new Error(`NatalChart API${code}: ${message}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchNatalChart(birth: NatalBirthRequest) {
  return natalRequest<NatalChartResponse>('/v1/chart/full', {
    method: 'POST',
    body: JSON.stringify({ birth }),
  });
}

export async function fetchNatalSky(date: string) {
  return natalRequest<NatalSkyResponse>(`/v1/sky?date=${encodeURIComponent(date)}`);
}
