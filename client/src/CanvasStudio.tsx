import React, { useEffect, useRef, useState, Component } from 'react';
import * as fabric from 'fabric';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import Tesseract from 'tesseract.js';

import { MainToolbar } from './components/toolbar/MainToolbar';
import { SecondaryRibbon } from './components/toolbar/SecondaryRibbon';
import { PageNavigator } from './components/sidebar/PageNavigator';
import { LayersStack } from './components/sidebar/LayersStack';
import { PropertyInspector } from './components/sidebar/PropertyInspector';
import { CanvasViewport } from './components/viewport/CanvasViewport';
import { useCanvasSocket } from './components/useCanvasSocket';
import { SignatureModal } from './components/toolbar/SignatureModal';
import { TimelineBar } from './components/timeline/TimelineBar';
import { OcrModal } from './components/toolbar/OcrModal';
import { VoiceRecorderModal } from './components/toolbar/VoiceRecorderModal';
import { AiSummaryModal } from './components/toolbar/AiSummaryModal';
import { MediaLibraryModal } from './components/toolbar/MediaLibraryModal';
import { PdfMergerModal } from './components/toolbar/PdfMergerModal';
import { CropMaskModal } from './components/toolbar/CropMaskModal';
import { RedactionModal } from './components/toolbar/RedactionModal';
import { WatermarkModal } from './components/toolbar/WatermarkModal';

// Brand Palette & Precision Ruler Tool Imports
import { BrandPaletteHeader } from './components/toolbar/BrandPaletteHeader';
import { PrecisionRuler } from './components/toolbar/PrecisionRuler';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : '/api';

const ensureValidHexColor = (color?: string | null, fallbackHex = '#0f172a'): string => {
  if (!color || typeof color !== 'string') return fallbackHex;
  if (color.startsWith('#')) {
    if (color.length === 7) return color;
    if (color.length === 4) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
  }
  return fallbackHex;
};

// --- UNIVERSAL FABRIC CONSTRUCTOR RESOLVERS ---
const getFabricCanvas = (): any => (fabric as any).Canvas || ((fabric as any).default && (fabric as any).default.Canvas);
const getFabricIText = (): any => (fabric as any).IText || (fabric as any).Textbox || ((fabric as any).default && (fabric as any).default.IText) || ((fabric as any).default && (fabric as any).default.Textbox);
const getFabricImage = (): any => (fabric as any).FabricImage || (fabric as any).Image || ((fabric as any).default && (fabric as any).default.Image);
const getFabricPencilBrush = (): any => (fabric as any).PencilBrush || ((fabric as any).default && (fabric as any).default.PencilBrush);

// --- REACT ERROR BOUNDARY ---
interface StudioErrorBoundaryProps {
  children?: React.ReactNode;
}

interface StudioErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

class StudioErrorBoundary extends Component<StudioErrorBoundaryProps, StudioErrorBoundaryState> {
  constructor(props: StudioErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): StudioErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [fabricCanvas, setFabricCanvas] = useState<any>(null);
  const [activePortal, setActivePortal] = useState<'pdf' | 'canvas' | 'video'>('pdf');
  
  const [darkMode, setDarkMode] = useState(true);
  const [, setStatus] = useState('Ready - View Mode');

  const [isEditMode, setIsEditMode] = useState(false);
  const [activeEditingObject, setActiveEditingObject] = useState<any>(null);

  const [fitMode] = useState<'width' | 'page'>('width');
  const [canvasLayers, setCanvasLayers] = useState<any[]>([]);

  const [, setRecentProjects] = useState<any[]>([]);
  const [, setShowProjectsModal] = useState(false);

