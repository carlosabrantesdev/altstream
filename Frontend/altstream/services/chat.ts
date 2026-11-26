export type ChatMessage = { role: 'ai' | 'user'; content: string };
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
export type ChatMode = 'websocket' | 'rest';

export interface IChatConnection {
  connect(): Promise<void>;
  sendMessage(message: string): Promise<string>;
  disconnect(): void;
}

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_CHAT_WEBSOCKET_URL;
const CHAT_REST_URL = process.env.NEXT_PUBLIC_CHAT_API_URL;
const CONNECT_TIMEOUT = 15_000;
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

export function createChatPayload(message: string, sessionId?: string) {
  return JSON.stringify(sessionId ? { message, session_id: sessionId } : { message });
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
    if (response.connectionId && response.requestId) {
      throw new Error('O servidor recusou a mensagem. Tente novamente.');
    }
    if (response.type === 'response' && typeof response.message === 'string' && response.message.trim()) {
      return response.message;
    }
  }
  throw new Error('O assistente enviou uma resposta em formato inesperado.');
}

export class ChatConnection implements IChatConnection {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private connecting: Promise<void> | null = null;
  private cancelConnect: ((error: Error) => void) | null = null;
  private pending: { resolve: (reply: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  private sending = false;
  private generation = 0;

  constructor(
    private readonly getToken: () => Promise<string>,
    private readonly onStatus: (status: ConnectionStatus) => void,
  ) {}

  async connect(): Promise<void> {
    const generation = this.generation;
    const token = await this.getToken();
    if (generation !== this.generation) throw new Error('Conexão cancelada.');
    if (this.socket?.readyState === WebSocket.OPEN && this.token === token) return;
    if (this.connecting) return this.connecting;
    if (this.socket) this.disconnect();
    if (!WEBSOCKET_URL) throw new Error('A URL do servidor de chat WebSocket não está configurada no ambiente.');
    const url = new URL(WEBSOCKET_URL);
    if (url.protocol !== 'wss:') throw new Error('A URL do chat deve usar wss://.');
    url.searchParams.set('Authorization', token);
    const socket = new WebSocket(url.toString());
    this.socket = socket;
    this.token = token;
    this.onStatus('connecting');

    this.connecting = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.fail(new Error('A conexão com o chat demorou demais. Tente novamente.'));
      }, CONNECT_TIMEOUT);
      this.cancelConnect = (error) => {
        clearTimeout(timer);
        reject(error);
      };
      socket.onopen = () => {
        if (this.socket !== socket) return;
        clearTimeout(timer);
        this.cancelConnect = null;
        this.connecting = null;
        this.onStatus('connected');
        resolve();
      };
      socket.onmessage = (event: MessageEvent) => {
        if (this.socket !== socket || !this.pending) return;
        try {
          if (typeof event.data !== 'string') throw new Error('Resposta inválida do assistente.');
          const reply = readChatReply(event.data);
          const pending = this.pending;
          this.pending = null;
          clearTimeout(pending.timer);
          pending.resolve(reply);
        } catch (error) {
          this.fail(error instanceof Error ? error : new Error('Resposta inválida do assistente.'));
        }
      };
      socket.onerror = () => {
        if (this.socket === socket) {
          this.fail(new Error('Não foi possível conectar ao chat. Confira sua conexão e tente entrar novamente.'));
        }
      };
      socket.onclose = () => {
        if (this.socket === socket) this.fail(new Error('A conexão com o chat foi encerrada. Envie sua pergunta novamente.'));
      };
    });
    return this.connecting;
  }

  async sendMessage(message: string): Promise<string> {
    if (this.sending) throw new Error('Aguarde a resposta anterior.');
    if (!message.trim()) throw new Error('Digite uma pergunta.');
    const payload = createChatPayload(message.trim());
    if (new TextEncoder().encode(payload).length > 30_000) {
      throw new Error('A pergunta ficou muito longa. Envie uma pergunta menor.');
    }
    this.sending = true;
    try {
      await this.connect();
      const socket = this.socket;
      if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('O chat está desconectado.');
      return await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.fail(new Error('O assistente demorou demais para responder. Tente novamente.'));
        }, RESPONSE_TIMEOUT);
        this.pending = { resolve, reject, timer };
        try {
          socket.send(payload);
        } catch {
          this.fail(new Error('Não foi possível enviar sua pergunta. Tente novamente.'));
        }
      });
    } finally {
      this.sending = false;
    }
  }

  private fail(error: Error) {
    this.generation++;
    this.cancelConnect?.(error);
    this.cancelConnect = null;
    this.connecting = null;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
    const socket = this.socket;
    this.socket = null;
    this.token = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      socket.close();
    }
    this.onStatus('disconnected');
  }

  disconnect() {
    this.fail(new Error('Conexão encerrada.'));
  }
}

export class RestChatConnection implements IChatConnection {
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
      throw new Error('A URL da API REST de chat não está configurada no ambiente.');
    }
    this.onStatus('connected');
  }

  async sendMessage(message: string): Promise<string> {
    if (this.sending) throw new Error('Aguarde a resposta anterior.');
    if (!message.trim()) throw new Error('Digite uma pergunta.');
    if (!CHAT_REST_URL) throw new Error('A URL da API REST de chat não está configurada no ambiente.');

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
        throw new Error(`Erro no servidor REST (${response.status}). Tente novamente.`);
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