'use client';

import React, { useState, useRef, useEffect } from 'react';
import { streamApi } from '@/services/api';

type Message = {

  role: 'ai' | 'user';
  content: string;
};

export default function AIPopUp() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Olá! Eu sou o assistente do AltStream. Como posso ajudar você a encontrar a série perfeita hoje?' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const data = await streamApi.chatAI(userMessage, messages.slice(1));

      if (data && data.reply) {
        setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
      } else {
        throw new Error('Resposta inválida da API');
      }
    } catch (error) {

      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Desculpe, tive um problema técnico de comunicação. Tente novamente em instantes.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante (Trigger) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 text-on-primary rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-50 group overflow-hidden"
      >
        <img src="/AIpopup.png" alt="AI Assistant" className="w-full h-full object-cover transition-transform duration-300" />
        <span className="absolute right-16 bg-surface-container text-on-surface text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-outline-variant/30">
          Pergunte à IA
        </span>
      </button>

      {/* Chat Flutuante */}
      <div className={`fixed bottom-24 right-6 w-[350px] max-w-[calc(100vw-48px)] bg-surface-container shadow-2xl transition-all duration-300 ease-in-out z-[60] flex flex-col rounded-2xl overflow-hidden ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10 pointer-events-none'}`}>
        
        {/* Header do Chat */}
        <div className="p-4 bg-surface flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h3 className="font-headline-md text-headline-sm text-on-background leading-tight">AltStream AI</h3>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Mensagens */}
        <div 
          ref={scrollRef}
          className="h-[400px] overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar"
        >
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-on-primary rounded-tr-none' 
                  : 'bg-surface text-on-surface rounded-tl-none border border-outline-variant/30'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {/* Indicador de Digitação */}
          {isLoading && (
            <div className="flex justify-start">
               <div className="max-w-[85%] p-3 rounded-2xl text-sm bg-surface text-on-surface rounded-tl-none border border-outline-variant/30 flex gap-1 items-center">
                 <div className="w-2 h-2 bg-on-surface/50 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-on-surface/50 rounded-full animate-bounce delay-100"></div>
                 <div className="w-2 h-2 bg-on-surface/50 rounded-full animate-bounce delay-200"></div>
               </div>
            </div>
          )}
        </div>

        {/* Input de Mensagem */}
        <form onSubmit={handleSend} className="p-4 bg-surface flex gap-2 border-t border-outline-variant/20">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? "A IA está digitando..." : "Digite sua pergunta..."}
            className="flex-1 bg-surface-container rounded-full px-4 py-2 text-sm text-on-background focus:outline-none focus:border-primary transition-all disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary text-on-primary w-10 h-10 rounded-full flex items-center justify-center hover:bg-primary-fixed transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-transparent z-[55]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}