import React, { createContext, useContext, useReducer, useEffect } from 'react';
import socket from '../socket';

const GameContext = createContext(null);

const initialState = {
  roomId: '',
  players: [],
  phase: 'waiting',
  // ── Connection ───────────────────────────────────────────────────────────
  mySocketId: '',        // reactive socket.id — use this for isDrawer checks
  // ── Game-loop state ──────────────────────────────────────────────────────
  currentDrawerId: null,
  drawerName: '',
  roundNumber: 0,
  wordLength: 0,             // non-zero during 'drawing' phase (for guessers)
  wordChoices: [],           // non-empty only for the drawer during 'word-select'
  wordSelectStartTime: null, // Date.now() when drawer received word:choices (for countdown)
  wordSelectDuration: 15000, // ms the drawer has to pick (mirrors WORD_SELECT_TIMEOUT_MS)
  drawerWord: '',            // non-empty only for the drawer during 'drawing'
  roundStartTime: null,      // ms timestamp; set when drawing begins
  roundDuration: 0,          // ms duration of the round
  roundEndWord: '',          // the word revealed at round-end
  scores: [],                // array of {id, name, score}
  guessedCorrectly: [],      // array of playerIds who guessed correctly
};

function gameReducer(state, action) {
  switch (action.type) {

    // ── Connection ─────────────────────────────────────────────────────────
    case 'SET_MY_SOCKET_ID':
      return { ...state, mySocketId: action.payload };

    // ── Room ───────────────────────────────────────────────────────────────
    case 'ROOM_UPDATE': {
      const payload = action.payload;
      if (Array.isArray(payload)) {
        return { ...state, players: payload };
      }
      return {
        ...state,
        roomId:  payload?.roomId  !== undefined ? payload.roomId  : state.roomId,
        players: Array.isArray(payload?.players) ? payload.players : state.players,
        phase:   payload?.phase   !== undefined ? payload.phase   : state.phase,
      };
    }
    case 'SET_ROOM_ID':
      return { ...state, roomId: action.payload };

    case 'RESET_ROOM':
      return initialState;

    // Server → everyone: a new drawing turn is starting.
    // NOTE: do NOT reset wordChoices here. The server emits word:choices to the
    // drawer BEFORE it emits game:turnStart (Room.js lines 116 → 119), so by the
    // time TURN_START is processed the drawer's WORD_CHOICES dispatch has already
    // set wordChoices. Resetting here wipes those choices and the modal never opens.
    // wordChoices is cleared by WORD_CHOSEN (drawer picks) and DRAWER_WORD/WORD_LENGTH
    // (drawing begins), which is sufficient.
    case 'TURN_START':
      return {
        ...state,
        phase:               'word-select',
        currentDrawerId:     action.payload.drawerId,
        drawerName:          action.payload.drawerName,
        roundNumber:         action.payload.roundNumber,
        wordLength:          0,
        // wordChoices intentionally NOT reset here — see note above
        wordSelectStartTime: state.wordSelectStartTime || Date.now(),
        drawerWord:          '',
        roundStartTime:      null,
        roundDuration:       0,
        roundEndWord:        '',
        guessedCorrectly:    [],
      };


    // Server → drawer only: here are your word choices
    // wordSelectStartTime is recorded here (client-side now()) so the countdown
    // timer starts from the moment the drawer actually receives the choices.
    case 'WORD_CHOICES':
      return {
        ...state,
        phase:               'word-select',
        wordChoices:         action.payload.choices,
        roundNumber:         action.payload.roundNumber,
        wordSelectStartTime: state.wordSelectStartTime || Date.now(),
      };

    // Drawer picked a word — immediately clear choices so modal closes
    // (don't wait for the server round-trip confirmation)
    case 'WORD_CHOSEN':
      return { ...state, wordChoices: [], wordSelectStartTime: null };

    // Server → non-drawers: word length + start time (drawing phase begins)
    case 'WORD_LENGTH':
      return {
        ...state,
        phase:          'drawing',
        wordLength:     action.payload.wordLength,
        roundStartTime: action.payload.roundStartTime,
        roundDuration:  action.payload.roundDuration || 0,
        roundNumber:    action.payload.roundNumber,
        wordChoices:    [],
      };

    // Server → drawer only: actual word + start time
    case 'DRAWER_WORD':
      return {
        ...state,
        phase:          'drawing',
        drawerWord:     action.payload.word,
        roundStartTime: action.payload.roundStartTime,
        roundDuration:  action.payload.roundDuration || 0,
        roundNumber:    action.payload.roundNumber,
        wordChoices:    [],
      };

    // Server → everyone: turn is over, word revealed
    case 'ROUND_END':
      return {
        ...state,
        phase:       'round-end',
        roundEndWord: action.payload.word,
        scores:       action.payload.scores,
        roundNumber:  action.payload.roundNumber,
        wordLength:   0,
        drawerWord:   '',
      };

    // Server → everyone: game finished
    case 'GAME_OVER':
      return {
        ...state,
        phase:           'waiting',
        scores:          action.payload.scores,
        currentDrawerId: null,
        drawerName:      '',
        wordLength:      0,
        drawerWord:      '',
        roundStartTime:  null,
        roundDuration:   0,
        wordChoices:     [],
        guessedCorrectly: [],
      };
    
    // Server → everyone: someone guessed correctly
    case 'CORRECT_GUESS':
      if (state.guessedCorrectly.includes(action.payload.playerId)) {
        return state;
      }
      return {
        ...state,
        guessedCorrectly: [...state.guessedCorrectly, action.payload.playerId]
      };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // ── Track socket.id reactively ────────────────────────────────────────────
  // socket.id is a plain property; reading it at render time is not reactive.
  // Storing it via dispatch ensures isDrawer comparisons never use a stale value.
  useEffect(() => {
    function onConnect() {
      console.log('[GameContext] socket connected, id:', socket.id);
      dispatch({ type: 'SET_MY_SOCKET_ID', payload: socket.id });
    }
    function onDisconnect() {
      dispatch({ type: 'SET_MY_SOCKET_ID', payload: '' });
    }
    // If already connected when the provider mounts, capture the id immediately
    if (socket.connected && socket.id) {
      dispatch({ type: 'SET_MY_SOCKET_ID', payload: socket.id });
    }
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // ── Game-event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    function handleRoomUpdate(data) {
      console.log('[GameContext] room:update', data);
      dispatch({ type: 'ROOM_UPDATE', payload: data });
    }
    function handleTurnStart(data) {
      console.log('[GameContext] game:turnStart', data);
      dispatch({ type: 'TURN_START', payload: data });
    }
    function handleWordChoices(data) {
      console.log('[GameContext] word:choices received:', data);
      dispatch({ type: 'WORD_CHOICES', payload: data });
    }
    function handleWordLength(data) {
      console.log('[GameContext] game:wordLength', data);
      dispatch({ type: 'WORD_LENGTH', payload: data });
    }
    function handleDrawerWord(data) {
      console.log('[GameContext] game:drawerWord', data);
      dispatch({ type: 'DRAWER_WORD', payload: data });
    }
    function handleRoundEnd(data) {
      console.log('[GameContext] game:roundEnd', data);
      dispatch({ type: 'ROUND_END', payload: data });
    }
    function handleGameOver(data) {
      console.log('[GameContext] game:over', data);
      dispatch({ type: 'GAME_OVER', payload: data });
    }
    function handleCorrectGuess(data) {
      console.log('[GameContext] game:correctGuess', data);
      dispatch({ type: 'CORRECT_GUESS', payload: data });
    }

    socket.on('room:update',       handleRoomUpdate);
    socket.on('game:turnStart',    handleTurnStart);
    socket.on('word:choices',      handleWordChoices);
    socket.on('game:wordLength',   handleWordLength);
    socket.on('game:drawerWord',   handleDrawerWord);
    socket.on('game:roundEnd',     handleRoundEnd);
    socket.on('game:over',         handleGameOver);
    socket.on('game:correctGuess', handleCorrectGuess);

    return () => {
      socket.off('room:update',       handleRoomUpdate);
      socket.off('game:turnStart',    handleTurnStart);
      socket.off('word:choices',      handleWordChoices);
      socket.off('game:wordLength',   handleWordLength);
      socket.off('game:drawerWord',   handleDrawerWord);
      socket.off('game:roundEnd',     handleRoundEnd);
      socket.off('game:over',         handleGameOver);
      socket.off('game:correctGuess', handleCorrectGuess);
    };
  }, []);

  const value = { ...state, state, dispatch };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
}

export default GameContext;
