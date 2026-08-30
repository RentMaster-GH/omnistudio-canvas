import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

export function initializeSocketIO(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] User connected: ${socket.id}`);

    // Join project room
    socket.on('join-room', ({ projectId, user }) => {
      socket.join(projectId);
      console.log(`[Socket.io] ${user?.name || socket.id} joined project room: ${projectId}`);
      
      socket.to(projectId).emit('user-joined', {
        id: socket.id,
        user,
      });
    });

    // Sync live cursor movement
    socket.on('cursor-move', ({ projectId, position, user }) => {
      socket.to(projectId).emit('remote-cursor-moved', {
        socketId: socket.id,
        user,
        position,
      });
    });

    // Sync canvas object mutations (text, shapes, drawings)
    socket.on('canvas-modified', ({ projectId, objectData }) => {
      socket.to(projectId).emit('remote-canvas-modified', {
        socketId: socket.id,
        objectData,
      });
    });

    // Sync timeline playhead position
    socket.on('playhead-sync', ({ projectId, currentTime, isPlaying }) => {
      socket.to(projectId).emit('remote-playhead-synced', {
        socketId: socket.id,
        currentTime,
        isPlaying,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] User disconnected: ${socket.id}`);
      io.emit('user-left', { socketId: socket.id });
    });
  });

  return io;
}