import React, { useState } from 'react';
import { Play, Download, Edit2, Check, Captions, Clock, User } from 'lucide-react';

export default function TranscriptEditor({
  segments = [],
  currentTime = 0,
  onSeek = () => {},
  onTranscriptChange = () => {},
  darkMode = true,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Sample fallback segments if none provided yet
  const activeSegments = segments.length > 0 ? segments : [
    { id: '1', start: 0.0, end: 2.5, speaker: 'Speaker 1', text: 'Welcome to OmniStudio Canvas.' },
    { id: '2', start: 2.8, end: 6.0, speaker: 'Speaker 1', text: 'Your all-in-one editor for video, audio, text, and AI transcription.' },
    { id: '3', start: 6.2, end: 10.0, speaker: 'Speaker 1', text: 'Edit your document or video with full interactive precision.' },
  ];

  const formatTime = (secs = 0) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}.${ms}`;
  };

  const handleStartEdit = (seg) => {
    setEditingId(seg.id);
    setEditText(seg.text);
  };

  const handleSaveEdit = (id) => {
    onTranscriptChange(id, editText);
    setEditingId(null);
  };

  // Export SRT Subtitle File
  const exportSrt = () => {
    let srtContent = '';
    activeSegments.forEach((seg, idx) => {
      const startSrt = formatSrtTime(seg.start);
      const endSrt = formatSrtTime(seg.end);
      srtContent += `${idx + 1}\n${startSrt} --> ${endSrt}\n${seg.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `omnistudio-subtitles-${Date.now()}.srt`;
    link.click();
  };

  const formatSrtTime = (seconds) => {
    const pad = (n, z = 2) => ('00' + n).slice(-z);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
  };

  const bgCard = darkMode ? '#1e293b' : '#ffffff';
  const borderCol = darkMode ? '#334155' : '#cbd5e1';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';

  return (
    <div style={{
      width: '100%',
      backgroundColor: bgCard,
      border: `1px solid ${borderCol}`,
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ec4899', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Captions size={16} /> Interactive Subtitle & Transcript Editor
        </span>
        
        <button 
          onClick={exportSrt}
          title="Download .SRT subtitle file for YouTube, Premiere, or VLC"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            backgroundColor: '#ec4899',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          <Download size={13} /> Export .SRT File
        </button>
      </div>

      {/* Segment Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }} className="custom-scroll">
        {activeSegments.map((seg) => {
          const isActive = currentTime >= seg.start && currentTime <= seg.end;

          return (
            <div
              key={seg.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                backgroundColor: isActive ? 'rgba(236, 72, 153, 0.15)' : (darkMode ? '#0f172a' : '#f8fafc'),
                border: `1px solid ${isActive ? '#ec4899' : borderCol}`,
                borderRadius: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Timestamp Click to Seek */}
              <button
                onClick={() => onSeek(seg.start)}
                title="Click to jump video playhead to this timecode"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(2, 132, 199, 0.2)',
                  color: '#38bdf8',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Clock size={12} /> {formatTime(seg.start)} - {formatTime(seg.end)}
              </button>

              {/* Speaker Tag */}
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
                <User size={10} /> {seg.speaker || 'Speaker'}
              </span>

              {/* Editable Text String / Word-Level Spans */}
              <div style={{ flex: 1 }}>
                {editingId === seg.id ? (
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(seg.id)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                      color: textColor,
                      border: '1px solid #0284c7',
                      borderRadius: '4px'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '12px', color: textColor, lineHeight: '1.4', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {/* Render word-level clickable spans if Whisper word timestamps exist */}
                    {seg.words && seg.words.length > 0 ? (
                      seg.words.map((w) => {
                        const isWordActive = currentTime >= w.start && currentTime <= w.end;
                        return (
                          <span
                            key={w.id || w.start}
                            onClick={() => onSeek(w.start)}
                            style={{
                              cursor: 'pointer',
                              padding: '1px 3px',
                              borderRadius: '2px',
                              backgroundColor: isWordActive ? '#ec4899' : 'transparent',
                              color: isWordActive ? '#ffffff' : textColor,
                              fontWeight: isWordActive ? 'bold' : 'normal'
                            }}
                          >
                            {w.word}
                          </span>
                        );
                      })
                    ) : (
                      <span 
                        onClick={() => onSeek(seg.start)}
                        style={{ cursor: 'pointer' }}
                      >
                        {seg.text}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div>
                {editingId === seg.id ? (
                  <button onClick={() => handleSaveEdit(seg.id)} style={iconActionBtnStyle('#10b981')} title="Save text"><Check size={13} /></button>
                ) : (
                  <button onClick={() => handleStartEdit(seg)} style={iconActionBtnStyle('#0284c7')} title="Edit text"><Edit2 size={13} /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const iconActionBtnStyle = (color) => ({
  backgroundColor: color,
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  padding: '4px 6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
});