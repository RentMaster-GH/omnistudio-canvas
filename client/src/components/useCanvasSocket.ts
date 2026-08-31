import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : window.location.origin;

export const useCanvasSocket = (
  fabricCanvas: any,
  onRemoteGraphUpdate?: (graphData: any) => void
) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize Socket.io connection
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('⚡ [OmniStudio Socket] Connected to real-time server:', socket.id);
    });

    // Listen for incoming graph changes from other collaborators
    socket.on('GRAPH_UPDATED', (data: any) => {
      console.log('🔄 [OmniStudio Socket] Received remote graph update');
      if (fabricCanvas && data.canvasJson) {
        fabricCanvas.loadFromJSON(data.canvasJson, () => {
          fabricCanvas.renderAll();
        });
      }
      if (onRemoteGraphUpdate) {
        onRemoteGraphUpdate(data);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [fabricCanvas]);

  // Function to emit local changes to all connected peers
  const broadcastCanvasChange = (canvasJson: any) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('UPDATE_GRAPH', {
        timestamp: new Date().toISOString(),
        canvasJson,
      });
    }
  };

  return {
    socket: socketRef.current,
    broadcastCanvasChange,
  };
};