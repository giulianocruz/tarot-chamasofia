import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: "https://tarot.chamasofia.com.br",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://tarot.chamasofia.com.br/astrotarot",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://tarot.chamasofia.com.br/biblioteca",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
