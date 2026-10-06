import type { Metadata } from 'next';
import SerieClient from './SeriesClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  try {
    const response = await fetch(
      `${API_URL}/core/series/${id}/`,
      {
        next: {
          revalidate: 60,
        },
      }
    );

    if (!response.ok) {
      return {
        title: 'Série - AltStream',
        description: 'Assista séries no AltStream.',
      };
    }

    const serie = await response.json();

    const nome = serie.nome || 'Série';
    const descricao =
      serie.sinopse ||
      `Assista ${nome} no AltStream.`;

    const imagem = serie.link_imagem;

    const url =
      `https://carlosabrantes.dengoso.web.ufersa.dev.br/series/${id}`;

    return {
      title: `${nome} - AltStream`,
      description: descricao,

      openGraph: {
        title: nome,
        description: descricao,
        url,
        siteName: 'AltStream',
        type: 'website',

        ...(imagem && {
          images: [
            {
              url: imagem,
              width: 1280,
              height: 720,
              alt: nome,
            },
          ],
        }),
      },

      twitter: {
        card: 'summary_large_image',
        title: nome,
        description: descricao,

        ...(imagem && {
          images: [imagem],
        }),
      },
    };
  } catch (error) {
    console.error('Erro ao gerar metadados da série:', error);

    return {
      title: 'AltStream',
      description: 'Assista séries no AltStream.',
    };
  }
}

export default function Page() {
  return <SerieClient />;
}