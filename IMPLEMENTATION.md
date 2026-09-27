# Skribbl Clone Implementation Log

This document records the architectural decisions, configuration details, and exact changes made across every stage of development.

---

## 1. Project Architecture

The project is structured as a monorepo containing two primary workspaces:
- `server/`: Backend service powered by Node.js, Express, and Socket.IO.
- `client/`: Frontend single-page application built with React and `socket.io-client`.

---

## 2. Server Implementation (`server/`)

- **Port**: `process.env.PORT || 4000`
- **Dependencies**: `express`, `socket.io`, `cors`, `nodemon` (dev)
- **Files**:
  - `server/package.json`
  - `server/src/index.js`
- **Features**:
  - Express app wrapped with an HTTP server.
  - Socket.IO attached to HTTP server.
  - CORS origin restricted to `http://localhost:5173`.
  - Connection listener logging `Client connected: <socket.id>`.
  - Disconnect listener logging `Client disconnected: <socket.id>`.
- **Status**: Intact and untouched per user instructions.

---

## 3. Client Implementation Stages

### Stage 1: Initial Setup (Vite + React) [Superseded]
- Scaffolded Vite + React application in `client/`.
- Installed `socket.io-client`.
- Created `client/src/socket.js` and `client/src/App.jsx`.
- Verified socket communication between server and client.
- *Status*: Replaced in Stage 2 per requirement for plain React app without Vite.

---

### Stage 2: Plain React App via Create React App (Completed)

#### Step 2.1: Clean Removal of Previous Client
- Terminated running Vite development server task.
- Removed entire `client/` directory (`rm -rf client`).
- Verified `server/` remained untouched.

#### Step 2.2: Scaffolding with Create React App
- Executed `npx create-react-app client` in the project root.
- Generated standard React application structure using `react-scripts`.

#### Step 2.3: Dependency Installation
- Installed `socket.io-client`:
  ```bash
  cd client && npm install socket.io-client
  ```

#### Step 2.4: Socket Instance Configuration
- Created `client/src/socket.js`:
  - Exports a single `socket.io-client` instance connected to `http://localhost:4000`.

#### Step 2.5: Application UI & Connection Logging
- Created `client/src/App.jsx`:
  - Hooks into React's `useEffect` on mount.
  - Logs `App mounted. Initial socket connected status: <boolean>`.
  - Attaches listeners for `connect`, `disconnect`, and `connect_error`.
  - Logs `Socket connected! ID: <socket.id>` upon connection.
  - Displays real-time connection status and Socket ID on screen.
  - Cleaned up default `App.js` and `App.test.js`.
  - Cleaned up `client/src/App.css`.

#### Step 2.6: Port & CORS Alignment
- Configured `client/.env`:
  ```env
  PORT=5173
  BROWSER=none
  ```
  *Rationale*: Setting CRA to port `5173` ensures zero CORS issues with the backend (`server/src/index.js` allows `http://localhost:5173`) while keeping `server/` 100% untouched.

#### Step 2.7: Verification & Testing
- Executed production build (`npm run build`) -> **Compiled successfully**.
- Started CRA development server (`npm start`) -> **Running on `http://localhost:5173`**.
- Verified HTTP response with `curl -I http://localhost:5173` -> **200 OK**.
- Verified socket connection using `client/src/socket.js`:
  - Backend server output confirmed:
    ```text
    Client connected: a19eHsaQpLFEu68-AAAC
    Client disconnected: a19eHsaQpLFEu68-AAAC
    ```

---

## 4. How to Run Client and Server

### Option 1: Two Separate Terminals (Standard)

#### Terminal 1 — Start Server:
```bash
cd server
npm run dev
```
- Starts Express & Socket.IO server on `http://localhost:4000` with auto-reloading via `nodemon`.

#### Terminal 2 — Start Client:
```bash
cd client
npm start
```
- Starts React development server on `http://localhost:3000` (or `http://localhost:5173`).

---

## 5. Subsequent Stages & Milestones

### Stage 3: Real-Time Canvas & Multiplayer Room Mechanics
- **Canvas Optimization**: Implemented ~60 FPS throttled emission (`16ms`) in `Canvas.jsx` to prevent socket congestion.
- **Continuous Coordinates**: Emits `{ x0, y0, x1, y1, color, lineWidth }` segments so clients render smooth continuous paths without dropped lines.
- **Incremental Rendering**: Switched remote stroke listener from whole-canvas redrawing to direct `moveTo`/`lineTo` rendering.
- **Late-Joiner Replay**: Stored stroke history in `Room.js` and transmitted via `draw:replay` upon room connection.
- **Room Lifecycle**: Integrated `RoomManager.js` with multi-room isolation and alphanumeric room codes.

### Stage 4: Word Selection, Timers & Scoring
- **Word Selection Flow**: Server generates 3 random words and emits `word:choices` directly to the drawer. Gating uncoupled from race conditions to ensure instant modal display.
- **Drawer Word Event**: Emits `game:drawerWord` to reveal the secret word to the active drawer while guessers receive `game:wordLength`.
- **Synchronized Draining Timers**: Transmits server-authoritative `roundStartTime` and `roundDuration` so late joiners and reconnected clients immediately compute matching remaining time.
- **Chat & Real-time Scoring**: Registered `registerChatHandlers` in `server/src/index.js`, evaluating guesses server-side and immediately broadcasting `room:update` with fresh scores.

### Stage 5: Authentic skribbl.io Visual Redesign
- **Light Theme**: Replaced all dark backgrounds and gradients with a clean light theme (`#f4f5f8` base, `#ffffff` panels).
- **skribbl.io 3-Column Layout**:
  - Left column: `PlayerList` with avatar badges, score, and yellow/green highlights.
  - Center column: Dominant `Canvas` (~65-70% width), `WordBanner`, horizontal draining `Timer` bar, and attached `Toolbar`.
  - Right column: `ChatBox` with pinned input and green correct-guess banners.
- **Typography**: Integrated Google Fonts **Nunito** for a playful, rounded sans-serif look.


