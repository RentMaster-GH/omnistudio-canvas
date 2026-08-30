import React, { useEffect, useRef, useState, Component } from 'react';
import * as fabric from 'fabric';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { 
  Type, Image as ImageIcon, Video, Mic, Download, Trash2, Sliders, FileText, 
  Music, Play, Pause, Captions, Save, Upload, Layers, Sun, Moon, Eraser, ChevronLeft, 
  ChevronRight, Eye, EyeOff, PanelLeftClose, PanelLeftOpen, ZoomIn, ZoomOut, RotateCcw, RotateCw, Hand, MousePointer, 
  Highlighter, Pencil, Stamp, Square, Circle, Minus, Cloud, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  MoveRight, Triangle, Activity, Search, Printer, Share2, CheckCircle2, Check, X,
  PenTool, Link, Crop, Layout, FileCog, RefreshCw, Target, Edit3, ShieldAlert, Lock, Unlock, Film, CheckSquare, LogOut,
  FileDown, Maximize2, MoveHorizontal, Baseline, CaseUpper, CaseLower, CreditCard, FolderOpen
} from 'lucide-react';

import TimelineEditor from './components/TimelineEditor';
import TranscriptEditor from './components/TranscriptEditor';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Points to Vercel Serverless API or Local Server
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : '/api';

/**
 * Helper: Guarantees a strict 7-character #RRGGBB hex string to prevent 
 * React DOM crashes inside <input type="color" />
 */
const ensureValidHexColor = (color, fallbackHex = '#0f172a') => {
  if (!color || typeof color !== 'string') return fallbackHex;
  if (color.startsWith('#')) {
    if (color.length === 7) return color;
    if (color.length === 4) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
  }
  return fallbackHex;
};

