'use client';

import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import { firebaseAuth } from '@/services/firebase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      const user = await firebaseAuth.signInWithGoogle();
      if (user) {
        console.log('Login bem sucedido:', user.displayName);
        // Aqui você pode redirecionar o usuário ou salvar o token no backend
        router.push('/');
      }
    } catch (error) {
      alert('Erro ao realizar autenticação com Google. Tente novamente.');
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
              className="flex items-center justify-center gap-3 w-full bg-surface hover:bg-surface-variant text-on-surface font-label-sm py-3 px-4 rounded-xl border border-outline-variant/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                className="w-5 h-5" 
              />
              Entrar com Google
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <input 
                type="checkbox" 
                id="terms" 
                className="mt-1 w-4 h-4 accent-primary cursor-pointer" 
                required 
              />
              <label htmlFor="terms" className="text-xs text-on-surface-variant leading-relaxed cursor-pointer">
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
