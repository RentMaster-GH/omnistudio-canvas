// src/motion.ts - Linear & Easing Interpolation Math Engine
import { Keyframe, PropertyTrack, TimelineGraph } from './timelineTypes';

/**
 * Linear Interpolation (lerp) formula: a + (b - a) * t
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smooth Ease-In-Out curve math
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Calculates property value at any target frame
 */
export function evaluateTrackAtFrame(track: PropertyTrack, currentFrame: number): number {
  const kfs = track.keyframes;
  if (kfs.length === 0) return 0;
  if (currentFrame <= kfs[0].frame) return kfs[0].value;
  if (currentFrame >= kfs[kfs.length - 1].frame) return kfs[kfs.length - 1].value;

  // Find surrounding keyframes
  for (let i = 0; i < kfs.length - 1; i++) {
    const kf1 = kfs[i];
    const kf2 = kfs[i + 1];

    if (currentFrame >= kf1.frame && currentFrame <= kf2.frame) {
      // Calculate normalized time progress (0.0 to 1.0)
      let progress = (currentFrame - kf1.frame) / (kf2.frame - kf1.frame);

      if (kf1.easing === 'easeInOut') {
        progress = easeInOut(progress);
      }

      return lerp(kf1.value, kf2.value, progress);
    }
  }

  return kfs[0].value;
}