import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';

/**
 * Timer
 *
 * Counts down in two phases using server-authoritative timestamps so all
 * clients stay in sync even if they joined mid-round or reconnected.
 *
 * ─ word-select phase ─
 *   Uses `wordSelectStartTime` (set client-side the moment word:choices arrives)
 *   and `wordSelectDuration` (15 s, matching WORD_SELECT_TIMEOUT_MS on the server).
 *   Only visible to the drawer (non-drawers don't have wordSelectStartTime set).
 *
 * ─ drawing phase ─
 *   Uses `roundStartTime` (from server) and `roundDuration` (from server).
 *   Visible to all clients; shows how much drawing time remains.
 *
 * Color shifts: green → yellow (≤20 s) → red (≤10 s).
 * Stops the interval/rAF exactly at 0 and never displays negative time.
 */
function Timer() {
  const {
    phase,
    roundStartTime, roundDuration,
    wordSelectStartTime, wordSelectDuration,
  } = useGame();

  const [secondsLeft, setSecondsLeft] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    // Determine which timing anchor to use for this phase
    let startTime = null;
    let duration = 0;

    if (phase === 'word-select' && wordSelectStartTime) {
      startTime = wordSelectStartTime;
      duration = wordSelectDuration;
    } else if (phase === 'drawing' && roundStartTime) {
      startTime = roundStartTime;
      duration = roundDuration;
    }

    // Clear any running animation and reset when not in a timed phase
    if (!startTime || duration <= 0) {
      setSecondsLeft(null);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      const elapsed   = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setSecondsLeft(Math.ceil(remaining / 1000));
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, roundStartTime, roundDuration, wordSelectStartTime, wordSelectDuration]);

  // Only render in timed phases and once we have a value
  const isTimedPhase = phase === 'drawing' || phase === 'word-select';
  if (!isTimedPhase || secondsLeft === null) return null;

  const total = phase === 'drawing' ? roundDuration / 1000 : wordSelectDuration / 1000;
  const pct = (secondsLeft / total) * 100;

  const isWarning = secondsLeft <= 10;
  const isDanger  = secondsLeft <= 5;

  const label = phase === 'word-select' ? 'Choose a word' : null;

  return (
    <div className={`timer-container ${isWarning ? 'timer--warning' : ''} ${isDanger ? 'timer--danger' : ''}`}>
      {label && <span className="timer-phase-label">{label}</span>}
      <div className="timer-track">
        <div
          className="timer-bar"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="timer-value">{secondsLeft}s</span>
    </div>
  );
}

export default Timer;