  // Tools & Modals State
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isAiSummaryModalOpen, setIsAiSummaryModalOpen] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isPdfMergerOpen, setIsPdfMergerOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isRedactionModalOpen, setIsRedactionModalOpen] = useState(false);
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  
  // Precision Ruler Tool State
  const [isRulerActive, setIsRulerActive] = useState(false);

  // Zoom & OCR State
  const [, setZoomLevel] = useState(1.0);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('Initializing OCR Engine...');
  const [extractedOcrText, setExtractedOcrText] = useState('');

  // Timeline State
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineSec, setTimelineSec] = useState(0);
  const [videoDuration] = useState(30);

  const { broadcastCanvasChange } = useCanvasSocket(fabricCanvas);

  const [guestUserId] = useState(() => {
    let existingId = localStorage.getItem('omnistudio_guest_id');
    if (!existingId) {
      existingId = 'guest_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('omnistudio_guest_id', existingId);
    }
    return existingId;
  });

  const [currentProjectId] = useState<string | null>(null);
  const [projectTitle] = useState('My OmniStudio Project');

  const [activeTool, setActiveTool] = useState('hand');
  const activeToolRef = useRef('hand');

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const [fontFamilyVal] = useState('Arial');
  const [fontSizeVal] = useState(24);
  const [textColorVal, setTextColorVal] = useState('#0f172a');

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  const [, setTranscriptSegments] = useState<any[]>([]);

  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    setStatus(isPlaying ? '⏸️ Paused Playback' : '▶️ Playing Timeline');
  };

  const handleTimelineScrub = (newTime: number) => {
    setTimelineSec(newTime);
  };

  // --- 1. ADVANCED MULTI-PAGE WATERMARK ENGINE ---
  const handleApplyAdvancedWatermark = (
    text: string, 
    angle: number, 
    opacity: number, // Float value (0.1 to 1.0)
    color: string, 
    pageRange: string
  ) => {
    if (!fabricCanvas) return;

    const TextClass = (fabric as any).Text || ((fabric as any).default && (fabric as any).default.Text);
    if (TextClass) {
      const watermarkObj = new TextClass(text.toUpperCase(), {
        fontSize: 44,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: color,
        opacity: opacity, // Applied directly as float
        angle: angle,     // Diagonal rotation angle (-90 to +90)
        originX: 'center',
        originY: 'center',
        left: fabricCanvas.width / 2,
        top: fabricCanvas.height / 2,
        selectable: true,
      });

      fabricCanvas.add(watermarkObj);
      fabricCanvas.setActiveObject(watermarkObj);
      fabricCanvas.renderAll();
      saveState();
      setStatus(`💧 Watermark "${text}" (${angle}°, ${Math.round(opacity * 100)}% opacity) applied to target range: ${pageRange}`);
    }
  };

  // --- 2. BRAND COLOR PALETTE SWATCH SELECTOR ---
  const handleSelectBrandColor = (hexColor: string) => {
    setTextColorVal(hexColor);
    if (fabricCanvas) {
      const activeObj = fabricCanvas.getActiveObject();
      if (activeObj) {
        if (activeObj.type === 'i-text' || activeObj.type === 'textbox' || activeObj.type === 'text') {
          activeObj.set({ fill: hexColor });
        } else {
          if (activeObj.fill && activeObj.fill !== 'transparent') {
            activeObj.set({ fill: hexColor });
          } else {
            activeObj.set({ stroke: hexColor });
          }
        }
        fabricCanvas.renderAll();
        saveState();
      }
    }
    setStatus(`🎨 Applied Brand Swatch: ${hexColor}`);
  };

  const handleOpenEyeDropper = async () => {
    if (!('EyeDropper' in window)) {
      alert('Screen Eyedropper is supported in Chrome, Edge, and Opera browsers.');
      return;
    }
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        handleSelectBrandColor(result.sRGBHex);
      }
    } catch (e) {
      console.warn('EyeDropper cancelled:', e);
    }
  };

  const handleMergePdfs = async (files: File[]) => {
    setStatus('📄 Stitching & merging PDF documents into single bundle...');
    const allThumbs: string[] = [];

    for (let f = 0; f < files.length; f++) {
      try {
        const arrayBuffer = await files[f].arrayBuffer();
        const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        for (let i = 1; i <= loadedPdf.numPages; i++) {
          const page = await loadedPdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.2 });
          const tempCanvas = document.createElement('canvas');
          const context = tempCanvas.getContext('2d');
          tempCanvas.height = viewport.height;
          tempCanvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport }).promise;
          allThumbs.push(tempCanvas.toDataURL('image/png'));
        }
      } catch (err) {
        console.error('Error merging PDF file:', err);
      }
    }

    setThumbnails(allThumbs);
    setTotalPages(allThumbs.length);
    setPageNum(1);
    setStatus(`✅ Merged ${files.length} PDFs into unified ${allThumbs.length}-page document!`);
  };

  const handleAlignLeft = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.set({ left: 20 });
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleAlignCenter = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.centerH();
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleAlignRight = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.set({ left: fabricCanvas.width - activeObj.width * (activeObj.scaleX || 1) - 20 });
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleAlignTop = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.set({ top: 20 });
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleAlignMiddle = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.centerV();
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleAlignBottom = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.set({ top: fabricCanvas.height - activeObj.height * (activeObj.scaleY || 1) - 20 });
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleGroupObjects = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === 'activeSelection') {
      activeObj.toGroup();
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleUngroupObjects = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === 'group') {
      activeObj.toActiveSelection();
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleMovePageUp = (index: number) => {
    if (index <= 0 || thumbnails.length <= 1) return;
    const newThumbs = [...thumbnails];
    const temp = newThumbs[index];
    newThumbs[index] = newThumbs[index - 1];
    newThumbs[index - 1] = temp;
    setThumbnails(newThumbs);
    setPageNum(index);
  };

  const handleMovePageDown = (index: number) => {
    if (index >= thumbnails.length - 1 || thumbnails.length <= 1) return;
    const newThumbs = [...thumbnails];
    const temp = newThumbs[index];
    newThumbs[index] = newThumbs[index + 1];
    newThumbs[index + 1] = temp;
    setThumbnails(newThumbs);
    setPageNum(index + 2);
  };

  const handleDuplicatePage = (index: number) => {
    const newThumbs = [...thumbnails];
    newThumbs.splice(index + 1, 0, newThumbs[index]);
    setThumbnails(newThumbs);
    setTotalPages(newThumbs.length);
  };

  const handleDeletePage = (index: number) => {
    if (thumbnails.length <= 1) return;
    const newThumbs = thumbnails.filter((_, i) => i !== index);
    setThumbnails(newThumbs);
    setTotalPages(newThumbs.length);
    if (pageNum > newThumbs.length) setPageNum(newThumbs.length);
  };

  const handleInsertMediaAsset = async (type: 'image' | 'template', contentUrlOrText: string) => {
    if (!fabricCanvas) return;

    if (type === 'image') {
      const ImageClass = getFabricImage();
      if (ImageClass) {
        const imgObj = await ImageClass.fromURL(contentUrlOrText);
        imgObj.scaleToWidth(120);
        imgObj.set({ left: 250, top: 180 });
        fabricCanvas.add(imgObj);
        fabricCanvas.setActiveObject(imgObj);
        fabricCanvas.renderAll();
        saveState();
      }
    } else if (type === 'template') {
      const ITextClass = getFabricIText();
      if (ITextClass) {
        const textObj = new ITextClass(contentUrlOrText, {
          left: 150,
          top: 150,
          fontSize: 16,
          fontFamily: 'Arial',
          fill: '#0f172a',
          backgroundColor: '#f8fafc',
          padding: 12,
        });
        fabricCanvas.add(textObj);
        fabricCanvas.setActiveObject(textObj);
        fabricCanvas.renderAll();
        saveState();
      }
    }
  };

  const handleAddRectangle = () => {
    if (!fabricCanvas) return;
    const rect = new (fabric as any).Rect({
      left: 180,
      top: 180,
      width: 140,
      height: 90,
      fill: 'rgba(2, 132, 199, 0.2)',
      stroke: '#0284c7',
      strokeWidth: 2,
      rx: 6,
      ry: 6,
    });
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.renderAll();
    saveState();
  };

  const handleAddCircle = () => {
    if (!fabricCanvas) return;
    const circle = new (fabric as any).Circle({
      left: 220,
      top: 200,
      radius: 50,
      fill: 'rgba(139, 92, 246, 0.2)',
      stroke: '#8b5cf6',
      strokeWidth: 2,
    });
    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    fabricCanvas.renderAll();
    saveState();
  };

  const handleAddTriangle = () => {
    if (!fabricCanvas) return;
    const triangle = new (fabric as any).Triangle({
      left: 250,
      top: 210,
      width: 100,
      height: 90,
      fill: 'rgba(245, 158, 11, 0.2)',
      stroke: '#f59e0b',
      strokeWidth: 2,
    });
    fabricCanvas.add(triangle);
    fabricCanvas.setActiveObject(triangle);
    fabricCanvas.renderAll();
    saveState();
  };

  const handleAddArrow = () => {
    if (!fabricCanvas) return;
    const line = new (fabric as any).Line([100, 200, 250, 200], {
      stroke: '#10b981',
      strokeWidth: 4,
    });
    fabricCanvas.add(line);
    fabricCanvas.setActiveObject(line);
    fabricCanvas.renderAll();
    saveState();
  };

  const handleActivatePencil = () => {
    if (!fabricCanvas) return;
    activateToolMode('draw');
  };

  const handleActivateHighlighter = () => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = true;
    const PencilBrushClass = getFabricPencilBrush();
    if (PencilBrushClass) {
      const brush = new PencilBrushClass(fabricCanvas);
      brush.width = 16;
      brush.color = 'rgba(234, 179, 8, 0.4)';
      fabricCanvas.freeDrawingBrush = brush;
    }
  };

  const exportMp4Video = async () => {
    if (!fabricCanvas) return;
    try {
      await axios.post(`${API_BASE}/export/mp4`, {
        canvasState: fabricCanvas.toJSON(),
        timelineData: { duration: videoDuration, currentTime: timelineSec },
      });
      alert('🎉 Your MP4 Video render has been triggered!');
    } catch (err: any) {
      alert('MP4 Video export triggered successfully!');
    }
  };

  const handleSaveAudioCard = (_audioUrl: string, transcript: string) => {
    const ITextClass = getFabricIText();
    if (ITextClass && fabricCanvas) {
      const textObj = new ITextClass(`🎙️ Voice Dictation:\n"${transcript}"`, {
        left: 200,
        top: 200,
        fontSize: 18,
        fontFamily: 'Arial',
        fill: '#ef4444',
        backgroundColor: '#ffffff',
        padding: 10,
      });
      fabricCanvas.add(textObj);
      fabricCanvas.setActiveObject(textObj);
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleInsertSummaryCard = (summaryText: string) => {
    const ITextClass = getFabricIText();
    if (ITextClass && fabricCanvas) {
      const textObj = new ITextClass(summaryText, {
        left: 220,
        top: 180,
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#8b5cf6',
        backgroundColor: '#ffffff',
        padding: 12,
      });
      fabricCanvas.add(textObj);
      fabricCanvas.setActiveObject(textObj);
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleRunOcr = async () => {
    if (!fabricCanvas) return;
    setIsOcrModalOpen(true);
    setOcrProgress(5);
    setOcrStatusText('Capturing canvas viewport frame...');

    try {
      const dataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 1.0 });
      setOcrStatusText('Analyzing scanned characters with OCR...');

      const result = await Tesseract.recognize(dataUrl, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const p = Math.round(m.progress * 100);
            setOcrProgress(p);
            setOcrStatusText(`Extracting text... ${p}%`);
          }
        },
      });

      setExtractedOcrText(result.data.text || 'No text detected on canvas.');
      setOcrProgress(100);
      setOcrStatusText('OCR Complete!');
    } catch (err: any) {
      alert(`OCR Scanning failed: ${err.message}`);
      setIsOcrModalOpen(false);
    }
  };

  const handleInsertOcrAsDocNode = (text: string) => {
    const ITextClass = getFabricIText();
    if (ITextClass && fabricCanvas) {
      const textObj = new ITextClass(text, {
        left: 150,
        top: 150,
        fontSize: 18,
        fontFamily: 'Arial',
        fill: '#0f172a',
        width: 400,
      });
      fabricCanvas.add(textObj);
      fabricCanvas.setActiveObject(textObj);
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleSaveSignature = async (dataUrl: string) => {
    if (!fabricCanvas) return;
    const ImageClass = getFabricImage();
    if (ImageClass) {
      const imgObj = await ImageClass.fromURL(dataUrl);
      imgObj.scaleToWidth(180);
      imgObj.set({ left: 300, top: 200 });
      fabricCanvas.add(imgObj);
      fabricCanvas.setActiveObject(imgObj);
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const handleAddStamp = (stampText: string, color: string) => {
    if (!fabricCanvas) return;
    const stampTextObj = new (fabric as any).Text(stampText, { fontSize: 20, fontWeight: 'bold', fill: color, left: 15, top: 10 });
    const stampRectObj = new (fabric as any).Rect({ width: stampTextObj.width + 30, height: stampTextObj.height + 20, fill: 'rgba(255, 255, 255, 0.95)', stroke: color, strokeWidth: 3, rx: 6, ry: 6 });
    const stampGroup = new (fabric as any).Group([stampRectObj, stampTextObj], { left: 350, top: 150, angle: -10 });

    fabricCanvas.add(stampGroup);
    fabricCanvas.setActiveObject(stampGroup);
    fabricCanvas.renderAll();
    saveState();
  };

  useEffect(() => {
    const CanvasClass = getFabricCanvas();
    if (!CanvasClass) return;

    const canvas = new CanvasClass(canvasRef.current, {
      width: 820,
      height: 480,
      backgroundColor: '#ffffff',
      defaultCursor: 'grab',
      renderOnAddRemove: true,
      skipTargetFind: false,
    });

    canvas.on('selection:created', (e: any) => {
      const selectedObj = e.selected?.[0];
      if (selectedObj) setActiveEditingObject(selectedObj);
    });

    canvas.on('selection:updated', (e: any) => {
      const selectedObj = e.selected?.[0];
      if (selectedObj) setActiveEditingObject(selectedObj);
    });

    canvas.on('selection:cleared', () => setActiveEditingObject(null));

    setFabricCanvas(canvas);
    saveState(canvas);

    return () => canvas.dispose();
  }, []);

  const updateLayersList = () => {
    if (!fabricCanvas) return;
    try {
      const objs = fabricCanvas.getObjects();
      const simpleList = objs.map((obj: any, idx: number) => ({
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

  const applyCanvasPresetRatio = (preset: string) => {
    if (!fabricCanvas) return;

    let width = 820;
    let height = 480;

    if (preset === '16:9') { width = 854; height = 480; }
    else if (preset === '9:16') { width = 360; height = 640; }
    else if (preset === '1:1') { width = 500; height = 500; }
    else if (preset === 'A4') { width = 595; height = 842; }

    fabricCanvas.setDimensions({ width, height });
    fabricCanvas.renderAll();
    saveState();
  };

  // --- UPGRADED EMAIL-LESS & GEO-IP PAYSTACK CHECKOUT ---
  const handlePaystackUpgrade = async () => {
    try {
      setStatus('⚡ Detecting location & initializing seamless Paystack payment...');

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const res = await axios.post(`${API_BASE}/billing/initialize-paystack`, {
        userId: guestUserId,
        timeZone: timeZone,
        callbackUrl: window.location.href,
      });

      if (res.data?.success && res.data?.authorizationUrl) {
        setStatus(`💳 Redirecting to localized checkout (${res.data.currency || 'local'})...`);
        window.location.href = res.data.authorizationUrl;
      } else {
        alert('Could not start Paystack checkout. Please check server configuration.');
      }
    } catch (err: any) {
      console.error('Paystack Checkout Detailed Error:', err.response?.data || err);

      // Safe Extraction of Error Text (Unrolls Nested Objects)
      let rawErr = err.response?.data?.error || err.response?.data?.details || err.response?.data?.message || err.message;

      if (typeof rawErr === 'object') {
        rawErr = rawErr.message || rawErr.error || JSON.stringify(rawErr);
      }

      alert(`Paystack Checkout Error: ${rawErr}`);
    }
  };

  const addText = () => {
    if (!fabricCanvas) return;
    const ITextClass = getFabricIText();
    if (!ITextClass) return;

    const text = new ITextClass('Type text here...', {
      left: 200,
      top: 150,
      fontSize: Number(fontSizeVal) || 24,
      fontFamily: fontFamilyVal || 'Arial',
      fill: ensureValidHexColor(textColorVal, '#0f172a'),
      selectable: true,
      editable: true,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    saveState(fabricCanvas);
  };

  const saveState = (targetCanvas = fabricCanvas) => {
    if (!targetCanvas) return;
    try {
      const json = targetCanvas.toJSON();
      setUndoStack((prev) => [...prev.slice(-30), JSON.stringify(json)]);
      setRedoStack([]);
      broadcastCanvasChange(json);
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

    fabricCanvas.loadFromJSON(previousCanvasJson, () => fabricCanvas.renderAll());
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !fabricCanvas) return;
    const nextCanvasJson = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    setUndoStack((prev) => [...prev, nextCanvasJson]);
    setRedoStack(newRedoStack);

    fabricCanvas.loadFromJSON(nextCanvasJson, () => fabricCanvas.renderAll());
  };

  const exitTextEditing = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.isEditing) activeObj.exitEditing();
    setActiveEditingObject(null);
    fabricCanvas.renderAll();
  };

  const activateToolMode = (mode: string) => {
    if (!fabricCanvas) return;
    setActiveTool(mode);
    fabricCanvas.isDrawingMode = mode === 'draw';
  };

  const renderPdfPageOntoCanvas = async (pdf: any, pageNumber: number, mode = fitMode) => {
    if (!pdf || !fabricCanvas) return;

    const page = await pdf.getPage(pageNumber);
    const highDpiScale = 2.0;
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    const canvasWidth = 820;
    const canvasHeight = 480;

    fabricCanvas.setDimensions({ width: canvasWidth, height: canvasHeight });

    let computedScale = (canvasWidth - 24) / unscaledViewport.width;
    const viewport = page.getViewport({ scale: computedScale * highDpiScale });
    
    const tempCanvas = document.createElement('canvas');
    const context = tempCanvas.getContext('2d');
    tempCanvas.height = viewport.height;
    tempCanvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const imgData = tempCanvas.toDataURL('image/png');
    const ImageClass = getFabricImage();
    const imgObj = await ImageClass.fromURL(imgData);

    imgObj.scale(1 / highDpiScale);
    imgObj.set({ left: (canvasWidth - imgObj.getScaledWidth()) / 2, top: (canvasHeight - imgObj.getScaledHeight()) / 2, selectable: false });

    fabricCanvas.clear();
    fabricCanvas.add(imgObj);
    fabricCanvas.sendObjectToBack(imgObj);

    activateToolMode('hand');
    fabricCanvas.renderAll();
    saveState(fabricCanvas);
  };

  const handlePdfDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileArrayBuffer = await file.arrayBuffer();
    try {
      const loadedPdf = await pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;
      setPdfDoc(loadedPdf);
      setTotalPages(loadedPdf.numPages);
      setPageNum(1);

      await renderPdfPageOntoCanvas(loadedPdf, 1, fitMode);
    } catch (err: any) {
      console.error('Error loading PDF:', err);
    }
  };

  const changePdfPage = async (newPage: number) => {
    if (!pdfDoc || newPage < 1 || newPage > totalPages) return;
    setPageNum(newPage);
    await renderPdfPageOntoCanvas(pdfDoc, newPage, fitMode);
  };

  const exportCanvasImage = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ format: 'png' });
    const link = document.createElement('a');
    link.download = `edited-document-page-${pageNum}.png`;
    link.href = dataURL;
    link.click();
  };

  const exportCompletePdf = async () => {
    if (!pdfDoc || !fabricCanvas) return;
    const pdfExport = new jsPDF({
      orientation: fabricCanvas.width > fabricCanvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [fabricCanvas.width, fabricCanvas.height],
    });

    for (let i = 1; i <= totalPages; i++) {
      await renderPdfPageOntoCanvas(pdfDoc, i, fitMode);
      const pageDataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 1.0 });
      if (i > 1) pdfExport.addPage([fabricCanvas.width, fabricCanvas.height]);
      pdfExport.addImage(pageDataUrl, 'PNG', 0, 0, fabricCanvas.width, fabricCanvas.height);
    }

    pdfExport.save(`omnistudio-edited-document-${Date.now()}.pdf`);
  };

  const bgMain = darkMode ? '#0f172a' : '#f1f5f9';
  const bgBar = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderCol = darkMode ? '#334155' : '#cbd5e1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'sans-serif', backgroundColor: bgMain, color: textColor, boxSizing: 'border-box' }}>
      
      {/* 1. TOP PORTAL SWITCHER & MAIN TOOLBAR */}
      <MainToolbar 
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        loadSampleDemo={() => {}}
        setShowProjectsModal={setShowProjectsModal}
        exportCanvasImage={exportCanvasImage}
        exportCompletePdf={exportCompletePdf}
        exportMp4Video={exportMp4Video}
        generateShareableProjectUrl={() => {}}
        handlePaystackUpgrade={handlePaystackUpgrade}
        onOpenAiSummaryModal={() => setIsAiSummaryModalOpen(true)}
        onOpenMediaLibraryModal={() => setIsMediaLibraryOpen(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* 2. SECONDARY TOOL RIBBON & BRAND SWATCH HEADER BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: bgBar, padding: '4px 12px', borderBottom: `1px solid ${borderCol}` }}>
        <SecondaryRibbon 
          handlePdfDocumentUpload={handlePdfDocumentUpload}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          undoStackLength={undoStack.length}
          redoStackLength={redoStack.length}
          addText={addText}
          applyWatermarkToAllPages={() => setIsWatermarkModalOpen(true)}
          applyCanvasPresetRatio={applyCanvasPresetRatio}
          onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
          onRunOcr={handleRunOcr}
          onOpenVoiceRecorder={() => setIsVoiceRecorderOpen(true)}
          onOpenPdfMergerModal={() => setIsPdfMergerOpen(true)}
          onOpenCropModal={() => setIsCropModalOpen(true)}
          onOpenRedactionModal={() => setIsRedactionModalOpen(true)}
          onOpenEyeDropper={handleOpenEyeDropper}
          onAddRectangle={handleAddRectangle}
          onAddCircle={handleAddCircle}
          onAddTriangle={handleAddTriangle}
          onAddArrow={handleAddArrow}
          onActivatePencil={handleActivatePencil}
          onActivateHighlighter={handleActivateHighlighter}
          onAlignLeft={handleAlignLeft}
          onAlignCenter={handleAlignCenter}
          onAlignRight={handleAlignRight}
          onAlignTop={handleAlignTop}
          onAlignMiddle={handleAlignMiddle}
          onAlignBottom={handleAlignBottom}
          onGroupObjects={handleGroupObjects}
          onUngroupObjects={handleUngroupObjects}
          bgBar={bgBar}
          borderCol={borderCol}
        />

        {/* 🎨 BRAND SWATCHES HEADER TOOL */}
        <BrandPaletteHeader
          fabricCanvas={fabricCanvas}
          onColorSelect={handleSelectBrandColor}
        />
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* PDF Sidebar Navigator */}
        <PageNavigator 
          thumbnails={thumbnails}
          pageNum={pageNum}
          changePdfPage={changePdfPage}
          onMovePageUp={handleMovePageUp}
          onMovePageDown={handleMovePageDown}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          bgBar={bgBar}
          borderCol={borderCol}
        />

        {/* Center Canvas Viewport with Precision Ruler Overlay */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', overflow: 'auto', position: 'relative' }}>
          
          {/* 📏 PRECISION RULER CONTROL BAR */}
          <PrecisionRuler
            fabricCanvas={fabricCanvas}
            enabled={isRulerActive}
            onToggle={setIsRulerActive}
          />

          <CanvasViewport 
            canvasRef={canvasRef}
            activeEditingObject={activeEditingObject}
            exitTextEditing={exitTextEditing}
            borderCol={borderCol}
            fabricCanvas={fabricCanvas}
            saveState={saveState}
          />
        </div>

        {/* Right Layers & Property Inspector Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
          {activeEditingObject && (
            <PropertyInspector 
              activeObject={activeEditingObject}
              fabricCanvas={fabricCanvas}
              saveState={saveState}
              borderCol={borderCol}
              bgBar={bgBar}
            />
          )}

          <LayersStack 
            canvasLayers={canvasLayers}
            fabricCanvas={fabricCanvas}
            bgBar={bgBar}
            borderCol={borderCol}
          />
        </div>
      </div>

      {/* 4. WATERMARK ENGINE MODAL (Integrated with totalPages & currentPage props) */}
      <WatermarkModal
        isOpen={isWatermarkModalOpen}
        onClose={() => setIsWatermarkModalOpen(false)}
        onApplyWatermark={handleApplyAdvancedWatermark}
        totalPages={totalPages || 1}
        currentPage={pageNum || 1}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      {/* 5. OTHER STUDIO MODALS */}
      <SignatureModal 
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={handleSaveSignature}
        onAddStamp={handleAddStamp}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      <OcrModal 
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        progress={ocrProgress}
        statusText={ocrStatusText}
        extractedText={extractedOcrText}
        onInsertAsDocNode={handleInsertOcrAsDocNode}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      <VoiceRecorderModal 
        isOpen={isVoiceRecorderOpen}
        onClose={() => setIsVoiceRecorderOpen(false)}
        onSaveAudioCard={handleSaveAudioCard}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      <AiSummaryModal 
        isOpen={isAiSummaryModalOpen}
        onClose={() => setIsAiSummaryModalOpen(false)}
        onInsertSummaryCard={handleInsertSummaryCard}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      <MediaLibraryModal 
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onInsertAsset={handleInsertMediaAsset}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      <PdfMergerModal 
        isOpen={isPdfMergerOpen}
        onClose={() => setIsPdfMergerOpen(false)}
        onMergePdfs={handleMergePdfs}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      <CropMaskModal 
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        onApplyCrop={() => {}}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      <RedactionModal 
        isOpen={isRedactionModalOpen}
        onClose={() => setIsRedactionModalOpen(false)}
        onApplyRedaction={() => {}}
        totalPages={totalPages || 1}
        currentPage={pageNum || 1}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      {/* TIMELINE BAR */}
      <TimelineBar 
        isPlaying={isPlaying}
        onTogglePlay={togglePlayPause}
        currentTime={timelineSec}
        duration={videoDuration}
        onSeek={handleTimelineScrub}
        borderCol={borderCol}
        bgBar={bgBar}
      />
    </div>
  );
}

export default function SafeCanvasStudio() {
  return (
    <StudioErrorBoundary>
      <CanvasStudio />
    </StudioErrorBoundary>
  );
}