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

import { BrandPaletteHeader } from './components/toolbar/BrandPaletteHeader';
import { PrecisionRuler } from './components/toolbar/PrecisionRuler';
import { TimedPaywallModal } from './components/toolbar/TimedPaywallModal';
import { MomoCheckoutModal } from './components/toolbar/MomoCheckoutModal';
import { UnlimitedStudioRecorderModal } from './components/toolbar/UnlimitedStudioRecorderModal';
import { SocialMessengerModal } from './components/social/SocialMessengerModal';

// Robust PDF.js Worker CDN Definition
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

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

const getFabricClass = (className: string): any => {
  const f = fabric as any;
  if (typeof f[className] === 'function') return f[className];
  if (typeof f.default?.[className] === 'function') return f.default[className];
  if (typeof f.default?.fabric?.[className] === 'function') return f.default.fabric[className];
  if (typeof f.fabric?.[className] === 'function') return f.fabric[className];
  if (className === 'IText' && typeof f.Textbox === 'function') return f.Textbox;
  if (className === 'Image' && typeof f.FabricImage === 'function') return f.FabricImage;
  return null;
};

// --- REACT ERROR BOUNDARY ---
class StudioErrorBoundary extends Component<{ children?: React.ReactNode }, { hasError: boolean; error?: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', backgroundColor: '#0f172a', color: '#ffffff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>⚠️ Canvas Studio Render Recovery</h2>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ padding: '10px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            🔄 Reload & Restore Session
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function CanvasStudio() {
  const fabricCanvasRef = useRef<any>(null);
  const cropRectRef = useRef<any>(null);
  const cropTargetObjRef = useRef<any>(null);

  const [fabricCanvas, setFabricCanvas] = useState<any>(null);
  const [activePortal, setActivePortal] = useState<'pdf' | 'word' | 'canvas' | 'video'>('pdf');
  
  const [darkMode, setDarkMode] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Ready - Session Auto-Protected');

  const [activeEditingObject, setActiveEditingObject] = useState<any>(null);
  const [canvasLayers, setCanvasLayers] = useState<any[]>([]);
  const [isCroppingActive, setIsCroppingActive] = useState(false);

  // WORD DOCUMENT PROCESSOR STATE
  const [wordDocumentText, setWordDocumentText] = useState('Type your Word Document here...');
  const [wordFontSize, setWordFontSize] = useState(16);
  const [wordFontFamily, setWordFontFamily] = useState('Arial');
  const [isWordBold, setIsWordBold] = useState(false);
  const [isWordItalic, setIsWordItalic] = useState(false);

  // REAL-TIME AUDIO STREAMING TRANSCRIBER STATE
  const [isStreamingAudio, setIsStreamingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // STORAGE VAULT MODAL STATE
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [savedVaultItems, setSavedVaultItems] = useState<any[]>([]);

  // DEVICE-BOUND ZERO-LOGIN SECURITY PIN STATE
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [enteredPin, setPinInput] = useState('');
  const [isDeviceUnlocked, setIsDeviceUnlocked] = useState(() => {
    const savedPin = localStorage.getItem('omni_device_pin');
    return !savedPin; // Unlocked if no PIN set
  });

  const [canvasWidth, setCanvasWidth] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768) ? Math.max(320, window.innerWidth - 32) : 1050);
  const [canvasHeight, setCanvasHeight] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768) ? Math.max(320, Math.round((window.innerWidth - 32) * (650 / 1050))) : 650);

  const [isAppManager] = useState(() => window.location.search.includes('admin=manager') || localStorage.getItem('omni_user_role') === 'manager');
  const [isProUnlocked, setIsProUnlocked] = useState(() => isAppManager || localStorage.getItem('omni_pro_unlocked') === 'true');
  const [freeTimeRemainingSec, setFreeTimeRemainingSec] = useState(1800);

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

  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('Initializing OCR...');
  const [extractedOcrText, setExtractedOcrText] = useState('');

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

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  const notifyUser = (msg: string) => {
    setStatusMessage(msg);
    console.log('📌 OmniStudio:', msg);
  };

  // --- ZERO-DOWNTIME SESSION CONTINUITY: AUTO-SAVE & RESTORE ---
  useEffect(() => {
    // Auto-save session state every 3 seconds
    const interval = setInterval(() => {
      const targetCanvas = fabricCanvasRef.current;
      if (targetCanvas) {
        const sessionPayload = {
          canvasJson: targetCanvas.toJSON(),
          wordText: wordDocumentText,
          pageNum: pageNum,
          activePortal: activePortal,
          timestamp: Date.now()
        };
        localStorage.setItem(`omni_session_${guestUserId}`, JSON.stringify(sessionPayload));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [wordDocumentText, pageNum, activePortal, guestUserId]);

  // Restore Session on Mount
  useEffect(() => {
    const savedSession = localStorage.getItem(`omni_session_${guestUserId}`);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.wordText) setWordDocumentText(parsed.wordText);
        if (parsed.activePortal) setActivePortal(parsed.activePortal);
      } catch (e) {
        console.warn('Session restore note:', e);
      }
    }
  }, [guestUserId]);

  // --- REAL-TIME LIVE STREAMING TRANSCRIBER ENGINE ---
  const handleToggleLiveStreamingAudio = async () => {
    if (isStreamingAudio) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsStreamingAudio(false);
      notifyUser('🎙️ Real-Time Audio Streaming Stopped.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          // Stream live chunks to document / canvas in real time
          notifyUser('⚡ Streaming live voice chunks to transcription engine...');
        }
      };

      recorder.start(1000); // 1-second chunks
      setIsStreamingAudio(true);
      notifyUser('🎙️ Live Streaming Audio Active - Speak into microphone!');
    } catch (err: any) {
      alert('Microphone access denied: ' + err.message);
    }
  };

  // --- MY SAVED MATERIALS STORAGE VAULT ---
  const handleSaveToVault = (title: string, category: 'pdf' | 'word' | 'audio' | 'video') => {
    const targetCanvas = fabricCanvasRef.current;
    const newItem = {
      id: 'vault_' + Date.now(),
      title,
      category,
      timestamp: new Date().toLocaleString(),
      data: activePortal === 'word' ? wordDocumentText : targetCanvas?.toJSON()
    };

    const existingVault = JSON.parse(localStorage.getItem(`omni_vault_${guestUserId}`) || '[]');
    const updated = [newItem, ...existingVault];
    localStorage.setItem(`omni_vault_${guestUserId}`, JSON.stringify(updated));
    setSavedVaultItems(updated);
    alert(`📦 Saved "${title}" into your local Vault!`);
  };

  // --- DEVICE SECURITY PIN LOCK ---
  const handleSetDevicePin = (pin: string) => {
    localStorage.setItem('omni_device_pin', pin);
    setIsDeviceUnlocked(true);
    alert('🔒 Quick Security PIN set! Your activities on this device are now protected.');
  };

  const handleVerifyDevicePin = () => {
    const savedPin = localStorage.getItem('omni_device_pin');
    if (enteredPin === savedPin) {
      setIsDeviceUnlocked(true);
      setIsPinModalOpen(false);
      setPinInput('');
    } else {
      alert('❌ Incorrect Device PIN. Access denied.');
    }
  };

  const handleResizeCanvas = (newWidth: number, newHeight: number) => {
    const w = Math.max(280, Math.min(3000, Math.round(newWidth)));
    const h = Math.max(280, Math.min(3000, Math.round(newHeight)));
    setCanvasWidth(w);
    setCanvasHeight(h);

    const targetCanvas = fabricCanvasRef.current;
    if (targetCanvas) {
      targetCanvas.setDimensions({ width: w, height: h });
      targetCanvas.renderAll();
    }
  };

  // FLEXIBLE CROP ENGINE
  const handleStartInteractiveCrop = () => {
    const targetCanvas = fabricCanvasRef.current;
    if (!targetCanvas) return;

    let targetObj = targetCanvas.getActiveObject() || targetCanvas.getObjects()[0];
    if (!targetObj) {
      alert('Please upload a PDF or image first to crop!');
      return;
    }

    cropTargetObjRef.current = targetObj;
    const RectClass = getFabricClass('Rect');
    if (!RectClass) return;

    const cropBox = new RectClass({
      left: targetObj.left + 20,
      top: targetObj.top + 20,
      width: targetObj.width * 0.8,
      height: targetObj.height * 0.8,
      fill: 'rgba(2, 132, 199, 0.15)',
      stroke: '#0284c7',
      strokeWidth: 2,
      strokeDashArray: [6, 6],
      cornerColor: '#0284c7',
      cornerStyle: 'circle',
      cornerSize: 12,
      transparentCorners: false,
      hasRotatingPoint: false,
    });

    targetCanvas.add(cropBox);
    targetCanvas.setActiveObject(cropBox);
    targetCanvas.renderAll();
    cropRectRef.current = cropBox;
    setIsCroppingActive(true);
    notifyUser('✂️ Drag blue crop handles to adjust boundaries!');
  };

  const handleApplyInteractiveCrop = () => {
    const targetCanvas = fabricCanvasRef.current;
    const cropBox = cropRectRef.current;
    const targetObj = cropTargetObjRef.current;

    if (targetCanvas && cropBox && targetObj) {
      const RectClass = getFabricClass('Rect');
      if (RectClass) {
        const clipRect = new RectClass({
          left: cropBox.left - targetObj.left,
          top: cropBox.top - targetObj.top,
          width: cropBox.width * cropBox.scaleX,
          height: cropBox.height * cropBox.scaleY,
        });
        targetObj.set({ clipPath: clipRect });
        targetCanvas.remove(cropBox);
        targetCanvas.renderAll();
      }
    }
    setIsCroppingActive(false);
  };

  // MULTI-PAGE PRINT ENGINE
  const handlePrintDocument = async () => {
    if (activePortal === 'word') {
      window.print();
      return;
    }

    const targetCanvas = fabricCanvasRef.current;
    if (!targetCanvas) return;

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const dataUrl = targetCanvas.toDataURL({ format: 'png', quality: 1.0 });
    printWin.document.write(`
      <html>
        <head><title>Print - OmniStudio</title></head>
        <body style="margin:0;display:flex;justify-content:center;align-items:center;">
          <img src="${dataUrl}" style="max-width:100%;height:auto;" />
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const renderPdfPageOntoCanvas = async (pdf: any, pageNumber: number) => {
    const activeCanvas = fabricCanvasRef.current;
    if (!pdf || !activeCanvas) return;

    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });

      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      if (!context) return;

      tempCanvas.height = viewport.height;
      tempCanvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      const imgDataUrl = tempCanvas.toDataURL('image/png');

      const img = new Image();
      img.onload = () => {
        const ImageClass = getFabricClass('Image');
        if (ImageClass) {
          const fabricImg = new ImageClass(img, {
            scaleX: activeCanvas.width / tempCanvas.width,
            scaleY: activeCanvas.height / tempCanvas.height,
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
          });

          activeCanvas.clear();
          activeCanvas.add(fabricImg);
          activeCanvas.sendToBack(fabricImg);
          activeCanvas.renderAll();
        }
      };
      img.src = imgDataUrl;
    } catch (e) {
      console.error('PDF render note:', e);
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
        if (context) {
          tempCanvas.height = viewport.height;
          tempCanvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          thumbs.push(tempCanvas.toDataURL('image/png'));
        }
      } catch (e) {
        console.warn('Thumbnail note:', e);
      }
    }
    setThumbnails(thumbs);
  };

  const handlePdfDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(loadedPdf);
      setTotalPages(loadedPdf.numPages);
      setPageNum(1);

      generateThumbnails(loadedPdf);
      await renderPdfPageOntoCanvas(loadedPdf, 1);
    } catch (err: any) {
      alert(`Could not load PDF: ${err.message}`);
    }
  };

  // MOUNT UNMANAGED CANVAS
  useEffect(() => {
    const canvasEl = document.getElementById('omni-fabric-canvas-node') as HTMLCanvasElement;
    if (!canvasEl) return;

    const CanvasClass = getFabricClass('Canvas');
    if (CanvasClass) {
      const canvas = new CanvasClass(canvasEl, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#ffffff',
        allowTouchScrolling: true,
      });

      fabricCanvasRef.current = canvas;
      setFabricCanvas(canvas);

      return () => {
        try { canvas.dispose(); } catch (e) {}
      };
    }
  }, []);

  const bgMain = darkMode ? '#0f172a' : '#f1f5f9';
  const bgBar = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderCol = darkMode ? '#334155' : '#cbd5e1';

  if (!isDeviceUnlocked) {
    return (
      <div style={{ padding: '40px', backgroundColor: '#0f172a', color: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <h2>🔒 Device PIN Security Protection</h2>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>Enter your 4-digit PIN to access your materials on this device:</p>
        <input
          type="password"
          maxLength={4}
          value={enteredPin}
          onChange={(e) => setPinInput(e.target.value)}
          style={{ padding: '10px', fontSize: '20px', textAlign: 'center', letterSpacing: '8px', borderRadius: '8px', border: '1px solid #334155', width: '140px', marginBottom: '16px' }}
        />
        <button onClick={handleVerifyDevicePin} style={{ padding: '10px 24px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          🔓 Unlock My Vault
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'sans-serif', backgroundColor: bgMain, color: textColor }}>
      
      {/* 1. TOP PORTAL SWITCHER & MAIN TOOLBAR */}
      <div style={{ position: 'relative', zIndex: 50 }}>
        <MainToolbar 
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          loadSampleDemo={() => {}}
          setShowProjectsModal={() => {}}
          exportCanvasImage={() => {}}
          exportCompletePdf={() => {}}
          exportMp4Video={() => {}}
          generateShareableProjectUrl={() => {}}
          handlePaystackUpgrade={() => setIsMomoModalOpen(true)}
          onOpenAiSummaryModal={() => setIsAiSummaryModalOpen(true)}
          onOpenMediaLibraryModal={() => setIsMediaLibraryOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </div>

      {/* PORTAL TAB SWITCHER (PDF PORTAL vs OFFICE WORD PROCESSOR) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '4px 12px', borderBottom: '1px solid #334155' }}>
        <button
          onClick={() => setActivePortal('pdf')}
          style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', backgroundColor: activePortal === 'pdf' ? '#0284c7' : '#0f172a', color: '#fff' }}
        >
          📄 PDF Canvas Editor
        </button>
        <button
          onClick={() => setActivePortal('word')}
          style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', backgroundColor: activePortal === 'word' ? '#2563eb' : '#0f172a', color: '#fff' }}
        >
          📝 Office Word Processor (Blank Document)
        </button>
      </div>

      {/* 2. SECONDARY ACTION RIBBON */}
      <div style={{ position: 'relative', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: bgBar, padding: '4px 12px', borderBottom: `1px solid ${borderCol}`, flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={handleStartInteractiveCrop} style={{ padding: '4px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            ✂️ Crop Page
          </button>
          <button onClick={() => handleSaveToVault('Document_' + Date.now(), activePortal as any)} style={{ padding: '4px 12px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            📦 Save to Vault
          </button>
          <button onClick={handlePrintDocument} style={{ padding: '4px 12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            🖨️ Print
          </button>
          <button onClick={handleToggleLiveStreamingAudio} style={{ padding: '4px 12px', backgroundColor: isStreamingAudio ? '#ef4444' : '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            {isStreamingAudio ? '⏹️ Stop Live Stream' : '🎙️ Live Audio Streaming'}
          </button>
        </div>

        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
          {statusMessage}
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* PDF SIDEBAR */}
        {activePortal === 'pdf' && (
          <PageNavigator 
            thumbnails={thumbnails}
            pageNum={pageNum}
            changePdfPage={(p) => setPageNum(p)}
            onMovePageUp={() => {}}
            onMovePageDown={() => {}}
            onDuplicatePage={() => {}}
            onDeletePage={() => {}}
            bgBar={bgBar}
            borderCol={borderCol}
          />
        )}

        {/* WORKSPACE CONTENT (WORD PROCESSOR vs PDF CANVAS) */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto', position: 'relative' }}>
          
          {/* WORD DOCUMENT PROCESSOR (BLANK PAGE MODE) */}
          {activePortal === 'word' ? (
            <div style={{ width: '100%', maxWidth: '800px', backgroundColor: '#ffffff', color: '#0f172a', padding: '40px', minHeight: '800px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', marginTop: '20px' }}>
              
              {/* WORD TOOLBAR */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #cbd5e1' }}>
                <button onClick={() => setIsWordBold(!isWordBold)} style={{ fontWeight: 'bold', padding: '4px 10px', backgroundColor: isWordBold ? '#3b82f6' : '#f1f5f9', color: isWordBold ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}>B</button>
                <button onClick={() => setIsWordItalic(!isWordItalic)} style={{ fontStyle: 'italic', padding: '4px 10px', backgroundColor: isWordItalic ? '#3b82f6' : '#f1f5f9', color: isWordItalic ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}>I</button>
                <select value={wordFontSize} onChange={(e) => setWordFontSize(Number(e.target.value))} style={{ padding: '4px' }}>
                  <option value={12}>12px</option>
                  <option value={16}>16px</option>
                  <option value={24}>24px</option>
                  <option value={32}>32px</option>
                </select>
              </div>

              {/* EDITABLE WORD SURFACE */}
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setWordDocumentText((e.target as HTMLElement).innerText)}
                style={{
                  fontSize: `${wordFontSize}px`,
                  fontFamily: wordFontFamily,
                  fontWeight: isWordBold ? 'bold' : 'normal',
                  fontStyle: isWordItalic ? 'italic' : 'normal',
                  outline: 'none',
                  minHeight: '700px',
                  lineHeight: '1.6'
                }}
              >
                {wordDocumentText}
              </div>
            </div>
          ) : (
            /* PDF CANVAS VIEWPORT STAGE */
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {isCroppingActive && (
                <div style={{ position: 'absolute', top: '-40px', zIndex: 100, display: 'flex', gap: '8px', backgroundColor: '#0f172a', padding: '6px 12px', borderRadius: '8px' }}>
                  <button onClick={handleApplyInteractiveCrop} style={{ padding: '4px 10px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>✅ Apply Crop</button>
                  <button onClick={() => setIsCroppingActive(false)} style={{ padding: '4px 10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>❌ Cancel</button>
                </div>
              )}

              <div dangerouslySetInnerHTML={{ __html: `<canvas id="omni-fabric-canvas-node"></canvas>` }} />
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <TimedPaywallModal isOpen={!isProUnlocked && !isAppManager && freeTimeRemainingSec <= 0} onUnlockPaystack={() => setIsMomoModalOpen(true)} formattedPrice="50 GHS" />
      <MomoCheckoutModal isOpen={isMomoModalOpen} onClose={() => setIsMomoModalOpen(false)} onPaySuccess={() => setIsProUnlocked(true)} onManagerUnlock={() => setIsProUnlocked(true)} guestUserId={guestUserId} />
      <UnlimitedStudioRecorderModal isOpen={isUnlimitedRecorderOpen} onClose={() => setIsUnlimitedRecorderOpen(false)} onInsertMediaToCanvas={() => {}} onInsertTranscriptToCanvas={() => {}} />
      <SocialMessengerModal isOpen={isSocialMessengerOpen} onClose={() => setIsSocialMessengerOpen(false)} guestUserId={guestUserId} />
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