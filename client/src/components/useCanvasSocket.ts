import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useCanvasSocket(fabricCanvas: any) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 1. Detect Vercel Serverless environment
    const isVercel = window.location.hostname.includes('vercel.app');
    const customSocketUrl = import.meta.env.VITE_SOCKET_URL;

    // Vercel serverless functions do not support WebSockets.
    // Skip auto-connecting on Vercel unless a dedicated socket server URL is provided.
    if (isVercel && !customSocketUrl) {
      console.log('ℹ️ Running on Vercel Serverless. Real-time multiplayer WebSockets disabled.');
      return;
    }

    const socketUrl = customSocketUrl || (
      window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : window.location.origin
    );

    const socket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnectionAttempts: 2,
      timeout: 3000,
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection notice:', err.message);
      // Immediately disconnect on error to prevent continuous 404 polling on serverless hosts
      socket.disconnect();
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [fabricCanvas]);

  const broadcastCanvasChange = (canvasJson: any) => {
    // Safely emit only if connected
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('canvas-change', canvasJson);
    }
  };

  return { broadcastCanvasChange };
}