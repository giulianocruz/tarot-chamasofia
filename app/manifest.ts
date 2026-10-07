import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chama Sofia Tarot',
    short_name: 'Chama Sofia',
    description: 'Tarot completo com 78 cartas, diferentes métodos de tiragem e leitura personalizada.',
    start_url: '/consulta',
    display: 'standalone',
    background_color: '#0b0610',
    theme_color: '#21102f',
    lang: 'pt-BR',
  };
}
