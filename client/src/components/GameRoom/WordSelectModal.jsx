import React from 'react';
import socket from '../../socket';
import { useGame } from '../../context/GameContext';

/**
 * WordSelectModal — shown exclusively to the current drawer during 'word-select'.
 * Displays 3 word choices and emits word:select when one is clicked.
 * Immediately dispatches WORD_CHOSEN to clear wordChoices from state so the
 * modal closes right away rather than waiting for the server round-trip.
 */
function WordSelectModal({ choices }) {
  const { roomId, dispatch } = useGame();
  console.log('[WordSelectModal] Mounted with choices:', choices);

  const handlePick = (word) => {
    // 1. Emit the selection to the server
    socket.emit('word:select', { roomId, word });
    // 2. Optimistically clear wordChoices so the modal unmounts immediately
    dispatch({ type: 'WORD_CHOSEN' });
  };

  return (
    <div className="ws-overlay" role="dialog" aria-modal="true" aria-label="Choose a word">
      <div className="ws-modal">
        <p className="ws-label">Choose a word to draw</p>
        <div className="ws-choices">
          {choices.map((word) => (
            <button
              key={word}
              id={`word-choice-${word}`}
              type="button"
              className="ws-choice-btn"
              onClick={() => handlePick(word)}
            >
              {word}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WordSelectModal;
