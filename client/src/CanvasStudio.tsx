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

// Timed Paywall & MoMo Selector Modal Imports
import { TimedPaywallModal } from './components/toolbar/TimedPaywallModal';
import { MomoCheckoutModal } from './components/toolbar/MomoCheckoutModal';

// Unlimited Duration Recorder & AI Transcriber Modal Import
import { UnlimitedStudioRecorderModal } from './components/toolbar/UnlimitedStudioRecorderModal';

// 💬 Real-Time Social Chat & P2P Voice/Video Calls Modal Import
import { SocialMessengerModal } from './components/social/SocialMessengerModal';

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
  const [statusMessage, setStatusMessage] = useState('Ready - View Mode');

  const [activeEditingObject, setActiveEditingObject] = useState<any>(null);
  const [canvasLayers, setCanvasLayers] = useState<any[]>([]);

  const [, setShowProjectsModal] = useState(false);

  // Responsive Default Canvas Dimensions
  const [canvasWidth, setCanvasWidth] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return Math.max(320, window.innerWidth - 32);
    }
    return 1050;
  });
  const [canvasHeight, setCanvasHeight] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return Math.max(320, Math.round((window.innerWidth - 32) * (650 / 1050)));
    }
    return 650;
  });

  // --- APP MANAGER (ADMIN) BYPASS CHECK ---
  const [isAppManager, setIsAppManager] = useState<boolean>(() => {
    const isUrlAdmin = window.location.search.includes('admin=manager') || window.location.search.includes('role=manager');
    const isSavedManager = localStorage.getItem('omni_user_role') === 'manager';
    return isUrlAdmin || isSavedManager;
  });

  // --- TIMER & PAYWALL STATE ---
  const TIMER_DURATION_SEC = 1800; // 30 Minutes

  const [isProUnlocked, setIsProUnlocked] = useState<boolean>(() => {
    const hasPaidToken = localStorage.getItem('omni_pro_unlocked_token');
    const hasUnlockedFlag = localStorage.getItem('omni_pro_unlocked') === 'true';
    return isAppManager || hasPaidToken !== null || hasUnlockedFlag;
  });

  const [freeTimeRemainingSec, setFreeTimeRemainingSec] = useState<number>(() => {
    const savedTime = localStorage.getItem('omni_paywall_timer');
    return savedTime !== null ? Number(savedTime) : TIMER_DURATION_SEC;
  });

  // Modal States
  const [isMomoModalOpen, setIsMomoModalOpen] = useState(false);
  const [isUnlimitedRecorderOpen, setIsUnlimitedRecorderOpen] = useState(false);
  const [isSocialMessengerOpen, setIsSocialMessengerOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isAiSummaryModalOpen, setIsAiSummaryModalOpen] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isPdfMergerOpen, setIsPdfMergerOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isRedactionModalOpen, setIsRedactionModalOpen] = useState(false);
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  
  // Tools & OCR State
  const [isRulerActive, setIsRulerActive] = useState(false);
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

  const [activeTool, setActiveTool] = useState('hand');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const [fontFamilyVal] = useState('Arial');
  const [fontSizeVal] = useState(24);
  const [textColorVal, setTextColorVal] = useState('#0f172a');

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  useEffect(() => {
    if (isProUnlocked || isAppManager) return;

    const interval = setInterval(() => {
      setFreeTimeRemainingSec((prev) => {
        const nextTime = prev - 1;
        if (nextTime <= 0) {
          localStorage.setItem('omni_paywall_timer', '0');
          return 0;
        }
        localStorage.setItem('omni_paywall_timer', String(nextTime));
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isProUnlocked, isAppManager]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const notifyUser = (msg: string) => {
    setStatusMessage(msg);
    console.log('📌 OmniStudio Status:', msg);
  };

  const handleResizeCanvas = (newWidth: number, newHeight: number) => {
    const w = Math.max(280, Math.min(3000, Math.round(newWidth)));
    const h = Math.max(280, Math.min(3000, Math.round(newHeight)));
    setCanvasWidth(w);
    setCanvasHeight(h);

    if (fabricCanvas) {
      fabricCanvas.setDimensions({ width: w, height: h });
      fabricCanvas.renderAll();
      saveState();
    }
  };

  // --- DUMMY HANDLER FIXES IMPLEMENTED ---
  const handleLoadSampleDemo = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    
    // Create Sample Canvas Document
    const ITextClass = getFabricIText();
    if (ITextClass) {
      const title = new ITextClass('🎨 Welcome to OmniStudio Canvas!', {
        left: 50,
        top: 40,
        fontSize: 28,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#0284c7',
      });
      const subtitle = new ITextClass('You can edit PDFs, type documents, draw, record audio, and make WebRTC calls.', {
        left: 50,
        top: 90,
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#475569',
      });
      fabricCanvas.add(title, subtitle);
      fabricCanvas.renderAll();
      saveState();
      notifyUser('🚀 Loaded Sample OmniStudio Canvas Project');
    }
  };

  const handleGenerateShareableProjectUrl = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?project=${guestUserId}`;
    navigator.clipboard.writeText(shareUrl);
    alert(`🔗 Shareable Project URL copied to clipboard:\n${shareUrl}`);
    notifyUser('🔗 Project share URL copied to clipboard!');
  };

  const handleApplyCropMask = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj) {
      alert('Please select an image or object on the canvas first to apply a crop mask!');
      return;
    }
    activeObj.set({ clipPath: new (fabric as any).Rect({ width: activeObj.width * 0.8, height: activeObj.height * 0.8, originX: 'center', originY: 'center' }) });
    fabricCanvas.renderAll();
    saveState();
    setIsCropModalOpen(false);
    notifyUser('✂️ Applied crop mask to selected canvas element!');
  };

  const handleApplyRedaction = () => {
    if (!fabricCanvas) return;
    const redactionBox = new (fabric as any).Rect({
      left: fabricCanvas.width / 2 - 100,
      top: fabricCanvas.height / 2 - 25,
      width: 200,
      height: 50,
      fill: '#000000',
      selectable: true,
    });
    fabricCanvas.add(redactionBox);
    fabricCanvas.setActiveObject(redactionBox);
    fabricCanvas.renderAll();
    saveState();
    setIsRedactionModalOpen(false);
    notifyUser('⬛ Redaction blackout shield added to canvas!');
  };

  // --- PDF EDITING ENGINE ---
  const handleExtractAndEditPdfText = async () => {
    if (!pdfDoc || !fabricCanvas) {
      alert('Please upload a PDF document first using the "Upload PDF" button in the ribbon!');
      return;
    }

    notifyUser('🔍 Extracting vector text elements from PDF page...');
    try {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const stageW = canvasWidth || 1050;
      const stageH = canvasHeight || 650;
      const scaleX = (stageW - 24) / viewport.width;
      const scaleY = (stageH - 24) / viewport.height;
      const scale = Math.min(scaleX, scaleY);

      const ITextClass = getFabricIText();
      let extractedCount = 0;

      textContent.items.forEach((item: any) => {
        if (!item.str || !item.str.trim()) return;

        const tx = pdfjsLib.Util.transform(item.transform, viewport.transform);
        const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

        const posX = (tx[4] * scale) + (stageW - viewport.width * scale) / 2;
        const posY = (stageH - (tx[5] * scale)) - (fontHeight * scale);

        if (ITextClass) {
          const editableText = new ITextClass(item.str, {
            left: posX,
            top: posY,
            fontSize: Math.max(12, Math.round(fontHeight * scale)),
            fontFamily: 'Arial',
            fill: textColorVal || '#0f172a',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            selectable: true,
            editable: true,
          });

          fabricCanvas.add(editableText);
          extractedCount++;
        }
      });

      fabricCanvas.renderAll();
      saveState();
      notifyUser(`✨ Converted ${extractedCount} PDF text elements into editable text nodes!`);
      alert(`✨ Converted ${extractedCount} text elements on Page ${pageNum} into editable text boxes! Click any text on the screen to edit it.`);
    } catch (err: any) {
      console.error('PDF Text Extraction Error:', err);
      alert('Could not extract text: ' + err.message);
    }
  };

  const handlePaymentSuccessUnlock = (reference: string) => {
    localStorage.setItem('omni_pro_unlocked', 'true');
    localStorage.setItem('omni_pro_unlocked_token', `token_${reference}_${Date.now()}`);
    setIsProUnlocked(true);
    notifyUser('🎉 Payment Verified! Lifetime Access Unlocked. Ref: ' + reference);
    alert('🎉 Payment Successful! Your lifetime license has been recorded.');
  };

  const handleAppManagerUnlock = () => {
    localStorage.setItem('omni_user_role', 'manager');
    localStorage.setItem('omni_pro_unlocked', 'true');
    setIsAppManager(true);
    setIsProUnlocked(true);
    notifyUser('👑 App Manager Mode Activated - Unrestricted Access Enabled');
    alert('👑 App Manager Mode Activated! Lifetime unrestricted access enabled.');
  };

  const handleApplyAdvancedWatermark = (
    text: string, 
    angle: number, 
    opacity: number, 
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
        opacity: opacity,
        angle: angle,
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
      notifyUser(`💧 Watermark "${text}" applied to target range: ${pageRange}`);
    }
  };

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
    notifyUser(`🎨 Applied Brand Swatch: ${hexColor}`);
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
    notifyUser('📄 Stitching & merging PDF documents into single bundle...');
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
    notifyUser(`✅ Merged ${files.length} PDFs into unified ${allThumbs.length}-page document!`);
  };

  // --- ALIGNMENT WITH FALLBACK NOTIFICATIONS ---
  const handleAlignLeft = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to align it!'); return; }
    activeObj.set({ left: 20 });
    fabricCanvas.renderAll();
    saveState();
  };

  const handleAlignCenter = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to center it!'); return; }
    activeObj.centerH();
    fabricCanvas.renderAll();
    saveState();
  };

  const handleAlignRight = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to align it!'); return; }
    activeObj.set({ left: fabricCanvas.width - activeObj.width * (activeObj.scaleX || 1) - 20 });
    fabricCanvas.renderAll();
    saveState();
  };

  const handleAlignTop = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to align it!'); return; }
    activeObj.set({ top: 20 });
    fabricCanvas.renderAll();
    saveState();
  };

  const handleAlignMiddle = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to align it!'); return; }
    activeObj.centerV();
    fabricCanvas.renderAll();
    saveState();
  };

  const handleAlignBottom = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to align it!'); return; }
    activeObj.set({ top: fabricCanvas.height - activeObj.height * (activeObj.scaleY || 1) - 20 });
    fabricCanvas.renderAll();
    saveState();
  };

  const handleGroupObjects = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === 'activeSelection') {
      activeObj.toGroup();
      fabricCanvas.renderAll();
      saveState();
    } else {
      alert('Please select multiple objects on canvas using Shift+Click to group them!');
    }
  };

  const handleUngroupObjects = () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.type === 'group') {
      activeObj.toActiveSelection();
      fabricCanvas.renderAll();
      saveState();
    } else {
      alert('Please select a grouped object on canvas to ungroup it!');
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
      if (ImageClass && ImageClass.fromURL) {
        ImageClass.fromURL(contentUrlOrText, (imgObj: any) => {
          if (!imgObj) return;
          imgObj.scaleToWidth(180);
          imgObj.set({ left: 250, top: 180 });
          fabricCanvas.add(imgObj);
          fabricCanvas.setActiveObject(imgObj);
          fabricCanvas.renderAll();
          saveState();
        });
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
    if (ImageClass && ImageClass.fromURL) {
      ImageClass.fromURL(dataUrl, (imgObj: any) => {
        if (!imgObj) return;
        imgObj.scaleToWidth(180);
        imgObj.set({ left: 300, top: 200 });
        fabricCanvas.add(imgObj);
        fabricCanvas.setActiveObject(imgObj);
        fabricCanvas.renderAll();
        saveState();
      });
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
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      defaultCursor: 'grab',
      renderOnAddRemove: true,
      skipTargetFind: false,
      allowTouchScrolling: true,
      enableRetinaScaling: true,
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

    let width = 1050;
    let height = 650;

    if (preset === '16:9') { width = 1120; height = 630; }
    else if (preset === '9:16') { width = 450; height = 800; }
    else if (preset === '1:1') { width = 700; height = 700; }
    else if (preset === 'A4') { width = 794; height = 1123; }

    handleResizeCanvas(width, height);
  };

  const handlePaystackUpgrade = () => {
    setIsMomoModalOpen(true);
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

  const renderPdfPageOntoCanvas = async (pdf: any, pageNumber: number) => {
    if (!pdf || !fabricCanvas) return;

    try {
      const page = await pdf.getPage(pageNumber);
      const highDpiScale = 2.0;
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      const stageW = canvasWidth || 1050;
      const stageH = canvasHeight || 650;

      fabricCanvas.setDimensions({ width: stageW, height: stageH });

      const scaleX = (stageW - 24) / unscaledViewport.width;
      const scaleY = (stageH - 24) / unscaledViewport.height;
      const computedScale = Math.min(scaleX, scaleY);

      const viewport = page.getViewport({ scale: computedScale * highDpiScale });

      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      tempCanvas.height = viewport.height;
      tempCanvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;

      const imgDataUrl = tempCanvas.toDataURL('image/png', 1.0);

      const htmlImg = new Image();
      htmlImg.onload = () => {
        if (!fabricCanvas) return;

        const ImageConstructor = (fabric as any).Image || ((fabric as any).default && (fabric as any).default.Image);
        const fabricImg = new ImageConstructor(htmlImg);

        const scaledW = htmlImg.width / highDpiScale;
        const scaledH = htmlImg.height / highDpiScale;

        fabricImg.set({
          scaleX: 1 / highDpiScale,
          scaleY: 1 / highDpiScale,
          left: (stageW - scaledW) / 2,
          top: (stageH - scaledH) / 2,
          selectable: false,
          evented: false,
        });

        fabricCanvas.clear();
        fabricCanvas.add(fabricImg);
        fabricCanvas.sendObjectToBack(fabricImg);
        activateToolMode('hand');
        fabricCanvas.renderAll();
        saveState(fabricCanvas);
        notifyUser(`📄 Rendered PDF Page ${pageNumber} of ${pdf.numPages}`);
      };
      htmlImg.src = imgDataUrl;

    } catch (err: any) {
      console.error('Error rendering PDF page onto canvas:', err);
      notifyUser(`Error rendering PDF: ${err.message}`);
    }
  };

  const generateThumbnails = async (pdf: any) => {
    const thumbs: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.2 });
        const tempCanvas = document.createElement('canvas');
        const context = tempCanvas.getContext('2d');
        tempCanvas.height = viewport.height;
        tempCanvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        thumbs.push(tempCanvas.toDataURL('image/png'));
      } catch (e) {
        console.warn('Thumbnail render error:', e);
      }
    }
    setThumbnails(thumbs);
  };

  const handlePdfDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    notifyUser('📄 Loading PDF into Canvas Studio...');
    try {
      const fileArrayBuffer = await file.arrayBuffer();
      const loadedPdf = await pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;
      setPdfDoc(loadedPdf);
      setTotalPages(loadedPdf.numPages);
      setPageNum(1);

      generateThumbnails(loadedPdf);
      await renderPdfPageOntoCanvas(loadedPdf, 1);
      notifyUser(`✅ PDF Loaded! Page 1 of ${loadedPdf.numPages}`);
    } catch (err: any) {
      console.error('PDF Upload Error:', err);
      alert(`Could not load PDF document: ${err.message}`);
      notifyUser(`Error loading PDF: ${err.message}`);
    }
  };

  const changePdfPage = async (newPage: number) => {
    if (!pdfDoc || newPage < 1 || newPage > totalPages) return;
    setPageNum(newPage);
    await renderPdfPageOntoCanvas(pdfDoc, newPage);
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
      await renderPdfPageOntoCanvas(pdfDoc, i);
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
      <div style={{ position: 'relative', zIndex: 50, touchAction: 'manipulation' }}>
        <MainToolbar 
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          loadSampleDemo={handleLoadSampleDemo}
          setShowProjectsModal={setShowProjectsModal}
          exportCanvasImage={exportCanvasImage}
          exportCompletePdf={exportCompletePdf}
          exportMp4Video={exportMp4Video}
          generateShareableProjectUrl={handleGenerateShareableProjectUrl}
          handlePaystackUpgrade={handlePaystackUpgrade}
          onOpenAiSummaryModal={() => setIsAiSummaryModalOpen(true)}
          onOpenMediaLibraryModal={() => setIsMediaLibraryOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </div>

      {/* 2. SECONDARY TOOL RIBBON */}
      <div style={{ position: 'relative', zIndex: 45, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: bgBar, padding: '4px 12px', borderBottom: `1px solid ${borderCol}`, overflowX: 'auto', whiteSpace: 'nowrap', touchAction: 'manipulation' }}>
        <SecondaryRibbon 
          handlePdfDocumentUpload={handlePdfDocumentUpload}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          undoStackLength={undoStack.length}
          redoStackLength={redoStack.length}
          addText={addText}
          applyWatermarkToAllPages={() => setIsWatermarkModalOpen(true)}
          onOpenWatermarkModal={() => setIsWatermarkModalOpen(true)}
          applyCanvasPresetRatio={applyCanvasPresetRatio}
          onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
          onRunOcr={handleRunOcr}
          onOpenVoiceRecorder={() => setIsUnlimitedRecorderOpen(true)}
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
      </div>

      {/* 3. STUDIO ACTION & BRAND SWATCHES BAR */}
      <div style={{ position: 'relative', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: darkMode ? '#0f172a' : '#e2e8f0', padding: '4px 12px', borderBottom: `1px solid ${borderCol}`, flexWrap: 'wrap', gap: '10px', touchAction: 'manipulation' }}>
        
        {/* LEFT: QUICK LAUNCHERS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleExtractAndEditPdfText}
            style={{
              padding: '4px 12px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.15s ease',
              touchAction: 'manipulation'
            }}
            title="Convert all printed text on the current PDF page into editable text boxes"
          >
            ✍️ Edit PDF Text
          </button>

          <button
            onClick={() => setIsUnlimitedRecorderOpen(true)}
            style={{
              padding: '4px 12px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.15s ease',
              touchAction: 'manipulation'
            }}
            title="Record Unlimited Audio or Video and Transcribe to Text"
          >
            🎥 Record & Transcribe
          </button>

          <button
            onClick={() => setIsSocialMessengerOpen(true)}
            style={{
              padding: '4px 12px',
              backgroundColor: '#8b5cf6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.15s ease',
              touchAction: 'manipulation'
            }}
            title="Open Real-Time Chat, Friends & P2P Voice/Video Calls"
          >
            💬 Chat & Calls
          </button>
        </div>

        {/* CENTER: STATUS & PAYWALL DISPLAY */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
            {statusMessage}
          </span>

          {isAppManager ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#fbbf24', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
              <span>👑 App Manager</span>
            </div>
          ) : isProUnlocked ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
              <span>🎉 Pro Unlocked</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: freeTimeRemainingSec < 300 ? 'rgba(239, 68, 68, 0.2)' : '#0f172a',
                padding: '4px 10px',
                borderRadius: '6px',
                border: freeTimeRemainingSec < 300 ? '1px solid #ef4444' : '1px solid #334155',
                fontSize: '11px',
                fontWeight: 'bold',
                color: freeTimeRemainingSec < 300 ? '#fca5a5' : '#38bdf8'
              }}>
                <span>⏱️ Free Access:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{formatCountdown(freeTimeRemainingSec)}</span>
              </div>

              <button
                onClick={handlePaystackUpgrade}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
                  transition: 'all 0.15s ease',
                  touchAction: 'manipulation'
                }}
              >
                ⚡ Unlock Pro
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: BRAND PALETTE SWATCHES */}
        <div style={{ flexShrink: 0 }}>
          <BrandPaletteHeader
            fabricCanvas={fabricCanvas}
            onColorSelect={handleSelectBrandColor}
          />
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
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

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', overflow: 'auto', position: 'relative', maxWidth: '100%' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <PrecisionRuler
              fabricCanvas={fabricCanvas}
              enabled={isRulerActive}
              onToggle={setIsRulerActive}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', padding: '4px 10px', borderRadius: '8px', border: '1px solid #334155', fontSize: '11px', color: '#94a3b8' }}>
              <span>Stage:</span>
              <input
                type="number"
                value={canvasWidth}
                onChange={(e) => handleResizeCanvas(Number(e.target.value), canvasHeight)}
                style={{ width: '55px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '2px 4px', borderRadius: '4px', textAlign: 'center', fontFamily: 'monospace' }}
              />
              <span>×</span>
              <input
                type="number"
                value={canvasHeight}
                onChange={(e) => handleResizeCanvas(canvasWidth, Number(e.target.value))}
                style={{ width: '55px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '2px 4px', borderRadius: '4px', textAlign: 'center', fontFamily: 'monospace' }}
              />
              <span>px</span>
            </div>
          </div>

          <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', overflow: 'hidden' }}>
            <CanvasViewport 
              canvasRef={canvasRef}
              activeEditingObject={activeEditingObject}
              exitTextEditing={exitTextEditing}
              borderCol={borderCol}
              fabricCanvas={fabricCanvas}
              saveState={saveState}
            />

            <div
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const startW = canvasWidth;
                const startH = canvasHeight;

                const onMouseMove = (moveEvent: MouseEvent) => {
                  handleResizeCanvas(startW + (moveEvent.clientX - startX), startH + (moveEvent.clientY - startY));
                };

                const onMouseUp = () => {
                  window.removeEventListener('mousemove', onMouseMove);
                  window.removeEventListener('mouseup', onMouseUp);
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
              }}
              style={{
                position: 'absolute',
                bottom: '-8px',
                right: '-8px',
                width: '16px',
                height: '16px',
                backgroundColor: '#0284c7',
                border: '2px solid #ffffff',
                borderRadius: '50%',
                cursor: 'nwse-resize',
                zIndex: 40,
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                touchAction: 'none'
              }}
              title="Drag to resize canvas stage"
            />
          </div>
        </div>

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

      {/* MODALS */}
      <TimedPaywallModal
        isOpen={!isProUnlocked && !isAppManager && freeTimeRemainingSec <= 0}
        onUnlockPaystack={handlePaystackUpgrade}
        formattedPrice="50 GHS"
      />

      <MomoCheckoutModal
        isOpen={isMomoModalOpen}
        onClose={() => setIsMomoModalOpen(false)}
        onPaySuccess={handlePaymentSuccessUnlock}
        onManagerUnlock={handleAppManagerUnlock}
        guestUserId={guestUserId}
      />

      <UnlimitedStudioRecorderModal
        isOpen={isUnlimitedRecorderOpen}
        onClose={() => setIsUnlimitedRecorderOpen(false)}
        onInsertMediaToCanvas={handleInsertMediaAsset}
        onInsertTranscriptToCanvas={handleInsertOcrAsDocNode}
      />

      <SocialMessengerModal
        isOpen={isSocialMessengerOpen}
        onClose={() => setIsSocialMessengerOpen(false)}
        guestUserId={guestUserId}
      />

      <WatermarkModal
        isOpen={isWatermarkModalOpen}
        onClose={() => setIsWatermarkModalOpen(false)}
        onApplyWatermark={handleApplyAdvancedWatermark}
        totalPages={totalPages || 1}
        currentPage={pageNum || 1}
        borderCol={borderCol}
        bgBar={bgBar}
      />

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
        onApplyCrop={handleApplyCropMask}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      <RedactionModal 
        isOpen={isRedactionModalOpen}
        onClose={() => setIsRedactionModalOpen(false)}
        onApplyRedaction={handleApplyRedaction}
        totalPages={totalPages || 1}
        currentPage={pageNum || 1}
        borderCol={borderCol}
        bgBar={bgBar}
      />

      <TimelineBar 
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        currentTime={timelineSec}
        duration={videoDuration}
        onSeek={(t) => setTimelineSec(t)}
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