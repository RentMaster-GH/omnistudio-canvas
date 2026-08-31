// client/src/types/canvas.ts

export type NodeType = 'pdf' | 'video' | 'audio' | 'document' | 'image';

export interface Position {
  x: number;
  y: number;
}

export interface NodeSize {
  width: number;
  height: number;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  position: Position;
  size: NodeSize;
  contentUrl?: string; // For PDF, Video, Audio
  textContent?: string; // For Word / Rich Text
  zIndex: number;
}

export interface CanvasGraph {
  version: string;
  nodes: CanvasNode[];
  connections: Array<{ source: string; target: string }>;
}

export interface TimelineTrack {
  id: string;
  nodeId: string;
  label: string;
  type: NodeType;
  startTime: number; // in seconds
  duration: number;  // in seconds
}

export interface TimelineData {
  fps: number;
  totalDuration: number;
  tracks: TimelineTrack[];
}