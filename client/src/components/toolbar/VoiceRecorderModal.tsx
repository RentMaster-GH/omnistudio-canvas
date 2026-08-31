import React, { useState, useRef } from 'react';
import { Mic, Square, X, Play, Volume2, FileText, Check } from 'lucide-react';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAudioCard: (audioUrl: string, transcript: string) => void;
  borderCol?: string;
  bgBar?: string;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSaveAudioCard,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [liveTranscript, setTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start Recording Timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Speech Recognition Live Speech-to-Text
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          setTranscript(text);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err) {
      alert('Microphone access permission denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleSave = () => {
    if (audioBlobUrl) {
      onSaveAudioCard(audioBlobUrl, liveTranscript || 'Live audio dictation recording');
      onClose();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '420px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '12px 16px', backgroundColor: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mic size={16} /> Live Voice Dictation & Audio Recorder
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '12px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
            {!isRecording ? (
              <button onClick={startRecording} style={recordBtnStyle('#ef4444')}>
                <Mic size={16} /> Start Recording
              </button>
            ) : (
              <button onClick={stopRecording} style={recordBtnStyle('#f59e0b')}>
                <Square size={16} /> Stop Recording ({recordingTime}s)
              </button>
            )}
          </div>

          {/* Audio Preview */}
          {audioBlobUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Recorded Audio Preview:</span>
              <audio src={audioBlobUrl} controls style={{ width: '100%', height: '36px' }} />
            </div>
          )}

          {/* Live Transcript Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={12} /> Live Speech Transcription:
            </span>
            <textarea 
              value={liveTranscript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Spoken words will transcribe here automatically..."
              style={{ width: '100%', height: '80px', backgroundColor: '#0f172a', color: '#e2e8f0', border: `1px solid ${borderCol}`, borderRadius: '4px', padding: '8px', fontSize: '12px', resize: 'none' }}
            />
          </div>

          {/* Save Button */}
          {audioBlobUrl && (
            <button onClick={handleSave} style={{ padding: '8px 12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Check size={14} /> Add Audio Card to Canvas
            </button>
          )}

        </div>

      </div>
    </div>
  );
};

const recordBtnStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  backgroundColor: color,
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '13px',
});