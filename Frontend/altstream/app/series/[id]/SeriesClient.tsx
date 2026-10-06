'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { streamApi } from '@/services/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/services/firebase';
import { useRouter } from "next/navigation";

export default function SeriePage() {
  const router = useRouter();
  const params = useParams();
  const serieId = params.id;

  const [serie, setSerie] = useState<any>(null);
  const [episodios, setEpisodios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [isInList, setIsInList] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        if (serieId) {
          const [serieData, episodiosData] = await Promise.all([
            streamApi.getSerieById(Number(serieId)),
            streamApi.getEpisodiosBySerie(Number(serieId))
          ]);
          setSerie(serieData);
          setEpisodios(episodiosData);
          
          try {
            const user = auth.currentUser;
            if (user) {
              const token = await user.getIdToken();
              const lista = await streamApi.getMinhaLista(token);
              setIsInList(lista.some((item: any) => item.serie_id === Number(serieId)));
            }
          } catch (e) {
            console.error('Error checking list:', e);
          }
          
          const hasSeason1 = episodiosData.some((ep: any) => ep.temporada_numero === 1);
          if (hasSeason1) {
            setSelectedSeason(1);
          }
        }
      } catch (error) {
        console.error('Error fetching series data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [serieId]);

  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!serie) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <h1 className="text-2xl">Série não encontrada</h1>
      </div>
    );
  }

  const handleToggleList = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }
  
      const token = await user.getIdToken();
      const result = await streamApi.toggleMinhaLista(Number(serieId), token);
      setIsInList(!isInList);
    } catch (error) {
      console.error('Error toggling list:', error);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md text-body-md min-h-screen overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
      <Header />
      
      <main className="min-h-screen w-full relative pb-stack-lg">
        
        <section className="relative w-full h-[70vh] min-h-[500px] flex items-end pb-container-margin px-container-margin-mobile md:px-container-margin overflow-hidden mb-12">
          <div 
            className="absolute inset-0 bg-cover bg-center" 
            style={{ backgroundImage: `url('${serie.banner || serie.link_banner || serie.link_imagem || 'https://assets.startbootstrap.com/img/screenshots/templates/the-big-picture.png'}')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent"></div>
          
          <div className="relative z-10 max-w-4xl flex flex-col gap-stack-md">
            <div className="flex items-center gap-4">
              <span className="bg-primary text-on-primary font-label-sm text-label-sm px-3 py-1 rounded-full uppercase tracking-wider">
                {serie.genero}
              </span>
            </div>
            <h1 className="font-display-hero text-headline-lg-mobile md:text-display-hero text-on-background drop-shadow-2xl">
              {serie.nome}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl line-clamp-3 drop-shadow-md">
              {serie.sinopse}
            </p>
            <div className="flex items-center gap-4 mt-2">
              {episodios.length > 0 ? (
                <Link 
                  href={`/assistir/${episodios[0].id}`} 
                  className="bg-primary hover:bg-primary-fixed text-on-primary font-label-sm text-label-sm py-3 px-8 rounded-full flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(208,188,255,0.5)]"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  Assistir Primeiro Episódio
                </Link>
              ) : (
                <button disabled className="bg-surface/20 text-on-surface-variant font-label-sm text-label-sm py-3 px-8 rounded-full flex items-center gap-2 cursor-not-allowed">
                  <span className="material-symbols-outlined">play_arrow</span>
                  Nenhum Episódio Disponível
                </button>
              )}
              <button 
                onClick={handleToggleList}
                className={`bg-surface/10 backdrop-blur-md border ${isInList ? 'border-primary bg-primary/20' : 'border-on-surface/20 hover:border-primary/50 hover:bg-surface/30'} text-on-surface font-label-sm text-label-sm p-3 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 ${isInList ? 'text-primary' : ''}`}
              >
                <span className="material-symbols-outlined">{isInList ? 'check' : 'add'}</span>
              </button>
            </div>
          </div>
        </section>

        <div className="px-container-margin-mobile md:px-container-margin">
          <section className="flex flex-col gap-stack-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="font-headline-md text-headline-md text-on-background">Episódios</h2>
                
                {episodios.length > 0 && (
                  <select 
                    value={selectedSeason ?? ''} 
                    onChange={(e) => setSelectedSeason(e.target.value === '' ? null : Number(e.target.value))}
                    className="bg-surface-container border border-outline-variant/30 text-on-surface font-label-sm text-label-sm px-3 py-1 rounded-full focus:outline-none focus:border-primary transition-colors cursor-pointer appearance-none pr-8"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1em'
                    }}
                  >
                    {[...new Set(episodios.map(ep => ep.temporada_numero))].sort((a, b) => a - b).map(season => (
                      <option key={season} value={season}>
                        Temporada {season}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <span className="text-on-surface-variant font-label-sm text-label-sm">
                {selectedSeason !== null 
                  ? `${episodios.filter(ep => ep.temporada_numero === selectedSeason).length} Episódios` 
                  : `${episodios.length} Episódios`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {(selectedSeason === null ? episodios : episodios.filter(ep => ep.temporada_numero === selectedSeason)).length > 0 ? (
                (selectedSeason === null ? episodios : episodios.filter(ep => ep.temporada_numero === selectedSeason)).map((ep: any) => (
                  <Link 
                    key={ep.id} 
                    href={`/assistir/${ep.id}`} 
                    className="flex flex-col gap-3 p-3 rounded-2xl bg-surface-container border border-outline-variant/20 hover:border-primary/50 hover:bg-surface-variant/50 transition-all group cursor-pointer"
                  >
                    <div className="aspect-video rounded-xl overflow-hidden relative border border-outline-variant/20 bg-surface-container-high">
                      <img 
                        src={ep.link_imagem || 'https://assets.startbootstrap.com/img/screenshots/templates/the-big-picture.png'} 
                        alt={ep.nome} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      />
                      <div className="absolute inset-0 bg-surface-container/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-4xl">play_arrow</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-label-sm text-[10px] text-primary uppercase">T{ep.temporada_numero} • E{ep.numero}</span>
                      </div>
                      <h4 className="font-headline-sm text-headline-sm text-on-background truncate group-hover:text-primary transition-colors">
                        {ep.nome}
                      </h4>
                      <p className="font-body-md text-[12px] text-on-surface-variant line-clamp-2 mt-1">
                        {ep.descricao || "Clique para assistir a este episódio."}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-20 bg-surface-container rounded-3xl border border-dashed border-outline-variant/30">
                  <p className="text-on-surface-variant font-body-md">Nenhum episódio disponível para esta série.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}