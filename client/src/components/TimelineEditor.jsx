import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Layers, Eye, EyeOff, Volume2, VolumeX, Lock, Unlock, Film, Music, Image as ImageIcon, Type, Captions } from 'lucide-react';

export default function TimelineEditor({
  tracks = [],
  clips = [],
  currentTime = 0,
  duration = 30,
  isPlaying = false,
  onPlayPauseToggle = () => {},
  onScrub = () => {},
  onClipUpdate = () => {},
  darkMode = true,
}) {
  const timelineRef = useRef(null);
  
  // Interactive Clip State for Dragging & Edge Trimming
  const [localClips, setLocalClips] = useState(clips);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [draggingClip, setDraggingClip] = useState(null);
  const [resizingClip, setResizingClip] = useState(null);

  // Sync props clips when external clips change
  useEffect(() => {
    setLocalClips(clips);
  }, [clips]);

  // Time formatting helper
  const formatTime = (secs = 0) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}.${ms}`;
  };

  // Convert client X position to timecode (seconds)
  const getTimeFromX = (clientX) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return parseFloat((ratio * duration).toFixed(2));
  };

  // Handle timeline click / drag scrubbing
  const handleTimelineClick = (e) => {
    const targetTime = getTimeFromX(e.clientX);
    onScrub(targetTime);
  };

  const handleMouseDownPlayhead = (e) => {
    setIsDraggingPlayhead(true);
    handleTimelineClick(e);
  };

  // --- CLIP DRAG & TRIM HANDLERS ---
  const handleMouseDownClip = (e, clip, action) => {
    e.stopPropagation();
    if (action === 'move') {
      setDraggingClip({ clip, originalStart: clip.timelineStart, clickOffset: getTimeFromX(e.clientX) - clip.timelineStart });
    } else if (action === 'resize-left' || action === 'resize-right') {
      setResizingClip({ clip, action, originalStart: clip.timelineStart, originalDuration: clip.duration });
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingPlayhead) {
      handleTimelineClick(e);
      return;
    }

    const mouseTime = getTimeFromX(e.clientX);

    if (draggingClip) {
      const updatedClips = localClips.map((c) => {
        if (c.id === draggingClip.clip.id) {
          const newStart = Math.max(0, Math.min(duration - c.duration, mouseTime - draggingClip.clickOffset));
          return { ...c, timelineStart: parseFloat(newStart.toFixed(2)) };
        }
        return c;
      });
      setLocalClips(updatedClips);
    } else if (resizingClip) {
      const updatedClips = localClips.map((c) => {
        if (c.id === resizingClip.clip.id) {
          if (resizingClip.action === 'resize-right') {
            const newDuration = Math.max(0.5, mouseTime - c.timelineStart);
            return { ...c, duration: parseFloat(newDuration.toFixed(2)) };
          } else if (resizingClip.action === 'resize-left') {
            const endPoint = c.timelineStart + c.duration;
            const newStart = Math.max(0, Math.min(endPoint - 0.5, mouseTime));
            const newDuration = endPoint - newStart;
            return { 
              ...c, 
              timelineStart: parseFloat(newStart.toFixed(2)), 
              duration: parseFloat(newDuration.toFixed(2)) 
            };
          }
        }
        return c;
      });
      setLocalClips(updatedClips);
    }
  };

  const handleMouseUp = () => {
    if (draggingClip || resizingClip) {
      onClipUpdate(localClips);
    }
    setIsDraggingPlayhead(false);
    setDraggingClip(null);
    setResizingClip(null);
  };

  const bgTrackHeader = darkMode ? '#1e293b' : '#f1f5f9';
  const bgTrackLane = darkMode ? '#0f172a' : '#ffffff';
  const borderCol = darkMode ? '#334155' : '#cbd5e1';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';

  // Default track structure if empty
  const defaultTracks = tracks.length > 0 ? tracks : [
    { id: 't1', name: 'Video Track 1', type: 'video', isMuted: false, isLocked: false },
    { id: 't2', name: 'Audio Track 1', type: 'audio', isMuted: false, isLocked: false },
    { id: 't3', name: 'Graphics & Overlay', type: 'image', isMuted: false, isLocked: false },
    { id: 't4', name: 'Subtitle Track', type: 'transcription', isMuted: false, isLocked: false },
  ];

  const getTrackIcon = (type) => {
    switch (type) {
      case 'video': return <Film size={14} color="#8b5cf6" />;
      case 'audio': return <Music size={14} color="#38bdf8" />;
      case 'image': return <ImageIcon size={14} color="#10b981" />;
      case 'transcription': return <Captions size={14} color="#ec4899" />;
      default: return <Type size={14} color="#f59e0b" />;
    }
  };

  const getClipColor = (type) => {
    switch (type) {
      case 'video': return '#7c3aed';
      case 'audio': return '#0284c7';
      case 'image': return '#059669';
      case 'transcription': return '#db2777';
      default: return '#d97706';
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        width: '100%',
        backgroundColor: bgTrackLane,
        border: `1px solid ${borderCol}`,
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. TIMELINE TOP HEADER & PLAYHEAD CONTROLS */}
      <div style={{
        height: '40px',
        backgroundColor: bgTrackHeader,
        borderBottom: `1px solid ${borderCol}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onPlayPauseToggle}
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', color: textColor }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          Drag clip body to move | Drag handles to trim duration
        </span>

        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} /> Multi-Track NLE Timeline Editor
        </span>
      </div>

      {/* 2. MAIN TRACKS & RULER AREA */}
      <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
        
        {/* LEFT COLUMN: TRACK HEADERS */}
        <div style={{ width: '180px', minWidth: '180px', backgroundColor: bgTrackHeader, borderRight: `1px solid ${borderCol}` }}>
          {/* Ruler Corner Spacer */}
          <div style={{ height: '24px', borderBottom: `1px solid ${borderCol}`, padding: '4px 8px', fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>
            Tracks
          </div>

          {/* Track Headers */}
          {defaultTracks.map((track) => (
            <div 
              key={track.id}
              style={{
                height: '42px',
                borderBottom: `1px solid ${borderCol}`,
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                boxSizing: 'border-box'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold', color: textColor, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getTrackIcon(track.type)} {track.name}
              </span>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button style={miniIconBtnStyle}>{track.isMuted ? <VolumeX size={12} color="#ef4444" /> : <Volume2 size={12} />}</button>
                <button style={miniIconBtnStyle}>{track.isLocked ? <Lock size={12} color="#f59e0b" /> : <Unlock size={12} />}</button>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: TIME RULER & TRACK LANES */}
        <div 
          ref={timelineRef}
          onMouseDown={handleMouseDownPlayhead}
          style={{ flex: 1, position: 'relative', overflowX: 'hidden', cursor: 'crosshair' }}
        >
          {/* TIME RULER TICKS */}
          <div style={{ height: '24px', backgroundColor: bgTrackHeader, borderBottom: `1px solid ${borderCol}`, position: 'relative', display: 'flex', alignItems: 'center' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <div 
                key={ratio}
                style={{
                  position: 'absolute',
                  left: `${ratio * 100}%`,
                  fontSize: '9px',
                  color: '#94a3b8',
                  fontFamily: 'monospace',
                  transform: ratio === 1 ? 'translateX(-100%)' : 'none',
                  paddingLeft: '2px'
                }}
              >
                {formatTime(ratio * duration)}
              </div>
            ))}
          </div>

          {/* TRACK LANES & CLIP PLACEMENT */}
          {defaultTracks.map((track) => (
            <div 
              key={track.id}
              style={{
                height: '42px',
                borderBottom: `1px solid ${borderCol}`,
                position: 'relative',
                backgroundColor: 'rgba(0,0,0,0.02)'
              }}
            >
              {/* Render clips belonging to this track */}
              {localClips.filter(c => c.trackId === track.id || c.type === track.type).map((clip) => {
                const leftPct = (clip.timelineStart / duration) * 100;
                const widthPct = (clip.duration / duration) * 100;

                return (
                  <div
                    key={clip.id}
                    onMouseDown={(e) => handleMouseDownClip(e, clip, 'move')}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: '6px',
                      height: '30px',
                      backgroundColor: getClipColor(clip.type),
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'grab'
                    }}
                    title={`${clip.name} (${clip.duration}s)`}
                  >
                    {/* Left Trim Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownClip(e, clip, 'resize-left')}
                      title="Drag to trim start time"
                      style={{
                        width: '6px',
                        height: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'ew-resize',
                        borderRadius: '2px 0 0 2px'
                      }}
                    />

                    {/* Clip Body Label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', padding: '0 4px' }}>
                      {getTrackIcon(clip.type)}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{clip.name}</span>
                    </div>

                    {/* Right Trim Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDownClip(e, clip, 'resize-right')}
                      title="Drag to trim duration"
                      style={{
                        width: '6px',
                        height: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'ew-resize',
                        borderRadius: '0 2px 2px 0'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {/* RED TIMELINE SCRUBBER PLAYHEAD LINE */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${(currentTime / duration) * 100}%`,
              width: '2px',
              backgroundColor: '#ef4444',
              zIndex: 30,
              pointerEvents: 'none'
            }}
          >
            <div style={{
              width: '10px',
              height: '10px',
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              transform: 'translate(-4px, -2px)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
            }} />
          </div>

        </div>
      </div>
    </div>
  );
}

const miniIconBtnStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};