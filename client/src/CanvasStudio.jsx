import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Type, Image as ImageIcon, Video, Mic, Download, Trash2, Sliders, FileText, 
  Music, Play, Captions, Save, Upload, Layers, Sun, Moon, Eraser, ChevronLeft, 
  ChevronRight, Eye, ZoomIn, ZoomOut, RotateCcw, RotateCw, Hand, MousePointer, 
  Highlighter, Pencil, Stamp, Square, Circle, Minus, MoveRight, Cloud, ChevronDown
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

  // Tool Modes: 'select' | 'hand' | 'draw' | 'highlight'
  const [activeTool, setActiveTool] = useState('select');
  const [activeDropdown, setActiveDropdown] = useState(null); // 'eraser' | 'image' | 'shapes'

  // System State Management (Undo / Redo Stack)
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // PDF Preview & Thumbnail State
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);

  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [timelineSec, setTimelineSec] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState('');

  const [imgBrightness, setImgBrightness] = useState(1);
  const [imgBlur, setImgBlur] = useState(0);

  // Initialize Canvas
  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 900,
      height: 650,
      backgroundColor: '#ffffff',
    });

    setFabricCanvas(canvas);

    // Save initial blank state
    saveState(canvas);

    return () => canvas.dispose();
  }, []);

  // --- UNDO / REDO ENGINE ---
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

  // --- TOOL MODE SWITCHER ---
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
      brush.color = 'rgba(250, 204, 21, 0.4)'; // Yellow highlighter
      fabricCanvas.freeDrawingBrush = brush;
    } else {
      fabricCanvas.defaultCursor = 'default';
    }
  };

  // --- PDF DOCUMENT NAVIGATOR & THUMBNAIL ENGINE ---
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

      // Generate Page Thumbnails for Left Panel
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

  // --- ANNOTATION TOOLS ENGINE ---
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

  // Stamp Matrix Generator (APPROVED, CONFIDENTIAL, DRAFT, SIGN HERE)
  const addStamp = (type) => {
    if (!fabricCanvas) return;
    activateToolMode('select');

    let textStr = 'APPROVED';
    let color = '#10b981';

    if (type === 'CONFIDENTIAL') { textStr = 'CONFIDENTIAL'; color = '#ef4444'; }
    if (type === 'DRAFT') { textStr = 'DRAFT'; color = '#0284c7'; }
    if (type === 'SIGN') { textStr = 'SIGN HERE'; color = '#f59e0b'; }

    const text = new fabric.Text(textStr, {
      fontSize: 20,
      fontWeight: 'bold',
      fill: color,
      left: 15,
      top: 10,
    });

    const rect = new fabric.Rect({
      width: text.width + 30,
      height: text.height + 20,
      fill: 'rgba(255, 255, 255, 0.9)',
      stroke: color,
      strokeWidth: 3,
      rx: 6,
      ry: 6,
    });

    const group = new fabric.Group([rect, text], { left: 200, top: 200, angle: -12 });
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    saveState();
  };

  // Shape Suite (Rectangle, Ellipse, Line, Arrow, Revision Cloud)
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
      // PDF Revision Cloud Polygon Path
      const cloudPath = 'M 10 30 Q 15 10, 35 15 Q 55 5, 70 25 Q 90 25, 90 45 Q 95 65, 75 75 Q 65 95, 45 85 Q 25 95, 15 75 Q -5 65, 5 45 Q -5 25, 10 30 Z';
      shapeObj = new fabric.Path(cloudPath, { left: 200, top: 200, fill: 'transparent', stroke: '#ef4444', strokeWidth: 3, scaleX: 1.5, scaleY: 1.5 });
    }

    if (shapeObj) {
      fabricCanvas.add(shapeObj);
      fabricCanvas.setActiveObject(shapeObj);
      saveState();
    }
  };

  // Zoom Engine
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

  // Theme Styles
  const bgMain = darkMode ? '#0f172a' : '#f1f5f9';
  const bgBar = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderCol = darkMode ? '#334155' : '#cbd5e1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'sans-serif', backgroundColor: bgMain, color: textColor }}>
      
      {/* Top Professional Ribbon Toolbar */}
      <div style={{ height: '56px', backgroundColor: bgBar, borderBottom: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', padding: '0 15px', justifyContent: 'space-between', zIndex: 30 }}>
        
        {/* Left: Project Branding & Upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={20} /> OmniStudio PDF</span>
          <label style={{ ...ribbonBtnStyle, backgroundColor: '#0284c7', color: '#fff' }}>
            <Upload size={16} /> Open PDF
            <input type="file" accept=".pdf" onChange={handlePdfDocumentUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Center: Editing Tools Suite */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          
          {/* Undo / Redo */}
          <button title="Undo" onClick={handleUndo} disabled={undoStack.length <= 1} style={ribbonBtnStyle}><RotateCcw size={16} /></button>
          <button title="Redo" onClick={handleRedo} disabled={redoStack.length === 0} style={ribbonBtnStyle}><RotateCw size={16} /></button>
          <div style={{ width: '1px', height: '20px', backgroundColor: borderCol, margin: '0 4px' }} />

          {/* Select vs Hand Tool */}
          <button title="Select Tool" onClick={() => activateToolMode('select')} style={activeToolBtn(activeTool === 'select')}><MousePointer size={16} /></button>
          <button title="Hand / Pan Tool" onClick={() => activateToolMode('hand')} style={activeToolBtn(activeTool === 'hand')}><Hand size={16} /></button>
          <div style={{ width: '1px', height: '20px', backgroundColor: borderCol, margin: '0 4px' }} />

          {/* Text & Highlight */}
          <button title="Add / Edit Text" onClick={addText} style={ribbonBtnStyle}><Type size={16} /> Text</button>
          <button title="Text Highlight" onClick={() => activateToolMode('highlight')} style={activeToolBtn(activeTool === 'highlight')}><Highlighter size={16} /> Highlight</button>
          <button title="Ink Freehand Draw" onClick={() => activateToolMode('draw')} style={activeToolBtn(activeTool === 'draw')}><Pencil size={16} /> Draw</button>

          {/* Eraser Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setActiveDropdown(activeDropdown === 'eraser' ? null : 'eraser')} style={ribbonBtnStyle}>
              <Eraser size={16} /> Eraser <ChevronDown size={12} />
            </button>
            {activeDropdown === 'eraser' && (
              <div style={dropdownMenuStyle(bgBar, borderCol)}>
                <button onClick={addWhiteoutEraser} style={dropdownItemStyle}><Square size={14} /> Whiteout Cover Box</button>
                <button onClick={purgeVectorStrokes} style={{ ...dropdownItemStyle, color: '#ef4444' }}><Trash2 size={14} /> Vector Stroke Purge</button>
              </div>
            )}
          </div>

          {/* Image & Stamp Matrix Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setActiveDropdown(activeDropdown === 'image' ? null : 'image')} style={ribbonBtnStyle}>
              <ImageIcon size={16} /> Image & Stamps <ChevronDown size={12} />
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

          {/* Vector Shapes Suite Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setActiveDropdown(activeDropdown === 'shapes' ? null : 'shapes')} style={ribbonBtnStyle}>
              <Square size={16} /> Shapes <ChevronDown size={12} />
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

        {/* Right: Export & Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={exportCanvasImage} style={{ ...ribbonBtnStyle, backgroundColor: '#10b981', color: '#fff' }}><Download size={16} /> Export Page</button>
          <button title="Toggle Theme" onClick={() => setDarkMode(!darkMode)} style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer' }}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

      </div>

      {/* Main Studio Split Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left Document Navigator & Page Thumbnails Strip */}
        <div style={{ width: '200px', backgroundColor: bgBar, borderRight: `1px solid ${borderCol}`, overflowY: 'auto', padding: '15px 10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8' }}>Document Navigator</span>
          
          {thumbnails.length === 0 && (
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Open a PDF file to view page thumbnails.</p>
          )}

          {thumbnails.map((thumbUrl, idx) => (
            <div 
              key={idx} 
              onClick={() => changePdfPage(idx + 1)}
              style={{ 
                border: pageNum === idx + 1 ? '2px solid #0284c7' : `1px solid ${borderCol}`, 
                borderRadius: '6px', 
                padding: '4px', 
                cursor: 'pointer',
                backgroundColor: pageNum === idx + 1 ? 'rgba(2, 132, 199, 0.1)' : 'transparent'
              }}
            >
              <img src={thumbUrl} alt={`Page ${idx + 1}`} style={{ width: '100%', borderRadius: '4px', display: 'block' }} />
              <span style={{ fontSize: '11px', display: 'block', textAlign: 'center', marginTop: '4px' }}>Page {idx + 1}</span>
            </div>
          ))}
        </div>

        {/* Center Workspace Viewport */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '20px' }}>
          
          {/* Viewport Control Strip */}
          <div style={{ width: '900px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8' }}>Status: {status}</span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: bgBar, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${borderCol}` }}>
              <button title="Zoom Out" onClick={() => handleZoom(zoomLevel - 0.1)} style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer' }}><ZoomOut size={16} /></button>
              <span style={{ fontSize: '12px', fontWeight: 'bold', width: '45px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
              <button title="Zoom In" onClick={() => handleZoom(zoomLevel + 0.1)} style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer' }}><ZoomIn size={16} /></button>
              <div style={{ width: '1px', height: '14px', backgroundColor: borderCol, margin: '0 4px' }} />
              <button title="Fit Viewport" onClick={resetZoom} style={{ background: 'transparent', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Fit</button>
            </div>
          </div>

          {/* Interactive Document Workspace Canvas */}
          <div style={{ border: `2px solid ${borderCol}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
            <canvas ref={canvasRef} />
          </div>

        </div>

      </div>

    </div>
  );
}

// Button Styles
const ribbonBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500',
};

const activeToolBtn = (active) => ({
  ...ribbonBtnStyle,
  backgroundColor: active ? '#0284c7' : 'transparent',
  color: active ? '#ffffff' : 'inherit',
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
  minWidth: '180px',
  zIndex: 50,
});

const dropdownItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  textAlign: 'left',
  width: '100%',
};