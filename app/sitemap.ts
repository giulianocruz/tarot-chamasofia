import type { MetadataRoute } from 'next';
export default function sitemap():MetadataRoute.Sitemap{return[{url:'https://tarot.chamasofia.com.br',lastModified:new Date(),changeFrequency:'weekly',priority:1},{url:'https://tarot.chamasofia.com.br/biblioteca',lastModified:new Date(),changeFrequency:'monthly',priority:.6}]}
