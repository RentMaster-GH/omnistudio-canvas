import React from 'react';
import { Play, Pause, Film, Music, Captions, RotateCcw, Volume2 } from 'lucide-react';

interface TimelineBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  borderCol?: string;
  bgBar?: string;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      style={{ 
        height: '110px', 
        minHeight: '110px', 
        backgroundColor: bgBar, 
        borderTop: `1px solid ${borderCol}`, 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '8px 12px', 
        gap: '6px', 
        boxSizing: 'border-box',
        zIndex: 35
      }}
    >
      {/* Top Transport Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={onTogglePlay} style={transportBtnStyle}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={() => onSeek(0)} style={transportBtnStyle} title="Reset to Start">
            <RotateCcw size={14} />
          </button>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 'bold' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Film size={12} color="#8b5cf6" /> Video Track</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Music size={12} color="#0284c7" /> Audio Track</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Captions size={12} color="#10b981" /> Subtitles Track</span>
        </div>
      </div>

      {/* Scrubbing Timecode Slider */}
      <input 
        type="range" 
        min={0} 
        max={duration || 30} 
        step={0.1}
        value={currentTime} 
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
      />

      {/* Visual Multi-Track Lanes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {/* Track 1: Video Lane */}
        <div style={{ height: '14px', backgroundColor: '#0f172a', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: '0%', width: '60%', height: '100%', backgroundColor: 'rgba(139, 92, 246, 0.4)', borderLeft: '2px solid #8b5cf6', borderRadius: '2px', fontSize: '9px', color: '#fff', paddingLeft: '4px', display: 'flex', alignItems: 'center' }}>
            Main_Video_Stream.mp4
          </div>
        </div>

        {/* Track 2: Audio Lane */}
        <div style={{ height: '14px', backgroundColor: '#0f172a', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: '0%', width: '85%', height: '100%', backgroundColor: 'rgba(2, 132, 199, 0.4)', borderLeft: '2px solid #0284c7', borderRadius: '2px', fontSize: '9px', color: '#fff', paddingLeft: '4px', display: 'flex', alignItems: 'center' }}>
            Background_Audio.mp3
          </div>
        </div>
      </div>

    </div>
  );
};

const transportBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  backgroundColor: '#0284c7',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};