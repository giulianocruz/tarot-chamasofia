type SearchValue = string | string[] | undefined;
export type SearchParams = Record<string, SearchValue>;

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function shouldUseConsulta(searchParams: SearchParams) {
  if (first(searchParams.fbclid).trim()) return true;

  const source = first(searchParams.utm_source).trim().toLowerCase();
  if (["meta", "facebook", "instagram", "fb", "ig", "google", "youtube", "tiktok", "bing"].includes(source)) return true;

  const medium = first(searchParams.utm_medium).trim().toLowerCase();
  if (["cpc", "ppc", "paid", "paid_social", "paid-social", "display"].some((marker) => medium.includes(marker))) return true;

  const metaMarker = first(searchParams.meta).trim().toLowerCase();
  return ["1", "true", "ads", "paid"].includes(metaMarker);
}

export function consultationUrl(searchParams: SearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) query.append(key, item);
  }
  const suffix = query.toString();
  return suffix ? `/consulta?${suffix}` : "/consulta";
}
