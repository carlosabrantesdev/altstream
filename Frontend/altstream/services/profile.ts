export type StoredProfile = {
  nome: string;
  email: string;
  foto: string;
};

export type ProfileUpdate = {
  nome: string;
  email: string;
  foto?: string;
};

export type ProfileDraft = { nome: string; email: string; arquivo: File | null };
export type DisplayProfile = { nome: string; email: string; foto: string | null };

const PROFILE_API_URL = process.env.NEXT_PUBLIC_PROFILE_API_URL?.trim()
  || 'https://go9l700cm8.execute-api.us-east-1.amazonaws.com/profile';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getProfilePhotoUrl(foto: string | null | undefined): string | null {
  if (!foto) return null;
  try {
    const url = new URL(foto);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* Uma chave S3 não é uma URL pública de imagem. */ }
  return null;
}

export function parseProfile(value: unknown): StoredProfile {
  if (!isRecord(value) || typeof value.nome !== 'string' || typeof value.email !== 'string' || (typeof value.foto !== 'string' && value.foto !== null)) {
    throw new Error('Não foi possível ler nome, e-mail e foto do perfil. Tente novamente.');
  }
  // Aceita também a fotoUrl retornada pela versão anterior da Lambda.
  const signedPhoto = typeof value.fotoUrl === 'string' ? getProfilePhotoUrl(value.fotoUrl) : null;
  return { nome: value.nome, email: value.email, foto: signedPhoto || value.foto || '' };
}

export function createProfilePayload(update: ProfileUpdate) {
  const payload: { nome: string; email: string; imagem?: string; tipoImagem?: string } = {
    nome: update.nome,
    email: update.email,
  };
  if (update.foto !== undefined) {
    const prefix = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(update.foto);
    if (!prefix || update.foto.length === prefix[0].length) {
      throw new Error('Escolha uma foto JPG, PNG ou WebP válida.');
    }
    // A Lambda recebe os bytes em "imagem" e grava a chave S3 em "foto".
    // Envie a imagem uma única vez para não duplicar o tamanho da requisição.
    payload.imagem = update.foto.slice(prefix[0].length);
    payload.tipoImagem = prefix[1];
  }
  return payload;
}

async function requestProfile(token: string, method: 'GET' | 'PUT', signal?: AbortSignal, update?: ProfileUpdate) {
  if (!token) throw new Error('Entre novamente para acessar seu perfil.');
  const body = update ? JSON.stringify(createProfilePayload(update)) : undefined;
  let response: Response;
  try {
    response = await fetch(PROFILE_API_URL, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(update ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
      cache: 'no-store',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
        : AbortSignal.timeout(30_000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error('O serviço de perfil demorou para responder. Tente novamente.');
    }
    throw new Error('Não foi possível conectar ao perfil. Confira sua conexão e tente novamente.');
  }
  const data: unknown = await response.json().catch(() => null);
  // Só esse erro da Lambda representa um usuário novo. Um 404 de rota é uma falha.
  if (method === 'GET' && response.status === 404 && isRecord(data) && data.erro === 'Perfil nao cadastrado') return null;
  if (response.status === 401) throw new Error('Sua sessão expirou. Entre novamente para acessar seu perfil.');
  if (response.status === 403) throw new Error('Seu acesso ao perfil foi recusado. Entre novamente e tente outra vez.');
  if (response.status === 405) throw new Error(`A API ainda não permite ${method} no perfil. A integração precisa ser atualizada.`);
  if (!response.ok) {
    const message = isRecord(data) && typeof data.erro === 'string' ? data.erro : 'Não foi possível acessar seu perfil. Tente novamente.';
    throw new Error(message);
  }
  return parseProfile(isRecord(data) && isRecord(data.perfil) ? data.perfil : data);
}

export const profileApi = {
  get: (token: string, signal?: AbortSignal) => requestProfile(token, 'GET', signal),
  async update(token: string, update: ProfileUpdate, signal?: AbortSignal): Promise<StoredProfile> {
    const profile = await requestProfile(token, 'PUT', signal, update);
    if (!profile) throw new Error('Não foi possível confirmar a atualização do perfil.');
    return profile;
  },
};
