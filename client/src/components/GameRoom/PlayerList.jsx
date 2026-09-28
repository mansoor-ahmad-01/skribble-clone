import React from 'react';
import { useGame } from '../../context/GameContext';

export function PlayerList() {
  const { players, guessedCorrectly, mySocketId } = useGame();

  return (
    <div className="player-list-container">
      <div className="player-list-header">
        <h3 className="player-list-title">Players</h3>
        <span className="player-count-badge">
          {players.length} {players.length === 1 ? 'Player' : 'Players'}
        </span>
      </div>

      {players.length === 0 ? (
        <p className="no-players-text">Waiting for players to join...</p>
      ) : (
        <ul className="players-list">
          {players.map((player) => {
            const isMe = player.id === mySocketId;
            const initials = player.name ? player.name.slice(0, 2).toUpperCase() : '??';

            return (
              <li
                key={player.id}
                className={`player-item ${isMe ? 'player-me' : ''} ${player.isDrawing ? 'player-drawing' : ''} ${guessedCorrectly.includes(player.id) ? 'player-guessed' : ''}`}
              >
                <div className="player-info">
                  <div className="player-avatar">
                    {initials}
                  </div>
                  <div className="player-meta">
                    <span className="player-name">
                      {player.name}
                      {isMe && <span className="you-pill">You</span>}
                      {player.isDrawing && <span className="drawing-pill">✏️ Drawing</span>}
                      {guessedCorrectly.includes(player.id) && <span className="guessed-pill">✅ Guessed</span>}
                    </span>
                    {!player.connected && (
                      <span className="disconnected-pill">Disconnected</span>
                    )}
                  </div>
                </div>

                <div className="player-score">
                  <span className="score-value">{player.score}</span>
                  <span className="score-label">pts</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PlayerList;
