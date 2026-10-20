'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';

export default function AuthCallbackPage() {
  const { user, loading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [user, loading, router]);

  return (
    <main className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl">Entrando no AltStream</h1>
      {loading || user ? (
        <p role="status">Concluindo seu login com Google...</p>
      ) : (
        <>
          <p role="alert">{error || 'Não foi possível concluir o login. Inicie o acesso novamente.'}</p>
          <Link href="/login" className="text-primary underline">Voltar para o login</Link>
        </>
      )}
    </main>
  );
}
