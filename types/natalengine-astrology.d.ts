declare module 'natalengine/astrology' {
  type Sign = { name?: string };
  type Position = { sign?: Sign; longitude?: number; degree?: string };
  type Chart = {
    sun?: Position;
    moon?: Position;
    rising?: Position;
    planets?: Record<string, Position>;
    [key: string]: unknown;
  };
  export default function calculateAstrology(
    birthDate: string,
    birthHour: number,
    timezone: number,
    latitude?: number,
    longitude?: number,
  ): Chart;
}
