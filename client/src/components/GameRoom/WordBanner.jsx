import React from 'react';
import { useGame } from '../../context/GameContext';

/**
 * WordBanner
 *
 * - Drawer sees their actual word (from `drawerWord` in game state, populated
 *   by the server's `game:drawerWord` event — io.to(drawerId).emit).
 * - Guessers see underscore blanks matching `wordLength`.
 * - During 'word-select', shows a short waiting message.
 * - Hidden outside of 'word-select' / 'drawing' phases.
 *
 * Uses `mySocketId` from context (not raw socket.id) so `isDrawer` is always
 * reactive and never stale on initial render.
 */
function WordBanner() {
  const { phase, currentDrawerId, drawerName, wordLength, drawerWord, mySocketId } = useGame();

  // Use reactive mySocketId — raw socket.id can be undefined on first render
  const isDrawer = Boolean(mySocketId && mySocketId === currentDrawerId);

  if (phase === 'word-select') {
    if (isDrawer) return null; // drawer sees the WordSelectModal instead
    return (
      <div className="word-banner word-banner--waiting">
        <span className="wb-label">⏳ {drawerName} is choosing a word…</span>
      </div>
    );
  }

  if (phase !== 'drawing') return null;

  // Drawer: show the actual word (populated from server's game:drawerWord event)
  if (isDrawer) {
    return (
      <div className="word-banner word-banner--drawer">
        <span className="wb-label">Your word:</span>
        <span className="wb-word wb-word--reveal">{drawerWord}</span>
      </div>
    );
  }

  // Guessers: show letter-count blanks based on wordLength
  const blanks = wordLength > 0
    ? Array.from({ length: wordLength }, (_, i) => (
        <span key={i} className="wb-blank">_</span>
      ))
    : null;

  return (
    <div className="word-banner word-banner--guesser">
      <span className="wb-label">Guess the word:</span>
      <span className="wb-blanks">{blanks}</span>
      <span className="wb-hint">{wordLength} letters</span>
    </div>
  );
}

export default WordBanner;
