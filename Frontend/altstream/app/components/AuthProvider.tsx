'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Hub } from 'aws-amplify/utils';
import { configureAuth, getSessionUser, type CognitoUser } from '@/services/auth';

type AuthState = {
  user: CognitoUser | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthState | null>(null);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    let revision = 0;

    const refresh = async () => {
      const current = ++revision;
      try {
        const user = await getSessionUser();
        if (active && current === revision) setState({ user, loading: false, error: null });
      } catch {
        if (active && current === revision) {
          setState({ user: null, loading: false, error: 'Não foi possível recuperar sua sessão. Tente entrar novamente.' });
        }
      }
    };

    const clearSession = (error: string | null) => {
      revision++;
      if (active) setState({ user: null, loading: false, error });
    };

    const stopListening = Hub.listen('auth', async ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
        case 'signInWithRedirect':
          void refresh();
          break;
        case 'signedOut':
          clearSession(null);
          break;
        case 'tokenRefresh_failure':
          clearSession('Sua sessão expirou. Entre novamente.');
          break;
        case 'signInWithRedirect_failure': {
          const current = ++revision;
          try {
            const user = await getSessionUser();
            if (user && active && current === revision) {
              setState({ user, loading: false, error: null });
              break;
            }
          } catch {
          }
          clearSession('Não foi possível concluir o login com Google. Tente novamente.');
          break;
        }
      }
    });

    try {
      configureAuth();

      const hasOAuthCode = typeof window !== 'undefined' && window.location.search.includes('code=');
      if (!hasOAuthCode) {
        void refresh();
      }
    } catch (error) {
      clearSession(error instanceof Error ? error.message : 'Não foi possível configurar o login.');
    }

    return () => {
      active = false;
      revision++;
      stopListening();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}