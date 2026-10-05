'use client';

import React, { useState, useEffect, useRef } from 'react';
import { streamApi } from '@/services/api';
import Link from 'next/link';

interface Serie {
  id: string | number;
  nome: string;
  banner?: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Serie[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 0) {
        try {
          const data = await streamApi.searchSeries(query);
          setResults(data);
          setIsOpen(true);
        } catch (error) {
          console.error('Search error:', error);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div ref={searchRef} className="relative group hidden sm:block">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors z-10">search</span>
      <input 
        className="bg-surface-container/50 border border-outline-variant/30 rounded-full py-2 pl-10 pr-4 w-64 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:bg-surface-container/80 focus:ring-1 focus:ring-primary transition-all duration-300 font-body-md text-body-md backdrop-blur-md" 
        placeholder="Pesquisar títulos" 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length > 0 && setIsOpen(true)}
      />
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container shadow-xl rounded-2xl border border-outline-variant/30 overflow-hidden z-50 max-h-80 overflow-y-auto backdrop-blur-lg bg-opacity-90">
          {results.length > 0 ? (
            results.map((serie) => (
              <Link 
                key={serie.id} 
                href={`/series/${serie.id}`}
                className="flex items-center gap-3 p-3 hover:bg-surface-container-high transition-colors cursor-pointer border-b border-outline-variant/10 last:border-none"
                onClick={() => setIsOpen(false)}
              >
                {serie.banner && (
                  <img src={serie.banner} alt={serie.nome} className="w-10 h-10 object-cover rounded-md" />
                )}
                <span className="text-on-surface font-body-md truncate">{serie.nome}</span>
              </Link>
            ))
          ) : (
            <div className="p-4 text-center text-on-surface-variant font-body-md">
              Nenhum título foi encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
