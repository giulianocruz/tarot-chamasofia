export const PRICE_TIERS = [
  { from: 0, to: 4, cents: 990 },
  { from: 5, to: 9, cents: 1290 },
  { from: 10, to: 14, cents: 1490 },
  { from: 15, to: 19, cents: 1990 },
  { from: 20, to: 24, cents: 2190 },
  { from: 25, to: 29, cents: 2490 },
  { from: 30, to: Number.POSITIVE_INFINITY, cents: 2990 },
] as const;

export function priceForConfirmedSales(confirmedSales: number) {
  const tierIndex = PRICE_TIERS.findIndex((tier) => confirmedSales >= tier.from && confirmedSales <= tier.to);
  const tier = PRICE_TIERS[Math.max(tierIndex, 0)];
  const next = PRICE_TIERS[Math.min(Math.max(tierIndex, 0) + 1, PRICE_TIERS.length - 1)];
  return {
    cents: tier.cents,
    formatted: formatBRL(tier.cents),
    remaining: Number.isFinite(tier.to) ? tier.to - confirmedSales + 1 : null,
    nextCents: tierIndex < PRICE_TIERS.length - 1 ? next.cents : null,
    nextFormatted: tierIndex < PRICE_TIERS.length - 1 ? formatBRL(next.cents) : null,
    confirmedSales,
  };
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
