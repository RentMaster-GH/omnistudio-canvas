// src/timelineTypes.ts - Temporal Motion Engine Specification

export type EasingType = "linear" | "easeIn" | "easeOut" | "easeInOut";

export interface Keyframe {
  frame: number;        // Frame index (e.g., frame 0, frame 30, frame 60)
  value: number;        // Target numeric property value (e.g., X position = 500)
  easing?: EasingType;  // Interpolation easing curve
}

export interface PropertyTrack {
  property: "transform.x" | "transform.y" | "rotation" | "opacity" | "scaleX" | "scaleY";
  keyframes: Keyframe[];
}

export interface NodeMotionTrack {
  nodeId: string;
  tracks: PropertyTrack[];
}

export interface TimelineGraph {
  version: "1.0.0";
  fps: number;           // Frames per second (e.g. 60 FPS)
  durationFrames: number;// Total animation length in frames (e.g. 180 frames = 3 seconds)
  tracks: NodeMotionTrack[];
}