import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://omnistudio-canvas-api.onrender.com';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(projectId, user) {
    if (this.socket) return;

    this.socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Real-time Socket connected:', this.socket.id);
      this.socket.emit('join-room', { projectId, user });
    });

    return this.socket;
  }

  emitCursorMove(projectId, position, user) {
    if (this.socket) {
      this.socket.emit('cursor-move', { projectId, position, user });
    }
  }

  emitCanvasModified(projectId, objectData) {
    if (this.socket) {
      this.socket.emit('canvas-modified', { projectId, objectData });
    }
  }

  emitPlayheadSync(projectId, currentTime, isPlaying) {
    if (this.socket) {
      this.socket.emit('playhead-sync', { projectId, currentTime, isPlaying });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();