import { roomManager as defaultRoomManager } from '../rooms/RoomManager.js';
import { isCorrectGuess } from '../utils/guessChecker.js';

/**
 * registerChatHandlers
 *
 * Handles `chat:message` events.
 *   - If not in drawing phase or sender is the drawer, the message is broadcast as‑is.
 *   - Otherwise the server validates the guess. On a correct guess it:
 *        * awards points to the guesser and a small bonus to the drawer,
 *        * records the guess in room.guessedCorrectly,
 *        * emits `game:correctGuess` (so the client can track who has guessed),
 *        * broadcasts a masked chat line like "<name> guessed the word!",
 *        * ends the turn early if everyone but the drawer has guessed.
 *   - On an incorrect guess the text is broadcast unchanged.
 */
export function registerChatHandlers(io, socket, roomManager = defaultRoomManager) {
  socket.on('chat:message', ({ roomId, text } = {}) => {
    if (!roomId || typeof text !== 'string') return;
    
    const trimmedText = text.trim();
    if (!trimmedText) return;
    const safeText = trimmedText.slice(0, 200);

    const room = roomManager.getRoom(roomId);
    if (!room) {
      console.warn(`[chat:message] Unknown room "${roomId}"`);
      return;
    }

    const senderId = socket.id;
    const sender = room.players.get(senderId);
    const senderName = sender ? sender.name : 'Anonymous';

    // Phase check or drawer cannot guess
    if (room.phase !== 'drawing' || senderId === room.currentDrawerId) {
      io.to(room.id).emit('chat:message', {
        playerId: senderId,
        playerName: senderName,
        text: safeText,
        system: false,
      });
      return;
    }

    // Guess validation
    const alreadyGuessed = room.guessedCorrectly.has(senderId);
    if (alreadyGuessed) {
      // Already guessed correctly – just broadcast as normal chat (or ignore). We'll ignore to avoid spam.
      return;
    }

    if (isCorrectGuess(safeText, room.currentWord)) {
      // Correct guess handling
      room.guessedCorrectly.add(senderId);

      const elapsedSec = Math.floor((Date.now() - room.roundStartTime) / 1000);
      const points = Math.max(10, 100 - elapsedSec * 2);
      // Award points to guesser
      if (sender) sender.score += points;
      // Small bonus to drawer (e.g., 5 points per correct guess)
      const drawer = room.players.get(room.currentDrawerId);
      if (drawer) drawer.score += 5;

      // Inform everyone about the correct guess (so client can disable input for that player)
      io.to(room.id).emit('game:correctGuess', {
        playerId: senderId,
        playerName: senderName,
        pointsAwarded: points,
      });

      // Broadcast updated player list so PlayerList scores refresh in real-time.
      // Without this, scores only appear after round-end (game:roundEnd sends scores[]).
      io.to(room.id).emit('room:update', {
        roomId: room.id,
        players: room.getPlayerList(),
        phase: room.phase,
      });

      // Broadcast a masked chat message
      io.to(room.id).emit('chat:message', {
        playerId: senderId,
        playerName: senderName,
        text: `${senderName} guessed the word!`,
        system: true,
      });

      // If all non-drawer players guessed, end turn early
      const nonDrawerCount = room.turnOrder.length - 1;
      if (room.guessedCorrectly.size >= nonDrawerCount) {
        console.log(`[chat:message] All guessers correct in room "${room.id}" – ending turn early.`);
        room.endTurn(io);
      }
    } else {
      // Incorrect guess – broadcast as normal chat
      io.to(room.id).emit('chat:message', {
        playerId: senderId,
        playerName: senderName,
        text: safeText,
        system: false,
      });
    }
  });
}

export default registerChatHandlers;
