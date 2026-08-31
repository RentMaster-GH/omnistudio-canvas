import React, { useRef, useState } from 'react';
import { Film, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VideoNodeProps {
  id: string;
  title: string;
  videoUrl?: string;
  duration?: number;
  borderCol?: string;
  bgBar?: string;
}

export const VideoNode: React.FC<VideoNodeProps> = ({
  title,
  videoUrl,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div 
      style={{ 
        width: '320px', 
        backgroundColor: bgBar, 
        border: `1px solid ${borderCol}`, 
        borderRadius: '8px', 
        overflow: 'hidden', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Node Header */}
      <div style={{ padding: '8px 12px', backgroundColor: '#8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Film size={14} /> {title}
        </span>
        <span style={{ fontSize: '10px', opacity: 0.8 }}>Video Track</span>
      </div>

      {/* Video Viewport Area */}
      <div style={{ height: '180px', backgroundColor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {videoUrl ? (
          <video ref={videoRef} src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <Film size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ fontSize: '12px' }}>Video Player Ready</p>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div style={{ padding: '6px 12px', borderTop: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={togglePlay} style={controlBtnStyle}>
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>

        <button onClick={toggleMute} style={controlBtnStyle}>
          {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      </div>
    </div>
  );
};

const controlBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  backgroundColor: 'rgba(255,255,255,0.1)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
};