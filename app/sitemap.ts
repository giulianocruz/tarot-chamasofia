import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://tarot.chamasofia.com.br";
  const editorialDate = new Date("2026-09-02T15:00:00-03:00");
  return [
    { url: base, lastModified: editorialDate, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/en`, lastModified: new Date("2026-09-05T14:20:00-03:00"), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/mapa-astral-gratis`, lastModified: editorialDate, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/tarot-do-amor-gratis`, lastModified: editorialDate, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/astrotarot`, lastModified: editorialDate, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/biblioteca`, lastModified: editorialDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/artigos`, lastModified: editorialDate, changeFrequency: "weekly", priority: 0.85 },
    ...ARTICLES.map((article) => ({
      url: `${base}/artigos/${article.slug}`,
      lastModified: new Date(`${article.updatedAt}T12:00:00-03:00`),
      changeFrequency: "monthly" as const,
      priority: 0.78,
    })),
  ];
}
