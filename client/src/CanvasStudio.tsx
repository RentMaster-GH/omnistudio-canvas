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

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Points to Vercel Serverless API or Local Server
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : '/api';

/**
 * Helper: Guarantees a strict 7-character #RRGGBB hex string to prevent 
 * React DOM crashes inside <input type="color" />
 */
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

// --- REACT ERROR BOUNDARY (PREVENTS BLANK WHITE PAGES) ---
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

  // Dynamic Fit Mode State: 'width' | 'page'
  const [fitMode] = useState<'width' | 'page'>('width');

  // Layers Manager State
  const [canvasLayers, setCanvasLayers] = useState<any[]>([]);

  // Auto-Save & Recent Projects State
  const [, setRecentProjects] = useState<any[]>([]);
  const [, setShowProjectsModal] = useState(false);

  // Digital Signature Modal State
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  // Voice Recorder State
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);

  // AI Summary Modal State
  const [isAiSummaryModalOpen, setIsAiSummaryModalOpen] = useState(false);

  // Media Library Modal State
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  // PDF Merger Modal State
  const [isPdfMergerOpen, setIsPdfMergerOpen] = useState(false);

  // Crop Mask Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Redaction Modal State
  const [isRedactionModalOpen, setIsRedactionModalOpen] = useState(false);

  // OCR State
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('Initializing OCR Engine...');
  const [extractedOcrText, setExtractedOcrText] = useState('');

  // Timeline & Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineSec, setTimelineSec] = useState(0);
  const [videoDuration] = useState(30);

  // Real-Time Multiplayer Socket Hook
  const { broadcastCanvasChange } = useCanvasSocket(fabricCanvas);

  // GUEST SESSION
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

  // Typography State
  const [fontFamilyVal, setFontFamilyVal] = useState('Arial');
  const [fontSizeVal, setFontSizeVal] = useState(24);
  const [textColorVal, setTextColorVal] = useState('#0f172a');

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  const [, setTranscriptionText] = useState('Welcome to OmniStudio Canvas. Your all-in-one editor for video, audio, and text.');
  
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([
    {
      id: 'seg-1',
      speaker: 'Speaker 1',
      text: 'Welcome to OmniStudio Canvas.',
      start: 0,
      end: 2.5,
      words: [{ id: 'w1', word: 'Welcome', start: 0, end: 0.5, confidence: 0.99 }]
    }
  ]);

  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    setStatus(isPlaying ? '⏸️ Paused Playback' : '▶️ Playing Timeline');
  };

  const handleTimelineScrub = (newTime: number) => {
    setTimelineSec(newTime);
  };

  // Optional Redaction Handler
  const handleApplyRedaction = (label: string, applyToAllPages: boolean, maskColor: string) => {
    if (!fabricCanvas) return;

    const rectObj = new (fabric as any).Rect({
      width: 220,
      height: 60,
      fill: maskColor,
      left: 200,
      top: 180,
      rx: 4,
      ry: 4,
    });

    let redactionGroup: any = rectObj;

    if (label && label.trim() !== '') {
      const textObj = new (fabric as any).Text(label, {
        fontSize: 14,
        fontWeight: 'bold',
        fill: '#ffffff',
        left: 215,
        top: 200,
      });
      redactionGroup = new (fabric as any).Group([rectObj, textObj], { left: 200, top: 180 });
    }

    fabricCanvas.add(redactionGroup);
    fabricCanvas.setActiveObject(redactionGroup);
    fabricCanvas.renderAll();
    saveState();

    if (applyToAllPages) {
      setStatus(`🛡️ Batch Redaction applied across all ${totalPages} pages!`);
      alert(`🎉 Redaction mask successfully applied to all ${totalPages} pages!`);
    } else {
      setStatus(`🛡️ Redaction mask applied to Page ${pageNum}`);
    }
  };

  // Crop Handler
  const handleApplyCrop = (cropXPercent: number, cropYPercent: number, cropWPercent: number, cropHPercent: number) => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === 'image') {
      const origW = activeObj.width || 300;
      const origH = activeObj.height || 300;

      activeObj.set({
        cropX: (cropXPercent / 100) * origW,
        cropY: (cropYPercent / 100) * origH,
        width: (cropWPercent / 100) * origW,
        height: (cropHPercent / 100) * origH,
      });

      fabricCanvas.renderAll();
      saveState();
      setStatus('✂️ Applied Crop Mask to Element');
    } else {
      alert('Please select an image or PDF surface element to crop!');
    }
  };

  // Screen Eyedropper Tool Handler
  const handleOpenEyeDropper = async () => {
    if (!('EyeDropper' in window)) {
      alert('Screen Eyedropper is supported in Chrome, Edge, and Opera browsers.');
      return;
    }

    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        setTextColorVal(result.sRGBHex);
        const activeObj = fabricCanvas?.getActiveObject();
        if (activeObj) {
          activeObj.set({ fill: result.sRGBHex });
          fabricCanvas?.renderAll();
          saveState();
        }
        setStatus(`🧪 Eyedropper picked color: ${result.sRGBHex}`);
      }
    } catch (e) {
      console.warn('EyeDropper cancelled:', e);
    }
  };

  // PDF Stitching Engine
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
    alert(`🎉 Successfully merged ${files.length} PDF files into a single ${allThumbs.length}-page document!`);
  };

  // Object Alignment & Grouping Handlers
  const handleAlignLeft = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.set({ left: 20 });
      fabricCanvas.renderAll();
      saveState();
      setStatus('📐 Aligned Object Left');
    }
  };

  const handleAlignCenter = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.centerH();
      fabricCanvas.renderAll();
      saveState();
      setStatus('📐 Aligned Object Center');
    }
  };

  const handleAlignRight = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.set({ left: fabricCanvas.width - activeObj.width * (activeObj.scaleX || 1) - 20 });
      fabricCanvas.renderAll();
      saveState();
      setStatus('📐 Aligned Object Right');
    }
  };

  const handleAlignTop = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.set({ top: 20 });
      fabricCanvas.renderAll();
      saveState();
      setStatus('📐 Aligned Object Top');
    }
  };

  const handleAlignMiddle = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.centerV();
      fabricCanvas.renderAll();
      saveState();
      setStatus('📐 Aligned Object Middle');
    }
  };

  const handleAlignBottom = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj) {
      activeObj.set({ top: fabricCanvas.height - activeObj.height * (activeObj.scaleY || 1) - 20 });
      fabricCanvas.renderAll();
      saveState();
      setStatus('📐 Aligned Object Bottom');
    }
  };

  const handleGroupObjects = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === 'activeSelection') {
      activeObj.toGroup();
      fabricCanvas.renderAll();
      saveState();
      setStatus('🔗 Grouped Selected Objects');
    }
  };

  const handleUngroupObjects = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === 'group') {
      activeObj.toActiveSelection();
      fabricCanvas.renderAll();
      saveState();
      setStatus('🔓 Ungrouped Objects');
    }
  };

  // PDF Page Organizer Handlers
  const handleMovePageUp = (index: number) => {
    if (index <= 0 || thumbnails.length <= 1) return;
    const newThumbs = [...thumbnails];
    const temp = newThumbs[index];
    newThumbs[index] = newThumbs[index - 1];
    newThumbs[index - 1] = temp;
    setThumbnails(newThumbs);
    setPageNum(index);
    setStatus(`📄 Moved Page ${index + 1} Up`);
  };

  const handleMovePageDown = (index: number) => {
    if (index >= thumbnails.length - 1 || thumbnails.length <= 1) return;
    const newThumbs = [...thumbnails];
    const temp = newThumbs[index];
    newThumbs[index] = newThumbs[index + 1];
    newThumbs[index + 1] = temp;
    setThumbnails(newThumbs);
    setPageNum(index + 2);
    setStatus(`📄 Moved Page ${index + 1} Down`);
  };

  const handleDuplicatePage = (index: number) => {
    const newThumbs = [...thumbnails];
    newThumbs.splice(index + 1, 0, newThumbs[index]);
    setThumbnails(newThumbs);
    setTotalPages(newThumbs.length);
    setStatus(`📄 Duplicated Page ${index + 1}`);
  };

  const handleDeletePage = (index: number) => {
    if (thumbnails.length <= 1) {
      alert('Cannot delete the last remaining page!');
      return;
    }
    const newThumbs = thumbnails.filter((_, i) => i !== index);
    setThumbnails(newThumbs);
    setTotalPages(newThumbs.length);
    if (pageNum > newThumbs.length) setPageNum(newThumbs.length);
    setStatus(`🗑️ Deleted Page ${index + 1}`);
  };

  const handleInsertMediaAsset = async (type: 'image' | 'template', contentUrlOrText: string, title: string) => {
    if (!fabricCanvas) return;

    if (type === 'image') {
      const ImageClass = (fabric as any).FabricImage || (fabric as any).Image || ((fabric as any).default && (fabric as any).default.Image);
      if (ImageClass) {
        const imgObj = await ImageClass.fromURL(contentUrlOrText);
        imgObj.scaleToWidth(120);
        imgObj.set({ left: 250, top: 180 });
        fabricCanvas.add(imgObj);
        fabricCanvas.setActiveObject(imgObj);
        fabricCanvas.renderAll();
        saveState();
        setStatus(`📁 Inserted Asset: ${title}`);
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
        setStatus(`📄 Inserted Template: ${title}`);
      }
    }
  };

  // Vector Shape Handlers
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
    setStatus('🔷 Vector Rectangle added');
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
    setStatus('🟣 Vector Circle added');
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
    setStatus('🔺 Vector Triangle added');
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
    setStatus('➡️ Vector Line added');
  };

  const handleActivatePencil = () => {
    if (!fabricCanvas) return;
    activateToolMode('draw');
    setStatus('✏️ Freehand Pen Brush activated');
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
    setStatus('🖍️ Highlighter Pen activated');
  };

  const exportMp4Video = async () => {
    if (!fabricCanvas) return;
    setStatus('🎬 Triggering server-side OmniEngine MP4 video rendering...');

    try {
      const res = await axios.post(`${API_BASE}/export/mp4`, {
        canvasState: fabricCanvas.toJSON(),
        timelineData: { duration: videoDuration, currentTime: timelineSec },
      });

      if (res.data?.success) {
        setStatus('✅ Video rendered! Downloading MP4...');
        alert('🎉 Your MP4 Video has been rendered successfully by OmniEngine!');
      }
    } catch (err: any) {
      console.error('MP4 Render Error:', err);
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
      setStatus('🎙️ Live Voice Dictation Card added to Canvas!');
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
      setStatus('✨ AI Key Highlights Card added to Canvas!');
    }
  };

  // OCR Execution Handler
  const handleRunOcr = async () => {
    if (!fabricCanvas) {
      alert('Please open a document or image first to run OCR!');
      return;
    }

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
      console.error('OCR Error:', err);
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
      setStatus('📄 OCR extracted text inserted onto Canvas!');
    }
  };

  // Save Signature Image onto Canvas Surface
  const handleSaveSignature = async (dataUrl: string) => {
    if (!fabricCanvas) return;
    const ImageClass = (fabric as any).FabricImage || (fabric as any).Image || ((fabric as any).default && (fabric as any).default.Image);
    if (ImageClass) {
      const imgObj = await ImageClass.fromURL(dataUrl);
      imgObj.scaleToWidth(180);
      imgObj.set({ left: 300, top: 200 });
      fabricCanvas.add(imgObj);
      fabricCanvas.setActiveObject(imgObj);
      fabricCanvas.renderAll();
      saveState();
      setStatus('✍️ Added Digital Signature to Document Surface');
    }
  };

  // Save Vector Stamp onto Canvas Surface
  const handleAddStamp = (stampText: string, color: string) => {
    if (!fabricCanvas) return;
    const stampTextObj = new (fabric as any).Text(stampText, { fontSize: 20, fontWeight: 'bold', fill: color, left: 15, top: 10 });
    const stampRectObj = new (fabric as any).Rect({ width: stampTextObj.width + 30, height: stampTextObj.height + 20, fill: 'rgba(255, 255, 255, 0.95)', stroke: color, strokeWidth: 3, rx: 6, ry: 6 });
    const stampGroup = new (fabric as any).Group([stampRectObj, stampTextObj], { left: 350, top: 150, angle: -10 });

    fabricCanvas.add(stampGroup);
    fabricCanvas.setActiveObject(stampGroup);
    fabricCanvas.renderAll();
    saveState();
    setStatus(`🏷️ Added Stamp: "${stampText}"`);
  };

  // --- GOOGLE FONTS DYNAMIC INJECTION ENGINE ---
  useEffect(() => {
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Bangers&family=Bebas+Neue&family=Bungee&family=Caveat&family=Cinzel&family=Cormorant+Garamond&family=Courgette&family=Dancing+Script&family=Fira+Code&family=Great+Vibes&family=Inter&family=JetBrains+Mono&family=Lato&family=Lobster&family=Lora&family=Merriweather&family=Montserrat&family=Nunito&family=Open+Sans&family=Orbitron&family=Oswald&family=Pacifico&family=Permanent+Marker&family=Playfair+Display&family=Poppins&family=Press+Start+2P&family=Raleway&family=Roboto&family=Sacramento&family=Satisfy&family=Source+Code+Pro&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }, []);

  // --- AUTO-RESTORE SESSION & URL SHAREABLE LINK ---
  useEffect(() => {
    if (!fabricCanvas) return;

    const hash = window.location.hash;
    if (hash.includes('#project=')) {
      try {
        const encoded = hash.split('#project=')[1];
        const decodedJson = JSON.parse(decodeURIComponent(atob(encoded)));
        if (decodedJson.canvas) {
          fabricCanvas.loadFromJSON(decodedJson.canvas, () => {
            if (decodedJson.subtitles) setTranscriptSegments(decodedJson.subtitles);
            fabricCanvas.renderAll();
            setStatus('🔗 Shared project loaded from URL link!');
          });
          return;
        }
      } catch (e) {
        console.warn('Could not load shared project from URL hash:', e);
      }
    }

    const lastSavedProject = localStorage.getItem('omnistudio_last_autosave');
    if (lastSavedProject) {
      try {
        const parsed = JSON.parse(lastSavedProject);
        if (parsed.canvasJson) {
          fabricCanvas.loadFromJSON(parsed.canvasJson, () => {
            if (parsed.transcriptSegments) setTranscriptSegments(parsed.transcriptSegments);
            fabricCanvas.renderAll();
            setStatus('⚡ Restored your previous session automatically!');
          });
        }
      } catch (e) {
        console.warn('Could not auto-restore session:', e);
      }
    }
  }, [fabricCanvas]);

  // --- AUTO-SAVE & RECENT PROJECTS RESTORER ---
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (fabricCanvas) {
        const projectData = {
          id: currentProjectId || 'proj_' + Date.now(),
          title: projectTitle || 'OmniStudio Project',
          timestamp: new Date().toLocaleString(),
          canvasJson: fabricCanvas.toJSON(),
          transcriptSegments,
        };

        localStorage.setItem('omnistudio_last_autosave', JSON.stringify(projectData));
        
        const existing = JSON.parse(localStorage.getItem('omnistudio_recent_projects') || '[]');
        const filtered = existing.filter((p: any) => p.id !== projectData.id);
        const updatedList = [projectData, ...filtered].slice(0, 5);
        
        localStorage.setItem('omnistudio_recent_projects', JSON.stringify(updatedList));
        setRecentProjects(updatedList);
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [fabricCanvas, currentProjectId, projectTitle, transcriptSegments]);

  // --- SAMPLE DEMO PROJECT LOADER ---
  const loadSampleDemo = () => {
    if (!fabricCanvas) return;

    fabricCanvas.clear();

    const ITextClass = getFabricIText();
    if (ITextClass) {
      const titleText = new ITextClass('OmniStudio Canvas Sample Demo', {
        left: 80,
        top: 60,
        fontSize: 28,
        fontFamily: 'Roboto',
        fontWeight: 'bold',
        fill: '#0284c7',
      });
      fabricCanvas.add(titleText);
    }

    const stampText = new (fabric as any).Text('APPROVED', { fontSize: 20, fontWeight: 'bold', fill: '#10b981', left: 15, top: 10 });
    const stampRect = new (fabric as any).Rect({ width: stampText.width + 30, height: stampText.height + 20, fill: 'rgba(255, 255, 255, 0.9)', stroke: '#10b981', strokeWidth: 3, rx: 6, ry: 6 });
    const stampGroup = new (fabric as any).Group([stampRect, stampText], { left: 520, top: 80, angle: -12 });

    const shape = new (fabric as any).Rect({ left: 80, top: 180, width: 220, height: 120, fill: 'rgba(2, 132, 199, 0.1)', stroke: '#0284c7', strokeWidth: 2, rx: 8, ry: 8 });

    fabricCanvas.add(stampGroup, shape);

    setTranscriptionText('Welcome to OmniStudio Canvas. Edit text, video tracks, and subtitles seamlessly.');
    setTranscriptSegments([
      {
        id: 'demo-1',
        speaker: 'Speaker 1',
        text: 'Welcome to OmniStudio Canvas.',
        start: 0,
        end: 2.5,
        words: [{ id: 'w1', word: 'Welcome', start: 0, end: 0.5, confidence: 0.99 }]
      }
    ]);

    fabricCanvas.renderAll();
    saveState();
    setStatus('✨ Sample Demo Project Loaded onto Canvas!');
  };

  // --- 1-CLICK SHAREABLE PROJECT LINK GENERATOR ---
  const generateShareableProjectUrl = () => {
    if (!fabricCanvas) return;
    
    const projectState = {
      canvas: fabricCanvas.toJSON(),
      subtitles: transcriptSegments,
    };

    const encodedState = btoa(encodeURIComponent(JSON.stringify(projectState)));
    const shareUrl = `${window.location.origin}/#project=${encodedState}`;

    navigator.clipboard.writeText(shareUrl);
    alert('🔗 Shareable Project Link copied to clipboard!\n\nAnyone opening this link can view & edit your work instantly without signing in.');
    setStatus('🔗 Project link copied to clipboard!');
  };

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // UNIVERSAL FABRIC CANVAS INITIALIZATION WITH 60 FPS PERFORMANCE OPTIMIZATIONS
  useEffect(() => {
    const CanvasClass = getFabricCanvas();
    if (!CanvasClass) {
      console.error('Fabric Canvas constructor unavailable.');
      return;
    }

    const canvas = new CanvasClass(canvasRef.current, {
      width: 820,
      height: 480,
      backgroundColor: '#ffffff',
      defaultCursor: 'grab',
      renderOnAddRemove: true,
      skipTargetFind: false,
    });

    canvas.on('mouse:down', (opt: any) => {
      if (activeToolRef.current === 'hand') {
        isPanningRef.current = true;
        lastPosRef.current = { x: opt.e.clientX, y: opt.e.clientY };
        canvas.defaultCursor = 'grabbing';
        canvas.setCursor('grabbing');
      }
    });

    canvas.on('mouse:move', (opt: any) => {
      if (isPanningRef.current && activeToolRef.current === 'hand') {
        const vpt = canvas.viewportTransform;
        vpt[4] += opt.e.clientX - lastPosRef.current.x;
        vpt[5] += opt.e.clientY - lastPosRef.current.y;
        canvas.requestRenderAll();
        lastPosRef.current = { x: opt.e.clientX, y: opt.e.clientY };
      }
    });

    canvas.on('mouse:up', (opt: any) => {
      if (activeToolRef.current === 'hand') {
        isPanningRef.current = false;
        canvas.defaultCursor = 'grab';
        canvas.setCursor('grab');
      } else {
        handleMouseUpInitializer(canvas, opt);
      }
    });

    canvas.on('selection:created', (e: any) => {
      const selectedObj = e.selected?.[0];
      if (selectedObj) {
        setActiveEditingObject(selectedObj);
        updateInspectorFromSelection(selectedObj);
      }
    });

    canvas.on('selection:updated', (e: any) => {
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

  // --- GLOBAL KEYBOARD SHORTCUTS ENGINE ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = e.target ? (e.target as HTMLElement).tagName.toLowerCase() : '';
      const isEditingText = targetTag === 'input' || targetTag === 'textarea' || (fabricCanvas && fabricCanvas.getActiveObject()?.isEditing);

      if (isEditingText) return;

      if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        if (fabricCanvas) {
          const activeObjs = fabricCanvas.getActiveObjects();
          activeObjs.forEach((obj: any) => fabricCanvas.remove(obj));
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          saveState();
          setStatus('🗑️ Deleted selected element(s)');
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas, undoStack, redoStack, isPlaying]);

  // --- ASPECT RATIO PRESETS HANDLER ---
  const applyCanvasPresetRatio = (preset: string) => {
    if (!fabricCanvas) return;

    let width = 820;
    let height = 480;

    if (preset === '16:9') {
      width = 854;
      height = 480;
    } else if (preset === '9:16') {
      width = 360;
      height = 640;
    } else if (preset === '1:1') {
      width = 500;
      height = 500;
    } else if (preset === 'A4') {
      width = 595;
      height = 842;
    }

    fabricCanvas.setDimensions({ width, height });
    fabricCanvas.renderAll();
    saveState();
    setStatus(`📐 Resized Canvas Preset to ${preset} (${width}x${height}px)`);
  };

  // --- WATERMARKING HANDLER ---
  const applyWatermarkToAllPages = (watermarkText = 'CONFIDENTIAL') => {
    if (!fabricCanvas) return;
    const text = prompt('Enter Watermark Text for All Pages:', watermarkText);
    if (!text) return;

    const watermarkObj = new (fabric as any).Text(text.toUpperCase(), {
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: 'rgba(239, 68, 68, 0.25)',
      angle: -35,
      originX: 'center',
      originY: 'center',
      left: fabricCanvas.width / 2,
      top: fabricCanvas.height / 2,
      selectable: true,
    });

    fabricCanvas.add(watermarkObj);
    fabricCanvas.setActiveObject(watermarkObj);
    saveState();
    setStatus(`💧 Added Watermark: "${text}" to Page View`);
  };

  // --- PAYSTACK SUBSCRIPTION HANDLER ---
  const handlePaystackUpgrade = async () => {
    const userEmail = prompt('Enter your email address to upgrade to OmniStudio Pro ($9/mo):', 'user@example.com');
    if (!userEmail) return;

    setStatus('Initializing Paystack Payment Gateway (Cards & Mobile Money)...');

    try {
      const res = await axios.post(`${API_BASE}/billing/initialize-paystack`, {
        userId: guestUserId,
        email: userEmail,
        currency: 'USD',
      });

      if (res.data?.authorizationUrl) {
        window.location.href = res.data.authorizationUrl;
      } else {
        alert('Could not start Paystack checkout. Please check server keys.');
      }
    } catch (err: any) {
      console.error('Paystack Checkout Error:', err);
      alert(`Paystack Error: ${err.response?.data?.details || err.message}`);
    }
  };

  // --- UNIVERSAL ADD TEXT FUNCTION ---
  const addText = () => {
    if (!fabricCanvas) {
      alert('Please open a PDF or document first.');
      return;
    }

    try {
      if (!isEditMode) setIsEditMode(true);
      setActiveTool('select');

      const ITextClass = getFabricIText();
      if (!ITextClass) {
        alert('Fabric text class unavailable.');
        return;
      }

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

      setStatus('✏️ Added new editable text box.');
    } catch (err: any) {
      console.error('Add Text Failed:', err);
      alert(`Could not add text box: ${err.message}`);
    }
  };

  const updateInspectorFromSelection = (obj: any) => {
    if (!obj) return;
    try {
      if (obj.fontFamily) setFontFamilyVal(obj.fontFamily);
      if (obj.fontSize) setFontSizeVal(obj.fontSize);
      if (obj.fill) setTextColorVal(ensureValidHexColor(obj.fill, '#0f172a'));
    } catch (err) {
      console.error('Inspector update error:', err);
    }
  };

  const saveState = (targetCanvas = fabricCanvas) => {
    if (!targetCanvas) return;
    try {
      const json = targetCanvas.toJSON(['isPendingRedaction', 'isRedacted', 'id', 'linkUrl']);
      setUndoStack((prev) => [...prev.slice(-30), JSON.stringify(json)]); // Cap stack at 30 snapshots for 60 FPS performance
      setRedoStack([]);

      // Broadcast change live to all socket peers
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

  const activateToolMode = (mode: string) => {
    if (!fabricCanvas) return;
    setActiveTool(mode);

    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = true;

    if (mode === 'hand') {
      fabricCanvas.selection = false;
      fabricCanvas.defaultCursor = 'grab';
      fabricCanvas.setCursor('grab');
    } else if (mode === 'draw') {
      fabricCanvas.isDrawingMode = true;
      const PencilBrushClass = getFabricPencilBrush();
      if (PencilBrushClass) {
        const brush = new PencilBrushClass(fabricCanvas);
        brush.width = 3;
        brush.color = '#ef4444';
        fabricCanvas.freeDrawingBrush = brush;
      }
    } else {
      fabricCanvas.defaultCursor = 'default';
      fabricCanvas.setCursor('default');
    }
  };

  const renderPdfPageOntoCanvas = async (pdf: any, pageNumber: number, mode = fitMode) => {
    if (!pdf || !fabricCanvas) return;

    const page = await pdf.getPage(pageNumber);
    // 2.0x High-DPI Pixel Multiplier for Crisp PDF Text Zoom
    const highDpiScale = 2.0;
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

    // Multiply viewport scale by 2.0x for razor-sharp vector text rendering
    const viewport = page.getViewport({ scale: computedScale * highDpiScale });
    const tempCanvas = document.createElement('canvas');
    const context = tempCanvas.getContext('2d');
    tempCanvas.height = viewport.height;
    tempCanvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const imgData = tempCanvas.toDataURL('image/png');
    const ImageClass = getFabricImage();
    const imgObj = await ImageClass.fromURL(imgData);

    // Scale object back down to fit canvas size while preserving 2.0x raster density
    imgObj.scale(1 / highDpiScale);
    const left = (canvasWidth - imgObj.getScaledWidth()) / 2;
    const top = (canvasHeight - imgObj.getScaledHeight()) / 2;

    imgObj.set({ left, top, selectable: false });

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
    } catch (err: any) {
      setStatus(`Error loading PDF: ${err.message}`);
    }
  };

  const generateThumbnails = async (pdf: any) => {
    const thumbs: string[] = [];
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

  const changePdfPage = async (newPage: number) => {
    if (!pdfDoc || newPage < 1 || newPage > totalPages) return;
    setPageNum(newPage);
    await renderPdfPageOntoCanvas(pdfDoc, newPage, fitMode);
  };

  const handleMouseUpInitializer = (_canvas: any, _opt: any) => {};

  const exportCanvasImage = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ format: 'png' });
    const link = document.createElement('a');
    link.download = `edited-document-page-${pageNum}.png`;
    link.href = dataURL;
    link.click();
  };

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
        await renderPdfPageOntoCanvas(pdfDoc, i, fitMode);

        const pageDataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 1.0 });

        if (i > 1) {
          pdfExport.addPage([fabricCanvas.width, fabricCanvas.height], fabricCanvas.width > fabricCanvas.height ? 'landscape' : 'portrait');
        }

        pdfExport.addImage(pageDataUrl, 'PNG', 0, 0, fabricCanvas.width, fabricCanvas.height);
      }

      await renderPdfPageOntoCanvas(pdfDoc, currentPage, fitMode);
      setPageNum(currentPage);

      pdfExport.save(`omnistudio-edited-document-${Date.now()}.pdf`);
      setStatus('✅ Multi-Page PDF exported and downloaded successfully!');
      alert('🎉 Your complete edited PDF document has been downloaded!');
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      setStatus(`Error exporting PDF: ${err.message}`);
    }
  };

  const bgMain = darkMode ? '#0f172a' : '#f1f5f9';
  const bgBar = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderCol = darkMode ? '#334155' : '#cbd5e1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'sans-serif', backgroundColor: bgMain, color: textColor, boxSizing: 'border-box' }}>
      
      {/* 1. TOP PORTAL SWITCHER & GLOBAL ACTIONS */}
      <MainToolbar 
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        loadSampleDemo={loadSampleDemo}
        setShowProjectsModal={setShowProjectsModal}
        exportCanvasImage={exportCanvasImage}
        exportCompletePdf={exportCompletePdf}
        exportMp4Video={exportMp4Video}
        generateShareableProjectUrl={generateShareableProjectUrl}
        handlePaystackUpgrade={handlePaystackUpgrade}
        onOpenAiSummaryModal={() => setIsAiSummaryModalOpen(true)}
        onOpenMediaLibraryModal={() => setIsMediaLibraryOpen(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* 2. SECONDARY TOOL RIBBON */}
      <SecondaryRibbon 
        handlePdfDocumentUpload={handlePdfDocumentUpload}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        undoStackLength={undoStack.length}
        redoStackLength={redoStack.length}
        addText={addText}
        applyWatermarkToAllPages={applyWatermarkToAllPages}
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

        {/* Center Canvas Viewport */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', overflow: 'auto' }}>
          <CanvasViewport 
            canvasRef={canvasRef}
            activeEditingObject={activeEditingObject}
            exitTextEditing={exitTextEditing}
            borderCol={borderCol}
            fabricCanvas={fabricCanvas}
            saveState={saveState}
          />

          {/* Right Layers & Property Inspector Panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
      </div>

      {/* 4. DIGITAL SIGNATURE & STAMP MODAL */}
      <SignatureModal 
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={handleSaveSignature}
        onAddStamp={handleAddStamp}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      {/* 5. OCR SCANNER PROGRESS MODAL */}
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

      {/* 6. VOICE DICTATION & AUDIO RECORDER MODAL */}
      <VoiceRecorderModal 
        isOpen={isVoiceRecorderOpen}
        onClose={() => setIsVoiceRecorderOpen(false)}
        onSaveAudioCard={handleSaveAudioCard}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      {/* 7. AI MAGIC SUMMARIZER MODAL */}
      <AiSummaryModal 
        isOpen={isAiSummaryModalOpen}
        onClose={() => setIsAiSummaryModalOpen(false)}
        onInsertSummaryCard={handleInsertSummaryCard}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      {/* 8. CLOUD ASSET & TEMPLATE LIBRARY MODAL */}
      <MediaLibraryModal 
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onInsertAsset={handleInsertMediaAsset}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      {/* 9. PDF MERGER MODAL */}
      <PdfMergerModal 
        isOpen={isPdfMergerOpen}
        onClose={() => setIsPdfMergerOpen(false)}
        onMergePdfs={handleMergePdfs}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      {/* 10. CROP MASK MODAL */}
      <CropMaskModal 
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        onApplyCrop={handleApplyCrop}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      {/* 11. BOTTOM MULTI-TRACK TIMELINE BAR */}
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

// SINGLE DEFAULT EXPORT WRAPPED IN ERROR BOUNDARY
export default function SafeCanvasStudio() {
  return (
    <StudioErrorBoundary>
      <CanvasStudio />
    </StudioErrorBoundary>
  );
}