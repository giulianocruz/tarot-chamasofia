import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chama Sofia AstroTarot',
    short_name: 'Chama Sofia',
    description: 'Mapa Astral Express, céu atual e Tarot em uma análise personalizada.',
    start_url: '/consulta',
    display: 'standalone',
    background_color: '#0b0610',
    theme_color: '#21102f',
    lang: 'pt-BR',
  };
}
