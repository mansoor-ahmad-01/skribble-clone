import { roomManager as defaultRoomManager } from '../rooms/RoomManager.js';

/**
 * registerGameHandlers
 *
 * Handles:
 *   game:start   {roomId}          — Begin the game (requires ≥2 players & waiting phase).
 *   word:select  {roomId, word}    — Drawer picks a word from their choices.
 */
export function registerGameHandlers(io, socket, roomManager = defaultRoomManager) {
  // ── game:start ─────────────────────────────────────────────────────────────
  socket.on('game:start', ({ roomId } = {}, callback) => {
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) {
      console.warn(`[game:start] Unknown room "${roomId}" from socket "${socket.id}"`);
      if (typeof callback === 'function') callback({ error: 'Room not found' });
      return;
    }

    if (room.phase !== 'waiting') {
      console.warn(`[game:start] Room "${roomId}" is not in waiting phase (current: "${room.phase}")`);
      if (typeof callback === 'function') callback({ error: 'Game already started' });
      return;
    }

    if (room.players.size < 2) {
      console.warn(`[game:start] Room "${roomId}" has only ${room.players.size} player(s) — need ≥2`);
      if (typeof callback === 'function') callback({ error: 'Need at least 2 players' });
      return;
    }

    console.log(`[game:start] Starting game in room "${roomId}" with ${room.players.size} players.`);
    room.startGame(io);

    if (typeof callback === 'function') callback({ success: true });
  });

  // ── word:select ────────────────────────────────────────────────────────────
  socket.on('word:select', ({ roomId, word } = {}) => {
    if (!roomId || !word) return;

    const room = roomManager.getRoom(roomId);
    if (!room) {
      console.warn(`[word:select] Unknown room "${roomId}"`);
      return;
    }

    // Only the current drawer may select a word
    if (socket.id !== room.currentDrawerId) {
      console.warn(`[word:select] Socket "${socket.id}" is not the drawer in room "${roomId}"`);
      return;
    }

    if (room.phase !== 'word-select') {
      console.warn(`[word:select] Room "${roomId}" is not in word-select phase (current: "${room.phase}")`);
      return;
    }

    // Word must be one of the presented choices (prevents injection)
    if (!room.wordChoices.includes(word)) {
      console.warn(`[word:select] Word "${word}" not in choices for room "${roomId}"`);
      return;
    }

    console.log(`[word:select] Drawer "${socket.id}" selected word "${word}" in room "${roomId}"`);
    room.setWord(word, io);
  });
}

export default registerGameHandlers;
