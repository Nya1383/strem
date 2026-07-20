import type {
  ClientMessage,
  ServerMessage,
  SignalingState,
  IceCandidatePayload,
  SessionDescriptionPayload
} from '../../../../shared/signaling';

type SignalingEventListener = (msg: ServerMessage) => void;
type StateChangeListener = (state: SignalingState) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private serverUrl = 'ws://localhost:8080';
  private state: SignalingState = 'idle';
  private listeners: Set<SignalingEventListener> = new Set();
  private stateListeners: Set<StateChangeListener> = new Set();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private clientId = Math.random().toString(36).substring(2, 11);
  private autoReconnect = true;

  constructor(serverUrl = 'ws://localhost:8080') {
    this.serverUrl = serverUrl;
  }

  public setServerUrl(url: string): void {
    this.serverUrl = url;
  }

  public getState(): SignalingState {
    return this.state;
  }

  public connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    this.setState('connecting');
    this.autoReconnect = true;

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.serverUrl);
        this.ws = ws;

        ws.onopen = () => {
          console.log(`[SignalingClient] Connected to ${this.serverUrl}`);
          this.setState('connected');
          this.startHeartbeat();
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const msg: ServerMessage = JSON.parse(event.data);
            this.handleServerMessage(msg);
          } catch (err) {
            console.error('[SignalingClient] Failed to parse message:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('[SignalingClient] Connection error:', err);
          if (this.state === 'connecting') {
            this.setState('error');
            reject(err);
          }
        };

        ws.onclose = () => {
          console.log('[SignalingClient] Disconnected');
          this.stopHeartbeat();
          this.ws = null;

          if (this.autoReconnect && this.state !== 'closed') {
            this.setState('reconnecting');
            this.scheduleReconnect();
          } else {
            this.setState('closed');
          }
        };
      } catch (err) {
        this.setState('error');
        reject(err);
      }
    });
  }

  public disconnect(): void {
    this.autoReconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.send({ type: 'disconnect' });
      this.ws.close();
      this.ws = null;
    }
    this.setState('closed');
  }

  public subscribe(listener: SignalingEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeState(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public createRoom(password?: string, peerName?: string): void {
    this.send({
      type: 'create-room',
      role: 'broadcaster',
      password,
      peerName,
      clientId: this.clientId
    });
  }

  public joinRoom(roomId: string, password?: string, peerName?: string): void {
    this.send({
      type: 'join-room',
      role: 'viewer',
      roomId: roomId.trim().toLowerCase(),
      password,
      peerName,
      clientId: this.clientId
    });
  }

  public sendOffer(toPeerId: string, sdp: SessionDescriptionPayload): void {
    this.send({ type: 'offer', toPeerId, sdp });
  }

  public sendAnswer(toPeerId: string, sdp: SessionDescriptionPayload): void {
    this.send({ type: 'answer', toPeerId, sdp });
  }

  public sendIceCandidate(toPeerId: string, candidate: IceCandidatePayload): void {
    this.send({ type: 'ice-candidate', toPeerId, candidate });
  }

  public sendChat(text: string): void {
    this.send({ type: 'chat', text });
  }

  private send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('[SignalingClient] Cannot send message, socket not open');
    }
  }

  private setState(newState: SignalingState): void {
    if (this.state !== newState) {
      this.state = newState;
      for (const listener of this.stateListeners) {
        listener(newState);
      }
    }
  }

  private handleServerMessage(msg: ServerMessage): void {
    for (const listener of this.listeners) {
      try {
        listener(msg);
      } catch (err) {
        console.error('[SignalingClient] Error in message listener:', err);
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat', ts: Date.now() });
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[SignalingClient] Attempting reconnect...');
      this.connect().catch((err) => {
        console.warn('[SignalingClient] Reconnect attempt failed:', err);
      });
    }, 3000);
  }
}
