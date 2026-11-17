'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getIdToken } from '@/services/auth';
import { getProfilePhotoUrl, profileApi, type DisplayProfile, type ProfileDraft, type StoredProfile } from '@/services/profile';
import { encodeProfileImage } from '@/services/profile-image';
import { useAuth } from './AuthProvider';

type ProfileContextValue = {
  profile: DisplayProfile | null;
  loading: boolean;
  error: string | null;
  photoUnavailable: boolean;
  reload: () => void;
  save: (draft: ProfileDraft) => Promise<StoredProfile>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

// Uma troca de conta desmonta todo o estado e cancela as requisições anteriores.
function AccountProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [stored, setStored] = useState<StoredProfile | null>(null);
  const [loading, setLoading] = useState(!!user);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const userId = user?.id;

  const reload = useCallback(() => {
    if (!userId || saving.current) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const current = ++revision.current;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const token = await getIdToken();
        if (controller.signal.aborted) return;
        const profile = await profileApi.get(token, controller.signal);
        if (!controller.signal.aborted && current === revision.current) setStored(profile);
      } catch (error) {
        if (!controller.signal.aborted && current === revision.current) {
          setError(error instanceof Error ? error.message : 'Não foi possível carregar seu perfil.');
        }
      } finally {
        if (!controller.signal.aborted && current === revision.current) setLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    reload();
    return () => {
      revision.current++;
      requestRef.current?.abort();
    };
  }, [reload]);

  const save = async (draft: ProfileDraft) => {
    if (!userId) throw new Error('Entre novamente para editar seu perfil.');
    if (saving.current) throw new Error('Aguarde a atualização em andamento.');
    if (!draft.nome.trim() || draft.nome.trim().length > 150) {
      throw new Error('Informe um nome com até 150 caracteres.');
    }
    const email = draft.email.trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Informe um e-mail válido.');
    }
    saving.current = true;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const current = ++revision.current;
    try {
      const token = await getIdToken();
      const foto = draft.arquivo ? await encodeProfileImage(draft.arquivo) : undefined;
      controller.signal.throwIfAborted();
      const payload = { nome: draft.nome.trim(), email, ...(foto ? { foto } : {}) };
      const profile = await profileApi.update(token, payload, controller.signal);
      controller.signal.throwIfAborted();
      if (current === revision.current) { setStored(profile); setError(null); }
      if (profile.email !== email) {
        throw new Error('O servidor não confirmou o novo e-mail. Seus outros dados podem ter sido salvos. Recarregue o perfil.');
      }
      // A Lambda pode substituir o arquivo mantendo a mesma chave no S3.
      if (draft.arquivo && !profile.foto) {
        throw new Error('O servidor não confirmou a nova foto. Seus outros dados podem ter sido salvos. Recarregue o perfil.');
      }
      return profile;
    } finally {
      saving.current = false;
    }
  };

  const profile: DisplayProfile | null = user ? {
    nome: stored?.nome || user.displayName,
    email: stored?.email || user.email || '',
    // Se existe foto personalizada, não mostramos a foto antiga do Google como se fosse a nova.
    foto: stored?.foto ? getProfilePhotoUrl(stored.foto) : user.photoURL,
  } : null;

  return (
    <ProfileContext.Provider value={{ profile, loading, error, photoUnavailable: !!stored?.foto && !getProfilePhotoUrl(stored.foto), reload, save }}>
      {children}
    </ProfileContext.Provider>
  );
}

export default function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <AccountProfileProvider key={user?.id || 'guest'}>{children}</AccountProfileProvider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile deve ser usado dentro de ProfileProvider.');
  return context;
}
