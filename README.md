# 🎨 skribbl.io Clone

A full-featured, real-time multiplayer drawing and guessing game built with **React**, **Node.js**, **Express**, and **Socket.IO**. Designed with an authentic, playful light visual style inspired directly by **skribbl.io**.

---

## 🌟 Key Features

- **Multiplayer Room System**:
  - Create custom rooms or join with a 5-letter room code.
  - Multi-room isolation with dynamic player tracking, connection status, and graceful leaves/disconnects.
  - Minimum 2 players required to start a game.

- **Authentic skribbl.io Visual Style**:
  - **3-Column Layout**: Players column on the left, dominant Canvas workspace in the center (~65-70% width), and Chat on the right.
  - **Single Light Theme**: Soft light background (`#f4f5f8`), signature teal-blue accents (`#1e90c8`), and Google Font **Nunito** typography.
  - **Dynamic Player Indicators**:
    - Active drawer highlighted with a standout yellow background (`#fff9db`), amber border, and `✏️ Drawing` badge.
    - Correct guessers highlighted with a fresh green background (`#dcfce7`) and `✅ Guessed` badge.
  - **Word Banner**: Skribbl-style cream/yellow pill showing spaced-out blanks (`_ _ _ _`) for guessers and the actual word in bold teal-blue for the drawer.
  - **Live Draining Timer Bar**: Horizontal progress bar right above the canvas that smoothly transitions from green (`#22c55e`) → yellow (`#f59e0b`) → red (`#ef4444`).
  - **Attached Canvas Toolbar**: Color swatches with active selection rings, adjustable brush size slider with live dot preview, and a Clear canvas button.

- **High-Performance Synchronized Canvas**:
  - Throttled emission (~60 FPS / 16ms) to prevent network lag.
  - Continuous coordinate segments `(x0, y0, x1, y1)` ensuring uninterrupted strokes even with dropped packets.
  - Direct canvas rendering using `moveTo`/`lineTo` without expensive full re-renders.
  - Late-joiner stroke replay (`draw:replay`) to keep all players in sync mid-round.

- **Game Lifecycle & Mechanics**:
  - **Word Selection Phase**: 3 randomly selected words presented to the drawer with a 15-second countdown timer. Auto-picks on timeout.
  - **Drawing & Guessing Phase**: Guessers type into chat; drawer sees live updates.
  - **Server-Authoritative Scoring**: Guesses evaluated server-side. Points awarded based on speed; drawer receives bonus points per correct guess.
  - **Real-Time Score Refresh**: Scores and player list update immediately upon correct guesses.
  - **Round End & Game Over**: Word reveal at the end of each round; final scoreboard podium with a "Play Again" option at game completion.

---

## 📁 Project & Folder Structure

```text
skribble-clone/
├── client/                     # Frontend React Single Page Application
│   ├── public/
│   │   ├── index.html          # HTML entry point with Google Fonts (Nunito)
│   │   ├── favicon.ico
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── GameRoom/
│   │   │   │   ├── Canvas.jsx          # Drawing board with pointer event handling
│   │   │   │   ├── ChatBox.jsx         # Chat feed, guess input, & system alerts
│   │   │   │   ├── GameOverScreen.jsx  # Final rankings podium & play again action
│   │   │   │   ├── PlayerList.jsx      # Player cards, scores, & status badges
│   │   │   │   ├── Timer.jsx           # Draining horizontal progress bar
│   │   │   │   ├── Toolbar.jsx         # Color swatches, brush slider, clear button
│   │   │   │   ├── WordBanner.jsx      # Word blanks or revealed secret word
│   │   │   │   └── WordSelectModal.jsx # Drawer 3-choice word selection modal
│   │   │   └── Lobby/
│   │   │       └── Lobby.jsx           # Join / create room and room code sharing
│   │   ├── context/
│   │   │   └── GameContext.jsx         # Global state management & socket event dispatch
│   │   ├── App.jsx             # Top-level container, navbar, & 3-column layout
│   │   ├── App.css             # Complete skribbl.io light visual stylesheet
│   │   ├── index.css           # Base body styles & typography
│   │   ├── index.js            # React root mount
│   │   └── socket.js           # Shared Socket.IO client instance
│   └── package.json            # Client dependencies & scripts
│
├── server/                     # Backend Node.js + Express + Socket.IO service
│   ├── src/
│   │   ├── rooms/
│   │   │   ├── Player.js       # Player model (id, name, score, isDrawing, connected)
│   │   │   ├── Room.js         # Room state machine (phases, turns, rounds, timers)
│   │   │   └── RoomManager.js  # In-memory room store & cleanup logic
│   │   ├── sockets/
│   │   │   ├── chatHandlers.js # Chat message routing, guess checking, scoring
│   │   │   ├── drawHandlers.js # Drawing stroke relay, clear, & stroke storage
│   │   │   ├── gameHandlers.js # Game start and word selection handlers
│   │   │   └── roomHandlers.js # Room join, leave, disconnect, & state re-sync
│   │   ├── config.js           # Game constants (durations, timeouts, word list)
│   │   └── index.js            # Express server, Socket.IO setup, & static hosting
│   └── package.json            # Server dependencies & scripts
│
├── package.json                # Root orchestration scripts
└── README.md                   # Project documentation
```

