import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import cors from 'cors';
import { registerRoomHandlers } from './sockets/roomHandlers.js';
import { registerDrawHandlers } from './sockets/drawHandlers.js';
import { registerGameHandlers } from './sockets/gameHandlers.js';
import { registerChatHandlers } from './sockets/chatHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  app.use(cors());
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: isDev ? {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  } : {},
});

io.on('connection', (socket) => {
  const initialTransport = socket.conn.transport.name;
  console.log(`Client connected: ${socket.id} (initial transport: ${initialTransport})`);

  socket.conn.on('upgrade', (transport) => {
    console.log(`Client ${socket.id} transport upgraded to: ${transport.name}`);
  });

  registerRoomHandlers(io, socket);
  registerDrawHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerChatHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Production build path serving
if (!isDev) {
  const clientBuildPath = path.join(__dirname, '../../client/build');
  app.use(express.static(clientBuildPath));

  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build/index.html'));
  });
}

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
