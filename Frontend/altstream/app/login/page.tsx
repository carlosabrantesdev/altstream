'use client';

import React, { useEffect, useState, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import { signInWithGoogle, configureAuth, getSessionUser } from '@/services/auth';
import { useAuth } from '../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Hub } from 'aws-amplify/utils';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, error: sessionError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledCodeRef = useRef(false);

  useEffect(() => {
    configureAuth();

    // 1. Limpa o "code" da URL imediatamente no primeiro render para evitar re-disparos do React StrictMode
    if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
      if (!handledCodeRef.current) {
        handledCodeRef.current = true;
        // Salva uma cópia da URL sem a query string para não re-executar a troca do código
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // 2. Escuta os eventos de autenticação do Amplify
    const unsubscribe = Hub.listen('auth', async ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signInWithRedirect') {
        router.replace('/');
      } else if (payload.event === 'signInWithRedirect_failure') {
        // Se deu erro (ex: invalid_grant da 2ª chamada), verifica se os tokens já foram salvos na 1ª chamada
        const activeUser = await getSessionUser();
        if (activeUser) {
          router.replace('/');
        } else {
          console.error('Falha real na autenticação:', payload.data);
          setError('Falha no login com o Google. Tente novamente.');
          setIsSigningIn(false);
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar com Google. Tente novamente.');
      setIsSigningIn(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md flex flex-col">
          <Header />
          
      <main className="flex-1 flex items-center justify-center px-container-margin-mobile md:px-container-margin py-10">
        <div className="w-full max-w-md bg-surface-container p-8 rounded-3xl border border-outline-variant/20 shadow-2xl flex flex-col gap-8">
          
          <div className="flex flex-col gap-2 text-center">
            <h1 className="font-display-hero text-headline-lg text-on-background">Bem-vindo ao AltStream</h1>
            <p className="text-on-surface-variant font-body-md text-sm">
              Acesse sua conta para continuar assistindo seus títulos favoritos.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading || isSigningIn}
              className="flex items-center justify-center gap-3 w-full bg-surface hover:bg-surface-variant text-on-surface font-label-sm py-3 px-4 rounded-xl border border-outline-variant/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img 
                src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png"
                alt="Google" 
                className="w-5 h-5" 
              />
              {isSigningIn ? 'Redirecionando para o Google...' : 'Entrar com Google'}
            </button>
            {(error || sessionError) && <p role="alert" className="text-error text-sm">{error || sessionError}</p>}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <input 
                type="checkbox" 
                id="terms" 
                className="mt-1 w-4 h-4 accent-primary cursor-pointer" 
                required 
              />
              <label htmlFor="terms" className="font-label-sm text-xs text-on-surface-variant leading-relaxed cursor-pointer">
                Ao entrar ou se cadastrar, eu concordo com os <Link href="/termos" className="text-primary hover:underline">Termos de Uso</Link> e a <Link href="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link> do AltStream.
              </label>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}