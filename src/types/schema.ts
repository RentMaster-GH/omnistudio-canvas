// src/types/schema.ts

export type MediaType = 'video' | 'audio' | 'image' | 'text_doc' | 'transcription';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}

// Spatial layout on the Canvas Graph
export interface CanvasTransform {
  position: Vector2D;
  size: Size2D;
  scale: Vector2D;
  rotation: number; // degrees
  opacity: number; // 0.0 to 1.0
  zIndex: number;
}

// Word-level timestamps for fine-grained editing
export interface WordCue {
  id: string;
  word: string;
  start: number; // seconds
  end: number;   // seconds
  confidence: number;
}

// Transcript segment linked to audio/video
export interface TranscriptSegment {
  id: string;
  speaker?: string;
  text: string;
  start: number; // seconds
  end: number;   // seconds
  words: WordCue[];
}

// Main clip representation across Timeline & Canvas
export interface Clip {
  id: string;
  trackId: string;
  name: string;
  type: MediaType;
  
  // Timing (Timeline)
  timelineStart: number; // Position on timeline (seconds)
  duration: number;      // Active duration on timeline (seconds)
  mediaOffset: number;   // In-point crop from source file (seconds)
  
  // File Source
  sourceUrl?: string;    // Blob URL or server URL
  fileId?: string;       // References uploaded file on server

  // Spatial (Canvas Graph)
  transform?: CanvasTransform;

  // Type-specific payloads
  payload: {
    // For text_doc
    content?: string; 
    fontStyle?: Record<string, any>;
    
    // For video/audio/transcription
    transcript?: TranscriptSegment[];
    volume?: number;      // 0.0 to 1.0
    speed?: number;       // Playback rate multiplier
  };
}

export interface Track {
  id: string;
  name: string;
  type: MediaType;
  isMuted: boolean;
  isLocked: boolean;
  isSolo: boolean;
  order: number;
}

export interface OmniProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  
  // Global Project Settings
  settings: {
    width: number;         // e.g., 1920
    height: number;        // e.g., 1080
    fps: number;           // e.g., 30 or 60
    sampleRate: number;    // e.g., 44100 or 48000
    duration: number;      // Total project duration in seconds
  };

  tracks: Track[];
  clips: Record<string, Clip>; // Map clipId -> Clip
}