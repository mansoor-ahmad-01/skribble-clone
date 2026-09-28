import React from 'react';
import { useGame } from '../../context/GameContext';

/**
 * GameOverScreen
 * 
 * Displays the final scoreboard when the game is over and provides a "Play Again" button.
 */
function GameOverScreen() {
  const { phase, scores } = useGame();

  if (phase !== 'waiting' || scores.length === 0) return null;

  const handlePlayAgain = () => {
    window.location.reload();
  };

  return (
    <div className="scoreboard-panel">
      <h3 className="scoreboard-title">🏆 Final Scores</h3>
      <ol className="scoreboard-list">
        {scores.map((s, i) => (
          <li key={s.id} className={`scoreboard-item rank-${i + 1}`}>
            <span className="sb-rank">#{i + 1}</span>
            <span className="sb-name">{s.name}</span>
            <span className="sb-score">{s.score} pts</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="action-btn primary-btn play-again-btn"
        onClick={handlePlayAgain}
        style={{ marginTop: '20px' }}
      >
        🔄 Play Again
      </button>
    </div>
  );
}

export default GameOverScreen;
