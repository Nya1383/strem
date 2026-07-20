# STREM — Low-Latency Desktop Streaming App

## Tech stack
- **Electron 30+** desktop shell, **React 18 + TypeScript 5**, **Vite** via `electron-vite` (one tool bundles main/preload/renderer with HMR).
- **ws** for the embedded WebSocket signaling server, **zod** for message validation, **nanoid** for room IDs, **qrcode** for QR, **clsx** for class merging, **framer-motion** for animations.
- **Vitest** + **React Testing Library** for unit tests.
- ESLint + Prettier + strict TS configs (`tsconfig.node.json`, `tsconfig.web.json`, shared).

## Major architectural decisions

1. **`electron-vite` instead of hand-rolled Vite+Electron.** It produces three bundles (main / preload / renderer) from one config, gives HMR in the renderer, and handles `contextIsolation: true` + `nodeIntegration: false` cleanly. Less config, fewer footguns.

2. **Embedded signaling server inside Electron main.** A `ws.WebSocketServer` starts on app launch (auto-picks a free port, written to a file/env the renderer reads). Single binary, no separate deploy. The server is isolated in `src/main/signaling/` so it can be lifted to a standalone process later with ~zero changes. The renderer connects to it as a normal WS client — same code path whether embedded or remote.

3. **Mesh topology for v1** (one `RTCPeerConnection` per broadcaster↔viewer pair), broadcaster-initiated offers with **sendonly** video/audio transceivers, viewers answer **recvonly**. This is the lowest-latency, simplest design for small rooms and matches the <200ms target. Documented as the scaling boundary (SFU would be the next step); the `rtcPeerFactory` is the single seam where an SFU client would slot in.

4. **Capture via Electron `desktopCapturer` + Chromium `chromeMediaSource: 'desktop'`.** Screen/window enumeration goes through the main process (IPC), then the renderer calls `getUserMedia` with the source id. Windows system-audio loopback is captured alongside via the desktop audio constraint; mic is a separate `getUserMedia` stream mixed in via `AudioContext` when both are enabled.

5. **Codec preferences:** `RTCRtpTransceiver.setCodecPreferences([H264, VP9, VP8])`. Hardware encoding is automatic in Chromium when GPU is available — we just prefer H264 and let the encoder pick. Capture constraints default to **2560×1440 @ 60fps**, user-tunable.

6. **Adaptive bitrate:** a `useAdaptiveBitrate` hook polls `pc.getStats()`, watches packet loss / RTT / jitter / nack counts, and adjusts each sender's `parameters.encodings[0].maxBitrate` plus capture frame-rate/resolution ladders (1440p→1080p→720p, 60→30fps). Same hook drives the on-screen quality indicator.

7. **Auto-reconnect:** wraps the signaling client (exponential backoff, heartbeat ping/pong) and each PeerConnection (ICE restart via `restartIce()` on failure). Single `useAutoReconnect` hook, reused by both roles.

8. **Security:** room IDs from `nanoid(12)`; optional password hashed (SHA-256 + salt) and verified at `join-room`; DTLS/SRTP are automatic in WebRTC; every signaling message is parsed through a zod schema before dispatch (rejects malformed/oversized messages).

9. **State management:** lightweight **Context API** (`StreamContext`, `ToastContext`, `ThemeContext`) + reusable hooks. No Redux — overkill here. Components subscribe narrowly to avoid rerenders; video elements are imperatively controlled via refs so stats polling never rerenders React.

