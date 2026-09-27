import Player from '../rooms/Player.js';
import { roomManager as defaultRoomManager } from '../rooms/RoomManager.js';
import { ROUND_DURATION_MS } from '../config.js';

export function registerRoomHandlers(io, socket, roomManager = defaultRoomManager) {
  socket.on('room:join', (payload = {}, callback) => {
    const { roomId, playerName } = payload;

    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      if (typeof callback === 'function') callback({ error: 'Player name is required' });
      return;
    }
    const safePlayerName = playerName.trim().slice(0, 20);

    // 1. Log exact roomId string with quotes and current keys in RoomManager
    console.log(`[room:join] Received raw payload from socket "${socket.id}": roomId="${roomId}", playerName="${safePlayerName}"`);

    // Normalize roomId: trim and uppercase
    const normalizedRoomId = typeof roomId === 'string' ? roomId.trim().toUpperCase() : '';
    console.log(`[room:join] Normalized roomId: "${normalizedRoomId}"`);

    // Log RoomManager's current Map keys right before lookup
    const currentKeys = Array.from(roomManager.rooms.keys());
    console.log(`[room:join] RoomManager current Map keys (${currentKeys.length}):`, currentKeys.map((k) => `"${k}"`));

    // Leave any previous room the socket was in
    const prevRoomId = socket.data?.roomId || socket.roomId;
    if (prevRoomId) {
      const prevRoom = roomManager.getRoom(prevRoomId);
      if (prevRoom && prevRoom.players.has(socket.id)) {
        prevRoom.removePlayer(socket.id);
        socket.leave(prevRoom.id);
        console.log(`[room:join] Socket "${socket.id}" left previous room "${prevRoom.id}"`);
        io.to(prevRoom.id).emit('room:update', {
          roomId: prevRoom.id,
          players: prevRoom.getPlayerList(),
          phase: prevRoom.phase,
        });
        if (prevRoom.players.size === 0) {
          roomManager.removeRoom(prevRoom.id);
        }
      }
    }

    // 2. Lookup existing room or create a new one
    let room;
    if (normalizedRoomId) {
      console.log(`[room:join] Looking up room: "${normalizedRoomId}"`);
      room = roomManager.getRoom(normalizedRoomId) || roomManager.createRoom(normalizedRoomId);
    } else {
      console.log(`[room:join] No roomId provided; creating a new room.`);
      room = roomManager.createRoom();
    }

    // 3. Add player to room
    const player = new Player(socket.id, safePlayerName);
    room.addPlayer(player);

    // 4. Track room on socket and join Socket.IO room channel BEFORE emitting room:update
    socket.data = socket.data || {};
    socket.data.roomId = room.id;
    socket.roomId = room.id;
    socket.join(room.id);

    console.log(`[room:join] Socket "${socket.id}" joined channel "${room.id}". Room now has ${room.players.size} player(s):`, room.getPlayerList().map((p) => `"${p.name}"`));

    // 5a. Replay existing canvas strokes to the joining socket only (late-joiner catch-up)
    if (room.strokes && room.strokes.length > 0) {
      console.log(`[room:join] Replaying ${room.strokes.length} stroke(s) to socket "${socket.id}"`);
      socket.emit('draw:replay', room.strokes);
    }

    // 5b. Re-emit round-timing state so a late joiner / reconnect gets the
    //     correct roundStartTime and roundDuration immediately.  Without this,
    //     roundStartTime stays null in the client's GameContext and Timer never
    //     starts (or starts at 100% instead of the true remaining time).
    if (room.phase === 'drawing' && room.roundStartTime) {
      if (socket.id === room.currentDrawerId) {
        // Drawer rejoined — send the actual word + timing anchor
        socket.emit('game:drawerWord', {
          word:           room.currentWord,
          roundStartTime: room.roundStartTime,
          roundDuration:  ROUND_DURATION_MS,
          roundNumber:    room.roundNumber,
        });
        console.log(`[room:join] Re-emitted game:drawerWord to reconnecting drawer "${socket.id}"`);
      } else {
        // Guesser (or new joiner) — send word length + timing anchor only
        socket.emit('game:wordLength', {
          wordLength:     room.currentWord ? room.currentWord.length : 0,
          roundStartTime: room.roundStartTime,
          roundDuration:  ROUND_DURATION_MS,
          roundNumber:    room.roundNumber,
        });
        console.log(`[room:join] Re-emitted game:wordLength to late-joining socket "${socket.id}"`);
      }
    }

    // 5c. Broadcast room:update via io.to(room.id).emit(...) to all sockets in the room
    const updatePayload = {
      roomId: room.id,
      players: room.getPlayerList(),
      phase: room.phase,
    };
    console.log(`[room:join] Emitting room:update to room "${room.id}" via io.to("${room.id}").emit:`, updatePayload);
    io.to(room.id).emit('room:update', updatePayload);

    // Acknowledge to caller if callback provided
    if (typeof callback === 'function') {
      callback({ success: true, ...updatePayload });
    }
  });

  socket.on('disconnect', () => {
    const currentRoomId = socket.data?.roomId || socket.roomId;
    let room = currentRoomId ? roomManager.getRoom(currentRoomId) : null;
    if (!room) {
      room = roomManager.getRoomByPlayerId(socket.id);
    }

    if (room) {
      const removedPlayer = room.removePlayer(socket.id);
      const playerName = removedPlayer ? removedPlayer.name : socket.id;
      console.log(`[disconnect] Player "${playerName}" ("${socket.id}") disconnected from room "${room.id}". Remaining: ${room.players.size}`);

      const updatePayload = {
        roomId: room.id,
        players: room.getPlayerList(),
        phase: room.phase,
      };
      io.to(room.id).emit('room:update', updatePayload);

      if (room.players.size === 0) {
        roomManager.removeRoom(room.id);
        console.log(`[disconnect] Room "${room.id}" removed (all players left)`);
      }
    }
  });
}

export default registerRoomHandlers;
