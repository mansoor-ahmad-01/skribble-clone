import Room from './Room.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  normalizeRoomId(roomId) {
    if (!roomId || typeof roomId !== 'string') return '';
    return roomId.trim().toUpperCase();
  }

  generateRoomCode(length = 5) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        code += chars.charAt(randomIndex);
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(roomId) {
    const normalized = this.normalizeRoomId(roomId);
    const id = normalized || this.generateRoomCode();

    if (this.rooms.has(id)) {
      console.log(`[RoomManager.createRoom] Room "${id}" already exists, returning existing room.`);
      return this.rooms.get(id);
    }

    const room = new Room(id);
    this.rooms.set(id, room);
    console.log(`[RoomManager.createRoom] Created new room: "${id}". Total rooms: ${this.rooms.size}`);
    return room;
  }

  getRoom(roomId) {
    const normalized = this.normalizeRoomId(roomId);
    if (!normalized) return null;
    return this.rooms.get(normalized) || null;
  }

  removeRoom(roomId) {
    const normalized = this.normalizeRoomId(roomId);
    if (!normalized) return false;
    const deleted = this.rooms.delete(normalized);
    if (deleted) {
      console.log(`[RoomManager.removeRoom] Removed room "${normalized}". Total rooms remaining: ${this.rooms.size}`);
    }
    return deleted;
  }

  getRoomByPlayerId(playerId) {
    for (const room of this.rooms.values()) {
      if (room.players.has(playerId)) {
        return room;
      }
    }
    return null;
  }
}

export const roomManager = new RoomManager();
export default RoomManager;
