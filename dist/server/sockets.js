"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketIO = initializeSocketIO;
const socket_io_1 = require("socket.io");
function initializeSocketIO(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
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