---

## 🛠️ Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

---

## 📦 Installation Procedures

You can install all dependencies across the root, backend, and frontend with a single command from the project root:

```bash
# Clone the repository (if not already local)
git clone <repository-url>
cd skribble-clone

# Install root, server, and client dependencies
npm install && npm install --prefix server && npm install --prefix client
```

Or step-by-step per directory:

1. **Install root dependencies**:
   ```bash
   npm install
   ```

2. **Install server dependencies**:
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Install client dependencies**:
   ```bash
   cd client
   npm install
   cd ..
   ```

---

## 🚀 Running in Development Mode

To run both the backend server and frontend client concurrently with hot-reloading:

```bash
npm run dev
```

This uses `concurrently` to launch:
- **Server**: Runs via `nodemon` on `http://localhost:4000`
- **Client**: Runs via Create React App dev server on `http://localhost:3000` (or `http://localhost:5173`)

### Running in Separate Terminals (Optional)

If you prefer separate terminal logs:

- **Terminal 1 (Backend)**:
  ```bash
  cd server
  npm run dev
  ```
- **Terminal 2 (Frontend)**:
  ```bash
  cd client
  npm start
  ```

---

## 🚢 Building and Running in Production

In production, the React frontend is compiled into optimized static assets and served directly by the Express backend on a single port (`http://localhost:4000`):

1. **Build the client**:
   ```bash
   npm run build
   ```
   *(Compiles static assets into `client/build/`)*

2. **Start the production server**:
   ```bash
   NODE_ENV=production npm start
   ```

The application will be accessible at `http://localhost:4000`.

---

## 📡 Socket.IO Event Reference

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `room:join` | Client → Server | `{ roomId?, playerName }` | Join an existing room or create a new room |
| `room:update` | Server → Room | `{ roomId, players, phase }` | Broadcast updated room roster, status, and scores |
| `game:start` | Client → Server | `{ roomId }` | Start game (requires host & ≥2 players) |
| `game:turnStart` | Server → Room | `{ drawerId, drawerName, roundNumber }` | Broadcast the start of a turn and the active drawer |
| `word:choices` | Server → Drawer | `{ choices: string[], roundNumber }` | Privately send 3 word options to the active drawer |
| `word:select` | Drawer → Server | `{ roomId, word }` | Active drawer picks a word from choices |
| `game:drawerWord` | Server → Drawer | `{ word, roundStartTime, roundDuration, ... }` | Privately confirm the secret word to the drawer |
| `game:wordLength` | Server → Guessers | `{ wordLength, roundStartTime, roundDuration, ... }` | Inform guessers of the word length and round timer |
| `draw:stroke` | Bidirectional | `{ roomId, strokeData: { x0, y0, x1, y1, color, lineWidth } }` | Transmit drawing segments between clients |
| `draw:clear` | Bidirectional | `{ roomId }` | Clear the canvas for all clients in the room |
| `draw:replay` | Server → Client | `strokeData[]` | Replay existing strokes for late joiners |
| `chat:message` | Bidirectional | `{ roomId, text, playerName?, system? }` | Chat messaging and correct-guess announcements |
| `game:correctGuess`| Server → Room | `{ playerId, playerName, pointsAwarded }` | Announce a player's successful guess |
| `game:roundEnd` | Server → Room | `{ word, scores, roundNumber }` | Reveal the secret word and end-of-round scores |
| `game:over` | Server → Room | `{ scores }` | Final game-over scoreboard podium |

---

## 🎮 How to Play

1. **Enter Your Name**: Enter a nickname in the lobby and either create a new room or enter a friend's room code.
2. **Invite Friends**: Copy and share the 5-letter room code (e.g., `8TEMM`).
3. **Start Game**: When at least 2 players are in the room, click **🎮 Start Game**.
4. **Drawing**:
   - When it's your turn, select one of the three word options.
   - Use the bottom toolbar to pick colors, change brush thickness, and draw on the canvas.
5. **Guessing**:
   - Watch the canvas and look at the blank underscores at the top.
   - Type your guesses in the chat box on the right. Faster guesses earn more points!
6. **Win**: The player with the highest score at the end of all rounds wins the match!
