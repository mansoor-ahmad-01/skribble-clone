import { io } from 'socket.io-client';

const URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';

export const socket = io(URL, {
  transports: ['websocket', 'polling'], // Prefer websocket, allow polling fallback
});

socket.on('connect', () => {
  const transportName = socket.io?.engine?.transport?.name;
  console.log(`[Socket] Connected (${socket.id}) via transport: "${transportName}"`);

  if (socket.io?.engine) {
    socket.io.engine.on('upgrade', (transport) => {
      console.log(`[Socket] Transport upgraded to: "${transport.name}"`);
    });
  }
});

export default socket;
