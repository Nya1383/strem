/**
 * Wire-format types for the signaling protocol.
 */

export type PeerRole = 'broadcaster' | 'viewer';

export interface IceCandidatePayload {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string | null;
}

export interface ChatMessage {
  id: string;
  fromPeerId: string;
  fromName: string;
  text: string;
  timestamp: number;
  historical?: boolean;
}

export type SessionDescriptionPayload = {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
};

export type ClientMessage =
  | {
      type: 'create-room';
      role: 'broadcaster';
      password?: string;
      peerName?: string;
      clientId: string;
    }
  | {
      type: 'join-room';
      role: 'viewer';
      roomId: string;
      password?: string;
      peerName?: string;
      clientId: string;
    }
  | {
      type: 'offer';
      toPeerId: string;
      sdp: SessionDescriptionPayload;
    }
  | {
      type: 'answer';
      toPeerId: string;
      sdp: SessionDescriptionPayload;
    }
  | {
      type: 'ice-candidate';
      toPeerId: string;
      candidate: IceCandidatePayload;
    }
  | { type: 'heartbeat'; ts: number }
  | { type: 'chat'; text: string }
  | { type: 'disconnect'; reason?: string };

export type ServerMessage =
  | { type: 'room-created'; roomId: string; peerId: string; joinUrl: string }
  | { type: 'room-joined'; roomId: string; peerId: string; peers: RoomPeer[] }
  | { type: 'peer-joined'; peer: RoomPeer }
  | { type: 'peer-left'; peerId: string }
  | { type: 'offer'; fromPeerId: string; sdp: SessionDescriptionPayload }
  | { type: 'answer'; fromPeerId: string; sdp: SessionDescriptionPayload }
  | { type: 'ice-candidate'; fromPeerId: string; candidate: IceCandidatePayload }
  | { type: 'heartbeat-ack'; ts: number; viewerCount: number }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'viewer-count'; count: number }
  | { type: 'error'; code: ErrorCode; message: string }
  | { type: 'kick'; reason: string };

export interface RoomPeer {
  peerId: string;
  peerName: string;
  role: PeerRole;
}

export type ErrorCode =
  | 'room-not-found'
  | 'wrong-password'
  | 'room-full'
  | 'room-closed'
  | 'duplicate-client'
  | 'invalid-message'
  | 'unauthorized'
  | 'internal-error';

export type SignalingState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'closed'
  | 'error';
