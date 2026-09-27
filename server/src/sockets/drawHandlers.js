import { roomManager as defaultRoomManager } from '../rooms/RoomManager.js';

/**
 * registerDrawHandlers
 *
 * Handles two events:
 *
 *   draw:stroke  {roomId, strokeData}
 *     - Validates the room exists and the socket is in it.
 *     - Pushes strokeData onto room.strokes for late-joiner replay.
 *     - Relays strokeData to everyone ELSE in the room via socket.to().
 *
 *   draw:clear   {roomId}
 *     - Validates the room.
 *     - Clears room.strokes[].
 *     - Relays draw:clear to everyone ELSE in the room.
 */
export function registerDrawHandlers(io, socket, roomManager = defaultRoomManager) {
  // ── draw:stroke ──────────────────────────────────────────────────────────────
  socket.on('draw:stroke', ({ roomId, strokeData } = {}) => {
    if (!roomId || !strokeData) return;

    const room = roomManager.getRoom(roomId);
    if (!room) {
      console.warn(`[draw:stroke] Unknown room "${roomId}" from socket "${socket.id}"`);
      return;
    }

    if (socket.id !== room.currentDrawerId) {
      return; // Only the current drawer can emit strokes
    }

    // Basic shape validation — reject garbage payloads
    const { x0, y0, x1, y1, color, lineWidth } = strokeData;
    if (
      typeof x0 !== 'number' || typeof y0 !== 'number' ||
      typeof x1 !== 'number' || typeof y1 !== 'number' ||
      typeof color !== 'string' || typeof lineWidth !== 'number'
    ) {
      console.warn(`[draw:stroke] Malformed strokeData from socket "${socket.id}"`);
      return;
    }

    // Persist for late-joiner replay (cap at 20 000 segments to protect memory)
    if (room.strokes.length < 20000) {
      room.strokes.push({ x0, y0, x1, y1, color, lineWidth });
    }

    // Relay to everyone else in the room
    socket.to(roomId).emit('draw:stroke', { x0, y0, x1, y1, color, lineWidth });
  });

  // ── draw:clear ───────────────────────────────────────────────────────────────
  socket.on('draw:clear', ({ roomId } = {}) => {
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) {
      console.warn(`[draw:clear] Unknown room "${roomId}" from socket "${socket.id}"`);
      return;
    }

    if (socket.id !== room.currentDrawerId) {
      return; // Only the current drawer can clear the canvas
    }

    console.log(`[draw:clear] Room "${roomId}" cleared by socket "${socket.id}". Wiping ${room.strokes.length} stroke(s).`);
    room.clearStrokes();

    // Relay to everyone else — the sender already cleared locally
    socket.to(roomId).emit('draw:clear');
  });
}

export default registerDrawHandlers;
