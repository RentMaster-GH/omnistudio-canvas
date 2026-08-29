import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Type, Image as ImageIcon, Video, Mic, Download, Trash2, Sliders, FileText, 
  Music, Play, Captions, Save, Upload, Layers, Sun, Moon, Eraser, ChevronLeft, 
  ChevronRight, Eye, PanelLeftClose, PanelLeftOpen, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://omnistudio-canvas-api.onrender.com/api';

export default function CanvasStudio() {
  const canvasRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [activeTab, setActiveTab] = useState('pdf');
  const [darkMode, setDarkMode] = useState(true);
  const [status, setStatus] = useState('Ready');
  const [transcriptionText, setTranscriptionText] = useState('');
  const [timelineSec, setTimelineSec] = useState(0);

  // Zoom Engine State
  const [zoomLevel, setZoomLevel] = useState(1.0); // 1.0 = 100%

  // Portal Resizing & Collapse State
  const [drawerWidth, setDrawerWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // PDF Preview Portal State
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [imgBrightness, setImgBrightness] = useState(1);
  const [imgBlur, setImgBlur] = useState(0);

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 900,
      height: 650,
      backgroundColor: '#ffffff',
    });
    setFabricCanvas(canvas);
    return () => canvas.dispose();
  }, []);

  // --- ZOOM CONTROL ENGINE ---
  const handleZoom = (newZoom) => {
    if (!fabricCanvas) return;
    const clampedZoom = Math.max(0.2, Math.min(3.0, newZoom)); // 20% to 300%
    setZoomLevel(clampedZoom);

    const center = { x: fabricCanvas.width / 2, y: fabricCanvas.height / 2 };
    fabricCanvas.zoomToPoint(center, clampedZoom);
    fabricCanvas.renderAll();
  };

  const resetZoom = () => {
    if (!fabricCanvas) return;
    setZoomLevel(1.0);
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    fabricCanvas.renderAll();
  };

  // --- PORTAL RESIZING ENGINE ---
  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX - 80; // 80px = icon bar
      if (newWidth >= 160 && newWidth <= 600) {
        setDrawerWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // --- PDF PREVIEW & MOVABLE OBJECT ENGINE ---
  const handlePdfDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Loading PDF into Interactive Preview Portal...');
    const fileArrayBuffer = await file.arrayBuffer();

    try {
      const loadedPdf = await pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;
      setPdfDoc(loadedPdf);
      setTotalPages(loadedPdf.numPages);
      setPageNum(1);

      await renderPdfPageOntoCanvas(loadedPdf, 1);
      setStatus(`PDF Loaded! Previewing Page 1 of ${loadedPdf.numPages}`);
    } catch (err) {
      setStatus(`Error loading PDF: ${err.message}`);
    }
  };

  // Movable & Scalable PDF Object Engine
  const renderPdfPageOntoCanvas = async (pdf, pageNumber) => {
    if (!pdf || !fabricCanvas) return;

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });

    const tempCanvas = document.createElement('canvas');
    const context = tempCanvas.getContext('2d');
    tempCanvas.height = viewport.height;
    tempCanvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const imgData = tempCanvas.toDataURL('image/png');
    const imgObj = await fabric.FabricImage.fromURL(imgData);

    const canvasWidth = 900;
    const canvasHeight = 650;

    fabricCanvas.setDimensions({ width: canvasWidth, height: canvasHeight });

    // Auto-scale PDF page to fit cleanly inside workspace on load
    const scale = Math.min(
      (canvasWidth - 60) / imgObj.width,
      (canvasHeight - 60) / imgObj.height
    );

    imgObj.scale(scale);

    // Calculate Centering Position
    const left = (canvasWidth - imgObj.width * scale) / 2;
    const top = (canvasHeight - imgObj.height * scale) / 2;

    imgObj.set({
      left,
      top,
      selectable: true,  // Full drag, move, scale, and rotate controls!
      hasControls: true,
    });

    fabricCanvas.clear();
    resetZoom();
    fabricCanvas.add(imgObj);
    fabricCanvas.sendObjectToBack(imgObj); // Ensures text overlays sit on top of PDF page
    fabricCanvas.setActiveObject(imgObj);
    fabricCanvas.renderAll();
  };

  const changePdfPage = async (newPage) => {
    if (!pdfDoc || newPage < 1 || newPage > totalPages) return;
    setPageNum(newPage);
    setStatus(`Rendering Page ${newPage} of ${totalPages}...`);
    await renderPdfPageOntoCanvas(pdfDoc, newPage);
    setStatus(`Previewing Page ${newPage} of ${totalPages}`);
  };

  const addWhiteoutEraser = () => {
    if (!fabricCanvas) return;
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 35,
      fill: '#ffffff',
      stroke: '#cbd5e1',
      strokeWidth: 1,
    });
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
  };

  // --- SAVE & LOAD PROJECT ---
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
    const text = new fabric.IText('Edit PDF Text Here', { left: 100, top: 100, fontSize: 22, fill: '#0f172a' });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricCanvas) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imgObj = await fabric.FabricImage.fromURL(event.target.result);
      
      const scale = Math.min(800 / imgObj.width, 550 / imgObj.height, 1);
      imgObj.scale(scale);
      imgObj.set({
        left: (900 - imgObj.width * scale) / 2,
        top: (650 - imgObj.height * scale) / 2,
      });

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
    link.download = `edited-document-page-${pageNum}.png`;
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
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'sans-serif', backgroundColor: bgMain, color: textColor }}>
      {/* Scrollbar Styling Injection */}
      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: ${darkMode ? '#0f172a' : '#e2e8f0'};
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#334155' : '#94a3b8'};
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #0284c7;
        }
      `}</style>

      {/* Far-Left Icon Navigation Bar */}
      <div style={{ width: '80px', minWidth: '80px', backgroundColor: '#0284c7', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', gap: '20px', zIndex: 20 }}>
        <button title="PDF Document Editor" onClick={() => { setActiveTab('pdf'); setIsCollapsed(false); }} style={navIconStyle(activeTab === 'pdf')}><FileText size={22} /></button>
        <button title="Canvas Tools" onClick={() => { setActiveTab('canvas'); setIsCollapsed(false); }} style={navIconStyle(activeTab === 'canvas')}><Type size={22} /></button>
        <button title="Image Filters" onClick={() => { setActiveTab('image'); setIsCollapsed(false); }} style={navIconStyle(activeTab === 'image')}><Sliders size={22} /></button>
        <button title="Video & Audio" onClick={() => { setActiveTab('video'); setIsCollapsed(false); }} style={navIconStyle(activeTab === 'video')}><Video size={22} /></button>
        <button title="AI Transcribe" onClick={() => { setActiveTab('transcribe'); setIsCollapsed(false); }} style={navIconStyle(activeTab === 'transcribe')}><Mic size={22} /></button>

        <div style={{ marginTop: 'auto', marginBottom: '20px' }}>
          <button title="Toggle Dark/Light Mode" onClick={() => setDarkMode(!darkMode)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </div>

      {/* Resizable & Scrollable Tools Drawer (OmniStudio Portal) */}
      {!isCollapsed && (
        <div 
          className="custom-scroll"
          style={{ 
            width: `${drawerWidth}px`, 
            minWidth: `${drawerWidth}px`, 
            backgroundColor: bgSidebar, 
            padding: '20px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px', 
            overflowY: 'auto',
            height: '100vh',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>OmniStudio Portal</h2>
            <button 
              title="Collapse Portal" 
              onClick={() => setIsCollapsed(true)} 
              style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <PanelLeftClose size={20} />
            </button>
          </div>

          {activeTab === 'pdf' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3>PDF Document Portal</h3>
              <label style={{ ...btnStyle, backgroundColor: '#0284c7' }}>
                <Eye size={18} /> Upload PDF to Preview Portal
                <input type="file" accept=".pdf" onChange={handlePdfDocumentUpload} style={{ display: 'none' }} />
              </label>

              <hr style={{ borderColor: borderCol, margin: '5px 0' }} />

              {pdfDoc && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '12px', color: '#38bdf8' }}>Interactive Manual Editing Tools:</p>
                  <button onClick={addText} style={btnStyle}><Type size={18} /> Add Editable Text Box</button>
                  <button onClick={addWhiteoutEraser} style={{ ...btnStyle, backgroundColor: '#f59e0b' }}><Eraser size={18} /> Whiteout Cover Box</button>
                  <button onClick={deleteSelected} style={{ ...btnStyle, backgroundColor: '#ef4444' }}><Trash2 size={18} /> Delete Selected Object</button>
                  
                  <hr style={{ borderColor: borderCol, margin: '5px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => changePdfPage(pageNum - 1)} disabled={pageNum <= 1} style={paginationBtnStyle}><ChevronLeft size={16} /> Prev</button>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Page {pageNum} of {totalPages}</span>
                    <button onClick={() => changePdfPage(pageNum + 1)} disabled={pageNum >= totalPages} style={paginationBtnStyle}>Next <ChevronRight size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                <Download size={18} /> Export Document Page (PNG)
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
      )}

      {/* Resize Handle Divider */}
      {!isCollapsed && (
        <div 
          onMouseDown={startResizing}
          style={{
            width: '6px',
            cursor: 'col-resize',
            backgroundColor: isResizing ? '#0284c7' : borderCol,
            transition: 'background-color 0.2s',
            zIndex: 15,
            userSelect: 'none'
          }}
          title="Click and drag to shrink or expand the Portal"
        />
      )}

      {/* Expand Portal Button (Shown when collapsed) */}
      {isCollapsed && (
        <button 
          title="Expand Portal" 
          onClick={() => setIsCollapsed(false)}
          style={{
            position: 'absolute',
            left: '90px',
            top: '15px',
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px',
            cursor: 'pointer',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      {/* Main Studio Preview View & Timeline (Scrollable) */}
      <div 
        className="custom-scroll"
        style={{ 
          flex: 1, 
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          overflowY: 'auto',
          height: '100vh',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          Status: <span style={{ color: '#38bdf8' }}>{status}</span>
        </div>

        {/* Studio Preview Header & Zoom Controls */}
        <div style={{ width: '900px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>Canvas Viewport</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: bgSidebar, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${borderCol}` }}>
            <button 
              title="Zoom Out" 
              onClick={() => handleZoom(zoomLevel - 0.1)} 
              style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: '12px', fontWeight: 'bold', width: '45px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button 
              title="Zoom In" 
              onClick={() => handleZoom(zoomLevel + 0.1)} 
              style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ZoomIn size={16} />
            </button>
            
            <div style={{ width: '1px', height: '14px', backgroundColor: borderCol, margin: '0 4px' }} />

            <button 
              title="Reset Zoom / Fit Viewport" 
              onClick={resetZoom} 
              style={{ background: 'transparent', border: 'none', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold' }}
            >
              <RotateCcw size={14} /> Fit
            </button>
          </div>
        </div>

        {/* Live Document Preview Screen */}
        <div style={{ border: `2px solid ${borderCol}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
          <canvas ref={canvasRef} />
        </div>

        {/* Video Timeline Scrub Bar */}
        <div style={{ marginTop: '15px', width: '900px', backgroundColor: bgSidebar, border: `1px solid ${borderCol}`, padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          <div style={{ marginTop: '15px', width: '900px', backgroundColor: bgSidebar, border: `1px solid ${borderCol}`, padding: '15px', borderRadius: '8px' }}>
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

const paginationBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 12px',
  backgroundColor: '#0f172a',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
};