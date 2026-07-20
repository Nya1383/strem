# STREM — Desktop & Application Streamer 🚀

> A modern, production-quality, ultra-low latency desktop and application window streaming application built with **Electron**, **React**, **TypeScript**, **Node.js**, **WebRTC**, and **WebSocket Signaling**.

---

## 🌟 Features

- ⚡ **Ultra-Low Latency Streaming**: WebRTC peer-to-peer media pipeline targeting sub-200ms glass-to-glass latency.
- 💻 **Screen & Window Selection**: Live grid preview of all active monitors and application windows with instant selection.
- 🎙️ **Audio Capture & Web Audio Mixing**: Blends system audio loopback with microphone audio into a single stream with independent mute controls.
- 🤖 **Discord Bot Auto-Announcements**: Automatically posts rich live stream cards and 1-click watch links to your Discord text channel using your Discord Bot Token + Channel ID (or Webhook URL).
- 🔗 **1-Click Deep Linking (`strem://`)**: Clicking a `strem://join/<roomId>` link in Discord or any browser automatically launches STREM and joins the stream room instantly.
- 📊 **Real-time Diagnostics HUD**: Floating overlay tracking RTT Latency (`ms`), Framerate (`FPS`), Bitrate (`Mbps`), Packet Loss (`%`), Video Codec (`H.264`), and Connection Quality tier.
- 🎥 **Stream Recording & Snapshots**: Built-in MediaRecorder to record live stream output directly to `.webm` video files and take high-res PNG snapshots.
- 💬 **Live Stream Chat**: Built-in chat drawer supporting real-time text messaging, broadcaster/viewer role badges, and chat history replay for new viewers.
- 🎨 **Discord/OBS/Steam Dark Theme**: Modern glassmorphism dark mode interface with custom frameless window titlebar, glowing status indicators, and responsive layouts.

---

## 📋 Prerequisites

Before setting up STREM, ensure you have the following installed on your machine:

- **Node.js**: `v18.18.0` or higher ([Download Node.js](https://nodejs.org/))
- **npm** (comes bundled with Node.js) or **pnpm**

Verify installation in your terminal:
```bash
node -v
npm -v
```

---

## 🛠️ Quick Start & Installation

### 1. Open Project Directory
Navigate to the project root folder:
```bash
cd STREM
```

### 2. Install Dependencies
Install all required project dependencies:
```bash
npm install
```
*(or `pnpm install` if using pnpm)*

### 3. Run Development Mode
Start the application in local development mode:
```bash
npm run dev
```

This will compile TypeScript targets, start the Vite dev server, launch the embedded WebSocket signaling server on port `8080`, and open the STREM application window!

---

## 📖 How to Use STREM

### 📡 Broadcaster Studio (Streaming Your Desktop)

1. Click **Broadcaster Studio** (video camera icon on the left sidebar).
2. Under **Select Capture Source**, click on any monitor or open application window thumbnail.
3. Review your live stream in the studio preview box.
4. *(Optional)* Enter a **Room Password** if you wish to restrict viewer access.
5. Click **🚀 Start Stream**.
6. Your stream goes live instantly! A 6-character Room ID (e.g., `x7k9p2`) is generated.
7. Click **Share Stream & QR Code** to copy your room link or display a QR code for mobile joining.

---

### 📺 Viewer Mode (Watching a Stream)

#### Method A: Direct 1-Click Link (Discord / Browser)
Simply click any **`strem://join/<roomId>`** link posted in Discord or your browser. STREM will automatically open and connect to the stream room!

#### Method B: Manual Room ID Entry
1. Open STREM and click **Watch Stream** (play button on the left sidebar).
2. Enter the 6-character **Stream Room ID** (and password if required).
3. Click **📺 Watch Stream**.

---

## 🤖 Setting Up Discord Bot Stream Alerts

STREM can automatically announce your live streams in your Discord channel whenever you click **Start Stream**.

### Option 1: Discord Bot Token & Channel ID (Recommended)

1. **Create a Discord Bot**:
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications).
   - Click **New Application** and give it a name (e.g., `STREM Bot`).
   - Navigate to the **Bot** tab on the left menu and click **Reset Token** to copy your **Bot Token**.
   - Enable **Send Messages** and **Embed Links** bot permissions.
   - Copy the Bot invite link under **OAuth2** -> **URL Generator** (scope: `bot`, permissions: `Send Messages`, `Embed Links`), open it in a browser, and invite your bot to your Discord server.

2. **Get your Discord Channel ID**:
   - In Discord, go to **User Settings** -> **Advanced** and enable **Developer Mode**.
   - Right-click the text channel where you want stream alerts posted and click **Copy Channel ID**.

3. **Configure STREM**:
   - Open STREM and go to **Settings** (gear icon on the sidebar).
   - Select **🤖 Discord Bot Token & Channel ID**.
   - Paste your **Bot Token** and **Channel ID**.
   - Click **Test Bot** to verify — a test message will appear in your channel!

---

### Option 2: Discord Webhook URL (Zero-Bot Setup)

1. In Discord, right-click your text channel -> **Edit Channel** -> **Integrations** -> **Webhooks**.
2. Click **New Webhook** and click **Copy Webhook URL**.
3. In STREM **Settings**, select **🔗 Discord Webhook URL**, paste your URL, and click **Test Webhook**.

---

## 📦 Building Production Executables

To build packaged production installers/executables for your operating system:

### Windows Executable (.exe)
```bash
npm run build:win
```

### macOS Bundle (.dmg / .app)
```bash
npm run build:mac
```

### Linux Package (.AppImage / .deb)
```bash
npm run build:linux
```

The compiled binaries will be output to the `dist/` directory.

---

## 📂 Project Structure

```
STREM/
├── electron.vite.config.ts  # Bundler configuration for Main, Preload & Renderer
├── package.json             # Dependencies and build scripts
├── tsconfig.node.json       # TypeScript config for Main & Preload process
├── tsconfig.web.json        # TypeScript config for React Renderer process
├── tests/
│   └── signaling.test.ts    # Unit tests for Zod schemas & room signaling
└── src/
    ├── main/                # Electron Main Process
    │   ├── index.ts         # App lifecycle, window creation & deep-link protocol
    │   ├── ipc/             # Desktop capturer & window control IPC handlers
    │   ├── services/        # Discord REST API notification service
    │   └── signaling/       # In-process WebSocket server & Zod validation schemas
    ├── preload/
    │   └── index.ts         # ContextBridge API exposing window.electronAPI
    ├── shared/              # Shared types, IPC channels & signaling contracts
    └── renderer/            # React + TypeScript Frontend
        ├── index.html       # Single page app container
        └── src/
            ├── App.tsx      # Main application router
            ├── components/  # Broadcaster, Viewer, Chat, TitleBar & Stats components
            ├── context/     # StreamContext, ChatContext, SettingsContext
            ├── pages/       # BroadcasterPage, ViewerPage, SettingsPage
            ├── services/    # WebRTC peer managers, media stream capture & stats collector
            └── styles/      # Obsidian dark theme CSS design system
```

---

## 🧪 Running Unit Tests

Run the Vitest test suite to verify signaling message schemas:
```bash
npm run test
```

Run TypeScript typecheck across all files:
```bash
npm run typecheck
```

---

## 🛡️ License

Distributed under the **MIT License**. See `LICENSE` for more information.
