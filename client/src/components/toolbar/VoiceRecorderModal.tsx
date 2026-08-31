import React, { useState, useRef } from 'react';
import { Mic, Square, X, FileText, Check, Globe } from 'lucide-react';

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
  const [selectedLang, setSelectedLang] = useState('en-US');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // 25+ African & Global Languages List
  const supportedLanguages = [
    { code: 'en-US', name: 'English (US / Global)' },
    { code: 'sw-KE', name: 'Swahili / Kiswahili (Kenya / TZ)' },
    { code: 'ha-NG', name: 'Hausa (Nigeria / WA)' },
    { code: 'am-ET', name: 'Amharic / ኃይለኛ (Ethiopia)' },
    { code: 'yo-NG', name: 'Yoruba (Nigeria)' },
    { code: 'om-ET', name: 'Oromo (Ethiopia / Kenya)' },
    { code: 'ig-NG', name: 'Igbo (Nigeria)' },
    { code: 'zu-ZA', name: 'Zulu / isiZulu (South Africa)' },
    { code: 'pcm-NG', name: 'Nigerian Pidgin' },
    { code: 'aka', name: 'Akan / Twi / Fante (Ghana)' },
    { code: 'gaa', name: 'Ga / Ga-Adangme (Ghana)' },
    { code: 'ee-GH', name: 'Ewe (Ghana / Togo)' },
    { code: 'sn-ZW', name: 'Shona (Zimbabwe)' },
    { code: 'pt-PT', name: 'Portuguese (Angola / Mozambique)' },
    { code: 'fr-FR', name: 'French (West / Central Africa)' },
    { code: 'es-ES', name: 'Spanish (Equatorial Guinea)' },
    { code: 'de-DE', name: 'German' },
    { code: 'zh-CN', name: 'Chinese Mandarin (中文)' },
    { code: 'ar-SA', name: 'Arabic / العربية' },
    { code: 'ja-JP', name: 'Japanese (日本語)' },
  ];

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

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Speech Recognition with selected language
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLang;

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
      <div style={{ width: '440px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '12px 16px', backgroundColor: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mic size={16} /> African & Global Multi-Language Voice Dictation
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Language Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={12} color="#38bdf8" /> Select Speech Dictation Language:
            </label>
            <select 
              value={selectedLang} 
              onChange={(e) => setSelectedLang(e.target.value)}
              disabled={isRecording}
              style={{ width: '100%', backgroundColor: '#0f172a', color: '#fff', border: `1px solid ${borderCol}`, borderRadius: '4px', padding: '6px 8px', fontSize: '12px' }}
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          {/* Recording Controls */}
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
              <FileText size={12} /> Transcribed Text ({selectedLang}):
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