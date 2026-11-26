'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { getIdToken } from '@/services/auth';
import {
  ChatConnection,
  RestChatConnection,
  type ChatMessage,
  type ChatMode,
  type ConnectionStatus,
  type IChatConnection,
} from '@/services/chat';
import { useAuth } from './AuthProvider';

function ChatPanel({ userId, mode }: { userId: string; mode: ChatMode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      content:
        mode === 'rest'
          ? 'Olá! Estou no modo Agente Strands (REST) com memória de sessão e consulta ao horário oficial do Brasil. Como posso ajudar?'
          : 'Olá! Eu sou o assistente do AltStream. Como posso ajudar você a encontrar a série perfeita hoje?',
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const connectionRef = useRef<IChatConnection | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    let active = true;
    const handleStatus = (newStatus: ConnectionStatus) => {
      if (active) setStatus(newStatus);
    };

    const connection: IChatConnection =
      mode === 'rest'
        ? new RestChatConnection(getIdToken, handleStatus, userId)
        : new ChatConnection(getIdToken, handleStatus);

    connectionRef.current = connection;
    connection.connect().catch(error => {
      if (active) setError(error instanceof Error ? error.message : 'Não foi possível conectar ao chat.');
    });

    return () => {
      active = false;
      connectionRef.current = null;
      connection.disconnect();
    };
  }, [userId, mode]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, error]);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const connection = connectionRef.current;
    const question = input.trim();
    if (!question || sendingRef.current || !connection) return;
    sendingRef.current = true;
    setInput('');
    setError(null);
    setMessages(previous => [...previous, { role: 'user', content: question }]);
    setIsLoading(true);
    try {
      const reply = await connection.sendMessage(question);
      if (connectionRef.current === connection) {
        setMessages(previous => [...previous, { role: 'ai', content: reply }]);
      }
    } catch (error) {
      if (connectionRef.current === connection) {
        setMessages(previous => previous.slice(0, -1));
        setInput(question);
        setError(error instanceof Error ? error.message : 'Não foi possível enviar a pergunta.');
      }
    } finally {
      sendingRef.current = false;
      if (connectionRef.current === connection) setIsLoading(false);
    }
  };

  return (
    <>
      <p role="status" className="px-4 pt-2 text-xs text-on-surface-variant">
        {mode === 'rest'
          ? status === 'connecting'
            ? 'Consultando agente...'
            : 'Conectado (API REST • Strands)'
          : status === 'connected'
          ? 'Conectado (WebSocket)'
          : status === 'connecting'
          ? 'Conectando...'
          : 'Desconectado — envie para tentar conectar'}
      </p>
      <div ref={scrollRef} role="log" aria-live="polite" aria-label="Conversa com o assistente" className="h-[400px] overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap break-words ${
              message.role === 'user'
                ? 'bg-primary text-on-primary rounded-tr-none'
                : 'bg-surface text-on-surface rounded-tl-none border border-outline-variant/30'
            }`}>
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div role="status" className="text-sm text-on-surface-variant animate-pulse">A IA está respondendo...</div>
        )}
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
      </div>
      <form onSubmit={handleSend} className="p-4 bg-surface flex gap-2 border-t border-outline-variant/20">
        <input
          type="text"
          aria-label="Sua pergunta"
          value={input}
          onChange={event => setInput(event.target.value)}
          disabled={isLoading}
          maxLength={4000}
          placeholder={isLoading ? 'A IA está respondendo...' : 'Digite sua pergunta...'}
          className="min-w-0 flex-1 bg-surface-container rounded-full px-4 py-2 text-sm text-on-background focus:outline-none focus:border-primary transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Enviar pergunta"
          disabled={isLoading || (mode === 'websocket' && status === 'connecting') || !input.trim()}
          className="bg-primary text-on-primary w-10 h-10 shrink-0 rounded-full flex items-center justify-center hover:bg-primary-fixed transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </form>
    </>
  );
}

export default function AIPopUp() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>('websocket');
  const { user, loading } = useAuth();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Abrir assistente AltStream"
        aria-expanded={isOpen}
        className="fixed bottom-6 right-6 w-14 h-14 text-on-primary rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-50 group overflow-hidden"
      >
        <img src="/AIPopup.png" alt="" className="w-full h-full object-cover transition-transform duration-300" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-transparent z-[55]" onClick={() => setIsOpen(false)} />
          <section aria-label="Assistente AltStream" className="fixed bottom-24 right-6 w-[350px] max-w-[calc(100vw-48px)] bg-surface-container shadow-2xl z-[60] flex flex-col rounded-2xl overflow-hidden">
            <div className="p-4 bg-surface flex items-center justify-between gap-2">
              <h3 className="font-headline-md text-headline-sm text-on-background leading-tight">AltStream AI</h3>
              <div className="flex items-center gap-1.5">
                <div role="group" aria-label="Modo de conexão do chat" className="flex rounded-full bg-surface-container p-0.5 text-[11px] font-medium border border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setMode('websocket')}
                    className={`px-2 py-0.5 rounded-full transition-colors ${
                      mode === 'websocket' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-background'
                    }`}
                  >
                    WS
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('rest')}
                    className={`px-2 py-0.5 rounded-full transition-colors ${
                      mode === 'rest' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-background'
                    }`}
                  >
                    REST
                  </button>
                </div>
                <button onClick={() => setIsOpen(false)} aria-label="Fechar chat" className="p-1 rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>
            {loading ? (
              <p role="status" className="p-4 text-on-surface-variant">Verificando sua sessão...</p>
            ) : user ? (
              <ChatPanel key={`${user.id}-${mode}`} userId={user.id} mode={mode} />
            ) : (
              <div className="p-6 flex flex-col gap-4 text-sm text-on-surface">
                <p>Entre com sua conta Google para conversar com o assistente.</p>
                <Link href="/login" onClick={() => setIsOpen(false)} className="text-primary underline">Fazer login</Link>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}