export interface Clip {
  id: string;
  name: string;
  startTime?: number;
  timelineStart?: number;
  mediaOffset?: number;
  duration?: number;
  trackId?: string;
  type?: string;
  contentUrl?: string;
  sourceUrl?: string;
  fileId?: string;
  payload?: any;
  transform?: {
    position?: { x: number; y: number };
    scale?: { x: number; y: number };
    rotation?: number;
    opacity?: number;
  } | any;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  zIndex?: number;
}

export interface Track {
  id: string;
  name: string;
  type?: string;
  isMuted?: boolean;
  isLocked?: boolean;
  isSolo?: boolean;
  order?: number;
  clips?: Clip[];
}

export interface OmniProject {
  id: string;
  version: string;
  tracks: Track[];
  clips?: Record<string, Clip>;
  settings?: {
    width: number;
    height: number;
    fps?: number;
  };
}