// --- REACT ERROR BOUNDARY (PREVENTS BLANK WHITE PAGES) ---
class StudioErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Studio Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', backgroundColor: '#0f172a', color: '#ffffff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>⚠️ Canvas Studio Encountered a Render Issue</h2>
          <p style={{ color: '#94a3b8', maxWidth: '600px', textAlign: 'center', fontSize: '13px', marginBottom: '20px' }}>
            {this.state.error?.message || 'An unexpected render glitch occurred.'}
          </p>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ padding: '10px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🔄 Reload Studio & Clear Cache
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function CanvasStudio() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const copiedObjectRef = useRef(null);

  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [activePortal, setActivePortal] = useState('pdf');
  
  const [darkMode, setDarkMode] = useState(true);
  const [status, setStatus] = useState('Ready - View Mode');

  const [isEditMode, setIsEditMode] = useState(false);
  const [activeEditingObject, setActiveEditingObject] = useState(null);

  // Dynamic Fit Mode State: 'width' | 'page'
  const [fitMode, setFitMode] = useState('width');

  // Layers Manager State (Plain Metadata Array)
  const [canvasLayers, setCanvasLayers] = useState([]);

  // Auto-Save & Recent Projects State
  const [recentProjects, setRecentProjects] = useState([]);
  const [showProjectsModal, setShowProjectsModal] = useState(false);

  // NO-SIGN-UP FRICTIONLESS GUEST SESSION
  const [guestUserId] = useState(() => {
    let existingId = localStorage.getItem('omnistudio_guest_id');
    if (!existingId) {
      existingId = 'guest_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('omnistudio_guest_id', existingId);
    }
    return existingId;
  });

  const [currentProjectId] = useState(null);
  const [projectTitle] = useState('My OmniStudio Project');

  const [activeTool, setActiveTool] = useState('hand');
  const activeToolRef = useRef('hand');
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [signatureName, setSignatureName] = useState('John Doe');

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [pendingRedactionsCount, setPendingRedactionsCount] = useState(0);

  // Typography State
  const [fontFamilyVal, setFontFamilyVal] = useState('Arial');
  const [fontSizeVal, setFontSizeVal] = useState(24);
  const [lineHeightVal, setLineHeightVal] = useState(1.16);
  const [charSpacingVal, setCharSpacingVal] = useState(0);
  const [textColorVal, setTextColorVal] = useState('#0f172a');
  const [textBgColorVal, setTextBgColorVal] = useState('#ffffff');
  const [textOpacityVal, setTextOpacityVal] = useState(1.0);
  const [isBoldVal, setIsBoldVal] = useState(false);
  const [isItalicVal, setIsItalicVal] = useState(false);
  const [isUnderlineVal, setIsUnderlineVal] = useState(false);
  const [textAlignVal, setTextAlignVal] = useState('left');

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);

  const [zoomLevel, setZoomLevel] = useState(1.0);

  // Video Portal, Timeline & Transcription State
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineSec, setTimelineSec] = useState(0);
  const [videoDuration, setVideoDuration] = useState(30);
  const [transcriptionText, setTranscriptionText] = useState('Welcome to OmniStudio Canvas.');
  
  const [transcriptSegments, setTranscriptSegments] = useState([
    {
      id: 'seg-1',
      speaker: 'Speaker 1',
      text: 'Welcome to OmniStudio Canvas.',
      start: 0,
      end: 2.5,
      words: [{ id: 'w1', word: 'Welcome', start: 0, end: 0.5, confidence: 0.99 }]
    }
  ]);

  const [clips] = useState([
    { id: 'c1', trackId: 't1', name: 'Main Video Stream.mp4', type: 'video', timelineStart: 0, duration: 15 }
  ]);

  const [imgBrightness, setImgBrightness] = useState(1);
  const [imgBlur, setImgBlur] = useState(0);

  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // --- GOOGLE FONTS DYNAMIC INJECTION ENGINE ---
  useEffect(() => {
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Bangers&family=Bebas+Neue&family=Bungee&family=Caveat&family=Cinzel&family=Cormorant+Garamond&family=Courgette&family=Dancing+Script&family=Fira+Code&family=Great+Vibes&family=Inter&family=JetBrains+Mono&family=Lato&family=Lobster&family=Lora&family=Merriweather&family=Montserrat&family=Nunito&family=Open+Sans&family=Orbitron&family=Oswald&family=Pacifico&family=Permanent+Marker&family=Playfair+Display&family=Poppins&family=Press+Start+2P&family=Raleway&family=Roboto&family=Sacramento&family=Satisfy&family=Source+Code+Pro&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }, []);

  // Initialize Fabric Canvas
  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 820,
      height: 480,
      backgroundColor: '#ffffff',
      defaultCursor: 'grab',
    });

    canvas.on('mouse:down', (opt) => {
      if (activeToolRef.current === 'hand') {
        isPanningRef.current = true;
        lastPosRef.current = { x: opt.e.clientX, y: opt.e.clientY };
        canvas.defaultCursor = 'grabbing';
        canvas.setCursor('grabbing');
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (isPanningRef.current && activeToolRef.current === 'hand') {
        const vpt = canvas.viewportTransform;
        vpt[4] += opt.e.clientX - lastPosRef.current.x;
        vpt[5] += opt.e.clientY - lastPosRef.current.y;
        canvas.requestRenderAll();
        lastPosRef.current = { x: opt.e.clientX, y: opt.e.clientY };
      }
    });

    canvas.on('mouse:up', (opt) => {
      if (activeToolRef.current === 'hand') {
        isPanningRef.current = false;
        canvas.defaultCursor = 'grab';
        canvas.setCursor('grab');
      } else {
        handleMouseUpInitializer(canvas, opt);
      }
    });

    canvas.on('selection:created', (e) => {
      const selectedObj = e.selected?.[0];
      if (selectedObj) {
        setActiveEditingObject(selectedObj);
        updateInspectorFromSelection(selectedObj);
      }
    });

    canvas.on('selection:updated', (e) => {
      const selectedObj = e.selected?.[0];
      if (selectedObj) {
        setActiveEditingObject(selectedObj);
        updateInspectorFromSelection(selectedObj);
      }
    });

    canvas.on('selection:cleared', () => {
      setActiveEditingObject(null);
    });

    setFabricCanvas(canvas);
    saveState(canvas);

    return () => canvas.dispose();
  }, []);

  // --- SAFE PLAIN METADATA LAYERS LIST ---
  const updateLayersList = () => {
    if (!fabricCanvas) return;
    try {
      const objs = fabricCanvas.getObjects();
      const simpleList = objs.map((obj, idx) => ({
        index: idx,
        type: obj.type || 'object',
        text: typeof obj.text === 'string' ? obj.text : '',
        visible: obj.visible !== false,
        selectable: obj.selectable !== false,
        targetObj: obj
      })).reverse();
      setCanvasLayers(simpleList);
    } catch (err) {
      console.error('Error updating layers list:', err);
    }
  };

  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.on('object:added', updateLayersList);
    fabricCanvas.on('object:removed', updateLayersList);
    fabricCanvas.on('object:modified', updateLayersList);
    return () => {
      fabricCanvas.off('object:added', updateLayersList);
      fabricCanvas.off('object:removed', updateLayersList);
      fabricCanvas.off('object:modified', updateLayersList);
    };
  }, [fabricCanvas]);

  // --- BULLETPROOF SAFE ADD TEXT FUNCTION ---
  const addText = () => {
    try {
      if (!fabricCanvas) {
        alert('Canvas not ready yet. Please open a PDF or Document.');
        return;
      }

      if (!isEditMode) setIsEditMode(true);
      setActiveTool('select');

      const TextConstructor = fabric.IText || fabric.Textbox || fabric.Text;
      if (!TextConstructor) {
        console.error('Fabric text class missing');
        return;
      }

      const safeFontSize = Number(fontSizeVal) > 0 ? Number(fontSizeVal) : 24;
      const safeFontFamily = fontFamilyVal || 'Arial';
      const safeColor = ensureValidHexColor(textColorVal, '#0f172a');

      const textObj = new TextConstructor('Type text here...', { 
        left: fabricCanvas.width ? fabricCanvas.width / 3 : 200, 
        top: fabricCanvas.height ? fabricCanvas.height / 3 : 150, 
        fontSize: safeFontSize, 
        fontFamily: safeFontFamily,
        fill: safeColor,
        fontWeight: isBoldVal ? 'bold' : 'normal',
        fontStyle: isItalicVal ? 'italic' : 'normal',
        underline: !!isUnderlineVal,
        textAlign: textAlignVal || 'left',
        selectable: true,
        editable: true,
      });

      fabricCanvas.add(textObj);
      fabricCanvas.setActiveObject(textObj);
      setActiveEditingObject(textObj);
      fabricCanvas.renderAll();

      saveState(fabricCanvas);
      setStatus('✏️ Added new editable text box.');
    } catch (err) {
      console.error('[Add Text Error]:', err);
      alert(`Could not add text box: ${err.message}`);
    }
  };

  const updateInspectorFromSelection = (obj) => {
    if (!obj) return;
    try {
      if (obj.fontFamily) setFontFamilyVal(obj.fontFamily);
      if (obj.fontSize) setFontSizeVal(obj.fontSize);
      if (obj.fill) setTextColorVal(ensureValidHexColor(obj.fill, '#0f172a'));
      if (obj.textBackgroundColor) setTextBgColorVal(ensureValidHexColor(obj.textBackgroundColor, '#ffffff'));
      setIsBoldVal(obj.fontWeight === 'bold');
      setIsItalicVal(obj.fontStyle === 'italic');
      setIsUnderlineVal(!!obj.underline);
    } catch (err) {
      console.error('Inspector update error:', err);
    }
  };

  const saveState = (targetCanvas = fabricCanvas) => {
    if (!targetCanvas) return;
    try {
      const json = targetCanvas.toJSON(['isPendingRedaction', 'isRedacted', 'id', 'linkUrl']);
      setUndoStack((prev) => [...prev, JSON.stringify(json)]);
      setRedoStack([]);
    } catch (e) {
      console.warn('saveState error:', e);
    }
  };

  const handleUndo = () => {
    if (undoStack.length <= 1 || !fabricCanvas) return;
    const currentCanvasJson = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, undoStack.length - 1);
    const previousCanvasJson = newUndoStack[newUndoStack.length - 1];

    setRedoStack((prev) => [currentCanvasJson, ...prev]);
    setUndoStack(newUndoStack);

    fabricCanvas.loadFromJSON(previousCanvasJson, () => {
      fabricCanvas.renderAll();
      setStatus('↺ Undo Safety Net: Reverted to prior state.');
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !fabricCanvas) return;
    const nextCanvasJson = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    setUndoStack((prev) => [...prev, nextCanvasJson]);
    setRedoStack(newRedoStack);

    fabricCanvas.loadFromJSON(nextCanvasJson, () => {
      fabricCanvas.renderAll();
      setStatus('↻ Redo Forward Restorer: Reinstated edit action.');
    });
  };

  const exitTextEditing = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      if (activeObj.isEditing) activeObj.exitEditing();
      fabricCanvas.discardActiveObject();
    }
    setActiveEditingObject(null);
    fabricCanvas.renderAll();
    activateToolMode('select');
    saveState(fabricCanvas);
    setStatus('Exited text editing session.');
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
      fabricCanvas.setCursor('grab');
    } else if (mode === 'draw') {
      fabricCanvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(fabricCanvas);
      brush.width = 3;
      brush.color = '#ef4444';
      fabricCanvas.freeDrawingBrush = brush;
    } else {
      fabricCanvas.defaultCursor = 'default';
      fabricCanvas.setCursor('default');
    }
  };

  const renderPdfPageOntoCanvas = async (pdf, pageNumber, mode = fitMode) => {
    if (!pdf || !fabricCanvas) return;

    const page = await pdf.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    const canvasWidth = 820;
    const canvasHeight = 480;
    const padding = 24;

    fabricCanvas.setDimensions({ width: canvasWidth, height: canvasHeight });

    let computedScale = (canvasWidth - padding) / unscaledViewport.width;
    if (mode === 'page') {
      computedScale = Math.min(
        (canvasWidth - padding) / unscaledViewport.width,
        (canvasHeight - padding) / unscaledViewport.height
      );
    }

    const viewport = page.getViewport({ scale: computedScale });
    const tempCanvas = document.createElement('canvas');
    const context = tempCanvas.getContext('2d');
    tempCanvas.height = viewport.height;
    tempCanvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const imgData = tempCanvas.toDataURL('image/png');
    const imgObj = await fabric.FabricImage.fromURL(imgData);

    const left = (canvasWidth - imgObj.width) / 2;
    const top = (canvasHeight - imgObj.height) / 2;

    imgObj.set({ left, top, selectable: false });

    fabricCanvas.clear();
    fabricCanvas.add(imgObj);
    fabricCanvas.sendObjectToBack(imgObj);

    activateToolMode('hand');
    fabricCanvas.renderAll();
    saveState(fabricCanvas);
  };

  const handlePdfDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Loading PDF into Viewport...');
    const fileArrayBuffer = await file.arrayBuffer();

    try {
      const loadedPdf = await pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;
      setPdfDoc(loadedPdf);
      setTotalPages(loadedPdf.numPages);
      setPageNum(1);

      generateThumbnails(loadedPdf);
      await renderPdfPageOntoCanvas(loadedPdf, 1, fitMode);
      setStatus(`PDF Loaded! Page 1 of ${loadedPdf.numPages}`);
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

  const changePdfPage = async (newPage) => {
    if (!pdfDoc || newPage < 1 || newPage > totalPages) return;
    setPageNum(newPage);
    await renderPdfPageOntoCanvas(pdfDoc, newPage, fitMode);
  };

  const handleMouseUpInitializer = (canvas, opt) => {};

  const exportCanvasImage = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ format: 'png' });
    const link = document.createElement('a');
    link.download = `edited-document-page-${pageNum}.png`;
    link.href = dataURL;
    link.click();
  };

  const bgMain = darkMode ? '#0f172a' : '#f1f5f9';
  const bgBar = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderCol = darkMode ? '#334155' : '#cbd5e1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'sans-serif', backgroundColor: bgMain, color: textColor, boxSizing: 'border-box' }}>
      
      {/* 1. TOP PORTAL SWITCHER & GLOBAL ACTIONS */}
      <div style={{ height: '36px', minHeight: '36px', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '6px', zIndex: 40, boxSizing: 'border-box', overflowX: 'auto' }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff', marginRight: '8px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          <FileText size={16} /> OmniStudio
        </span>
        
        <button onClick={() => setActivePortal('pdf')} style={portalTabStyle(activePortal === 'pdf')}><FileText size={13} /> PDF Portal</button>
        <button onClick={() => setActivePortal('canvas')} style={portalTabStyle(activePortal === 'canvas')}><Type size={13} /> Canvas Studio</button>
        <button onClick={() => setActivePortal('video')} style={portalTabStyle(activePortal === 'video')}><Video size={13} /> Video Portal</button>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />

        <button title="Download Page" onClick={exportCanvasImage} style={globalHeaderBtnStyle}><Download size={13} /> Download PNG</button>

        <div style={{ marginLeft: 'auto' }}>
          <button title="Toggle Theme" onClick={() => setDarkMode(!darkMode)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* 2. SECONDARY TOOL RIBBON */}
      <div style={{ height: '44px', minHeight: '44px', backgroundColor: bgBar, borderBottom: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', padding: '0 10px', gap: '8px', zIndex: 30, boxSizing: 'border-box', overflowX: 'auto' }}>
        <label style={prominentBtnStyle('#0284c7')}>
          <Upload size={14} /> Open PDF
          <input type="file" accept=".pdf" onChange={handlePdfDocumentUpload} style={{ display: 'none' }} />
        </label>

        <div style={{ width: '1px', height: '18px', backgroundColor: borderCol, margin: '0 2px' }} />

        <button title="Undo" onClick={handleUndo} disabled={undoStack.length <= 1} style={iconToolBtnStyle(false)}>
          <RotateCcw size={14} />
        </button>

        <button title="Redo" onClick={handleRedo} disabled={redoStack.length === 0} style={iconToolBtnStyle(false)}>
          <RotateCw size={14} />
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: borderCol, margin: '0 2px' }} />

        {/* ADD TEXT BUTTON */}
        <button title="Add Editable Text Box" onClick={addText} style={prominentBtnStyle('#0284c7')}>
          <Type size={14} /> Add Text
        </button>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* PDF Sidebar Navigator */}
        <div style={{ width: '160px', minWidth: '160px', backgroundColor: bgBar, borderRight: `1px solid ${borderCol}`, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>Page Navigator</span>
          {thumbnails.length === 0 && <p style={{ fontSize: '10px', color: '#94a3b8' }}>Open a PDF to view pages.</p>}
          {thumbnails.map((thumbUrl, idx) => (
            <div 
              key={idx} 
              onClick={() => changePdfPage(idx + 1)}
              style={{ border: pageNum === idx + 1 ? '2px solid #0284c7' : `1px solid ${borderCol}`, borderRadius: '4px', padding: '2px', cursor: 'pointer' }}
            >
              <img src={thumbUrl} alt={`Page ${idx + 1}`} style={{ width: '100%', borderRadius: '2px', display: 'block' }} />
              <span style={{ fontSize: '10px', display: 'block', textAlign: 'center', marginTop: '2px' }}>Page {idx + 1}</span>
            </div>
          ))}
        </div>

        {/* Center Canvas Area */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', overflow: 'auto' }}>
          <div style={{ position: 'relative', border: `2px solid ${borderCol}`, borderRadius: '4px', overflow: 'hidden' }}>
            {activeEditingObject && (
              <button onClick={exitTextEditing} style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', zIndex: 100 }}>
                Close Text Focus
              </button>
            )}
            <canvas ref={canvasRef} />
          </div>

          {/* Right Layers Panel */}
          <div style={{ width: '200px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>Layers Stack ({canvasLayers.length})</span>
            {canvasLayers.map((layer) => (
              <div 
                key={layer.index} 
                onClick={() => { fabricCanvas?.setActiveObject(layer.targetObj); fabricCanvas?.renderAll(); }} 
                style={{ padding: '6px', border: `1px solid ${borderCol}`, borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >
                {layer.text ? `"${layer.text.substring(0, 10)}..."` : layer.type}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

// Export Wrapped in Error Boundary
export default function SafeCanvasStudio() {
  return (
    <StudioErrorBoundary>
      <CanvasStudio />
    </StudioErrorBoundary>
  );
}

// Styles
const portalTabStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  padding: '4px 10px',
  backgroundColor: active ? '#0f172a' : 'transparent',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
});

const globalHeaderBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 8px',
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
};

const prominentBtnStyle = (bgColor) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  padding: '4px 9px',
  backgroundColor: bgColor,
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
});

const iconToolBtnStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 8px',
  backgroundColor: active ? '#0284c7' : 'transparent',
  color: active ? '#ffffff' : 'inherit',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
});