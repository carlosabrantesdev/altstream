import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

export const streamApi = {
  async checkAdmin(token: string): Promise<{ isAdmin: boolean }> {
    try {
      const response = await api.get('/core/check-admin/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao checar admin:', error);
      return { isAdmin: false };
    }
  },

  async getSeries() {
    const response = await api.get('/core/series/');
    return response.data;
  },

  async getSerieById(serieId: number) {
    const response = await api.get(`/core/series/${serieId}/`);
    return response.data;
  },

  async getEpisodiosBySerie(serieId: number) {
    const response = await api.get(`/core/series/${serieId}/episodios/`);
    return response.data;
  },

  async getEpisodioById(episodioId: number) {
    const response = await api.get(`/core/episodios/${episodioId}/`);
    return response.data;
  },

  async saveVideoProgress(episodioId: number, tempo: number, token: string) {
    const response = await api.post('/core/continuar/', { episodio_id: episodioId, tempo }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getContinueWatching(token: string) {
    const response = await api.get('/core/continuar/', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getNewReleases() {
    const response = await api.get('/core/novos-episodios/');
    return response.data;
  },

  async searchSeries(query: string) {
    const response = await api.get(`/core/pesquisar/?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  async toggleLike(episodioId: number, like: boolean, token: string) {
    const response = await api.post(`/core/episodios/${episodioId}/like/`, { like }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

async createSerie(data: any, token: string) {
  const response = await api.post('/core/series/', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
},

async deleteSerie(id: number, token: string) {
  const response = await api.delete(`/core/series/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
},

async createEpisodio(serieId: number, data: any, token: string) {
  const response = await api.post(`/core/series/${serieId}/episodios/create/`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
},

  async chatAI(message: string, history: any[]) {
    const response = await api.post('/core/ai/chat/', { message, history });
    return response.data;
  },

  async getMinhaLista(token: string) {
    const response = await api.get('/core/lista/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async toggleMinhaLista(serieId: number, token: string) {
    const response = await api.post('/core/lista/', { serie_id: serieId }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }
};

export default api;