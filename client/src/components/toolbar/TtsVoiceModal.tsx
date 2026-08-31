import React, { useEffect, useState } from 'react';
import { Volume2, Play, Pause, Square, X, Sliders } from 'lucide-react';

interface TtsVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  borderCol?: string;
  bgBar?: string;
}

export const TtsVoiceModal: React.FC<TtsVoiceModalProps> = ({
  isOpen,
  onClose,
  initialText = 'Select any text or PDF paragraph on the canvas to read aloud.',
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [textToRead, setTextToRead] = useState(initialText);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setTextToRead(initialText);
  }, [initialText]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  if (!isOpen) return null;

  const handlePlay = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel(); // Stop any previous speech

    const utterance = new SpeechSynthesisUtterance(textToRead);
    if (voices.length > 0 && voices[selectedVoiceIndex]) {
      utterance.voice = voices[selectedVoiceIndex];
    }
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const handleModalClose = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '450px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '12px 16px', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Volume2 size={16} /> Text-to-Speech (TTS) Document Voice Reader
          </span>
          <button onClick={handleModalClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Text Area */}
          <textarea 
            value={textToRead} 
            onChange={(e) => setTextToRead(e.target.value)}
            placeholder="Type or select canvas text to read aloud..."
            style={{ width: '100%', height: '100px', backgroundColor: '#0f172a', color: '#e2e8f0', border: `1px solid ${borderCol}`, borderRadius: '4px', padding: '8px', fontSize: '12px', resize: 'none' }}
          />

          {/* Voice Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8' }}>Voice Synthesizer Speaker:</label>
            <select 
              value={selectedVoiceIndex}
              onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
              style={{ width: '100%', backgroundColor: '#0f172a', color: '#fff', border: `1px solid ${borderCol}`, borderRadius: '4px', padding: '6px 8px', fontSize: '11px' }}
            >
              {voices.map((voice, idx) => (
                <option key={idx} value={idx}>{voice.name} ({voice.lang})</option>
              ))}
            </select>
          </div>

          {/* Speed Rate & Pitch Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Speed: {rate}x</label>
              <input type="range" min={0.5} max={2.0} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Pitch: {pitch}</label>
              <input type="range" min={0.5} max={1.5} step={0.1} value={pitch} onChange={(e) => setPitch(Number(e.target.value))} style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }} />
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '4px' }}>
            {!isPlaying ? (
              <button onClick={handlePlay} style={controlBtnStyle('#0284c7')}>
                <Play size={14} /> Read Aloud
              </button>
            ) : (
              <button onClick={handlePause} style={controlBtnStyle('#f59e0b')}>
                <Pause size={14} /> Pause
              </button>
            )}

            <button onClick={handleStop} style={controlBtnStyle('#64748b')}>
              <Square size={14} /> Stop
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

const controlBtnStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  backgroundColor: color,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '12px',
});