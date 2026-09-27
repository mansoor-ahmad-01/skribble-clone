import {
  ROUND_DURATION_MS,
  WORD_SELECT_TIMEOUT_MS,
  MAX_ROUNDS,
  ROUND_END_DELAY_MS,
} from '../config.js';
import { pickRandomWords } from '../words.js';

export class Room {
  constructor(id) {
    this.id = id;
    this.players = new Map();
    this.phase = 'waiting';
    this.turnOrder = [];
    this.turnIndex = 0;

    /** Accumulated stroke segments for late-joiner replay. */
    this.strokes = [];

    // ── Game-loop state ──────────────────────────────────────────────────────
    /** Socket ID of the current drawer. */
    this.currentDrawerId = null;
    /** The secret word for this turn (null between turns). */
    this.currentWord = null;
    /** The 3 word choices sent to the drawer at word-select time. */
    this.wordChoices = [];
    /** 1-based round counter. */
    this.roundNumber = 0;
    /** Set of socket IDs that have guessed correctly this turn. */
    this.guessedCorrectly = new Set();
    /** Date.now() timestamp when drawing actually began. */
    this.roundStartTime = null;

    // Internal timer handles so we can cancel them on advance/cleanup
    this._wordSelectTimer = null;
    this._roundTimer = null;
    this._roundEndTimer = null;
  }

  // ── Player management ────────────────────────────────────────────────────

