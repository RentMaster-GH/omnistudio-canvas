import React, { useState, useRef, useEffect } from 'react';
import { Mic, Video, Square, Play, Pause, Download, Clock, X, Sparkles, Plus } from 'lucide-react';
import axios from 'axios';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsertMediaToCanvas: (type: 'image' | 'template', urlOrText: string) => void;
  onInsertTranscriptToCanvas: (text: string) => void;
  borderCol?: string;
  bgBar?: string;
}

export const UnlimitedStudioRecorderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onInsertMediaToCanvas,
  onInsertTranscriptToCanvas,
}) => {
  const [recordMode, setRecordMode] = useState<'audio' | 'video'>('video');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState('');
  const [extractedTranscript, setExtractedTranscript] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Function declared BEFORE useEffect (Fixes ReferenceError Hoisting Bug)
  const stopStreamTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopStreamTracks();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours < 10 ? '0' : ''}${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- START UNLIMITED RECORDING ---
  const startRecording = async () => {
    try {
      mediaChunksRef.current = [];
      setRecordedBlob(null);
      setMediaUrl(null);
      setExtractedTranscript(null);

      let stream: MediaStream;

      if (recordMode === 'video') {
        const videoStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30, max: 60 } },
          audio: true,
        });
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = [...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()];
        stream = new MediaStream(tracks);
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      }

      streamRef.current = stream;

      if (recordMode === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const mimeType = recordMode === 'video' ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus';
      const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(mediaChunksRef.current, {
          type: recordMode === 'video' ? 'video/webm' : 'audio/webm',
        });
        setRecordedBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setMediaUrl(url);
        stopStreamTracks();
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;

      setIsRecording(true);
      setIsPaused(false);
      setElapsedSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Recording initialization error:', err);
      alert('Could not start recording: ' + (err.message || 'Permission denied'));
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        timerIntervalRef.current = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleTranscribeRecordedMedia = async () => {
    if (!recordedBlob) {
      alert('Please record an audio or video session first!');
      return;
    }

    setIsTranscribing(true);
    setTranscribeProgress('Uploading media chunk for transcription...');

    try {
      const fileExt = recordMode === 'video' ? 'webm' : 'webm';
      const file = new File([recordedBlob], `recording_${Date.now()}.${fileExt}`, {
        type: recordedBlob.type,
      });

      const formData = new FormData();
      formData.append('file', file);

      const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
      
      const res = await axios.post(`${API_BASE}/transcribe`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setTranscribeProgress(`Processing media (${percent}% uploaded)...`);
        },
      });

      if (res.data?.transcription?.text) {
        const textResult = res.data.transcription.text;
        setExtractedTranscript(textResult);
        alert('🎉 Transcription complete!');
      } else {
        alert('Transcription finished, but no spoken text was detected.');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      alert('Transcription Error: ' + (err.response?.data?.details || err.message));
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDownloadMedia = () => {
    if (!mediaUrl) return;
    const a = document.createElement('a');
    a.href = mediaUrl;
    a.download = `omnistudio_unlimited_recording_${Date.now()}.${recordMode === 'video' ? 'webm' : 'webm'}`;
    a.click();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '28px',
        maxWidth: '560px',
        width: '100%',
        border: '1px solid #334155',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
        position: 'relative'
      }}>
        <button
          onClick={() => { stopStreamTracks(); onClose(); }}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          <X style={{ width: '20px', height: '20px' }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(2, 132, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #0284c7' }}>
            <Video style={{ width: '22px', height: '22px', color: '#38bdf8' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Unlimited Studio Recorder & Transcriber</h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Record & Transcribe Audio/Video with NO time limits</span>
          </div>
        </div>

        {!isRecording && (
          <div style={{ display: 'flex', backgroundColor: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '20px' }}>
            <button
              onClick={() => setRecordMode('video')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: recordMode === 'video' ? '#0284c7' : 'transparent',
                color: recordMode === 'video' ? '#ffffff' : '#94a3b8'
              }}
            >
              <Video style={{ width: '15px', height: '15px' }} /> 🎥 Video & Screen Recording
            </button>
            <button
              onClick={() => setRecordMode('audio')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: recordMode === 'audio' ? '#0284c7' : 'transparent',
                color: recordMode === 'audio' ? '#ffffff' : '#94a3b8'
              }}
            >
              <Mic style={{ width: '15px', height: '15px' }} /> 🎙️ Audio Dictation
            </button>
          </div>
        )}

        {recordMode === 'video' && (
          <div style={{ width: '100%', height: '220px', backgroundColor: '#0f172a', borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {mediaUrl ? (
              <video src={mediaUrl} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <video ref={videoPreviewRef} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
        )}

        <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            <Clock style={{ width: '18px', height: '18px', color: isRecording ? '#ef4444' : '#94a3b8' }} />
            <span style={{ fontFamily: 'monospace', fontSize: '26px', fontWeight: 'bold', color: isRecording ? '#ef4444' : '#ffffff' }}>
              {formatTimer(elapsedSeconds)}
            </span>
            {isRecording && (
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {!isRecording ? (
              <button
                onClick={startRecording}
                style={{ padding: '10px 24px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Play style={{ width: '16px', height: '16px' }} /> Start Unlimited Recording
              </button>
            ) : (
              <>
                <button
                  onClick={pauseRecording}
                  style={{ padding: '10px 18px', backgroundColor: '#f59e0b', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isPaused ? <Play style={{ width: '16px', height: '16px' }} /> : <Pause style={{ width: '16px', height: '16px' }} />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={stopRecording}
                  style={{ padding: '10px 24px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Square style={{ width: '16px', height: '16px' }} /> Stop Recording
                </button>
              </>
            )}
          </div>
        </div>

        {recordedBlob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleTranscribeRecordedMedia}
                disabled={isTranscribing}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#8b5cf6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: isTranscribing ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles style={{ width: '16px', height: '16px' }} />
                {isTranscribing ? transcribeProgress : '🗣️ Transcribe to Text (Unlimited)'}
              </button>

              <button
                onClick={handleDownloadMedia}
                style={{ padding: '12px 16px', backgroundColor: '#334155', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download style={{ width: '15px', height: '15px' }} /> Save File
              </button>
            </div>

            {extractedTranscript && (
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', maxHeight: '120px', overflowY: 'auto' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', display: 'block', marginBottom: '4px' }}>
                  📄 Extracted Transcript Text:
                </span>
                <p style={{ fontSize: '12px', color: '#f8fafc', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {extractedTranscript}
                </p>
                <button
                  onClick={() => {
                    onInsertTranscriptToCanvas(extractedTranscript);
                    onClose();
                  }}
                  style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus style={{ width: '13px', height: '13px' }} /> Insert Transcript onto Canvas Surface
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};