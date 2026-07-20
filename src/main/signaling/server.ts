import { WebSocketServer, WebSocket } from 'ws';
import { customAlphabet } from 'nanoid';
import { ClientMessageSchema } from './schema';
import type {
  ServerMessage,
  RoomPeer,
  ChatMessage
} from '../../shared/signaling';
import type { SignalingServerStatus } from '../../shared/ipc';
import { getLocalIpAddress } from '../services/network';

const nanoidRoom = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 6);
const nanoidPeer = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

interface ClientPeer {
  ws: WebSocket;
  peerId: string;
  peerName: string;
  role: 'broadcaster' | 'viewer';
  roomId: string;
  lastHeartbeat: number;
}

interface Room {
  roomId: string;
  password?: string;
  broadcaster: ClientPeer;
  viewers: Map<string, ClientPeer>;
  chatHistory: ChatMessage[];
  createdAt: number;
}

export class SignalingServer {
  private wss: WebSocketServer | null = null;
  private rooms = new Map<string, Room>();
  private clients = new Map<WebSocket, ClientPeer>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentPort = 8080;

  public async start(port = 8080): Promise<number> {
    if (this.wss) {
      if (this.currentPort === port) return this.currentPort;
      await this.stop();
    }

    return new Promise((resolve, reject) => {
      try {
        const wss = new WebSocketServer({ port }, () => {
          this.currentPort = port;
          this.wss = wss;
          this.startHeartbeatMonitor();
          const lanIp = getLocalIpAddress();
          console.log(`[SignalingServer] Listening on 0.0.0.0:${port}`);
          console.log(`[SignalingServer] Local LAN URL: ws://${lanIp}:${port}`);
          resolve(port);
        });

        wss.on('connection', (ws) => {
          this.handleConnection(ws);
        });

        wss.on('error', (err) => {
          console.error('[SignalingServer] Error:', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const ws of this.clients.keys()) {
      this.send(ws, { type: 'kick', reason: 'Server shutting down' });
      ws.close();
    }

    this.rooms.clear();
    this.clients.clear();

    if (this.wss) {
      return new Promise((resolve) => {
        this.wss?.close(() => {
          this.wss = null;
          console.log('[SignalingServer] Stopped');
          resolve();
        });
      });
    }
  }

  public getStatus(): SignalingServerStatus {
    return {
      running: this.wss !== null,
      port: this.currentPort,
      activeRooms: this.rooms.size,
      activeClients: this.clients.size
    };
  }

  private handleConnection(ws: WebSocket): void {
    ws.on('message', (raw) => {
      try {
        const parsedJson = JSON.parse(raw.toString());
        const result = ClientMessageSchema.safeParse(parsedJson);

        if (!result.success) {
          console.warn('[SignalingServer] Invalid message received:', result.error.format());
          this.send(ws, {
            type: 'error',
            code: 'invalid-message',
            message: 'Malformed signaling payload'
          });
          return;
        }

        const msg = result.data;
        this.dispatchMessage(ws, msg);
      } catch (err) {
        console.error('[SignalingServer] Message parse error:', err);
        this.send(ws, {
          type: 'error',
          code: 'invalid-message',
          message: 'Invalid JSON payload'
        });
      }
    });

    ws.on('close', () => {
      this.handleClientDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.error('[SignalingServer] WS Error:', err);
      this.handleClientDisconnect(ws);
    });
  }

  private dispatchMessage(ws: WebSocket, msg: ReturnType<typeof ClientMessageSchema.parse>): void {
    switch (msg.type) {
      case 'create-room':
        this.handleCreateRoom(ws, msg);
        break;
      case 'join-room':
        this.handleJoinRoom(ws, msg);
        break;
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        this.handleRtcRelay(ws, msg);
        break;
      case 'heartbeat':
        this.handleHeartbeat(ws, msg);
        break;
      case 'chat':
        this.handleChat(ws, msg);
        break;
      case 'disconnect':
        this.handleClientDisconnect(ws, msg.reason);
        break;
    }
  }

  private handleCreateRoom(
    ws: WebSocket,
    msg: Extract<ReturnType<typeof ClientMessageSchema.parse>, { type: 'create-room' }>
  ): void {
    let roomId = nanoidRoom();
    while (this.rooms.has(roomId)) {
      roomId = nanoidRoom();
    }

    const peerId = `broadcaster_${nanoidPeer()}`;
    const peerName = msg.peerName || 'Broadcaster';

    const peer: ClientPeer = {
      ws,
      peerId,
      peerName,
      role: 'broadcaster',
      roomId,
      lastHeartbeat: Date.now()
    };

    const room: Room = {
      roomId,
      password: msg.password,
      broadcaster: peer,
      viewers: new Map(),
      chatHistory: [],
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    this.clients.set(ws, peer);

    const lanIp = getLocalIpAddress();
    const joinUrl = `strem://join/${roomId}?server=ws://${lanIp}:${this.currentPort}`;

    this.send(ws, {
      type: 'room-created',
      roomId,
      peerId,
      joinUrl
    });

    console.log(`[SignalingServer] Room created: ${roomId} by ${peerId} (Join URL: ${joinUrl})`);
  }

  private handleJoinRoom(
    ws: WebSocket,
    msg: Extract<ReturnType<typeof ClientMessageSchema.parse>, { type: 'join-room' }>
  ): void {
    const room = this.rooms.get(msg.roomId.toLowerCase());
    if (!room) {
      this.send(ws, {
        type: 'error',
        code: 'room-not-found',
        message: 'The requested room stream ID does not exist or has ended'
      });
      return;
    }

    if (room.password && room.password !== msg.password) {
      this.send(ws, {
        type: 'error',
        code: 'wrong-password',
        message: 'Incorrect room password'
      });
      return;
    }

    const peerId = `viewer_${nanoidPeer()}`;
    const peerName = msg.peerName || `Viewer ${room.viewers.size + 1}`;

    const newPeer: ClientPeer = {
      ws,
      peerId,
      peerName,
      role: 'viewer',
      roomId: room.roomId,
      lastHeartbeat: Date.now()
    };

    room.viewers.set(peerId, newPeer);
    this.clients.set(ws, newPeer);

    const roomPeers: RoomPeer[] = [
      { peerId: room.broadcaster.peerId, peerName: room.broadcaster.peerName, role: 'broadcaster' }
    ];

    for (const v of room.viewers.values()) {
      if (v.peerId !== peerId) {
        roomPeers.push({ peerId: v.peerId, peerName: v.peerName, role: 'viewer' });
      }
    }

    this.send(ws, {
      type: 'room-joined',
      roomId: room.roomId,
      peerId,
      peers: roomPeers
    });

    for (const chatMsg of room.chatHistory) {
      this.send(ws, {
        type: 'chat',
        message: { ...chatMsg, historical: true }
      });
    }

    const newPeerRecord: RoomPeer = { peerId, peerName, role: 'viewer' };

    this.send(room.broadcaster.ws, {
      type: 'peer-joined',
      peer: newPeerRecord
    });

    this.broadcastViewerCount(room);

    console.log(`[SignalingServer] Peer ${peerId} joined room ${room.roomId}`);
  }

  private handleRtcRelay(
    ws: WebSocket,
    msg: Extract<ReturnType<typeof ClientMessageSchema.parse>, { type: 'offer' | 'answer' | 'ice-candidate' }>
  ): void {
    const sender = this.clients.get(ws);
    if (!sender) {
      this.send(ws, { type: 'error', code: 'unauthorized', message: 'Not connected to room' });
      return;
    }

    const room = this.rooms.get(sender.roomId);
    if (!room) return;

    let targetPeer: ClientPeer | undefined;
    if (room.broadcaster.peerId === msg.toPeerId) {
      targetPeer = room.broadcaster;
    } else {
      targetPeer = room.viewers.get(msg.toPeerId);
    }

    if (!targetPeer) {
      console.warn(`[SignalingServer] Target peer ${msg.toPeerId} not found in room ${sender.roomId}`);
      return;
    }

    if (msg.type === 'offer') {
      this.send(targetPeer.ws, {
        type: 'offer',
        fromPeerId: sender.peerId,
        sdp: msg.sdp
      });
    } else if (msg.type === 'answer') {
      this.send(targetPeer.ws, {
        type: 'answer',
        fromPeerId: sender.peerId,
        sdp: msg.sdp
      });
    } else if (msg.type === 'ice-candidate') {
      this.send(targetPeer.ws, {
        type: 'ice-candidate',
        fromPeerId: sender.peerId,
        candidate: msg.candidate
      });
    }
  }

  private handleHeartbeat(
    ws: WebSocket,
    msg: Extract<ReturnType<typeof ClientMessageSchema.parse>, { type: 'heartbeat' }>
  ): void {
    const peer = this.clients.get(ws);
    if (peer) {
      peer.lastHeartbeat = Date.now();
      const room = this.rooms.get(peer.roomId);
      const viewerCount = room ? room.viewers.size : 0;

      this.send(ws, {
        type: 'heartbeat-ack',
        ts: msg.ts,
        viewerCount
      });
    }
  }

  private handleChat(
    ws: WebSocket,
    msg: Extract<ReturnType<typeof ClientMessageSchema.parse>, { type: 'chat' }>
  ): void {
    const peer = this.clients.get(ws);
    if (!peer) return;

    const room = this.rooms.get(peer.roomId);
    if (!room) return;

    const chatMessage: ChatMessage = {
      id: nanoidPeer(),
      fromPeerId: peer.peerId,
      fromName: peer.peerName,
      text: msg.text,
      timestamp: Date.now()
    };

    room.chatHistory.push(chatMessage);
    if (room.chatHistory.length > 50) {
      room.chatHistory.shift();
    }

    this.send(room.broadcaster.ws, { type: 'chat', message: chatMessage });

    for (const v of room.viewers.values()) {
      this.send(v.ws, { type: 'chat', message: chatMessage });
    }
  }

  private handleClientDisconnect(ws: WebSocket, reason?: string): void {
    const peer = this.clients.get(ws);
    if (!peer) return;

    this.clients.delete(ws);
    const room = this.rooms.get(peer.roomId);

    if (!room) return;

    if (peer.role === 'broadcaster') {
      console.log(`[SignalingServer] Broadcaster left room ${room.roomId}. Closing room.`);
      for (const v of room.viewers.values()) {
        this.send(v.ws, {
          type: 'kick',
          reason: reason || 'Broadcaster stopped streaming'
        });
        this.clients.delete(v.ws);
      }
      this.rooms.delete(room.roomId);
    } else {
      console.log(`[SignalingServer] Viewer ${peer.peerId} left room ${room.roomId}`);
      room.viewers.delete(peer.peerId);

      this.send(room.broadcaster.ws, {
        type: 'peer-left',
        peerId: peer.peerId
      });

      this.broadcastViewerCount(room);
    }
  }

  private broadcastViewerCount(room: Room): void {
    const count = room.viewers.size;
    const msg: ServerMessage = { type: 'viewer-count', count };

    this.send(room.broadcaster.ws, msg);
    for (const v of room.viewers.values()) {
      this.send(v.ws, msg);
    }
  }

  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeoutMillis = 15000;

      for (const [ws, peer] of this.clients.entries()) {
        if (now - peer.lastHeartbeat > timeoutMillis) {
          console.warn(`[SignalingServer] Peer ${peer.peerId} timed out. Disconnecting.`);
          ws.terminate();
          this.handleClientDisconnect(ws, 'Heartbeat timeout');
        }
      }
    }, 5000);
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}

export const signalingServer = new SignalingServer();