  addPlayer(player) {
    if (!player || !player.id) return null;
    this.players.set(player.id, player);
    if (!this.turnOrder.includes(player.id)) {
      this.turnOrder.push(player.id);
    }
    return player;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId) || null;
    if (player) {
      this.players.delete(playerId);
      this.turnOrder = this.turnOrder.filter((id) => id !== playerId);
      // If drawer left mid-turn we need to re-index
      if (this.turnIndex >= this.turnOrder.length && this.turnOrder.length > 0) {
        this.turnIndex = 0;
      }
    }
    return player;
  }

  getPlayerList() {
    return Array.from(this.players.values());
  }

  /** Wipe accumulated stroke history (called on draw:clear). */
  clearStrokes() {
    this.strokes = [];
  }

  // ── Game loop ────────────────────────────────────────────────────────────

  /**
   * Begin the game. Must be called only when phase === 'waiting' and
   * there are ≥ 2 players. Needs `io` so it can emit events.
   */
  startGame(io) {
    this.roundNumber = 1;
    this.turnIndex = 0;
    this._clearAllTimers();
    this.clearStrokes();
    this._resetPlayerScores();
    this.startWordSelection(io);
  }

  /**
   * Pick the next drawer, emit word:choices to them privately,
   * and emit game:turnStart to everyone else.
   */
  startWordSelection(io) {
    this.phase = 'word-select';
    this.currentWord = null;
    this.wordChoices = [];
    this.guessedCorrectly = new Set();
    this.roundStartTime = null;
    this._clearAllTimers();

    // Mark isDrawing on the current drawer player object
    const drawerId = this.turnOrder[this.turnIndex];
    this.currentDrawerId = drawerId;
    this._updateIsDrawing(drawerId);

    const drawer = this.players.get(drawerId);
    const drawerName = drawer ? drawer.name : 'Unknown';
    const choices = pickRandomWords(3);
    this.wordChoices = choices;

    console.log(
      `[Room ${this.id}] Round ${this.roundNumber}, turn ${this.turnIndex}. ` +
      `Drawer: "${drawerName}" (${drawerId}). Choices: ${choices.join(', ')}`
    );

    // Private to drawer
    io.to(drawerId).emit('word:choices', { choices, roundNumber: this.roundNumber });

    // Public to everyone
    io.to(this.id).emit('game:turnStart', {
      drawerId,
      drawerName,
      roundNumber: this.roundNumber,
    });

    // Auto-pick after timeout if drawer is idle
    this._wordSelectTimer = setTimeout(() => {
      if (this.phase === 'word-select' && this.currentDrawerId === drawerId) {
        console.log(`[Room ${this.id}] Word-select timeout; auto-picking "${choices[0]}"`);
        this.setWord(choices[0], io);
      }
    }, WORD_SELECT_TIMEOUT_MS);
  }

  /**
   * Confirm the chosen word, begin the drawing phase, start the round timer.
   */
  setWord(word, io) {
    this._clearTimer('_wordSelectTimer');

    this.currentWord = word;
    this.phase = 'drawing';
    this.roundStartTime = Date.now();
    this.guessedCorrectly = new Set();
    this.clearStrokes(); // fresh canvas for the new turn

    console.log(`[Room ${this.id}] Word set: "${word}". Drawing phase started.`);

    // Tell every NON-drawer the word length (underscores) + timing anchor
    const nonDrawerIds = this.turnOrder.filter((id) => id !== this.currentDrawerId);
    for (const sid of nonDrawerIds) {
      io.to(sid).emit('game:wordLength', {
        wordLength: word.length,
        roundStartTime: this.roundStartTime,
        roundDuration: ROUND_DURATION_MS,
        roundNumber: this.roundNumber,
      });
    }
    // Tell the drawer their actual word and the timing anchor
    io.to(this.currentDrawerId).emit('game:drawerWord', {
      word,
      roundStartTime: this.roundStartTime,
      roundDuration: ROUND_DURATION_MS,
      roundNumber: this.roundNumber,
    });

    // Clear the canvas for everyone
    io.to(this.id).emit('draw:clear');

    // Round timer
    this._roundTimer = setTimeout(() => {
      if (this.phase === 'drawing') {
        console.log(`[Room ${this.id}] Round timer expired.`);
        this.endTurn(io);
      }
    }, ROUND_DURATION_MS);
  }

  /**
   * End the current turn: reveal word, broadcast scores, then advance.
   */
  endTurn(io) {
    this._clearAllTimers();
    this.phase = 'round-end';

    const scores = this._buildScoreList();
    console.log(`[Room ${this.id}] Turn ended. Word was "${this.currentWord}".`);

    io.to(this.id).emit('game:roundEnd', {
      word: this.currentWord,
      scores,
      roundNumber: this.roundNumber,
    });

    // Short pause then advance
    this._roundEndTimer = setTimeout(() => {
      this.advanceTurn(io);
    }, ROUND_END_DELAY_MS);
  }

  /**
   * Move to the next player/round. Triggers game:over when rounds are exhausted.
   */
  advanceTurn(io) {
    this._clearAllTimers();

    // Advance index; when we've gone through all players, increment round
    this.turnIndex++;
    if (this.turnIndex >= this.turnOrder.length) {
      this.turnIndex = 0;
      this.roundNumber++;
    }

    if (this.roundNumber > MAX_ROUNDS || this.turnOrder.length < 2) {
      // Game over
      this.phase = 'waiting';
      this.currentDrawerId = null;
      this.currentWord = null;
      this._updateIsDrawing(null);
      const scores = this._buildScoreList();
      console.log(`[Room ${this.id}] Game over after ${MAX_ROUNDS} rounds.`);
      io.to(this.id).emit('game:over', { scores });
    } else {
      this.startWordSelection(io);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  _clearTimer(key) {
    if (this[key]) {
      clearTimeout(this[key]);
      this[key] = null;
    }
  }

  _clearAllTimers() {
    this._clearTimer('_wordSelectTimer');
    this._clearTimer('_roundTimer');
    this._clearTimer('_roundEndTimer');
  }

  _updateIsDrawing(drawerId) {
    for (const player of this.players.values()) {
      player.isDrawing = player.id === drawerId;
    }
  }

  _resetPlayerScores() {
    for (const player of this.players.values()) {
      player.score = 0;
    }
  }

  _buildScoreList() {
    return this.getPlayerList()
      .map((p) => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }
}

export default Room;
