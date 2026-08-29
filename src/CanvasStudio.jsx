import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import axios from 'axios';
import { Type, Image as ImageIcon, Video, Mic, Download, Trash2, Sliders, FileText, Music } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function CanvasStudio() {
  const canvasRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' | 'image' | 'video' | 'pdf' | 'transcribe'
  const [status, setStatus] = useState('Ready');
  const [transcriptionText, setTranscriptionText] = useState('');

  // Image Fine-tuning state
  const [imgBrightness, setImgBrightness] = useState(1);
  const [imgBlur, setImgBlur] = useState(0);

  // PDF state
  const [pdfText, setPdfText] = useState('');

  // Initialize Fabric.js Canvas
  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 450,
      backgroundColor: '#ffffff',
    });
    setFabricCanvas(canvas);
    return () => canvas.dispose();
  }, []);

  // --- CANVAS HANDLERS ---
  const addText = () => {
    if (!fabricCanvas) return;
    const text = new fabric.IText('Edit this text', {
      left: 100,
      top: 100,
      fontSize: 28,
      fill: '#000000',
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricCanvas) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imgObj = await fabric.FabricImage.fromURL(event.target.result);
      imgObj.scaleToWidth(300);
      fabricCanvas.add(imgObj);
      fabricCanvas.setActiveObject(imgObj);
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    activeObjects.forEach((obj) => fabricCanvas.remove(obj));
    fabricCanvas.discardActiveObject();
  };

  const exportCanvasImage = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ format: 'png' });
    const link = document.createElement('a');
    link.download = 'canvas-export.png';
    link.href = dataURL;
    link.click();
  };

  // --- BACKEND API HANDLERS ---

  // Goal 1: Image Fine-Tuning (via Sharp backend)
  const handleImageFineTune = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Fine-tuning image with Sharp backend...');
    const formData = new FormData();
    formData.append('image', file);
    formData.append('brightness', imgBrightness);
    formData.append('blur', imgBlur);
    formData.append('format', 'png');

    try {
      const res = await axios.post(`${API_BASE}/image/edit`, formData);
      const imageUrl = `http://localhost:5000/outputs/${res.data.file}`;
      
      // Load processed image onto canvas
      const imgObj = await fabric.FabricImage.fromURL(imageUrl);
      imgObj.scaleToWidth(350);
      fabricCanvas.add(imgObj);
      setStatus('Image fine-tuned and added to canvas!');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  // Goal 3: Audio + Video Stitching (via FFmpeg backend)
  const handleVideoStitch = async (e) => {
    e.preventDefault();
    const videoFile = e.target.video.files[0];
    const audioFile = e.target.audio.files[0];

    if (!videoFile || !audioFile) {
      alert('Please select both a video and an audio file.');
      return;
    }

    setStatus('Stitching Audio + Video with FFmpeg...');
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('audio', audioFile);

    try {
      const res = await axios.post(`${API_BASE}/video/stitch`, formData);
      const fileUrl = `http://localhost:5000/outputs/${res.data.file}`;
      setStatus(`Stitching Complete! Output: ${fileUrl}`);
      window.open(fileUrl, '_blank');
    } catch (err) {
      setStatus(`Error stitching: ${err.message}`);
    }
  };

  // Goal 1 & Document: Add Text to PDF
  const handlePdfEdit = async (e) => {
    e.preventDefault();
    const pdfFile = e.target.pdf.files[0];
    if (!pdfFile || !pdfText) return;

    setStatus('Adding text overlay to PDF document...');
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('text', pdfText);
    formData.append('x', 50);
    formData.append('y', 700);
    formData.append('fontSize', 20);

    try {
      const res = await axios.post(`${API_BASE}/image/pdf/add-text`, formData);
      const fileUrl = `http://localhost:5000/outputs/${res.data.file}`;
      setStatus('PDF successfully edited!');
      window.open(fileUrl, '_blank');
    } catch (err) {
      setStatus(`Error editing PDF: ${err.message}`);
    }
  };

  // Goal 5: AI Transcription (via Whisper backend)
  const handleTranscription = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Transcribing media with Whisper AI...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/transcribe`, formData);
      const text = res.data.transcription.text;
      setTranscriptionText(text);

      // Auto-add transcription onto canvas
      const textObj = new fabric.IText(text, {
        left: 50,
        top: 350,
        fontSize: 18,
        fill: '#1e293b',
        width: 700,
        splitByGrapheme: true,
      });
      fabricCanvas.add(textObj);
      setStatus('Transcription complete & placed on canvas!');
    } catch (err) {
      setStatus(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f1f5f9' }}>
      {/* Sidebar Navigation */}
      <div style={{ width: '80px', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', gap: '20px' }}>
        <button title="Canvas Tools" onClick={() => setActiveTab('canvas')} style={navIconStyle(activeTab === 'canvas')}><Type size={22} /></button>
        <button title="Image Filters" onClick={() => setActiveTab('image')} style={navIconStyle(activeTab === 'image')}><Sliders size={22} /></button>
        <button title="Video & Audio" onClick={() => setActiveTab('video')} style={navIconStyle(activeTab === 'video')}><Video size={22} /></button>
        <button title="PDF Document" onClick={() => setActiveTab('pdf')} style={navIconStyle(activeTab === 'pdf')}><FileText size={22} /></button>
        <button title="AI Transcribe" onClick={() => setActiveTab('transcribe')} style={navIconStyle(activeTab === 'transcribe')}><Mic size={22} /></button>
      </div>

      {/* Control Panel Drawer */}
      <div style={{ width: '280px', backgroundColor: '#1e293b', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>OmniStudio Tools</h2>

        {activeTab === 'canvas' && (
          <>
            <button onClick={addText} style={btnStyle}><Type size={18} /> Add Text Box</button>
            <label style={btnStyle}>
              <ImageIcon size={18} /> Add Image
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </label>
            <button onClick={deleteSelected} style={{ ...btnStyle, backgroundColor: '#ef4444' }}>
              <Trash2 size={18} /> Delete Selected
            </button>
            <hr style={{ borderColor: '#334155', margin: '10px 0' }} />
            <button onClick={exportCanvasImage} style={{ ...btnStyle, backgroundColor: '#10b981' }}>
              <Download size={18} /> Export Canvas (PNG)
            </button>
          </>
        )}

        {activeTab === 'image' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3>Image Fine-Tuning</h3>
            <label style={{ fontSize: '12px' }}>Brightness: {imgBrightness}</label>
            <input type="range" min="0.5" max="2" step="0.1" value={imgBrightness} onChange={(e) => setImgBrightness(e.target.value)} />
            
            <label style={{ fontSize: '12px' }}>Blur: {imgBlur}</label>
            <input type="range" min="0" max="10" step="0.5" value={imgBlur} onChange={(e) => setImgBlur(e.target.value)} />

            <label style={{ ...btnStyle, marginTop: '10px' }}>
              <Sliders size={18} /> Apply & Upload Image
              <input type="file" accept="image/*" onChange={handleImageFineTune} style={{ display: 'none' }} />
            </label>
          </div>
        )}

        {activeTab === 'video' && (
          <form onSubmit={handleVideoStitch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3>Stitch Audio + Video</h3>
            <label style={{ fontSize: '12px' }}>Video File:</label>
            <input type="file" name="video" accept="video/*" required style={{ fontSize: '12px' }} />
            
            <label style={{ fontSize: '12px' }}>Audio File:</label>
            <input type="file" name="audio" accept="audio/*" required style={{ fontSize: '12px' }} />

            <button type="submit" style={{ ...btnStyle, marginTop: '10px', backgroundColor: '#8b5cf6' }}>
              <Music size={18} /> Stitch & Render MP4
            </button>
          </form>
        )}

        {activeTab === 'pdf' && (
          <form onSubmit={handlePdfEdit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3>Edit PDF Document</h3>
            <label style={{ fontSize: '12px' }}>Text to Add:</label>
            <input type="text" value={pdfText} onChange={(e) => setPdfText(e.target.value)} placeholder="Type text here..." required style={{ padding: '8px', borderRadius: '4px', border: 'none' }} />

            <label style={{ fontSize: '12px' }}>Upload PDF:</label>
            <input type="file" name="pdf" accept=".pdf" required style={{ fontSize: '12px' }} />

            <button type="submit" style={{ ...btnStyle, marginTop: '10px', backgroundColor: '#0284c7' }}>
              <FileText size={18} /> Save & Open PDF
            </button>
          </form>
        )}

        {activeTab === 'transcribe' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3>Whisper AI Speech-to-Text</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Upload any video or audio to automatically generate subtitles onto your canvas.</p>
            <label style={{ ...btnStyle, backgroundColor: '#ec4899' }}>
              <Mic size={18} /> Upload Media & Transcribe
              <input type="file" accept="audio/*,video/*" onChange={handleTranscription} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>

      {/* Main Workspace */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '15px', color: '#334155', fontWeight: 'bold' }}>
          Status: <span style={{ color: '#2563eb' }}>{status}</span>
        </div>

        <div style={{ border: '2px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <canvas ref={canvasRef} />
        </div>

        {transcriptionText && (
          <div style={{ marginTop: '20px', width: '800px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Transcription Text:</h3>
            <p style={{ color: '#334155', fontSize: '14px' }}>{transcriptionText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const navIconStyle = (active) => ({
  backgroundColor: active ? '#3b82f6' : 'transparent',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px',
  cursor: 'pointer',
});

const btnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 15px',
  backgroundColor: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
};