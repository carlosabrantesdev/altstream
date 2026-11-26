export type ChatMessage = { role: 'ai' | 'user'; content: string };
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

const CHAT_REST_URL = process.env.NEXT_PUBLIC_CHAT_API_URL;
const RESPONSE_TIMEOUT = 90_000;

export function getOrCreateSessionId(userId?: string): string {
  if (userId) return `user-${userId}`;
  if (typeof window === 'undefined') return 'sessao-ssr';

  let sessionId = localStorage.getItem('strands_chat_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('strands_chat_session_id', sessionId);
  }
  return sessionId;
}

export function createChatPayload(message: string, sessionId: string) {
  return JSON.stringify({ message, session_id: sessionId });
}

export function readChatReply(raw: string): string {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('O assistente enviou uma resposta em formato inesperado.');
  }

  if (data && typeof data === 'object') {
    const response = data as Record<string, unknown>;
    if (response.type === 'error') {
      throw new Error(
        typeof response.message === 'string' && response.message.trim()
          ? response.message
          : 'O assistente não conseguiu responder. Tente novamente.'
      );
    }
    if (response.type === 'response' && typeof response.message === 'string' && response.message.trim()) {
      return response.message;
    }
  }
  throw new Error('O assistente enviou uma resposta em formato inesperado.');
}

export class ChatConnection {
  private abortController: AbortController | null = null;
  private sending = false;
  private readonly sessionId: string;

  constructor(
    private readonly getToken: () => Promise<string>,
    private readonly onStatus: (status: ConnectionStatus) => void,
    userId?: string,
  ) {
    this.sessionId = getOrCreateSessionId(userId);
  }

  async connect(): Promise<void> {
    if (!CHAT_REST_URL) {
      this.onStatus('disconnected');
      throw new Error('A URL da API de chat não está configurada no ambiente.');
    }
    this.onStatus('connected');
  }

  async sendMessage(message: string): Promise<string> {
    if (this.sending) throw new Error('Aguarde a resposta anterior.');
    if (!message.trim()) throw new Error('Digite uma pergunta.');
    if (!CHAT_REST_URL) throw new Error('A URL da API de chat não está configurada no ambiente.');

    const payload = createChatPayload(message.trim(), this.sessionId);
    if (new TextEncoder().encode(payload).length > 30_000) {
      throw new Error('A pergunta ficou muito longa. Envie uma pergunta menor.');
    }

    this.sending = true;
    this.onStatus('connecting');

    const controller = new AbortController();
    this.abortController = controller;
    const timer = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT);

    try {
      const token = await this.getToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = token;
      }

      const response = await fetch(CHAT_REST_URL, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
      });

      const rawText = await response.text();
      if (!response.ok) {
        throw new Error(`Erro no servidor (${response.status}). Tente novamente.`);
      }

      const reply = readChatReply(rawText);
      this.onStatus('connected');
      return reply;
    } catch (error) {
      this.onStatus('disconnected');
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('O assistente demorou demais para responder. Tente novamente.');
      }
      throw error instanceof Error ? error : new Error('Não foi possível enviar sua pergunta.');
    } finally {
      clearTimeout(timer);
      this.abortController = null;
      this.sending = false;
    }
  }

  disconnect() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.onStatus('disconnected');
  }
}