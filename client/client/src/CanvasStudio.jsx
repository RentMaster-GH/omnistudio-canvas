import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { 
  Type, Image as ImageIcon, Video, Mic, Download, Trash2, Sliders, FileText, 
  Music, Play, Captions, Save, Upload, Layers, Sun, Moon, Eraser, ChevronLeft, 
  ChevronRight, Eye, ZoomIn, ZoomOut, RotateCcw, RotateCw, Hand, MousePointer, 
  Highlighter, Pencil, Stamp, Square, Circle, Minus, Cloud, ChevronDown, FileDown
} from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://omnistudio-canvas-api.onrender.com/api';

export default function CanvasStudio() {
  const canvasRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [activePortal, setActivePortal] = useState('pdf');
  const [darkMode, setDarkMode] = useState(true);
  const [status, setStatus] = useState('Ready');

  const [activeTool, setActiveTool] = useState('select');
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);

  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [timelineSec, setTimelineSec] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState('');

  const [imgBrightness, setImgBrightness] = useState(1);
  const [imgBlur, setImgBlur] = useState(0);

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 900,
      height: 650,
      backgroundColor: '#ffffff',
    });

    setFabricCanvas(canvas);
    saveState(canvas);

    return () => canvas.dispose();
  }, []);

  const saveState = (targetCanvas = fabricCanvas) => {
    if (!targetCanvas) return;
    const json = JSON.stringify(targetCanvas.toJSON());
    setUndoStack((prev) => [...prev, json]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length <= 1 || !fabricCanvas) return;
    const currentState = undoStack[undoStack.length - 1];
    const prevState = undoStack[undoStack.length - 2];

    setRedoStack((prev) => [...prev, currentState]);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));

    fabricCanvas.loadFromJSON(prevState, () => fabricCanvas.renderAll());
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !fabricCanvas) return;
    const nextState = redoStack[redoStack.length - 1];

    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, nextState]);

    fabricCanvas.loadFromJSON(nextState, () => fabricCanvas.renderAll());
  };

  const activateToolMode = (mode) => {
    if (!fabricCanvas) return;
    setActiveTool(mode);
    setActiveDropdown(null);

    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = true;

    if (mode === 'hand') {
      fabricCanvas.selection = false;
      fabricCanvas.defaultCursor = 'grab';
    } else if (mode === 'draw') {
      fabricCanvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(fabricCanvas);
      brush.width = 3;
      brush.color = '#ef4444';
      fabricCanvas.freeDrawingBrush = brush;
    } else if (mode === 'highlight') {
      fabricCanvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(fabricCanvas);
      brush.width = 18;
      brush.color = 'rgba(250, 204, 21, 0.4)';
      fabricCanvas.freeDrawingBrush = brush;
    } else {
      fabricCanvas.defaultCursor = 'default';
    }
  };

  const handlePdfDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Loading PDF into Document Navigator...');
    const fileArrayBuffer = await file.arrayBuffer();

    try {
      const loadedPdf = await pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;
      setPdfDoc(loadedPdf);
      setTotalPages(loadedPdf.numPages);
      setPageNum(1);

      generateThumbnails(loadedPdf);
      await renderPdfPageOntoCanvas(loadedPdf, 1);
      setStatus(`PDF Loaded! Previewing Page 1 of ${loadedPdf.numPages}`);
    } catch (err) {
      setStatus(`Error loading PDF: ${err.message}`);
    }
  };

  const generateThumbnails = async (pdf) => {
    const thumbs = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.2 });
      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      tempCanvas.height = viewport.height;
      tempCanvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      thumbs.push(tempCanvas.toDataURL('image/png'));
    }
    setThumbnails(thumbs);
  };

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

    const scale = Math.min((canvasWidth - 60) / imgObj.width, (canvasHeight - 60) / imgObj.height);
    imgObj.scale(scale);

    const left = (canvasWidth - imgObj.width * scale) / 2;
    const top = (canvasHeight - imgObj.height * scale) / 2;

    imgObj.set({ left, top, selectable: true, hasControls: true });

    fabricCanvas.clear();
    fabricCanvas.add(imgObj);
    fabricCanvas.sendObjectToBack(imgObj);
    fabricCanvas.setActiveObject(imgObj);
    fabricCanvas.renderAll();

    saveState(fabricCanvas);
  };

  const changePdfPage = async (newPage) => {
    if (!pdfDoc || newPage < 1 || newPage > totalPages) return;
    setPageNum(newPage);
    await renderPdfPageOntoCanvas(pdfDoc, newPage);
  };

  // --- MULTI-PAGE PDF EXPORT ENGINE ---
  const exportCompletePdf = async () => {
    if (!pdfDoc || !fabricCanvas) {
      alert('Please upload a PDF document first to export as PDF!');
      return;
    }

    setStatus('📄 Compiling all edited pages into downloadable PDF...');

    try {
      const pdfExport = new jsPDF({
        orientation: fabricCanvas.width > fabricCanvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [fabricCanvas.width, fabricCanvas.height],
      });

      const currentPage = pageNum;

      for (let i = 1; i <= totalPages; i++) {
        setStatus(`📄 Rendering & baking Page ${i} of ${totalPages}...`);
        await renderPdfPageOntoCanvas(pdfDoc, i);

        // Capture rendered canvas frame as PNG
        const pageDataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 1.0 });

        if (i > 1) {
          pdfExport.addPage(
            [fabricCanvas.width, fabricCanvas.height], 
            fabricCanvas.width > fabricCanvas.height ? 'landscape' : 'portrait'
          );
        }

        pdfExport.addImage(pageDataUrl, 'PNG', 0, 0, fabricCanvas.width, fabricCanvas.height);
      }

      // Restore original active page view
      await renderPdfPageOntoCanvas(pdfDoc, currentPage);
      setPageNum(currentPage);

      // Save complete compiled PDF file
      pdfExport.save(`omnistudio-edited-document-${Date.now()}.pdf`);
      setStatus('✅ Multi-Page PDF exported and downloaded successfully!');
      alert('🎉 Your complete edited PDF document has been downloaded!');
    } catch (err) {
      console.error('PDF Export Error:', err);
      setStatus(`Error exporting PDF: ${err.message}`);
    }
  };

  const addText = () => {
    if (!fabricCanvas) return;
    activateToolMode('select');
    const text = new fabric.IText('Edit text here', { left: 150, top: 150, fontSize: 22, fill: '#0f172a' });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    saveState();
  };

  const addWhiteoutEraser = () => {
    if (!fabricCanvas) return;
    activateToolMode('select');
    const rect = new fabric.Rect({
      left: 150,
      top: 150,
      width: 180,
      height: 35,
      fill: '#ffffff',
      stroke: '#cbd5e1',
      strokeWidth: 1,
    });
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    saveState();
  };

  const purgeVectorStrokes = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    activeObjects.forEach((obj) => fabricCanvas.remove(obj));
    fabricCanvas.discardActiveObject();
    saveState();
  };

  const addStamp = (type) => {
    if (!fabricCanvas) return;
    activateToolMode('select');

    let textStr = 'APPROVED';
    let color = '#10b981';

    if (type === 'CONFIDENTIAL') { textStr = 'CONFIDENTIAL'; color = '#ef4444'; }
    if (type === 'DRAFT') { textStr = 'DRAFT'; color = '#0284c7'; }

    const text = new fabric.Text(textStr, { fontSize: 20, fontWeight: 'bold', fill: color, left: 15, top: 10 });
    const rect = new fabric.Rect({ width: text.width + 30, height: text.height + 20, fill: 'rgba(255, 255, 255, 0.9)', stroke: color, strokeWidth: 3, rx: 6, ry: 6 });

    const group = new fabric.Group([rect, text], { left: 200, top: 200, angle: -12 });
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    saveState();
  };

  const addShape = (shapeType) => {
    if (!fabricCanvas) return;
    activateToolMode('select');

    let shapeObj;
    if (shapeType === 'rect') {
      shapeObj = new fabric.Rect({ left: 200, top: 200, width: 120, height: 80, fill: 'transparent', stroke: '#0284c7', strokeWidth: 3 });
    } else if (shapeType === 'ellipse') {
      shapeObj = new fabric.Ellipse({ left: 200, top: 200, rx: 60, ry: 40, fill: 'transparent', stroke: '#0284c7', strokeWidth: 3 });
    } else if (shapeType === 'line') {
      shapeObj = new fabric.Line([50, 50, 200, 50], { left: 200, top: 200, stroke: '#0284c7', strokeWidth: 3 });
    } else if (shapeType === 'cloud') {
      const cloudPath = 'M 10 30 Q 15 10, 35 15 Q 55 5, 70 25 Q 90 25, 90 45 Q 95 65, 75 75 Q 65 95, 45 85 Q 25 95, 15 75 Q -5 65, 5 45 Q -5 25, 10 30 Z';
      shapeObj = new fabric.Path(cloudPath, { left: 200, top: 200, fill: 'transparent', stroke: '#ef4444', strokeWidth: 3, scaleX: 1.5, scaleY: 1.5 });
    }

    if (shapeObj) {
      fabricCanvas.add(shapeObj);
      fabricCanvas.setActiveObject(shapeObj);
      saveState();
    }
  };

  const handleZoom = (newZoom) => {
    if (!fabricCanvas) return;
    const clampedZoom = Math.max(0.2, Math.min(3.0, newZoom));
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricCanvas) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imgObj = await fabric.FabricImage.fromURL(event.target.result);
      imgObj.scaleToWidth(250);
      imgObj.set({ left: 200, top: 200 });
      fabricCanvas.add(imgObj);
      fabricCanvas.setActiveObject(imgObj);
      saveState();
    };
    reader.readAsDataURL(file);
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

  const bgMain = darkMode ? '#0f172a' : '#f1f5f9';
  const bgBar = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderCol = darkMode ? '#334155' : '#cbd5e1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'sans-serif', backgroundColor: bgMain, color: textColor }}>
      
      {/* TOP PORTAL SWITCHER BAR */}
      <div style={{ height: '42px', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', padding: '0 15px', gap: '8px', zIndex: 40 }}>
        <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff', marginRight: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={18} /> OmniStudio</span>
        
        <button onClick={() => setActivePortal('pdf')} style={portalTabStyle(activePortal === 'pdf')}><FileText size={14} /> PDF Portal</button>
        <button onClick={() => setActivePortal('canvas')} style={portalTabStyle(activePortal === 'canvas')}><Type size={14} /> Canvas Studio</button>
        <button onClick={() => setActivePortal('image')} style={portalTabStyle(activePortal === 'image')}><Sliders size={14} /> Image Filters</button>
        <button onClick={() => setActivePortal('video')} style={portalTabStyle(activePortal === 'video')}><Video size={14} /> Video & Audio</button>
        <button onClick={() => setActivePortal('transcribe')} style={portalTabStyle(activePortal === 'transcribe')}><Mic size={14} /> AI Subtitles</button>

        <div style={{ marginLeft: 'auto' }}>
          <button title="Toggle Theme" onClick={() => setDarkMode(!darkMode)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* SECONDARY TOOL RIBBON (Contextual to Selected Portal) */}
      <div style={{ height: '54px', backgroundColor: bgBar, borderBottom: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', padding: '0 15px', justifyContent: 'space-between', zIndex: 30 }}>
        
        {/* PDF EDITING TOOLS RIBBON */}
        {activePortal === 'pdf' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={prominentBtnStyle('#0284c7')}>
                <Upload size={15} /> Open PDF
                <input type="file" accept=".pdf" onChange={handlePdfDocumentUpload} style={{ display: 'none' }} />
              </label>

              <div style={{ width: '1px', height: '20px', backgroundColor: borderCol, margin: '0 2px' }} />

              <button title="Undo" onClick={handleUndo} disabled={undoStack.length <= 1} style={iconToolBtnStyle(false)}><RotateCcw size={15} /></button>
              <button title="Redo" onClick={handleRedo} disabled={redoStack.length === 0} style={iconToolBtnStyle(false)}><RotateCw size={15} /></button>
              
              <div style={{ width: '1px', height: '20px', backgroundColor: borderCol, margin: '0 2px' }} />

              <button title="Select Tool" onClick={() => activateToolMode('select')} style={iconToolBtnStyle(activeTool === 'select')}><MousePointer size={15} /></button>
              <button title="Hand / Pan Tool" onClick={() => activateToolMode('hand')} style={iconToolBtnStyle(activeTool === 'hand')}><Hand size={15} /></button>

              <div style={{ width: '1px', height: '20px', backgroundColor: borderCol, margin: '0 2px' }} />

              {/* 1. TEXT TOOL */}
              <button title="Add / Edit Text" onClick={addText} style={prominentBtnStyle('#0284c7')}>
                <Type size={15} /> Text
              </button>

              {/* 2. HIGHLIGHT TOOL */}
              <button title="Text Highlight" onClick={() => activateToolMode('highlight')} style={prominentBtnStyle(activeTool === 'highlight' ? '#b45309' : '#d97706')}>
                <Highlighter size={15} /> Highlight
              </button>

              {/* 3. DRAW TOOL */}
              <button title="Ink Freehand Draw" onClick={() => activateToolMode('draw')} style={prominentBtnStyle(activeTool === 'draw' ? '#991b1b' : '#dc2626')}>
                <Pencil size={15} /> Draw
              </button>

              {/* 4. ERASER MENU TOOL */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setActiveDropdown(activeDropdown === 'eraser' ? null : 'eraser')} style={prominentBtnStyle('#ea580c')}>
                  <Eraser size={15} /> Eraser <ChevronDown size={12} />
                </button>
                {activeDropdown === 'eraser' && (
                  <div style={dropdownMenuStyle(bgBar, borderCol)}>
                    <button onClick={addWhiteoutEraser} style={dropdownItemStyle}><Square size={14} /> Whiteout Cover Box</button>
                    <button onClick={purgeVectorStrokes} style={{ ...dropdownItemStyle, color: '#ef4444' }}><Trash2 size={14} /> Vector Stroke Purge</button>
                  </div>
                )}
              </div>

              {/* 5. IMAGE & STAMPS MENU TOOL */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setActiveDropdown(activeDropdown === 'image' ? null : 'image')} style={prominentBtnStyle('#059669')}>
                  <ImageIcon size={15} /> Image & Stamps <ChevronDown size={12} />
                </button>
                {activeDropdown === 'image' && (
                  <div style={dropdownMenuStyle(bgBar, borderCol)}>
                    <label style={dropdownItemStyle}>
                      <Upload size={14} /> Local Image Upload
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                    <hr style={{ borderColor: borderCol, margin: '4px 0' }} />
                    <button onClick={() => addStamp('APPROVED')} style={dropdownItemStyle}><Stamp size={14} color="#10b981" /> APPROVED Stamp</button>
                    <button onClick={() => addStamp('CONFIDENTIAL')} style={dropdownItemStyle}><Stamp size={14} color="#ef4444" /> CONFIDENTIAL Stamp</button>
                    <button onClick={() => addStamp('DRAFT')} style={dropdownItemStyle}><Stamp size={14} color="#0284c7" /> DRAFT Stamp</button>
                  </div>
                )}
              </div>

              {/* 6. SHAPES MENU TOOL */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setActiveDropdown(activeDropdown === 'shapes' ? null : 'shapes')} style={prominentBtnStyle('#7c3aed')}>
                  <Square size={15} /> Shapes <ChevronDown size={12} />
                </button>
                {activeDropdown === 'shapes' && (
                  <div style={dropdownMenuStyle(bgBar, borderCol)}>
                    <button onClick={() => addShape('rect')} style={dropdownItemStyle}><Square size={14} /> Rectangle</button>
                    <button onClick={() => addShape('ellipse')} style={dropdownItemStyle}><Circle size={14} /> Ellipse / Oval</button>
                    <button onClick={() => addShape('line')} style={dropdownItemStyle}><Minus size={14} /> Line</button>
                    <button onClick={() => addShape('cloud')} style={dropdownItemStyle}><Cloud size={14} color="#ef4444" /> Revision Cloud</button>
                  </div>
                )}
              </div>
            </div>

            {/* HEADER EXPORT ACTIONS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={exportCanvasImage} style={prominentBtnStyle('#10b981')}><Download size={15} /> Export Page PNG</button>
              
              {/* EXPORT COMPLETE MULTI-PAGE PDF BUTTON */}
              <button 
                title="Export Complete Multi-Page PDF Document" 
                onClick={exportCompletePdf} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  backgroundColor: '#8b5cf6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <FileDown size={13} /> Export Complete PDF
              </button>
            </div>
          </div>
        )}

        {activePortal === 'canvas' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={addText} style={prominentBtnStyle('#0284c7')}><Type size={14} /> Add Text</button>
            <label style={prominentBtnStyle('#059669')}>
              <ImageIcon size={14} /> Add Image
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </label>
            <button onClick={saveProjectJson} style={prominentBtnStyle('#0284c7')}><Save size={14} /> Save JSON</button>
            <label style={prominentBtnStyle('#0369a1')}>
              <Upload size={14} /> Load JSON
              <input type="file" accept=".json" onChange={loadProjectJson} style={{ display: 'none' }} />
            </label>
            <button onClick={exportCanvasToMp4} style={prominentBtnStyle('#8b5cf6')}><Play size={14} /> Render Canvas to MP4</button>
          </div>
        )}

        {activePortal === 'image' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '12px' }}>Brightness: {imgBrightness}</span>
            <input type="range" min="0.5" max="2" step="0.1" value={imgBrightness} onChange={(e) => setImgBrightness(e.target.value)} />
            <span style={{ fontSize: '12px' }}>Blur: {imgBlur}</span>
            <input type="range" min="0" max="10" step="0.5" value={imgBlur} onChange={(e) => setImgBlur(e.target.value)} />
            <label style={prominentBtnStyle('#0284c7')}>
              <Sliders size={14} /> Upload & Fine-Tune Image
              <input type="file" accept="image/*" onChange={handleImageFineTune} style={{ display: 'none' }} />
            </label>
          </div>
        )}

        {activePortal === 'video' && (
          <form onSubmit={handleVideoStitch} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Stitch Tracks:</span>
            <input type="file" name="video" accept="video/*" required style={{ fontSize: '11px' }} />
            <input type="file" name="audio" accept="audio/*" required style={{ fontSize: '11px' }} />
            <button type="submit" style={prominentBtnStyle('#8b5cf6')}><Music size={14} /> Stitch Audio+Video</button>
          </form>
        )}

        {activePortal === 'transcribe' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={prominentBtnStyle('#ec4899')}>
              <Mic size={14} /> Transcribe Media to Canvas
              <input type="file" accept="audio/*,video/*" onChange={handleTranscription} style={{ display: 'none' }} />
            </label>
            <label style={prominentBtnStyle('#d946ef')}>
              <Captions size={14} /> Auto-Subtitle Video (MP4)
              <input type="file" accept="video/*" onChange={handleAutoSubtitleVideo} style={{ display: 'none' }} />
            </label>
          </div>
        )}

      </div>

      {/* MAIN BODY WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {activePortal === 'pdf' && (
          <div style={{ width: '180px', backgroundColor: bgBar, borderRight: `1px solid ${borderCol}`, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>Page Navigator</span>
            {thumbnails.length === 0 && <p style={{ fontSize: '11px', color: '#94a3b8' }}>Open a PDF to view thumbnails.</p>}
            {thumbnails.map((thumbUrl, idx) => (
              <div 
                key={idx} 
                onClick={() => changePdfPage(idx + 1)}
                style={{ 
                  border: pageNum === idx + 1 ? '2px solid #0284c7' : `1px solid ${borderCol}`, 
                  borderRadius: '4px', 
                  padding: '3px', 
                  cursor: 'pointer',
                  backgroundColor: pageNum === idx + 1 ? 'rgba(2, 132, 199, 0.1)' : 'transparent'
                }}
              >
                <img src={thumbUrl} alt={`Page ${idx + 1}`} style={{ width: '100%', borderRadius: '2px', display: 'block' }} />
                <span style={{ fontSize: '10px', display: 'block', textAlign: 'center', marginTop: '2px' }}>Page {idx + 1}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '15px' }}>
          
          <div style={{ width: '900px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8' }}>Status: {status}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: bgBar, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${borderCol}` }}>
              <button title="Zoom Out" onClick={() => handleZoom(zoomLevel - 0.1)} style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer' }}><ZoomOut size={14} /></button>
              <span style={{ fontSize: '11px', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
              <button title="Zoom In" onClick={() => handleZoom(zoomLevel + 0.1)} style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer' }}><ZoomIn size={14} /></button>
              <button title="Fit" onClick={resetZoom} style={{ background: 'transparent', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', marginLeft: '4px' }}>Fit</button>
            </div>
          </div>

          <div style={{ border: `2px solid ${borderCol}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
            <canvas ref={canvasRef} />
          </div>

          <div style={{ marginTop: '12px', width: '900px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '10px 15px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><Layers size={14} /> Video Timeline Track</span>
              <span style={{ fontSize: '11px', color: '#0284c7' }}>00:00:{String(timelineSec).padStart(2, '0')} / 00:00:30</span>
            </div>
            <input type="range" min="0" max="30" value={timelineSec} onChange={(e) => setTimelineSec(e.target.value)} style={{ width: '100%', cursor: 'pointer', accentColor: '#0284c7' }} />
          </div>

          {transcriptionText && (
            <div style={{ marginTop: '10px', width: '900px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '10px 15px', borderRadius: '6px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '3px' }}>Transcription Text:</h3>
              <p style={{ fontSize: '12px', margin: 0 }}>{transcriptionText}</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

// Button & Dropdown Styles
const portalTabStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  backgroundColor: active ? '#0f172a' : 'transparent',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
});

// Prominent White-Font Color Badges for High Visibility
const prominentBtnStyle = (bgColor) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  backgroundColor: bgColor,
  color: '#ffffff', // Crisp white font
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold', // Bold text
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
});

const iconToolBtnStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 10px',
  backgroundColor: active ? '#0284c7' : 'transparent',
  color: active ? '#ffffff' : 'inherit',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
});

const dropdownMenuStyle = (bg, border) => ({
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '4px',
  backgroundColor: bg,
  border: `1px solid ${border}`,
  borderRadius: '6px',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
  padding: '6px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: '170px',
  zIndex: 50,
});

const dropdownItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 8px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  textAlign: 'left',
  width: '100%',
};