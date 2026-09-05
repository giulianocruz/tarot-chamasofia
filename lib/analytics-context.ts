export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

export type AnalyticsContext = Partial<Record<AttributionKey, string>> & {
  anonymous_id: string;
  session_id: string;
  is_test: boolean;
  locale?: string;
  currency?: string;
  market?: string;
};

export function normalizeTestFlag(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return ["1", "true", "yes", "sim"].includes(String(value ?? "").trim().toLowerCase());
}

export function analyticsMetadata(
  context: AnalyticsContext,
  metadata: Record<string, unknown> = {},
) {
  return { ...metadata, ...context };
}

export function contextFromOrder(order: Record<string, unknown>): AnalyticsContext {
  const fallbackId = `order:${String(order.order_number ?? order.id ?? "unknown")}`;
  const context: AnalyticsContext = {
    anonymous_id: String(order.anonymous_id || fallbackId),
    session_id: String(order.session_id || fallbackId),
    is_test: normalizeTestFlag(order.is_test),
  };
  for (const key of ATTRIBUTION_KEYS) {
    const value = String(order[key] ?? "").trim();
    if (value) context[key] = value;
  }
  const locale = String(order.locale ?? "").trim();
  const currency = String(order.currency ?? "").trim();
  if (locale) context.locale = locale;
  if (currency) context.currency = currency;
  if (locale || currency) context.market = locale.toLowerCase().startsWith("en") || currency === "USD" ? "international" : "brazil";
  return context;
}
