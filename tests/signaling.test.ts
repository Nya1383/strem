import { describe, it, expect } from 'vitest';
import {
  CreateRoomMessageSchema,
  JoinRoomMessageSchema,
  OfferMessageSchema,
  AnswerMessageSchema,
  IceCandidateMessageSchema,
  HeartbeatMessageSchema,
  ChatMessageSchema,
  ClientMessageSchema
} from '../src/main/signaling/schema';

describe('Signaling Zod Schema Validation', () => {
  it('should validate valid create-room message', () => {
    const msg = {
      type: 'create-room',
      role: 'broadcaster',
      password: 'secretpassword',
      peerName: 'Host',
      clientId: 'client-123'
    };
    const result = CreateRoomMessageSchema.safeParse(msg);
    expect(result.success).toBe(true);
  });

  it('should validate valid join-room message', () => {
    const msg = {
      type: 'join-room',
      role: 'viewer',
      roomId: 'a1b2c3',
      peerName: 'Viewer1',
      clientId: 'client-456'
    };
    const result = JoinRoomMessageSchema.safeParse(msg);
    expect(result.success).toBe(true);
  });

  it('should validate SDP offer and answer messages', () => {
    const offerMsg = {
      type: 'offer',
      toPeerId: 'viewer_1',
      sdp: { type: 'offer', sdp: 'v=0\r\no=- 123 456 IN IP4 127.0.0.1...' }
    };
    expect(OfferMessageSchema.safeParse(offerMsg).success).toBe(true);

    const answerMsg = {
      type: 'answer',
      toPeerId: 'broadcaster_1',
      sdp: { type: 'answer', sdp: 'v=0\r\no=- 789 012 IN IP4 127.0.0.1...' }
    };
    expect(AnswerMessageSchema.safeParse(answerMsg).success).toBe(true);
  });

  it('should validate ICE candidate payload', () => {
    const iceMsg = {
      type: 'ice-candidate',
      toPeerId: 'viewer_1',
      candidate: {
        candidate: 'candidate:1 1 UDP 2122260223 192.168.1.100 54321 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
        usernameFragment: 'abc'
      }
    };
    expect(IceCandidateMessageSchema.safeParse(iceMsg).success).toBe(true);
  });

  it('should validate heartbeat message', () => {
    const hbMsg = { type: 'heartbeat', ts: 1700000000000 };
    expect(HeartbeatMessageSchema.safeParse(hbMsg).success).toBe(true);
  });

  it('should validate chat message', () => {
    const chatMsg = { type: 'chat', text: 'Hello everyone!' };
    expect(ChatMessageSchema.safeParse(chatMsg).success).toBe(true);
  });

  it('should reject malformed message through discriminated union', () => {
    const badMsg = { type: 'create-room', role: 'unknown' };
    const result = ClientMessageSchema.safeParse(badMsg);
    expect(result.success).toBe(false);
  });
});
