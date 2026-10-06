'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import VideoPlayer from '@/app/components/VideoPlayer';
import { DiscussionEmbed } from 'disqus-react';
import { streamApi } from '@/services/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/services/firebase';
import PopUp from '@/app/components/PopUp';

export default function EpisodioPage() {
  const router = useRouter();
  const params = useParams();
  const episodioId = params.id;

  const [episodio, setEpisodio] = useState<any>(null);
  const [curtidas, setCurtidas] = useState<number>(0);
  const [descurtidas, setDescurtidas] = useState<number>(0);
  const [recomendados, setRecomendados] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [popupType, setPopupType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchEpisodio() {
      try {
        if (episodioId) {
          const data = await streamApi.getEpisodioById(Number(episodioId));
          setEpisodio(data);
          setCurtidas(data.curtidas);
          setDescurtidas(data.descurtidas);
          
          if (data.serie) {
            const todosEpisodios = await streamApi.getEpisodiosBySerie(data.serie.id);
            const currentIndex = todosEpisodios.findIndex((e: any) => e.id === Number(episodioId));
            const nextEpisodes = todosEpisodios.slice(currentIndex + 1, currentIndex + 4);
            setRecomendados(nextEpisodes);
          }
        }
      } catch (error) {
        setPopupMessage('Erro ao carregar o episódio. Tente novamente mais tarde.');
        setPopupType('error');
      }
    }
    fetchEpisodio();
  }, [episodioId]);

  const videoPlayerMemo = useMemo(() => {
    if (!episodio?.link_midia) return null;
    return <VideoPlayer videoSrc={episodio.link_midia} />;
  }, [episodio?.link_midia]);

  if (!episodio) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <h1 className="text-2xl">Episódio não encontrado</h1>
      </div>
    );
  }

  const disqusShortname = "altstream";
  const disqusConfig = {
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/assistir/${episodioId}`,
    identifier: `episodio-${episodioId}`,
    title: `${episodio.serie?.nome || 'Série'} - ${episodio.nome}`,
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setPopupMessage('Link copiado para a área de transferência!');
      setPopupType('success');
    } catch (error) {
      setPopupMessage('Não foi possível copiar o link.');
      setPopupType('error');
    }
  };

  const handleLike = async (isLike: boolean) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await streamApi.toggleLike(Number(episodioId), isLike, token);
      
      setCurtidas(response.curtidas);
      setDescurtidas(response.descurtidas);
    } catch (error) {
        setPopupMessage('Ocorreu um erro ao processar sua avalia��o.');
        setPopupType('error');
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md text-body-md min-h-screen overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
      <Header />
        <PopUp 
          message={popupMessage} 
          type={popupType} 
          onClose={() => setPopupMessage(null)} 
        />
      
      <main className="min-h-screen w-full relative pt-[100px] px-container-margin-mobile md:px-container-margin pb-stack-lg">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-outline-variant/20 bg-surface-container-high">
              {/* Chamamos a versão em cache do player em vez de renderizar direto */}
              {videoPlayerMemo}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex flex-col gap-3">
                <h1 className="font-display-hero text-headline-lg-mobile md:text-headline-lg text-on-background">
                  {episodio.nome}
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 leading-relaxed">
                  {episodio.descricao || "Sem descrição disponível para este episódio."}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-outline-variant/30">
                    <img 
                      src={episodio.serie?.link_imagem || 'https://assets.startbootstrap.com/img/screenshots/templates/the-big-picture.png'} 
                      alt="Capa da Série" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider">Série</span>
                    <span className="font-body-md text-body-md text-on-surface-variant font-medium">
                      <Link 
                        href={`/series/${episodio.serie?.id}`} 
                        className="text-on-background hover:underline font-label-sm text-label-sm"
                      >
                        {episodio.serie?.nome || 'Série Desconhecida'}
                      </Link>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleLike(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-variant/50 transition-all text-on-surface-variant hover:text-primary"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>thumb_up</span>
                    <span className="font-label-sm text-label-sm">{curtidas}</span>
                  </button>
                  <button 
                    onClick={() => handleLike(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container border border-outline-variant/30 hover:border-error/50 hover:bg-surface-variant/50 transition-all text-on-surface-variant hover:text-error"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>thumb_down</span>
                    <span className="font-label-sm text-label-sm">{descurtidas}</span>
                  </button>
                  <button onClick={handleShare} className="flex items-center gap-2 p-2 rounded-full bg-surface-container border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-variant/50 transition-all text-on-surface-variant hover:text-primary ml-2">
                    <span className="material-symbols-outlined">share</span>
                  </button>
                  {recomendados.length > 0 && (
                    <Link 
                      href={`/assistir/${recomendados[0].id}`}
                      className="flex items-center justify-center gap-2 px-6 py-2 rounded-full bg-primary text-on-primary font-label-sm text-label-sm transition-all] w-full sm:w-max ml-2"
                    >
                      Próximo <span className="material-symbols-outlined text-sm">skip_next</span>
                    </Link>
                  )}
                </div>
                <div className="flex justify-end">
                </div>
              </div>
            </div>

            <hr className="border-outline-variant/20 my-2" />

            <section className="flex flex-col gap-4 mt-2">
              <h3 className="font-headline-md text-headline-md text-on-background">Comentários</h3>
              <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/20">
                <DiscussionEmbed
                  shortname={disqusShortname}
                  config={disqusConfig}
                />
              </div>
            </section>
          </div>

          <aside className="lg:col-span-1 flex flex-col gap-6">
            <h3 className="font-headline-md text-headline-md text-on-background">Mais de {episodio.serie?.nome || 'Série'}</h3>
            <div className="flex flex-col gap-4">
              {recomendados.length > 0 ? (
                recomendados.map((ep: any) => (
                  <Link 
                    key={ep.id} 
                    href={`/assistir/${ep.id}`} 
                    className="flex items-center gap-4 p-3 rounded-xl bg-surface-container border border-outline-variant/20 hover:border-primary/50 hover:bg-surface-variant/50 transition-all group cursor-pointer"
                  >
                    <div className="w-24 aspect-video rounded-lg overflow-hidden border border-outline-variant/30">
                      <img src={ep.link_imagem} alt={ep.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Episódio {ep.numero}</span>
                      <span className="font-body-md text-sm text-on-background line-clamp-2 leading-tight group-hover:text-primary transition-colors">{ep.nome}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-on-surface-variant text-sm">Não há próximos episódios disponíveis.</p>
              )}
            </div>
            <hr className="border-outline-variant/20 my-4" />
            <h3 className="font-headline-md text-headline-md text-on-background">Outras séries</h3>
            <div className="grid grid-cols-2 gap-4"></div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
