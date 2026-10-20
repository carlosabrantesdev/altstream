'use client';

import React from 'react';
import Link from 'next/link';
import SearchBar from './SearchBar';
import { logout } from '@/services/auth';
import { useAuth } from './AuthProvider';

export default function Header() {
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-margin py-4 bg-transparent">
      <div className="flex items-center gap-stack-lg">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-display-hero text-headline-md text-on-background tracking-tighter">AltStream</span>
        </Link>
      </div>
      <div className="flex items-center gap-gutter">
        {/* Search Bar */}
        <SearchBar />
        {/* Actions */}
        <div className="flex items-center gap-stack-sm text-on-surface-variant">
        </div>
        {/* User Profile / Login */}
        {user ? (
          <div className="flex items-center gap-3 cursor-pointer group relative">
            <div className="hidden md:flex flex-col items-end">
              <span className="font-label-sm text-label-sm text-on-surface group-hover:text-primary transition-colors">{user.displayName?.split(' ')[0]}</span>
            </div>
            <div 
              onClick={handleLogout}
              className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/30 group-hover:border-primary transition-colors shadow-[0_0_15px_rgba(208,188,255,0.1)] group-hover:shadow-[0_0_20px_rgba(208,188,255,0.4)]"
              title="Clique para sair"
            >
              <img 
                alt="User Profile Avatar" 
                className="w-full h-full object-cover" 
                src={user.photoURL || "https://i.ibb.co/ZnRWYK5/profile.png"} 
                referrerPolicy="no-referrer"
              />
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
