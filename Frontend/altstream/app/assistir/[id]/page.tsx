import type { Metadata } from 'next';
import EpisodioClient from './EpisodioClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  try {
    const response = await fetch(
      `${API_URL}/core/episodios/${id}/`,
      {
        next: {
          revalidate: 60,
        },
      }
    );

    if (!response.ok) {
      return {
        title: 'Episódio | AltStream',
        description: 'Assista ao episódio no AltStream.',
      };
    }

    const episodio = await response.json();

    const titulo = episodio.nome || 'Episódio';
    const serie = episodio.serie?.nome || 'AltStream';

    const imagem =
      episodio.link_imagem ||
      episodio.serie?.link_imagem;

    const url =
      `https://carlosabrantes.dengoso.web.ufersa.dev.br/assistir/${id}`;

    return {
      title: `${titulo} | ${serie} - AltStream`,
      description:
        episodio.descricao ||
        `Assista ${titulo} no AltStream.`,

      openGraph: {
        title: titulo,
        description:
          episodio.descricao ||
          `Assista ${titulo} no AltStream.`,
        url,
        siteName: 'AltStream',
        type: 'video.other',

        ...(imagem && {
          images: [
            {
              url: imagem,
              width: 1280,
              height: 720,
              alt: titulo,
            },
          ],
        }),
      },

      twitter: {
        card: 'summary_large_image',
        title: titulo,
        description:
          episodio.descricao ||
          `Assista ${titulo} no AltStream.`,

        ...(imagem && {
          images: [imagem],
        }),
      },
    };
  } catch (error) {
    console.error('Erro ao gerar metadados:', error);

    return {
      title: 'AltStream',
      description: 'Assista episódios no AltStream.',
    };
  }
}

export default function Page() {
  return <EpisodioClient />;
}