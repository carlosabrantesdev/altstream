export type ChatMessage = { role: 'ai' | 'user'; content: string };
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_CHAT_WEBSOCKET_URL
const CONNECT_TIMEOUT = 15_000;
const RESPONSE_TIMEOUT = 90_000;

export function createChatPayload(message: string) {
  return JSON.stringify({ message });
}

export function readChatReply(raw: string): string {
  let data: unknown;
  try { data = JSON.parse(raw); } catch {
    throw new Error('O assistente enviou uma resposta em formato inesperado.');
  }
  if (data && typeof data === 'object') {
    const response = data as Record<string, unknown>;
    if (response.type === 'error') {
      throw new Error('O assistente não conseguiu responder. Tente novamente.');
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

export class ChatConnection {
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
    if (!WEBSOCKET_URL) throw new Error('A URL do servidor de chat não está configurada no ambiente.');
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
          // Fechar impede uma resposta atrasada de responder à próxima pergunta.
          this.fail(new Error('O assistente demorou demais para responder. Tente novamente.'));
        }, RESPONSE_TIMEOUT);
        this.pending = { resolve, reject, timer };
        try { socket.send(payload); } catch {
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
