import React, { useEffect, useRef, useState } from 'react';
import socket from './socket';
import { GameProvider, useGame } from './context/GameContext';
import Lobby from './components/Lobby/Lobby';
import PlayerList from './components/GameRoom/PlayerList';
import Canvas from './components/GameRoom/Canvas';
import Toolbar from './components/GameRoom/Toolbar';
import WordSelectModal from './components/GameRoom/WordSelectModal';
import WordBanner from './components/GameRoom/WordBanner';
import Timer from './components/GameRoom/Timer';
import GameOverScreen from './components/GameRoom/GameOverScreen';
import ChatBox from './components/GameRoom/ChatBox';
import './App.css';

function GameContent() {
  const {
    roomId, phase, dispatch,
    currentDrawerId, wordChoices,
    roundEndWord, roundNumber,
    drawerName, mySocketId,
  } = useGame();

  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState('');

  // Drawing state — lifted so Toolbar and Canvas share the same source of truth
  const [color, setColor] = useState('#111111');
  const [brushSize, setBrushSize] = useState(4);
  const canvasRef = useRef(null);

  // Use reactive mySocketId from context — NOT raw socket.id — so isDrawer
  // re-computes correctly after connect and whenever currentDrawerId updates.
  const isDrawer = Boolean(mySocketId && mySocketId === currentDrawerId);
  const isDrawing = phase === 'drawing';
  const isWordSelect = phase === 'word-select';

  const handleClear = () => {
    canvasRef.current?.clear(true);
  };

  const handleCopyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveRoom = () => {
    dispatch({ type: 'RESET_ROOM' });
    window.location.reload();
  };

  const handleStartGame = () => {
    setStartError('');
    socket.emit('game:start', { roomId }, (res) => {
      if (res?.error) setStartError(res.error);
    });
  };

  return (
    <main className="app-main">
      {!roomId ? (
        <Lobby />
      ) : (
        <section className="gameroom-placeholder">
          {/* ── Header ── */}
          <div className="gameroom-header">
            <div className="room-badge-group">
              <span className="room-label">Room Code:</span>
              <span className="room-code-badge">{roomId}</span>
              <button
                type="button"
                className="copy-btn-sm"
                onClick={handleCopyCode}
                title="Copy Room Code"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="room-status-group">
              {roundNumber > 0 && (
                <span className="round-indicator">Round {roundNumber}</span>
              )}
              <span className="phase-indicator">
                Status: <strong>{phase}</strong>
              </span>
              <button
                type="button"
                className="leave-btn-sm"
                onClick={handleLeaveRoom}
                title="Leave Room"
              >
                Leave
              </button>
            </div>
          </div>

          {/* ── Game body ── */}
          {/* ── Game body (Skribbl 3-column layout: Players | Canvas | Chat) ── */}
          <div className="gameroom-body">
            {/* Left column: Player list */}
            <aside className="gameroom-col-left">
              <PlayerList />
            </aside>

            {/* Center column: Game alerts, Word banner, Timer, Canvas, Toolbar */}
            <div className="gameroom-main">
              {/* Waiting phase: Start Game button */}
              {phase === 'waiting' && (
                <div className="start-game-panel">
                  <button
                    id="start-game-btn"
                    type="button"
                    className="action-btn primary-btn start-game-btn"
                    onClick={handleStartGame}
                  >
                    🎮 Start Game
                  </button>
                  {startError && (
                    <p className="start-game-error">{startError}</p>
                  )}
                </div>
              )}

              {/* Round-end reveal panel */}
              {phase === 'round-end' && (
                <div className="round-end-panel">
                  <p className="round-end-label">Round over!</p>
                  <p className="round-end-word">
                    The word was <strong>{roundEndWord}</strong>
                  </p>
                </div>
              )}

              {/* Game-over scoreboard */}
              <GameOverScreen />

              {/* Turn info banner — who is drawing */}
              {(isWordSelect || isDrawing) && drawerName && (
                <div className="turn-info-bar">
                  {isDrawer
                    ? '✏️ It\'s your turn to draw!'
                    : `✏️ ${drawerName} is drawing`}
                </div>
              )}

              {/* Word-select modal */}
              {wordChoices && wordChoices.length > 0 && (
                <WordSelectModal choices={wordChoices} />
              )}

              {/* Word banner (blanks for guessers, word for drawer) */}
              <WordBanner />

              {/* Timer progress bar directly above canvas */}
              <Timer />

              {/* Canvas drawing board */}
              <Canvas 
                ref={canvasRef} 
                color={color} 
                brushSize={brushSize} 
                roomId={roomId} 
                disabled={!isDrawer}
              />

              {/* Toolbar — attached directly below canvas */}
              {(isWordSelect || isDrawing) && (
                <Toolbar
                  color={color}
                  brushSize={brushSize}
                  onColor={setColor}
                  onBrushSize={setBrushSize}
                  onClear={handleClear}
                  disabled={!isDrawer}
                />
              )}
            </div>

            {/* Right column: Chat and Guesses */}
            <aside className="gameroom-col-right">
              <ChatBox />
            </aside>
          </div>
        </section>
      )}
    </main>
  );
}

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [socketId, setSocketId] = useState(socket.id || '');
  const [transport, setTransport] = useState(socket.io?.engine?.transport?.name || '');

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setSocketId(socket.id);
      const currentTransport = socket.io?.engine?.transport?.name || '';
      setTransport(currentTransport);
      console.log(`[App] Socket connected (${socket.id}). Transport: "${currentTransport}"`);
    }

    function onUpgrade(upgradedTransport) {
      const name = upgradedTransport?.name || '';
      setTransport(name);
      console.log(`[App] Socket transport upgraded to: "${name}"`);
    }

    function onDisconnect() {
      setIsConnected(false);
      setSocketId('');
      setTransport('');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io?.engine?.on('upgrade', onUpgrade);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <GameProvider>
      <div className="app-container">
        <header className="app-navbar">
          <div className="brand">
            <h1 className="logo-text">🎨 Skribbl<span className="logo-accent">Clone</span></h1>
          </div>
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
            <span className="status-text">
              {isConnected ? `Connected${transport ? ` (${transport})` : ''}` : 'Connecting...'}
            </span>
            {isConnected && socketId && (
              <span className="socket-id-tag">ID: {socketId.slice(0, 6)}...</span>
            )}
          </div>
        </header>

        <GameContent />
      </div>
    </GameProvider>
  );
}

export default App;
