import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import axios from 'axios';
import { Type, Image as ImageIcon, Video, Mic, Download, Trash2, Sliders, FileText, Music, Play, Captions, Save, Upload, Layers, Sun, Moon } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://omnistudio-canvas-api.onrender.com/api';

export default function CanvasStudio() {
  const canvasRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [activeTab, setActiveTab] = useState('canvas');
  const [darkMode, setDarkMode] = useState(true); // Dark/Light Mode Theme
  const [status, setStatus] = useState('Ready');
  const [transcriptionText, setTranscriptionText] = useState('');
  const [timelineSec, setTimelineSec] = useState(0);

  const [imgBrightness, setImgBrightness] = useState(1);
  const [imgBlur, setImgBlur] = useState(0);
  const [pdfText, setPdfText] = useState('');

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 450,
      backgroundColor: '#ffffff',
    });
    setFabricCanvas(canvas);
    return () => canvas.dispose();
  }, []);

  // --- SAVE & LOAD PROJECT (JSON) ---
  const saveProjectJson = () => {
    if (!fabricCanvas) return;
    const jsonStr = JSON.stringify(fabricCanvas.toJSON());
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `omnistudio-project-${Date.now()}.json`;
    link.click();
    setStatus('Project saved as JSON!');
  };

  const loadProjectJson = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricCanvas) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      fabricCanvas.loadFromJSON(event.target.result, () => {
        fabricCanvas.renderAll();
        setStatus('Project JSON loaded onto canvas!');
      });
    };
    reader.readAsText(file);
  };

  // --- CANVAS HANDLERS ---
  const addText = () => {
    if (!fabricCanvas) return;
    const text = new fabric.IText('Animated Title', { left: 100, top: 100, fontSize: 32, fill: '#1e293b' });
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

  const exportCanvasToMp4 = async () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject() || fabricCanvas.getObjects()[0];
    if (!activeObj) {
      alert('Please add a text or image object to canvas first!');
      return;
    }

    setStatus('Recording 30 frames of animation...');
    const frames = [];
    const totalFrames = 30;
    const initialLeft = activeObj.left;

    for (let i = 0; i < totalFrames; i++) {
      activeObj.set('left', initialLeft + i * 5);
      fabricCanvas.renderAll();
      frames.push(fabricCanvas.toDataURL({ format: 'png' }));
    }

    activeObj.set('left', initialLeft);
    fabricCanvas.renderAll();

    setStatus('Rendering MP4 video via FFmpeg backend...');

    try {
      const res = await axios.post(`${API_BASE}/video/render-canvas`, { frames, fps: 30 });
      const videoUrl = `${API_BASE.replace('/api', '')}/outputs/${res.data.file}`;
      setStatus(`Animation exported! Opening MP4...`);
      window.open(videoUrl, '_blank');
    } catch (err) {
      setStatus(`Error rendering MP4: ${err.message}`);
    }
  };

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
      const imageUrl = `${API_BASE.replace('/api', '')}/outputs/${res.data.file}`;
      const imgObj = await fabric.FabricImage.fromURL(imageUrl);
      imgObj.scaleToWidth(350);
      fabricCanvas.add(imgObj);
      setStatus('Image fine-tuned and added to canvas!');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

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
      const fileUrl = `${API_BASE.replace('/api', '')}/outputs/${res.data.file}`;
      setStatus(`Stitching Complete! Output: ${fileUrl}`);
      window.open(fileUrl, '_blank');
    } catch (err) {
      setStatus(`Error stitching: ${err.message}`);
    }
  };

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
      const fileUrl = `${API_BASE.replace('/api', '')}/outputs/${res.data.file}`;
      setStatus('PDF successfully edited!');
      window.open(fileUrl, '_blank');
    } catch (err) {
      setStatus(`Error editing PDF: ${err.message}`);
    }
  };

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

      const textObj = new fabric.IText(text, { left: 50, top: 350, fontSize: 18, fill: '#1e293b', width: 700, splitByGrapheme: true });
      fabricCanvas.add(textObj);
      setStatus('Transcription complete & placed on canvas!');
    } catch (err) {
      setStatus(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleAutoSubtitleVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Whisper AI transcribing & FFmpeg burning subtitles onto video...');
    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await axios.post(`${API_BASE}/video/auto-subtitle`, formData);
      const videoUrl = `${API_BASE.replace('/api', '')}/outputs/${res.data.file}`;
      setTranscriptionText(res.data.transcriptionText);
      setStatus(`Subtitled video ready! Opening MP4...`);
      window.open(videoUrl, '_blank');
    } catch (err) {
      setStatus(`Error generating subtitled video: ${err.message}`);
    }
  };

  // Theme Styles
  const bgMain = darkMode ? '#0f172a' : '#f1f5f9';
  const bgSidebar = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderCol = darkMode ? '#334155' : '#e2e8f0';

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: bgMain, color: textColor, transition: 'all 0.3s' }}>
      {/* Sidebar Nav */}
      <div style={{ width: '80px', backgroundColor: '#0284c7', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', gap: '20px' }}>
        <button title="Canvas Tools" onClick={() => setActiveTab('canvas')} style={navIconStyle(activeTab === 'canvas')}><Type size={22} /></button>
        <button title="Image Filters" onClick={() => setActiveTab('image')} style={navIconStyle(activeTab === 'image')}><Sliders size={22} /></button>
        <button title="Video & Audio" onClick={() => setActiveTab('video')} style={navIconStyle(activeTab === 'video')}><Video size={22} /></button>
        <button title="PDF Document" onClick={() => setActiveTab('pdf')} style={navIconStyle(activeTab === 'pdf')}><FileText size={22} /></button>
        <button title="AI Transcribe" onClick={() => setActiveTab('transcribe')} style={navIconStyle(activeTab === 'transcribe')}><Mic size={22} /></button>
        
        {/* Theme Toggle Button */}
        <div style={{ marginTop: 'auto', marginBottom: '20px' }}>
          <button title="Toggle Dark/Light Mode" onClick={() => setDarkMode(!darkMode)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </div>

      {/* Tools Drawer */}
      <div style={{ width: '280px', backgroundColor: bgSidebar, borderRight: `1px solid ${borderCol}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
            <hr style={{ borderColor: borderCol, margin: '5px 0' }} />
            
            <button onClick={saveProjectJson} style={{ ...btnStyle, backgroundColor: '#0284c7' }}>
              <Save size={18} /> Save Project (JSON)
            </button>
            <label style={{ ...btnStyle, backgroundColor: '#0369a1' }}>
              <Upload size={18} /> Load Project (JSON)
              <input type="file" accept=".json" onChange={loadProjectJson} style={{ display: 'none' }} />
            </label>

            <hr style={{ borderColor: borderCol, margin: '5px 0' }} />
            <button onClick={exportCanvasImage} style={{ ...btnStyle, backgroundColor: '#10b981' }}>
              <Download size={18} /> Export PNG
            </button>
            <button onClick={exportCanvasToMp4} style={{ ...btnStyle, backgroundColor: '#8b5cf6' }}>
              <Play size={18} /> Render Canvas to MP4
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
            <h3>Whisper AI Subtitles</h3>
            <label style={{ ...btnStyle, backgroundColor: '#ec4899' }}>
              <Mic size={18} /> Transcribe to Canvas
              <input type="file" accept="audio/*,video/*" onChange={handleTranscription} style={{ display: 'none' }} />
            </label>

            <hr style={{ borderColor: borderCol, margin: '5px 0' }} />

            <label style={{ ...btnStyle, backgroundColor: '#d946ef' }}>
              <Captions size={18} /> Auto-Subtitle Video (MP4)
              <input type="file" accept="video/*" onChange={handleAutoSubtitleVideo} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>

      {/* Main Studio View & Timeline */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          Status: <span style={{ color: '#38bdf8' }}>{status}</span>
        </div>

        {/* Canvas Screen */}
        <div style={{ border: `2px solid ${borderCol}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
          <canvas ref={canvasRef} />
        </div>

        {/* Video Timeline Scrub Bar */}
        <div style={{ marginTop: '15px', width: '800px', backgroundColor: bgSidebar, border: `1px solid ${borderCol}`, padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Layers size={16} /> Video Timeline Track</span>
            <span style={{ fontSize: '12px', color: '#0284c7' }}>00:00:{String(timelineSec).padStart(2, '0')} / 00:00:30</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="30" 
            value={timelineSec} 
            onChange={(e) => setTimelineSec(e.target.value)}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#0284c7' }}
          />
        </div>

        {/* Transcription Output Display */}
        {transcriptionText && (
          <div style={{ marginTop: '15px', width: '800px', backgroundColor: bgSidebar, border: `1px solid ${borderCol}`, padding: '15px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Transcription Text:</h3>
            <p style={{ fontSize: '14px' }}>{transcriptionText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const navIconStyle = (active) => ({
  backgroundColor: active ? '#0369a1' : 'transparent',
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
  backgroundColor: '#0284c7',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
};