'use client';

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { streamApi } from '@/services/api';
import Link from 'next/link';
import { auth } from '@/services/firebase';
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [continuar, setContinuar] = useState<any[]>([]);
  const [novos, setNovos] = useState<any[]>([]);
  const [seriesDestaque, setSeriesDestaque] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [minhaLista, setMinhaLista] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const handleToggleList = async (serieId: number) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }
  
      const token = await user.getIdToken();
      await streamApi.toggleMinhaLista(serieId, token);
      
      // Refresh the list
      const updatedLista = await streamApi.getMinhaLista(token);
      setMinhaLista(updatedLista);
    } catch (error) {
      console.error('Error toggling list:', error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const user = auth.currentUser;
        const isLoggedIn = !!user;
        setIsLoggedIn(isLoggedIn);

        // Em um cenário real, o usuarioId viria de um contexto de autenticação
        const usuarioId = 1; 
        
        const requests = [
          streamApi.getContinueWatching(usuarioId),
          streamApi.getNewReleases(),
          streamApi.getSeries()
        ];

        if (isLoggedIn) {
          const token = await user.getIdToken();
          requests.push(streamApi.getMinhaLista(token));
        }

        const results = await Promise.all(requests);
        
        setContinuar(results[0]);
        setNovos(results[1]);
        setSeries(results[2]);
        setSeriesDestaque(results[2].filter((s: any) => s.destaque_landing_page));
        
        if (isLoggedIn) {
          setMinhaLista(results[3]);
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (seriesDestaque.length > 1) {
      const timer = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % seriesDestaque.length);
      }, 7000);
      return () => clearInterval(timer);
    }
  }, [seriesDestaque]);

  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body-md text-body-md min-h-screen overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
      <Header />
      
      <main className="min-h-screen w-full relative">
        {/* Hero Banner: Intergalactic Wars */}
        <section className="relative w-full h-[716px] min-h-[500px] flex items-end pb-container-margin px-container-margin-mobile md:px-container-margin overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out" 
            data-alt={seriesDestaque.length > 0 ? seriesDestaque[currentBannerIndex].nome : "Cinematic space battle"} 
            style={{ backgroundImage: `url('${seriesDestaque.length > 0 ? seriesDestaque[currentBannerIndex].banner : 'https://wallpaperaccess.com/full/3215377.jpg'}')` }}
          ></div>
          
          {/* Gradient Overlays for integration */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent"></div>
          
          <div className="relative z-10 max-w-3xl flex flex-col gap-stack-md">
            {seriesDestaque.length > 0 ? (
              <>
                <h2 className="font-display-hero text-headline-lg-mobile md:text-display-hero text-on-background drop-shadow-2xl">
                  {seriesDestaque[currentBannerIndex].nome}
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl line-clamp-3 drop-shadow-md">
                  {seriesDestaque[currentBannerIndex].sinopse}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display-hero text-headline-lg-mobile md:text-display-hero text-on-background drop-shadow-2xl">Nome da série</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl line-clamp-3 drop-shadow-md">
                  Descrição da série
                </p>
              </>
            )}
            <div className="flex items-center gap-4 mt-2">
              {seriesDestaque.length > 0 && (
                <Link 
                  href={`/series/${seriesDestaque[currentBannerIndex].id}`} 
                  className="bg-primary hover:bg-primary-fixed text-on-primary font-label-sm text-label-sm py-3 px-8 rounded-full flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(208,188,255,0.5)]"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  Assistir Agora
                </Link>
              )}
              {seriesDestaque.length > 0 && (
                <button 
                  onClick={() => handleToggleList(seriesDestaque[currentBannerIndex].id)}
                  className={`bg-surface/10 backdrop-blur-md border ${minhaLista.some(i => i.serie_id === seriesDestaque[currentBannerIndex].id) ? 'border-primary bg-primary/20 text-primary' : 'border-on-surface/20 hover:border-primary/50 hover:bg-surface/30 text-on-surface'} font-label-sm text-label-sm p-3 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105`}
                >
                  <span className="material-symbols-outlined">
                    {minhaLista.some(i => i.serie_id === seriesDestaque[currentBannerIndex].id) ? 'check' : 'add'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="px-container-margin-mobile md:px-container-margin py-stack-lg flex flex-col gap-[48px]">
          <section className="flex flex-col gap-stack-md">
            <h3 className="font-headline-md text-headline-md text-on-background">Continuar Assistindo</h3>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-container-margin-mobile px-container-margin-mobile md:mx-0 md:px-0">
              {continuar.length > 0 ? (
                continuar.map((item: any) => (
                  <Link key={item.id} href={`/assistir/${item.episodio.id}`} className="relative flex-none w-64 group cursor-pointer">
                    <div className="aspect-[16/9] rounded-lg overflow-hidden relative border border-outline-variant/20 bg-surface-container-high transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(208,188,255,0.15)] group-hover:border-primary/30">
                      <img alt={item.episodio?.nome} className="w-full h-full object-cover" src={item.episodio?.serie?.link_imagem || 'https://wallpaperaccess.com/full/3215377.jpg'} />
                      <div className="absolute inset-0 bg-surface-container/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button className="bg-primary/20 backdrop-blur-md text-primary rounded-full aspect-square w-12 h-12 flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(208,188,255,0.5)]">
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-surface-container-highest">
                        <div className="h-full bg-secondary shadow-[0_0_8px_rgba(93,230,255,0.8)]" style={{ width: `${item.progresso}%` }}></div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface truncate">{item.episodio?.serie?.nome}</span>
                      <span className="font-body-md text-[13px] text-on-surface-variant truncate">T{item.episodio?.temporada_numero}:E{item.episodio?.numero} "{item.episodio?.nome}"</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-on-surface-variant font-body-md text-sm">Nenhum item para continuar assistindo.</p>
              )}
            </div>
          </section>

          {/* Row 2: Novos Lançamentos (New Releases) */}
          <section className="flex flex-col gap-stack-md">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-background">Novos Lançamentos</h3>
              <button className="font-label-sm text-label-sm text-primary hover:text-primary-fixed transition-colors flex items-center gap-1">
                Ver Tudo <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-container-margin-mobile px-container-margin-mobile md:mx-0 md:px-0">
              {novos.length > 0 ? (
                novos.map((ep: any) => (
                  <Link key={ep.id} href={`/assistir/${ep.id}`} className="relative flex-none w-64 group cursor-pointer">
                    <div className="aspect-[16/9] rounded-lg overflow-hidden relative border border-outline-variant/20 bg-surface-container-high transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(208,188,255,0.15)] group-hover:border-primary/30">
                      <img alt={ep.nome} className="w-full h-full object-cover" src={ep.link_imagem || ep.serie?.link_imagem || 'https://wallpaperaccess.com/full/3215377.jpg'} />
                      <div className="absolute inset-0 bg-surface-container/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button className="bg-primary/20 backdrop-blur-md text-primary rounded-full aspect-square w-12 h-12 flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(208,188,255,0.5)]">
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 bg-surface-container-highest/90 backdrop-blur-sm text-primary font-label-sm text-[10px] px-2 py-1 rounded-full uppercase tracking-wider">Novo Episódio</div>
                    </div>
                    <div className="mt-2 flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface truncate">{ep.serie?.nome}</span>
                      <span className="font-body-md text-[13px] text-on-surface-variant truncate">T{ep.temporada_numero}:E{ep.numero} - {ep.nome}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-on-surface-variant font-body-md text-sm">Nenhum novo lançamento disponível.</p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-stack-md">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-md text-headline-md text-on-background">Minha Lista</h3>
                {isLoggedIn && (
                  <button className="font-label-sm text-label-sm text-primary hover:text-primary-fixed transition-colors flex items-center gap-1">
                    Ver Tudo <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                )}
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-container-margin-mobile px-container-margin-mobile md:mx-0 md:px-0">
                {!isLoggedIn ? (
                  <div className="w-full py-10 text-center bg-surface-container rounded-2xl border border-dashed border-outline-variant/30">
                    <p className="text-on-surface-variant font-body-md text-sm">Faça login para salvar e visualizar suas séries favoritas.</p>
                  </div>
                ) : minhaLista.length > 0 ? (
                  minhaLista.map((item: any) => (
                    <Link key={item.id} href={`/series/${item.serie_id}`} className="relative flex-none w-32 group cursor-pointer aspect-[2/3]">
                      <div className="w-full h-full rounded-lg overflow-hidden relative border border-outline-variant/20 bg-surface-container-high transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(208,188,255,0.15)] group-hover:border-primary/30">
                        <img alt={item.serie_nome} className="w-full h-full object-cover" src={item.serie_imagem || 'https://wallpaperaccess.com/full/3215377.jpg'} />
                        <div className="absolute inset-0 bg-surface-container/60 backdrop-blur-sm opacity-0 flex items-center justify-center">
                        </div>
                      </div>
                      <div className="mt-2 flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface truncate">{item.serie_nome}</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-on-surface-variant font-body-md text-sm">Sua lista está vazia.</p>
                )}
              </div>
            </section>

          {/* Row 3: Catálogo Completo (Complete Catalog) */}
          <section className="flex flex-col gap-stack-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-headline-md text-headline-md text-on-background">Todas as séries</h3>
              {/* Genre Filters */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <button className="whitespace-nowrap px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm transition-all shadow-[0_0_10px_rgba(208,188,255,0.2)]">Todos</button>
                <button className="whitespace-nowrap px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant/30 text-on-surface-variant font-label-sm text-label-sm hover:border-primary/50 hover:text-primary transition-all">Comédia</button>
                <button className="whitespace-nowrap px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant/30 text-on-surface-variant font-label-sm text-label-sm hover:border-primary/50 hover:text-primary transition-all">Ação</button>
                <button className="whitespace-nowrap px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant/30 text-on-surface-variant font-label-sm text-label-sm hover:border-primary/50 hover:text-primary transition-all">Drama</button>
                <button className="whitespace-nowrap px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant/30 text-on-surface-variant font-label-sm text-label-sm hover:border-primary/50 hover:text-primary transition-all">Documentário</button>
              </div>
            </div>
            
            {/* Bento Grid Layout for Catalog */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
              {series.length > 0 ? (
                series.map((serie: any) => (
                  <Link key={serie.id} href={`/series/${serie.id}`} className="relative group cursor-pointer w-40 md:w-48 rounded-2xl overflow-hidden border border-outline-variant/20 bg-surface-container-high transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:border-primary/50 aspect-[2/3]">
                    <div className="absolute inset-0 overflow-hidden rounded-2xl">
                      <img alt={serie.nome} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={serie.link_imagem || 'https://wallpaperaccess.com/full/3215377.jpg'} />
                    </div>
                    
                    {/* Overlay gradients - Optimized for subtle blend and full coverage */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent opacity-100 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none"></div>
                    
                    {/* Info Content */}
                    <div className="absolute inset-0 p-5 flex flex-col justify-end transition-all duration-300 group-hover:translate-y-[-8px]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-primary/20 backdrop-blur-md text-primary font-label-sm text-[10px] px-2 py-0.5 rounded-full border border-primary/30">
                          {serie.genero || 'Série'}
                        </span>
                        <span className="text-on-surface-variant font-label-sm text-[10px]">
                          {serie.data_lancamento ? new Date(serie.data_lancamento).getFullYear() : 'N/A'}
                        </span>
                      </div>
                      
                      <h4 className="font-headline-sm text-headline-sm text-on-background mb-1 transition-colors duration-300 group-hover:text-primary leading-tight">
                        {serie.nome}
                      </h4>
                      
                      <p className="font-body-md text-[10px] text-on-surface-variant line-clamp-2 transition-all duration-300">
                        {serie.sinopse || 'Clique para saber mais sobre esta série.'}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="col-span-full text-center text-on-surface-variant py-10">Nenhuma série encontrada no catálogo.</p>
              )}
            </div>
          </section>
        </div>
        
        <Footer />
      </main>
    </div>
  );
}