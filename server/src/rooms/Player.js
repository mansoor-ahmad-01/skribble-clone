export class Player {
  constructor(id, name, score = 0, isDrawing = false, connected = true) {
    this.id = id;
    this.name = name;
    this.score = score;
    this.isDrawing = isDrawing;
    this.connected = connected;
  }
}

export function createPlayer(id, name, score = 0, isDrawing = false, connected = true) {
  return new Player(id, name, score, isDrawing, connected);
}

export default Player;
