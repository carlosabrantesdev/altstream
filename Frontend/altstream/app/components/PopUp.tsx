'use client';

import React, { useEffect, useState } from 'react';

interface PopUpProps {
  message: string | null;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
}

export default function PopUp({ message, onClose, type = 'info' }: PopUpProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!message) return;

    // Pequeno delay para garantir que a animação de entrada funcione
    const enterTimer = setTimeout(() => setIsAnimating(true), 10);

    // Inicia o processo de saída após 3 segundos
    const leaveTimer = setTimeout(() => {
      setIsAnimating(false);
      
      // Aguarda 300ms (tempo da animação) para chamar o onClose
      setTimeout(() => {
        onClose();
      }, 300);
    }, 3000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(leaveTimer);
    };
  }, [message, onClose]);

  if (!message && !isAnimating) return null;

  return (
    <div className="fixed top-5 inset-x-0 z-[100] flex justify-center pointer-events-none px-4">
      
      <div 
        className={`
          max-w-sm px-6 py-3 rounded-full
          bg-surface-container text-on-surface shadow-2xl 
          backdrop-blur-md bg-opacity-95
          transition-all duration-300 ease-out transform
          ${isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-6'}
        `}
      >
        <p className="font-body-md text-sm md:text-base font-medium text-center leading-relaxed m-0">
          {message}
        </p>
      </div>
      
    </div>
  );
}