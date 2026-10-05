'use client';

import { useState, useEffect } from 'react';
import { streamApi } from '@/services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { auth } from '@/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [series, setSeries] = useState<any[]>([]);
  const [selectedSerieId, setSelectedSerieId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form States - Series
  const [serieForm, setSerieForm] = useState({
    nome: '',
    generos: '',
    sinopse: '',
    data_lancamento: '',
    link_imagem: '',
    banner: '',
    destaque_landing_page: false,
  });

  // Form States - Episode
  const [episodioForm, setEpisodioForm] = useState({
    nome: '',
    descricao: '',
    link_imagem: '',
    link_midia: '',
    temporada_numero: 1,
    numero: 1,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult(true);
          
          if (tokenResult.claims.admin) {
            setIsAdmin(true);
            fetchSeries();
          } else {
            console.log("Usuário não é admin:", tokenResult.claims);
            router.push('/login');
          }
        } catch (error) {
          console.error('Erro ao decodificar token:', error);
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  async function fetchSeries() {
    try {
      const data = await streamApi.getSeries();
      setSeries(data);
    } catch (error) {
      console.error('Error fetching series:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddSerie = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Usuário não autenticado');
      
      await streamApi.createSerie(serieForm, token);
      alert('Série adicionada com sucesso!');
      setSerieForm({ nome: '', generos: '', sinopse: '', data_lancamento: '', link_imagem: '', banner: '', destaque_landing_page: false });
      fetchSeries();
    } catch (error) {
      alert('Erro ao adicionar série');
    }
  };

  const handleDeleteSerie = async (id: number) => {
    if (confirm('Tem certeza que deseja deletar esta série e todos os seus episódios?')) {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Usuário não autenticado');

        await streamApi.deleteSerie(id, token);
        alert('Série deletada!');
        fetchSeries();
      } catch (error) {
        alert('Erro ao deletar série');
      }
    }
  };

  const handleAddEpisodio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSerieId) return alert('Selecione uma série primeiro!');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Usuário não autenticado');

      await streamApi.createEpisodio(Number(selectedSerieId), episodioForm, token);
      alert('Episódio adicionado com sucesso!');
      setEpisodioForm({ nome: '', descricao: '', link_imagem: '', link_midia: '', temporada_numero: 1, numero: 1 });
    } catch (error) {
      alert('Erro ao adicionar episódio');
    }
  };

  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      <Header />
      
      <main className="px-container-margin-mobile md:px-container-margin py-10 flex flex-col gap-10">
        <h1 className="font-display-hero text-headline-lg text-on-background">Painel Administrativo</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* SECTION: ADD SERIES */}
          <section className="bg-surface-container p-6 rounded-2xl border border-outline-variant/20 shadow-xl">
            <h2 className="font-headline-md text-headline-md mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">add_circle</span>
              Adicionar Nova Série
            </h2>
            <form onSubmit={handleAddSerie} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">Nome da Série</label>
                  <input 
                    className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all"
                    value={serieForm.nome}
                    onChange={e => setSerieForm({...serieForm, nome: e.target.value})}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">Gênero</label>
                  <input 
                    className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all"
                    value={serieForm.generos}
                    onChange={e => setSerieForm({...serieForm, generos: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant">Sinopse</label>
                <textarea 
                  className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all h-24 resize-none"
                  value={serieForm.sinopse}
                  onChange={e => setSerieForm({...serieForm, sinopse: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">Data de Lançamento</label>
                  <input 
                    type="date"
                    className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all"
                    value={serieForm.data_lancamento}
                    onChange={e => setSerieForm({...serieForm, data_lancamento: e.target.value})}
                    required
                  />
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <input 
                    type="checkbox" 
                    id="destaque"
                    className="w-5 h-5 accent-primary"
                    checked={serieForm.destaque_landing_page}
                    onChange={e => setSerieForm({...serieForm, destaque_landing_page: e.target.checked})}
                  />
                  <label htmlFor="destaque" className="text-label-sm cursor-pointer">Exibir no Destaque da Home</label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">Link da Capa</label>
                  <input 
                    className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all"
                    value={serieForm.link_imagem}
                    onChange={e => setSerieForm({...serieForm, link_imagem: e.target.value})}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">Link do Banner</label>
                  <input 
                    className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all"
                    value={serieForm.banner}
                    onChange={e => setSerieForm({...serieForm, banner: e.target.value})}
                    required
                  />
                </div>
              </div>

              <button className="bg-primary hover:bg-primary-fixed text-on-primary font-label-sm py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] shadow-lg">
                Cadastrar Série
              </button>
            </form>
          </section>

          {/* SECTION: ADD EPISODES */}
          <section className="bg-surface-container p-6 rounded-2xl border border-outline-variant/20 shadow-xl">
            <h2 className="font-headline-md text-headline-md mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">movie</span>
              Adicionar Episódio
            </h2>
            <form onSubmit={handleAddEpisodio} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant">Selecionar Série</label>
                <select 
                  className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all"
                  value={selectedSerieId}
                  onChange={e => setSelectedSerieId(e.target.value)}
                  required
                >
                  <option value="">-- Escolha a Série --</option>
                  {series.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant">Nome do Episódio</label>
                <input 
                  className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all"
                  value={episodioForm.nome}
                  onChange={e => setEpisodioForm({...episodioForm, nome: e.target.value})}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant">Descrição</label>
                <textarea 
                  className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all h-20 resize-none"
                  value={episodioForm.descricao}
                  onChange={e => setEpisodioForm({...episodioForm, descricao: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">Link da Imagem</label>
                  <input 
                    className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all"
                    value={episodioForm.link_imagem}
                    onChange={e => setEpisodioForm({...episodioForm, link_imagem: e.target.value})}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">Link do Vídeo (Mídia)</label>
                  <input 
                    className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all"
                    value={episodioForm.link_midia}
                    onChange={e => setEpisodioForm({...episodioForm, link_midia: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant">Temporada Número</label>
                <input 
                  type="number"
                  className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all"
                  value={episodioForm.temporada_numero}
                  onChange={e => setEpisodioForm({...episodioForm, temporada_numero: Number(e.target.value)})}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant">Episódio Número</label>
                <input 
                  type="number"
                  className="bg-surface border border-outline-variant/30 p-3 rounded-lg text-on-background outline-none focus:border-primary transition-all"
                  value={episodioForm.numero}
                  onChange={e => setEpisodioForm({...episodioForm, numero: Number(e.target.value)})}
                  required
                />
              </div>

              <button className="bg-primary hover:bg-primary-fixed text-on-primary font-label-sm py-3 rounded-lg transition-all duration-300 hover:scale-[1.02] shadow-lg">
                Cadastrar Episódio
              </button>
            </form>
          </section>
        </div>
   
        {/* SECTION: MANAGEMENT TABLE */}
        <section className="bg-surface-container p-6 rounded-2xl border border-outline-variant/20 shadow-xl overflow-x-auto">
          <h2 className="font-headline-md text-headline-md mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">list</span>
            Gerenciar Séries
          </h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3 px-4">Série</th>
                <th className="py-3 px-4">Gênero</th>
                <th className="py-3 px-4">Destaque</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-on-surface">
              {series.length > 0 ? (
                series.map((s: any) => (
                  <tr key={s.id} className="border-b border-outline-variant/10 hover:bg-surface/30 transition-colors">
                    <td className="py-4 px-4 flex items-center gap-3">
                      <img src={s.link_imagem} className="w-10 h-10 rounded object-cover border border-outline-variant/30" alt={s.nome} />
                      <span className="font-body-md">{s.nome}</span>
                    </td>
                    <td className="py-4 px-4 text-on-surface-variant font-body-sm">
                      {Array.isArray(s.generos) ? s.generos.map((g: any) => g.nome).join(', ') : s.genero}
                    </td>
                    <td className="py-4 px-4">
                      {s.destaque_landing_page ? (
                        <span className="text-primary text-xs font-bold uppercase">Sim</span>
                      ) : (
                        <span className="text-on-surface-variant text-xs uppercase">Não</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={() => handleDeleteSerie(s.id)}
                        className="text-error hover:text-error-fixed transition-colors p-2 rounded-full hover:bg-error/10"
                        title="Deletar Série"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-on-surface-variant">Nenhuma série cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
      <Footer />
    </div>
  );
}