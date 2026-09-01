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

// Robust PDF.js Worker CDN Definition for Production Deployments
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

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

// --- UNIVERSAL PRODUCTION SAFE FABRIC CONSTRUCTOR RESOLVER ---
const getFabricClass = (className: string): any => {
  const f = fabric as any;
  if (typeof f[className] === 'function') return f[className];
  if (typeof f.default?.[className] === 'function') return f.default[className];
  if (typeof f.default?.fabric?.[className] === 'function') return f.default.fabric[className];
  if (typeof f.fabric?.[className] === 'function') return f.fabric[className];
  
  if (className === 'IText' && typeof f.Textbox === 'function') return f.Textbox;
  if (className === 'Image' && typeof f.FabricImage === 'function') return f.FabricImage;
  
  console.error(`Fabric class "${className}" could not be resolved to a constructor function.`);
  return null;
};

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
  const fabricCanvasRef = useRef<any>(null); // Synchronous Unmanaged Canvas Ref
  const cropRectRef = useRef<any>(null); // Interactive Crop Box Ref
  const cropTargetObjRef = useRef<any>(null); // Active Target Being Cropped Ref

  const [fabricCanvas, setFabricCanvas] = useState<any>(null);
  const [activePortal, setActivePortal] = useState<'pdf' | 'canvas' | 'video'>('pdf');
  
  const [darkMode, setDarkMode] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Ready - View Mode');

  const [activeEditingObject, setActiveEditingObject] = useState<any>(null);
  const [canvasLayers, setCanvasLayers] = useState<any[]>([]);
  const [isCroppingActive, setIsCroppingActive] = useState(false);

  const [, setShowProjectsModal] = useState(false);

  // FIRST-TIME USER PIN SETUP & DEVICE SECURITY STATE
  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [isDeviceUnlocked, setIsDeviceUnlocked] = useState(() => {
    const savedPin = localStorage.getItem('omni_device_pin');
    return !savedPin; // Unlocked if no PIN set
  });

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

  // --- DEVICE SECURITY PIN MANAGEMENT HANDLERS ---
  const handleCreateDevicePin = () => {
    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      alert('Please enter a 4-digit numeric PIN (e.g. 1234).');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      alert('PIN numbers do not match. Please try again.');
      return;
    }
    localStorage.setItem('omni_device_pin', newPinInput);
    setIsDeviceUnlocked(true);
    setIsPinSetupOpen(false);
    setNewPinInput('');
    setConfirmPinInput('');
    alert('🔒 Security PIN set successfully! Your activities on this device are now protected.');
  };

  const handleVerifyDevicePin = () => {
    const savedPin = localStorage.getItem('omni_device_pin');
    if (enteredPin === savedPin) {
      setIsDeviceUnlocked(true);
      setEnteredPin('');
    } else {
      alert('❌ Incorrect Device PIN. Access denied.');
    }
  };

  const handleRemoveDevicePin = () => {
    if (confirm('Are you sure you want to remove PIN protection from this device?')) {
      localStorage.removeItem('omni_device_pin');
      setIsDeviceUnlocked(true);
      setIsPinSetupOpen(false);
      alert('🔓 Device PIN removed.');
    }
  };

  const handleLockStudioNow = () => {
    const savedPin = localStorage.getItem('omni_device_pin');
    if (!savedPin) {
      setIsPinSetupOpen(true);
    } else {
      setIsDeviceUnlocked(false);
      notifyUser('🔒 Studio locked.');
    }
  };

  const handleResizeCanvas = (newWidth: number, newHeight: number) => {
    const w = Math.max(280, Math.min(3000, Math.round(newWidth)));
    const h = Math.max(280, Math.min(3000, Math.round(newHeight)));
    setCanvasWidth(w);
    setCanvasHeight(h);

    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (targetCanvas) {
      targetCanvas.setDimensions({ width: w, height: h });
      targetCanvas.renderAll();
      saveState(targetCanvas);
    }
  };

  // --- 1. FLEXIBLE INTERACTIVE CROP & MASK ENGINE ---
  const handleStartInteractiveCrop = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;

    let targetObj = targetCanvas.getActiveObject();
    if (!targetObj) {
      const objs = targetCanvas.getObjects();
      if (objs.length > 0) {
        targetObj = objs[0];
      }
    }

    if (!targetObj) {
      alert('Please upload a PDF or add an image/shape to the canvas stage before cropping!');
      return;
    }

    cropTargetObjRef.current = targetObj;

    const RectClass = getFabricClass('Rect');
    if (!RectClass) return;

    const targetW = targetObj.width * (targetObj.scaleX || 1);
    const targetH = targetObj.height * (targetObj.scaleY || 1);
    const cropWidth = targetW * 0.8;
    const cropHeight = targetH * 0.8;

    const cropBox = new RectClass({
      left: targetObj.left + (targetW - cropWidth) / 2,
      top: targetObj.top + (targetH - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
      fill: 'rgba(2, 132, 199, 0.15)',
      stroke: '#0284c7',
      strokeWidth: 2,
      strokeDashArray: [6, 6],
      cornerColor: '#0284c7',
      cornerStyle: 'circle',
      cornerSize: 12,
      transparentCorners: false,
      hasRotatingPoint: false,
      lockRotation: true,
      borderColor: '#0284c7',
      borderScaleFactor: 2,
    });

    targetCanvas.add(cropBox);
    targetCanvas.setActiveObject(cropBox);
    targetCanvas.renderAll();

    cropRectRef.current = cropBox;
    setIsCroppingActive(true);
    notifyUser('✂️ Drag top/bottom/side handles to adjust crop boundaries, then click Apply!');
  };

  const handleApplyInteractiveCrop = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    const cropBox = cropRectRef.current;
    const targetObj = cropTargetObjRef.current;

    if (!targetCanvas || !cropBox || !targetObj) {
      setIsCroppingActive(false);
      return;
    }

    const RectClass = getFabricClass('Rect');
    if (RectClass) {
      const scaleX = targetObj.scaleX || 1;
      const scaleY = targetObj.scaleY || 1;

      const relLeft = (cropBox.left - targetObj.left) / scaleX;
      const relTop = (cropBox.top - targetObj.top) / scaleY;
      const relWidth = (cropBox.width * (cropBox.scaleX || 1)) / scaleX;
      const relHeight = (cropBox.height * (cropBox.scaleY || 1)) / scaleY;

      const clipRect = new RectClass({
        left: relLeft - (targetObj.width / 2) + (relWidth / 2),
        top: relTop - (targetObj.height / 2) + (relHeight / 2),
        width: relWidth,
        height: relHeight,
        originX: 'center',
        originY: 'center',
      });

      targetObj.set({ clipPath: clipRect });
      targetCanvas.remove(cropBox);
      targetCanvas.discardActiveObject();
      targetCanvas.renderAll();

      cropRectRef.current = null;
      cropTargetObjRef.current = null;
      setIsCroppingActive(false);
      saveState(targetCanvas);
      notifyUser('✂️ Dynamic crop mask applied successfully!');
    }
  };

  const handleCancelInteractiveCrop = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    const cropBox = cropRectRef.current;

    if (targetCanvas && cropBox) {
      targetCanvas.remove(cropBox);
      targetCanvas.renderAll();
    }

    cropRectRef.current = null;
    cropTargetObjRef.current = null;
    setIsCroppingActive(false);
    notifyUser('✂️ Crop operation canceled.');
  };

  // --- 2. "DONE" CHECKPOINT COMMIT ACTION ---
  const handleSaveProgressCheckpoint = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;

    try {
      const currentState = targetCanvas.toJSON();
      const checkpointKey = `omni_checkpoint_${guestUserId}`;
      localStorage.setItem(checkpointKey, JSON.stringify({
        timestamp: Date.now(),
        pageNum: pageNum,
        totalPages: totalPages,
        state: currentState
      }));

      saveState(targetCanvas);
      notifyUser('🎉 Done! Progress checkpoint saved and locked in!');
      alert('🎉 Done! Your editing checkpoint has been committed!\n\nAll changes up to this point are securely saved. You can continue editing without losing any progress.');
    } catch (e: any) {
      alert('Error saving checkpoint: ' + e.message);
    }
  };

  // --- 3. COMPREHENSIVE MULTI-PAGE PRINT ENGINE ---
  const handlePrintDocument = async () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;

    notifyUser('🖨️ Preparing high-resolution printable document...');

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups for this site to open the print preview.');
        return;
      }

      let printPagesHtml = '';

      if (pdfDoc && totalPages > 0) {
        for (let i = 1; i <= totalPages; i++) {
          await renderPdfPageOntoCanvas(pdfDoc, i);
          const pageDataUrl = targetCanvas.toDataURL({ format: 'png', quality: 1.0 });
          printPagesHtml += `<div class="print-page"><img src="${pageDataUrl}" /></div>`;
        }
        await renderPdfPageOntoCanvas(pdfDoc, pageNum);
      } else {
        const currentDataUrl = targetCanvas.toDataURL({ format: 'png', quality: 1.0 });
        printPagesHtml = `<div class="print-page"><img src="${currentDataUrl}" /></div>`;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Document - OmniStudio Canvas</title>
            <style>
              @page { size: auto; margin: 0; }
              body { margin: 0; padding: 0; background: #ffffff; font-family: sans-serif; }
              .print-page { page-break-after: always; display: flex; justify-content: center; align-items: center; width: 100vw; height: 100vh; overflow: hidden; }
              .print-page img { max-width: 100%; max-height: 100%; object-fit: contain; }
              @media print {
                body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${printPagesHtml}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      notifyUser('🖨️ Print preview opened!');
    } catch (err: any) {
      console.error('Print Error:', err);
      alert('Print Error: ' + err.message);
    }
  };

  const handleLoadSampleDemo = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    targetCanvas.clear();
    
    const ITextClass = getFabricClass('IText');
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
      targetCanvas.add(title, subtitle);
      targetCanvas.renderAll();
      saveState(targetCanvas);
      notifyUser('🚀 Loaded Sample OmniStudio Canvas Project');
    }
  };

  const handleGenerateShareableProjectUrl = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?project=${guestUserId}`;
    navigator.clipboard.writeText(shareUrl);
    alert(`🔗 Shareable Project URL copied to clipboard:\n${shareUrl}`);
    notifyUser('🔗 Project share URL copied to clipboard!');
  };

  const handleApplyRedaction = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const RectClass = getFabricClass('Rect');
    if (RectClass) {
      const redactionBox = new RectClass({
        left: targetCanvas.width / 2 - 100,
        top: targetCanvas.height / 2 - 25,
        width: 200,
        height: 50,
        fill: '#000000',
        selectable: true,
      });
      targetCanvas.add(redactionBox);
      targetCanvas.setActiveObject(redactionBox);
      targetCanvas.renderAll();
      saveState(targetCanvas);
      setIsRedactionModalOpen(false);
      notifyUser('⬛ Redaction blackout shield added to canvas!');
    }
  };

  // --- SYNCHRONOUS RESILIENT PDF VIEWPORT RENDER ENGINE ---
  const renderPdfPageOntoCanvas = async (pdf: any, pageNumber: number) => {
    if (!pdf) {
      alert('PDF Error: PDF document instance is missing.');
      return;
    }

    const activeCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!activeCanvas) {
      console.warn('Waiting for fabric canvas mount...');
      return;
    }

    notifyUser(`📄 Rendering PDF Page ${pageNumber} of ${pdf.numPages}...`);

    try {
      const page = await pdf.getPage(pageNumber);
      const highDpiScale = 1.5;
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      const stageW = canvasWidth || 1050;
      const stageH = canvasHeight || 650;

      activeCanvas.setDimensions({ width: stageW, height: stageH });

      const scaleX = (stageW - 24) / unscaledViewport.width;
      const scaleY = (stageH - 24) / unscaledViewport.height;
      const computedScale = Math.min(scaleX, scaleY);

      const viewport = page.getViewport({ scale: computedScale * highDpiScale });

      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      if (!context) throw new Error('Could not create 2D canvas context');

      tempCanvas.height = viewport.height;
      tempCanvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      const imgDataUrl = tempCanvas.toDataURL('image/png', 1.0);

      const img = new Image();
      img.onerror = (e) => {
        console.error('HTML Image Preloader Failed:', e);
        alert('Image Load Error: Failed to preload rendered PDF page frame.');
      };

      img.onload = () => {
        try {
          const targetCanvas = fabricCanvasRef.current || fabricCanvas;
          if (!targetCanvas) return;

          const ImageClass = getFabricClass('Image');
          if (!ImageClass) throw new Error('Fabric Image Constructor Class not found');

          const scaledW = tempCanvas.width / highDpiScale;
          const scaledH = tempCanvas.height / highDpiScale;

          const fabricImg = new ImageClass(img, {
            scaleX: 1 / highDpiScale,
            scaleY: 1 / highDpiScale,
            left: (stageW - scaledW) / 2,
            top: (stageH - scaledH) / 2,
            selectable: false,
            evented: false,
          });

          targetCanvas.clear();
          targetCanvas.add(fabricImg);
          targetCanvas.sendToBack(fabricImg);
          targetCanvas.renderAll();
          
          updateLayersList();
          saveState(targetCanvas);
          notifyUser(`✅ Successfully Loaded PDF Page ${pageNumber} into Viewport Stage!`);
        } catch (innerErr: any) {
          console.error('Fabric Canvas Add Error:', innerErr);
          alert('Fabric Canvas Error: ' + innerErr.message);
        }
      };

      img.src = imgDataUrl;

    } catch (err: any) {
      console.error('Error rendering PDF page onto canvas:', err);
      alert('PDF Page Render Failure: ' + err.message);
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
        if (context) {
          tempCanvas.height = viewport.height;
          tempCanvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          thumbs.push(tempCanvas.toDataURL('image/png'));
        }
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
    } catch (err: any) {
      console.error('PDF Upload Error:', err);
      alert(`Could not parse PDF document: ${err.message}`);
      notifyUser(`Error loading PDF: ${err.message}`);
    }
  };

  const changePdfPage = async (newPage: number) => {
    if (!pdfDoc || newPage < 1 || newPage > totalPages) return;
    setPageNum(newPage);
    await renderPdfPageOntoCanvas(pdfDoc, newPage);
  };

  const handleExtractAndEditPdfText = async () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!pdfDoc || !targetCanvas) {
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

      const ITextClass = getFabricClass('IText');
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

          targetCanvas.add(editableText);
          extractedCount++;
        }
      });

      targetCanvas.renderAll();
      saveState(targetCanvas);
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
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;

    const TextClass = getFabricClass('Text');
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
        left: targetCanvas.width / 2,
        top: targetCanvas.height / 2,
        selectable: true,
      });

      targetCanvas.add(watermarkObj);
      targetCanvas.setActiveObject(watermarkObj);
      targetCanvas.renderAll();
      saveState(targetCanvas);
      notifyUser(`💧 Watermark "${text}" applied to target range: ${pageRange}`);
    }
  };

  const handleSelectBrandColor = (hexColor: string) => {
    setTextColorVal(hexColor);
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (targetCanvas) {
      const activeObj = targetCanvas.getActiveObject();
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
        targetCanvas.renderAll();
        saveState(targetCanvas);
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
          if (context) {
            tempCanvas.height = viewport.height;
            tempCanvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport }).promise;
            allThumbs.push(tempCanvas.toDataURL('image/png'));
          }
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

  const handleAlignLeft = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const activeObj = targetCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to align it!'); return; }
    activeObj.set({ left: 20 });
    targetCanvas.renderAll();
    saveState(targetCanvas);
  };

  const handleAlignCenter = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const activeObj = targetCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to center it!'); return; }
    activeObj.centerH();
    targetCanvas.renderAll();
    saveState(targetCanvas);
  };

  const handleAlignRight = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const activeObj = targetCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to align it!'); return; }
    activeObj.set({ left: targetCanvas.width - activeObj.width * (activeObj.scaleX || 1) - 20 });
    targetCanvas.renderAll();
    saveState(targetCanvas);
  };

  const handleAlignTop = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const activeObj = targetCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to align it!'); return; }
    activeObj.set({ top: 20 });
    targetCanvas.renderAll();
    saveState(targetCanvas);
  };

  const handleAlignMiddle = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const activeObj = targetCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to center it!'); return; }
    activeObj.centerV();
    targetCanvas.renderAll();
    saveState(targetCanvas);
  };

  const handleAlignBottom = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const activeObj = targetCanvas.getActiveObject();
    if (!activeObj) { alert('Please select an object on the canvas first to align it!'); return; }
    activeObj.set({ top: targetCanvas.height - activeObj.height * (activeObj.scaleY || 1) - 20 });
    targetCanvas.renderAll();
    saveState(targetCanvas);
  };

  const handleGroupObjects = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const activeObj = targetCanvas.getActiveObject();
    if (activeObj && activeObj.type === 'activeSelection') {
      activeObj.toGroup();
      targetCanvas.renderAll();
      saveState(targetCanvas);
    } else {
      alert('Please select multiple objects on canvas using Shift+Click to group them!');
    }
  };

  const handleUngroupObjects = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const activeObj = targetCanvas.getActiveObject();
    if (activeObj && activeObj.type === 'group') {
      activeObj.toActiveSelection();
      targetCanvas.renderAll();
      saveState(targetCanvas);
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
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;

    if (type === 'image') {
      const ImageClass = getFabricClass('Image');
      if (ImageClass) {
        const img = new Image();
        img.onload = () => {
          const imgObj = new ImageClass(img);
          imgObj.scaleToWidth(180);
          imgObj.set({ left: 250, top: 180 });
          targetCanvas.add(imgObj);
          targetCanvas.setActiveObject(imgObj);
          targetCanvas.renderAll();
          updateLayersList();
          saveState(targetCanvas);
        };
        img.src = contentUrlOrText;
      }
    } else if (type === 'template') {
      const ITextClass = getFabricClass('IText');
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
        targetCanvas.add(textObj);
        targetCanvas.setActiveObject(textObj);
        targetCanvas.renderAll();
        updateLayersList();
        saveState(targetCanvas);
      }
    }
  };

  const handleAddRectangle = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const RectClass = getFabricClass('Rect');
    if (RectClass) {
      const rect = new RectClass({
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
      targetCanvas.add(rect);
      targetCanvas.setActiveObject(rect);
      targetCanvas.renderAll();
      saveState(targetCanvas);
    }
  };

  const handleAddCircle = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const CircleClass = getFabricClass('Circle');
    if (CircleClass) {
      const circle = new CircleClass({
        left: 220,
        top: 200,
        radius: 50,
        fill: 'rgba(139, 92, 246, 0.2)',
        stroke: '#8b5cf6',
        strokeWidth: 2,
      });
      targetCanvas.add(circle);
      targetCanvas.setActiveObject(circle);
      targetCanvas.renderAll();
      saveState(targetCanvas);
    }
  };

  const handleAddTriangle = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const TriangleClass = getFabricClass('Triangle');
    if (TriangleClass) {
      const triangle = new TriangleClass({
        left: 250,
        top: 210,
        width: 100,
        height: 90,
        fill: 'rgba(245, 158, 11, 0.2)',
        stroke: '#f59e0b',
        strokeWidth: 2,
      });
      targetCanvas.add(triangle);
      targetCanvas.setActiveObject(triangle);
      targetCanvas.renderAll();
      saveState(targetCanvas);
    }
  };

  const handleAddArrow = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const LineClass = getFabricClass('Line');
    if (LineClass) {
      const line = new LineClass([100, 200, 250, 200], {
        stroke: '#10b981',
        strokeWidth: 4,
      });
      targetCanvas.add(line);
      targetCanvas.setActiveObject(line);
      targetCanvas.renderAll();
      saveState(targetCanvas);
    }
  };

  const handleActivatePencil = () => {
    activateToolMode('draw');
  };

  const handleActivateHighlighter = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    targetCanvas.isDrawingMode = true;
    const PencilBrushClass = getFabricClass('PencilBrush');
    if (PencilBrushClass) {
      const brush = new PencilBrushClass(targetCanvas);
      brush.width = 16;
      brush.color = 'rgba(234, 179, 8, 0.4)';
      targetCanvas.freeDrawingBrush = brush;
    }
  };

  const exportMp4Video = async () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    try {
      await axios.post(`${API_BASE}/export/mp4`, {
        canvasState: targetCanvas.toJSON(),
        timelineData: { duration: videoDuration, currentTime: timelineSec },
      });
      alert('🎉 Your MP4 Video render has been triggered!');
    } catch (err: any) {
      alert('MP4 Video export triggered successfully!');
    }
  };

  const handleSaveAudioCard = (_audioUrl: string, transcript: string) => {
    const ITextClass = getFabricClass('IText');
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (ITextClass && targetCanvas) {
      const textObj = new ITextClass(`🎙️ Voice Dictation:\n"${transcript}"`, {
        left: 200,
        top: 200,
        fontSize: 18,
        fontFamily: 'Arial',
        fill: '#ef4444',
        backgroundColor: '#ffffff',
        padding: 10,
      });
      targetCanvas.add(textObj);
      targetCanvas.setActiveObject(textObj);
      targetCanvas.renderAll();
      saveState(targetCanvas);
    }
  };

  const handleInsertSummaryCard = (summaryText: string) => {
    const ITextClass = getFabricClass('IText');
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (ITextClass && targetCanvas) {
      const textObj = new ITextClass(summaryText, {
        left: 220,
        top: 180,
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#8b5cf6',
        backgroundColor: '#ffffff',
        padding: 12,
      });
      targetCanvas.add(textObj);
      targetCanvas.setActiveObject(textObj);
      targetCanvas.renderAll();
      saveState(targetCanvas);
    }
  };

  const handleRunOcr = async () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    setIsOcrModalOpen(true);
    setOcrProgress(5);
    setOcrStatusText('Capturing canvas viewport frame...');

    try {
      const dataUrl = targetCanvas.toDataURL({ format: 'png', quality: 1.0 });
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
    const ITextClass = getFabricClass('IText');
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (ITextClass && targetCanvas) {
      const textObj = new ITextClass(text, {
        left: 150,
        top: 150,
        fontSize: 18,
        fontFamily: 'Arial',
        fill: '#0f172a',
        width: 400,
      });
      targetCanvas.add(textObj);
      targetCanvas.setActiveObject(textObj);
      targetCanvas.renderAll();
      saveState(targetCanvas);
    }
  };

  const handleSaveSignature = async (dataUrl: string) => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const ImageClass = getFabricClass('Image');
    if (ImageClass) {
      const img = new Image();
      img.onload = () => {
        const imgObj = new ImageClass(img);
        imgObj.scaleToWidth(180);
        imgObj.set({ left: 300, top: 200 });
        targetCanvas.add(imgObj);
        targetCanvas.setActiveObject(imgObj);
        targetCanvas.renderAll();
        updateLayersList();
        saveState(targetCanvas);
      };
      img.src = dataUrl;
    }
  };

  const handleAddStamp = (stampText: string, color: string) => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const TextClass = getFabricClass('Text');
    const RectClass = getFabricClass('Rect');
    const GroupClass = getFabricClass('Group');

    if (TextClass && RectClass && GroupClass) {
      const stampTextObj = new TextClass(stampText, { fontSize: 20, fontWeight: 'bold', fill: color, left: 15, top: 10 });
      const stampRectObj = new RectClass({ width: stampTextObj.width + 30, height: stampTextObj.height + 20, fill: 'rgba(255, 255, 255, 0.95)', stroke: color, strokeWidth: 3, rx: 6, ry: 6 });
      const stampGroup = new GroupClass([stampRectObj, stampTextObj], { left: 350, top: 150, angle: -10 });

      targetCanvas.add(stampGroup);
      targetCanvas.setActiveObject(stampGroup);
      targetCanvas.renderAll();
      saveState(targetCanvas);
    }
  };

  const addText = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const ITextClass = getFabricClass('IText');
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

    targetCanvas.add(text);
    targetCanvas.setActiveObject(text);
    targetCanvas.renderAll();
    saveState(targetCanvas);
  };

  // --- INITIALIZE UNMANAGED FABRIC CANVAS PORTAL ---
  useEffect(() => {
    const canvasEl = document.getElementById('omni-fabric-canvas-node') as HTMLCanvasElement;
    if (!canvasEl) return;

    const CanvasClass = getFabricClass('Canvas');
    if (!CanvasClass) {
      console.error('Fabric Canvas Class could not be resolved in production bundle.');
      return;
    }

    try {
      const canvas = new CanvasClass(canvasEl, {
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

      fabricCanvasRef.current = canvas;
      setFabricCanvas(canvas);
      saveState(canvas);

      console.log('✅ Unmanaged Fabric Canvas initialized successfully!');

      return () => {
        try {
          canvas.dispose();
          fabricCanvasRef.current = null;
        } catch (e) {
          console.warn('Dispose error:', e);
        }
      };
    } catch (err) {
      console.error('Fabric Initialization Error:', err);
    }
  }, []);

  const updateLayersList = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    try {
      const objs = targetCanvas.getObjects();
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
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    targetCanvas.on('object:added', updateLayersList);
    targetCanvas.on('object:removed', updateLayersList);
    targetCanvas.on('object:modified', updateLayersList);
    return () => {
      targetCanvas.off('object:added', updateLayersList);
      targetCanvas.off('object:removed', updateLayersList);
      targetCanvas.off('object:modified', updateLayersList);
    };
  }, [fabricCanvas]);

  const applyCanvasPresetRatio = (preset: string) => {
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

  const saveState = (targetCanvas = fabricCanvasRef.current || fabricCanvas) => {
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
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (undoStack.length <= 1 || !targetCanvas) return;
    const currentCanvasJson = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, undoStack.length - 1);
    const previousCanvasJson = newUndoStack[newUndoStack.length - 1];

    setRedoStack((prev) => [currentCanvasJson, ...prev]);
    setUndoStack(newUndoStack);

    targetCanvas.loadFromJSON(previousCanvasJson, () => targetCanvas.renderAll());
  };

  const handleRedo = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (redoStack.length === 0 || !targetCanvas) return;
    const nextCanvasJson = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    setUndoStack((prev) => [...prev, nextCanvasJson]);
    setRedoStack(newRedoStack);

    targetCanvas.loadFromJSON(nextCanvasJson, () => targetCanvas.renderAll());
  };

  const exitTextEditing = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const activeObj = targetCanvas.getActiveObject();
    if (activeObj && activeObj.isEditing) activeObj.exitEditing();
    setActiveEditingObject(null);
    targetCanvas.renderAll();
  };

  const activateToolMode = (mode: string) => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    setActiveTool(mode);
    targetCanvas.isDrawingMode = mode === 'draw';
  };

  const exportCanvasImage = () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!targetCanvas) return;
    const dataURL = targetCanvas.toDataURL({ format: 'png' });
    const link = document.createElement('a');
    link.download = `edited-document-page-${pageNum}.png`;
    link.href = dataURL;
    link.click();
  };

  const exportCompletePdf = async () => {
    const targetCanvas = fabricCanvasRef.current || fabricCanvas;
    if (!pdfDoc || !targetCanvas) return;
    const pdfExport = new jsPDF({
      orientation: targetCanvas.width > targetCanvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [targetCanvas.width, targetCanvas.height],
    });

    for (let i = 1; i <= totalPages; i++) {
      await renderPdfPageOntoCanvas(pdfDoc, i);
      const pageDataUrl = targetCanvas.toDataURL({ format: 'png', quality: 1.0 });
      if (i > 1) pdfExport.addPage([targetCanvas.width, targetCanvas.height]);
      pdfExport.addImage(pageDataUrl, 'PNG', 0, 0, targetCanvas.width, targetCanvas.height);
    }

    pdfExport.save(`omnistudio-edited-document-${Date.now()}.pdf`);
  };

  const bgMain = darkMode ? '#0f172a' : '#f1f5f9';
  const bgBar = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderCol = darkMode ? '#334155' : '#cbd5e1';

  // LOCK SCREEN IF PIN IS SET AND UNLOCKED IS FALSE
  if (!isDeviceUnlocked) {
    return (
      <div style={{ padding: '40px', backgroundColor: '#0f172a', color: '#ffffff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ marginBottom: '8px' }}>🔒 Device PIN Security Protection</h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>Enter your 4-digit PIN to access your studio materials on this device:</p>
        <input
          type="password"
          maxLength={4}
          value={enteredPin}
          onChange={(e) => setEnteredPin(e.target.value)}
          placeholder="••••"
          style={{ padding: '12px', fontSize: '24px', textAlign: 'center', letterSpacing: '10px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#38bdf8', width: '160px', marginBottom: '20px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleVerifyDevicePin} style={{ padding: '10px 24px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            🔓 Unlock Studio
          </button>
        </div>
      </div>
    );
  }

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
          onOpenCropModal={handleStartInteractiveCrop}
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
      <div style={{ position: 'relative', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: darkMode ? '#0f172a' : '#e2e8f0', padding: '6px 12px', borderBottom: `1px solid ${borderCol}`, flexWrap: 'wrap', gap: '8px', touchAction: 'manipulation' }}>
        
        {/* LEFT: QUICK LAUNCHERS (EDIT TEXT, CROP, DONE CHECKPOINT, PRINT, RECORDER, PIN LOCK, CHAT) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          <button
            onClick={handleExtractAndEditPdfText}
            style={{ padding: '5px 12px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)', touchAction: 'manipulation' }}
            title="Convert all printed text on the current PDF page into editable text boxes"
          >
            ✍️ Edit PDF Text
          </button>

          <button
            onClick={handleStartInteractiveCrop}
            style={{ padding: '5px 12px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)', touchAction: 'manipulation' }}
            title="Adjust top, bottom, and side boundaries to crop document or image"
          >
            ✂️ Crop Page/Image
          </button>

          <button
            onClick={handleSaveProgressCheckpoint}
            style={{ padding: '5px 12px', backgroundColor: '#8b5cf6', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)', touchAction: 'manipulation' }}
            title="Save a permanent progress checkpoint and lock in changes up to this point"
          >
            ✅ Done (Checkpoint)
          </button>

          <button
            onClick={handlePrintDocument}
            style={{ padding: '5px 12px', backgroundColor: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)', touchAction: 'manipulation' }}
            title="Open native print preview driver for physical printout"
          >
            🖨️ Print Document
          </button>

          <button
            onClick={() => setIsPinSetupOpen(true)}
            style={{ padding: '5px 12px', backgroundColor: '#64748b', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(100, 116, 139, 0.4)', touchAction: 'manipulation' }}
            title="Set or Manage 4-Digit Quick PIN to protect your activities on this device"
          >
            🔒 Protect Device (PIN)
          </button>

          <button
            onClick={() => setIsUnlimitedRecorderOpen(true)}
            style={{ padding: '5px 12px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)', touchAction: 'manipulation' }}
            title="Record Unlimited Audio or Video and Transcribe to Text"
          >
            🎥 Record & Transcribe
          </button>

          <button
            onClick={() => setIsSocialMessengerOpen(true)}
            style={{ padding: '5px 12px', backgroundColor: '#ec4899', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(236, 72, 153, 0.4)', touchAction: 'manipulation' }}
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
            fabricCanvas={fabricCanvasRef.current || fabricCanvas}
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
          
          {/* FLOATING ACTION OVERLAY FOR DYNAMIC CROP MODE */}
          {isCroppingActive && (
            <div style={{ position: 'absolute', top: '20px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#0f172a', padding: '8px 16px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', border: '1px solid #38bdf8' }}>
              <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }}>✂️ Adjust blue box handles to crop:</span>
              <button onClick={handleApplyInteractiveCrop} style={{ padding: '6px 14px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                ✅ Apply Crop
              </button>
              <button onClick={handleCancelInteractiveCrop} style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                ❌ Cancel
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <PrecisionRuler
              fabricCanvas={fabricCanvasRef.current || fabricCanvas}
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

          {/* UNMANAGED PORTAL CONTAINER */}
          <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', overflow: 'hidden' }}>
            <div 
              style={{ position: 'relative', width: '100%', height: '100%' }}
              dangerouslySetInnerHTML={{ __html: `<canvas id="omni-fabric-canvas-node"></canvas>` }}
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
              fabricCanvas={fabricCanvasRef.current || fabricCanvas}
              saveState={saveState}
              borderCol={borderCol}
              bgBar={bgBar}
            />
          )}

          <LayersStack 
            canvasLayers={canvasLayers}
            fabricCanvas={fabricCanvasRef.current || fabricCanvas}
            bgBar={bgBar}
            borderCol={borderCol}
          />
        </div>
      </div>

      {/* 🔒 FIRST-TIME DEVICE PIN SETUP MODAL */}
      {isPinSetupOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', fontFamily: 'sans-serif', color: '#fff' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔒 Device PIN Security Setup
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              Create a 4-digit security PIN for this device. Anyone opening the app on this phone or computer will need this PIN to view your materials.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>Create 4-Digit PIN:</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="••••"
                  style={{ width: '100%', padding: '10px', fontSize: '18px', textAlign: 'center', letterSpacing: '6px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#38bdf8', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>Confirm 4-Digit PIN:</label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  placeholder="••••"
                  style={{ width: '100%', padding: '10px', fontSize: '18px', textAlign: 'center', letterSpacing: '6px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#38bdf8', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {localStorage.getItem('omni_device_pin') && (
                <button onClick={handleRemoveDevicePin} style={{ padding: '8px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  🗑️ Remove PIN
                </button>
              )}
              <button onClick={() => setIsPinSetupOpen(false)} style={{ padding: '8px 14px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCreateDevicePin} style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                💾 Save & Protect Device
              </button>
            </div>
          </div>
        </div>
      )}

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
        onApplyCrop={handleApplyInteractiveCrop}
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