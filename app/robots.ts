import type { MetadataRoute } from 'next';
export default function robots():MetadataRoute.Robots{return{rules:[{userAgent:'*',allow:'/',disallow:['/leitura/','/obrigada/','/oraculo-gestao-7f3a/','/api/']}],sitemap:'https://tarot.chamasofia.com.br/sitemap.xml',host:'https://tarot.chamasofia.com.br'}}
