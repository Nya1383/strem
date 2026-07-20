import { z } from 'zod';

export const IceCandidateSchema = z.object({
  candidate: z.string(),
  sdpMid: z.string().nullable(),
  sdpMLineIndex: z.number().nullable(),
  usernameFragment: z.string().nullable().optional()
});

export const SessionDescriptionSchema = z.object({
  type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
  sdp: z.string()
});

export const CreateRoomMessageSchema = z.object({
  type: z.literal('create-room'),
  role: z.literal('broadcaster'),
  password: z.string().max(64).optional(),
  peerName: z.string().max(32).optional(),
  clientId: z.string().min(1)
});

export const JoinRoomMessageSchema = z.object({
  type: z.literal('join-room'),
  role: z.literal('viewer'),
  roomId: z.string().min(1),
  password: z.string().max(64).optional(),
  peerName: z.string().max(32).optional(),
  clientId: z.string().min(1)
});

export const OfferMessageSchema = z.object({
  type: z.literal('offer'),
  toPeerId: z.string().min(1),
  sdp: SessionDescriptionSchema
});

export const AnswerMessageSchema = z.object({
  type: z.literal('answer'),
  toPeerId: z.string().min(1),
  sdp: SessionDescriptionSchema
});

export const IceCandidateMessageSchema = z.object({
  type: z.literal('ice-candidate'),
  toPeerId: z.string().min(1),
  candidate: IceCandidateSchema
});

export const HeartbeatMessageSchema = z.object({
  type: z.literal('heartbeat'),
  ts: z.number()
});

export const ChatMessageSchema = z.object({
  type: z.literal('chat'),
  text: z.string().min(1).max(500)
});

export const DisconnectMessageSchema = z.object({
  type: z.literal('disconnect'),
  reason: z.string().optional()
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  CreateRoomMessageSchema,
  JoinRoomMessageSchema,
  OfferMessageSchema,
  AnswerMessageSchema,
  IceCandidateMessageSchema,
  HeartbeatMessageSchema,
  ChatMessageSchema,
  DisconnectMessageSchema
]);

export type ValidatedClientMessage = z.infer<typeof ClientMessageSchema>;
