'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import SearchBar from './SearchBar';
import { logout } from '@/services/auth';
import { useAuth } from './AuthProvider';
import Avatar from './Avatar';
import { useProfile } from './ProfileProvider';

export default function Header() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setSigningOut(true);
    setLogoutError(null);
    try {
      await logout();
      setMenuOpen(false);
    } catch {
      setLogoutError('Não foi possível sair. Tente novamente.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-margin-mobile md:px-container-margin py-4 bg-transparent">
      <div className="flex items-center gap-stack-lg">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-display-hero text-headline-md text-on-background tracking-tighter">AltStream</span>
        </Link>
      </div>
      <div className="flex items-center gap-gutter">
        {/* Search Bar */}
        <SearchBar />
        {/* User Profile / Login */}
        {user ? (
          <div className="relative flex items-center gap-3">
            <Link
              href="/profile"
              aria-label="Abrir meu perfil"
              className="group flex items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <span className="hidden max-w-32 truncate text-sm text-on-surface group-hover:text-primary md:block">{(profile?.nome || user.displayName).split(' ')[0]}</span>
              <Avatar name={profile?.nome || user.displayName} src={profile ? profile.foto : user.photoURL} className="h-10 w-10 border border-outline-variant/30 group-hover:border-primary" />
            </Link>
            <div
              ref={menuRef}
              className="relative"
              onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMenuOpen(false);
              }}
            >
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMenuOpen(open => !open)}
                aria-label={menuOpen ? 'Fechar opções da conta' : 'Abrir opções da conta'}
                aria-expanded={menuOpen}
                aria-controls={menuId}
                className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 transition-transform motion-reduce:transition-none ${menuOpen ? 'rotate-180' : ''}`}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {menuOpen && (
                <div id={menuId} className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={signingOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-on-surface hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">logout</span>
                    {signingOut ? 'Saindo...' : 'Sair da conta'}
                  </button>
                  {logoutError && <p role="alert" className="px-3 py-2 text-sm text-error">{logoutError}</p>}
                </div>
              )}
            </div>
          </div>
        ) : !loading ? (
          <Link 
            href="/login" 
            className="bg-primary hover:bg-primary-fixed text-on-primary font-label-sm text-label-sm px-5 py-2 rounded-full transition-all duration-300 hover:scale-105 shadow-lg"
          >
            Fazer Login
          </Link>
        ) : null}
      </div>
    </header>
  );
}