10. **Stats & extras:**
    - Stats overlay reads from a single `useStreamStats` polling loop (one `getStats()` call per second), exposed via ref + subscription — no React state churn.
    - Clipboard copy (`navigator.clipboard`), QR (`qrcode` lib), chat (relayed through the WS server, broadcast to room), push-to-talk (renderer key listener toggling the mic track's `enabled`), screenshot (canvas draw from `<video>`), recording (`MediaRecorder` → saved via IPC `showSaveDialog`).

## Folder structure
```
STREM/
├─ package.json, pnpm-lock.yaml
├─ electron.vite.config.ts
├─ tsconfig.json / tsconfig.node.json / tsconfig.web.json
├─ .eslintrc.cjs, .prettierrc, .gitignore, .env.example, README.md
├─ resources/                      # app icon
├─ build/                          # packaged output
└─ src/
   ├─ main/                        # Electron main process
   │  ├─ index.ts                  # app lifecycle, boots server + window
   │  ├─ window.ts                 # BrowserWindow factory (preload, CSP, security flags)
   │  ├─ config.ts                 # ports, ICE servers (STUN/TURN), env load
   │  ├─ logger.ts
   │  ├─ ipc/                      # contextBridge handlers
   │  │  ├─ index.ts
   │  │  ├─ sources.ts             # desktopCapturer enumerate, refresh
   │  │  └─ dialog.ts              # save recording/screenshot
   │  └─ signaling/                # embedded WS server (drop-in standalone later)
   │     ├─ server.ts              # WebSocketServer lifecycle
   │     ├─ rooms.ts               # room registry + password verify
   │     ├─ router.ts              # message dispatch
   │     ├─ schema.ts              # zod message schemas
   │     └─ heartbeat.ts
   ├─ preload/
   │  ├─ index.ts                  # contextBridge expose('api', ...)
   │  └─ api.d.ts                  # typed surface for renderer
   ├─ renderer/
   │  ├─ index.html
   │  └─ src/
   │     ├─ main.tsx, App.tsx, router.tsx
   │     ├─ pages/  Home, Broadcaster, Viewer
   │     ├─ components/
   │     │  ├─ ui/        Button, Card, Modal, Toast, Spinner, Badge, Tooltip, Slider
   │     │  ├─ stream/    VideoStage, PreviewCanvas, ControlsBar, SourcePicker, DeviceSelect
   │     │  ├─ stats/     StatsOverlay, Latency, Bitrate, Fps, ViewerCount, QualityDot
   │     │  ├─ chat/      ChatPanel, MessageList, Composer
   │     │  └─ share/     StreamIdCard, QrCode, CopyButton
   │     ├─ hooks/  useSignaling, useWebRTC, useScreenCapture, useMediaDevices,
   │     │         useStreamStats, useAdaptiveBitrate, useAutoReconnect,
   │     │         usePushToTalk, useRecording, useClipboard, useFullscreen, useChat
   │     ├─ services/  signalingClient, rtcPeerFactory, capture, recording, statsCollector
   │     ├─ context/   StreamContext, ToastContext, ThemeContext
   │     ├─ styles/    globals.css, theme.css (dark Discord/OBS/Steam-inspired)
   │     └─ assets/
   ├─ shared/                # types shared across processes
   │  ├─ signaling.ts  ipc.ts  webrtc.ts  stats.ts
   └─ types/                # ambient .d.ts (electron-vite client, css modules)
tests/  signaling.test.ts, rooms.test.ts, useAdaptiveBitrate.test.ts, components…
```

## Build order (what I'll generate, step by step)

1. **Project init** — `package.json`, pnpm workspace bits, `electron.vite.config.ts`, three tsconfigs, ESLint/Prettier, `.gitignore`, `.env.example`, README skeleton.
2. **Shared types + zod signaling schema** — `src/shared/*`, `src/main/signaling/schema.ts`.
3. **Embedded signaling server** — `server.ts`, `rooms.ts` (room + password), `router.ts` (create-room/join-room/offer/answer/ice-candidate/heartbeat/disconnect/chat), `heartbeat.ts`, plus a Vitest unit test.
4. **Electron main + preload + IPC** — app lifecycle, secure window, `desktopCapturer` source IPC, save-dialog IPC, server boot on a free port.
5. **Renderer services** — `signalingClient` (WS + reconnect + heartbeat), `rtcPeerFactory` (codec prefs, ICE config), `capture`, `recording`, `statsCollector`.
6. **Hooks** — `useSignaling`, `useWebRTC` (broadcaster + viewer modes), `useScreenCapture`, `useMediaDevices`, `useStreamStats`, `useAdaptiveBitrate`, `useAutoReconnect`, `usePushToTalk`, `useRecording`, `useFullscreen`, `useChat`, `useClipboard`.
7. **Context + theme** — `StreamContext`, `ToastContext`, `ThemeContext`, dark theme CSS tokens, animations.
8. **UI components** — ui primitives, then stream/stats/chat/share components, all composable and tested where logic-bearing.
9. **Pages** — Home (role select), Broadcaster (source picker, preview, controls, share card with QR + copy, stats overlay, chat), Viewer (stream-id entry, video stage, fullscreen, quality indicator, chat, auto-reconnect UI).
10. **Tests + docs** — signaling/rooms/adaptive-bitrate unit tests; README with run/build/package instructions and config for STUN/TURN.

## Notes / trade-offs to flag
- Mesh topology caps practical viewer count (~8–12 depending on hardware); the plan documents this and isolates the seam so an SFU can replace it later without touching UI or signaling.
- TURN is a `.env` placeholder (`TURN_URL`, `TURN_USER`, `TURN_CRED`) — works on LAN and most NATs out of the box; you add a coturn credential URL for cross-internet reliability.
- Packaging config (electron-builder) will be included so `pnpm build` produces an installer; defaults target Windows (your OS) with macOS/Linux configs ready.

When you approve, I'll start with step 1 (project init + tooling) and proceed through the build order, explaining each layer as I go.