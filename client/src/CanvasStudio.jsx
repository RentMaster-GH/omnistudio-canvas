import React, { useEffect, useRef, useState } from 'react';
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
  FileDown, Maximize2, MoveHorizontal, Baseline, CaseUpper, CaseLower, CreditCard
} from 'lucide-react';

import TimelineEditor from './components/TimelineEditor';
import TranscriptEditor from './components/TranscriptEditor';
import { SupabaseService } from './services/supabaseService';

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

export default function CanvasStudio() {
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

  // Layers Manager State
  const [canvasLayers, setCanvasLayers] = useState([]);

  // Cloud Sync State
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectTitle, setProjectTitle] = useState('My OmniStudio Project');
  const [mockUserId] = useState('user_' + Math.random().toString(36).substring(7));

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
  const [transcriptionText, setTranscriptionText] = useState('Welcome to OmniStudio Canvas. Your all-in-one editor for video, audio, and text.');
  
  const [transcriptSegments, setTranscriptSegments] = useState([
    {
      id: 'seg-1',
      speaker: 'Speaker 1',
      text: 'Welcome to OmniStudio Canvas.',
      start: 0,
      end: 2.5,
      words: [
        { id: 'w1', word: 'Welcome', start: 0, end: 0.5, confidence: 0.99 },
        { id: 'w2', word: 'to', start: 0.6, end: 0.8, confidence: 0.98 },
        { id: 'w3', word: 'OmniStudio', start: 0.9, end: 1.8, confidence: 0.95 },
        { id: 'w4', word: 'Canvas.', start: 1.9, end: 2.5, confidence: 0.99 }
      ]
    },
    {
      id: 'seg-2',
      speaker: 'Speaker 1',
      text: 'Your all-in-one editor for video, audio, and text.',
      start: 2.8,
      end: 6.0,
      words: [
        { id: 'w5', word: 'Your', start: 2.8, end: 3.1, confidence: 0.97 },
        { id: 'w6', word: 'all-in-one', start: 3.2, end: 3.9, confidence: 0.96 },
        { id: 'w7', word: 'editor', start: 4.0, end: 4.5, confidence: 0.99 },
        { id: 'w8', word: 'for', start: 4.6, end: 4.8, confidence: 0.98 },
        { id: 'w9', word: 'video,', start: 4.9, end: 5.2, confidence: 0.99 },
        { id: 'w10', word: 'audio,', start: 5.3, end: 5.6, confidence: 0.99 },
        { id: 'w11', word: 'and', start: 5.7, end: 5.8, confidence: 0.98 },
        { id: 'w12', word: 'text.', start: 5.9, end: 6.0, confidence: 0.99 }
      ]
    }
  ]);

  const [clips] = useState([
    { id: 'c1', trackId: 't1', name: 'Main Video Stream.mp4', type: 'video', timelineStart: 0, duration: 15 },
    { id: 'c2', trackId: 't2', name: 'Background Audio.mp3', type: 'audio', timelineStart: 0, duration: 25 },
    { id: 'c3', trackId: 't4', name: 'Whisper Subtitles', type: 'transcription', timelineStart: 2, duration: 10 },
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

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

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
      try {
        const selectedObj = e.selected?.[0];
        if (selectedObj) {
          setActiveEditingObject(selectedObj);
          updateInspectorFromSelection(selectedObj);
        }
      } catch (err) {
        console.error('Error on selection:created', err);
      }
    });

    canvas.on('selection:updated', (e) => {
      try {
        const selectedObj = e.selected?.[0];
        if (selectedObj) {
          setActiveEditingObject(selectedObj);
          updateInspectorFromSelection(selectedObj);
        }
      } catch (err) {
        console.error('Error on selection:updated', err);
      }
    });

    canvas.on('selection:cleared', () => {
      setActiveEditingObject(null);
    });

    canvas.on('text:changed', () => {
      try {
        saveState(canvas);
      } catch (err) {
        console.error('Error on text:changed', err);
      }
    });

    setFabricCanvas(canvas);
    saveState(canvas);

    return () => canvas.dispose();
  }, []);

  // --- LAYERS MANAGER HANDLERS ---
  const updateLayersList = () => {
    if (!fabricCanvas) return;
    const objs = fabricCanvas.getObjects().slice().reverse(); // Reverse so top layer is first
    setCanvasLayers(objs);
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

  const bringLayerToFront = (obj) => {
    if (!fabricCanvas || !obj) return;
    fabricCanvas.bringObjectToFront(obj);
    fabricCanvas.renderAll();
    updateLayersList();
    saveState();
  };

  const sendLayerToBack = (obj) => {
    if (!fabricCanvas || !obj) return;
    fabricCanvas.sendObjectToBack(obj);
    fabricCanvas.renderAll();
    updateLayersList();
    saveState();
  };

  const toggleLayerLock = (obj) => {
    if (!fabricCanvas || !obj) return;
    const isLocked = !obj.selectable;
    obj.set({
      selectable: isLocked,
      evented: isLocked,
    });
    fabricCanvas.renderAll();
    updateLayersList();
    saveState();
  };

  const toggleLayerVisibility = (obj) => {
    if (!fabricCanvas || !obj) return;
    obj.set('visible', !obj.visible);
    fabricCanvas.renderAll();
    updateLayersList();
    saveState();
  };

  // --- GLOBAL KEYBOARD SHORTCUTS ENGINE ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      const targetTag = e.target ? e.target.tagName.toLowerCase() : '';
      const isEditingText = targetTag === 'input' || targetTag === 'textarea' || (fabricCanvas && fabricCanvas.getActiveObject()?.isEditing);

      if (isEditingText) return;

      // 1. SPACEBAR: Toggle Timeline Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      }

      // 2. DELETE / BACKSPACE: Remove Selected Canvas Element
      if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        if (fabricCanvas) {
          const activeObjs = fabricCanvas.getActiveObjects();
          activeObjs.forEach((obj) => fabricCanvas.remove(obj));
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          saveState();
          setStatus('🗑️ Deleted selected element(s)');
        }
      }

      // 3. CTRL+Z / CMD+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // 4. CTRL+Y / CTRL+SHIFT+Z: Redo
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
      }

      // 5. CTRL+C: Copy Selected Element
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (fabricCanvas) {
          const activeObj = fabricCanvas.getActiveObject();
          if (activeObj) {
            if (activeObj.clone.length > 0) {
              activeObj.clone((cloned) => {
                copiedObjectRef.current = cloned;
                setStatus('📋 Copied element to clipboard');
              });
            } else {
              Promise.resolve(activeObj.clone()).then((cloned) => {
                copiedObjectRef.current = cloned;
                setStatus('📋 Copied element to clipboard');
              });
            }
          }
        }
      }

      // 6. CTRL+V: Paste Copied Element
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        if (fabricCanvas && copiedObjectRef.current) {
          const handleClonedPaste = (clonedObj) => {
            fabricCanvas.discardActiveObject();
            clonedObj.set({
              left: clonedObj.left + 20,
              top: clonedObj.top + 20,
              evented: true,
            });
            if (clonedObj.type === 'activeSelection') {
              clonedObj.canvas = fabricCanvas;
              clonedObj.forEachObject((obj) => fabricCanvas.add(obj));
              clonedObj.setCoordinates();
            } else {
              fabricCanvas.add(clonedObj);
            }
            fabricCanvas.setActiveObject(clonedObj);
            fabricCanvas.requestRenderAll();
            saveState();
            setStatus('📄 Pasted element onto canvas');
          };

          if (copiedObjectRef.current.clone.length > 0) {
            copiedObjectRef.current.clone(handleClonedPaste);
          } else {
            Promise.resolve(copiedObjectRef.current.clone()).then(handleClonedPaste);
          }
        }
      }

      // 7. CTRL+A: Select All Canvas Objects
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (fabricCanvas) {
          const objs = fabricCanvas.getObjects();
          if (objs.length > 0) {
            const selection = new fabric.ActiveSelection(objs, { canvas: fabricCanvas });
            fabricCanvas.setActiveObject(selection);
            fabricCanvas.renderAll();
            setStatus('✨ Selected all canvas elements');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas, undoStack, redoStack, isPlaying]);

  // --- ASPECT RATIO PRESETS HANDLER ---
  const applyCanvasPresetRatio = (preset) => {
    if (!fabricCanvas) return;

    let width = 820;
    let height = 480;

    if (preset === '16:9') {
      width = 854;  // YouTube Video (16:9)
      height = 480;
    } else if (preset === '9:16') {
      width = 360;  // TikTok / Reels / Shorts (9:16)
      height = 640;
    } else if (preset === '1:1') {
      width = 500;  // Instagram Post Square (1:1)
      height = 500;
    } else if (preset === 'A4') {
      width = 595;  // Standard A4 Print Document
      height = 842;
    }

    fabricCanvas.setDimensions({ width, height });
    fabricCanvas.renderAll();
    saveState();
    setStatus(`📐 Resized Canvas Preset to ${preset} (${width}x${height}px)`);
  };

  // --- TEXT EFFECTS HANDLERS ---
  const applyTextShadow = (shadowColor = '#000000', blur = 8) => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text' || activeObj.type === 'textbox')) {
      activeObj.set('shadow', new fabric.Shadow({
        color: shadowColor,
        blur: blur,
        offsetX: 4,
        offsetY: 4
      }));
      fabricCanvas.renderAll();
      saveState();
      setStatus('✨ Applied Text Drop Shadow Effect');
    }
  };

  const applyTextStroke = (strokeColor = '#000000', strokeWidth = 2) => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text' || activeObj.type === 'textbox')) {
      activeObj.set({
        stroke: strokeColor,
        strokeWidth: strokeWidth
      });
      fabricCanvas.renderAll();
      saveState();
      setStatus('✏️ Applied Text Stroke Outline Effect');
    }
  };

  // --- WATERMARKING & PAGE REORDERING HANDLERS ---
  const applyWatermarkToAllPages = (watermarkText = 'CONFIDENTIAL') => {
    if (!fabricCanvas) return;
    const text = prompt('Enter Watermark Text for All Pages:', watermarkText);
    if (!text) return;

    const watermarkObj = new fabric.Text(text.toUpperCase(), {
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: 'rgba(239, 68, 68, 0.25)', // Semi-transparent Red
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

  const movePdfPage = (fromIdx, toIdx) => {
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= thumbnails.length || toIdx >= thumbnails.length) return;
    const updatedThumbs = [...thumbnails];
    const [movedThumb] = updatedThumbs.splice(fromIdx, 1);
    updatedThumbs.splice(toIdx, 0, movedThumb);
    setThumbnails(updatedThumbs);
    setStatus(`📄 Moved Page ${fromIdx + 1} to Position ${toIdx + 1}`);
  };

  // --- PAYSTACK SUBSCRIPTION HANDLER ---
  const handlePaystackUpgrade = async () => {
    const userEmail = prompt('Enter your email address to upgrade to OmniStudio Pro ($9/mo):', 'user@example.com');
    if (!userEmail) return;

    setStatus('Initializing Paystack Payment Gateway (Cards & Mobile Money)...');

    try {
      const res = await axios.post(`${API_BASE}/billing/initialize-paystack`, {
        userId: mockUserId,
        email: userEmail,
        currency: 'USD',
      });

      if (res.data?.authorizationUrl) {
        window.location.href = res.data.authorizationUrl;
      } else {
        alert('Could not start Paystack checkout. Please check server keys.');
      }
    } catch (err) {
      console.error('Paystack Checkout Error:', err);
      alert(`Paystack Error: ${err.response?.data?.details || err.message}`);
    }
  };

  // --- SAFE ADD TEXT FUNCTION ---
  const addText = () => {
    try {
      if (!isEditMode) setIsEditMode(true);
      if (!fabricCanvas) return;
      
      activateToolMode('select');

      const safeFill = ensureValidHexColor(textColorVal, '#0f172a');
      const safeBg = textBgColorVal && textBgColorVal.startsWith('#') ? textBgColorVal : 'transparent';

      const textObj = new fabric.IText('Type text here...', { 
        left: 200, 
        top: 200, 
        fontSize: Math.max(12, fontSizeVal || 24), 
        fontFamily: fontFamilyVal || 'Arial',
        fill: safeFill,
        textBackgroundColor: safeBg === '#ffffff' ? 'transparent' : safeBg,
        opacity: textOpacityVal || 1.0,
        fontWeight: isBoldVal ? 'bold' : 'normal',
        fontStyle: isItalicVal ? 'italic' : 'normal',
        underline: !!isUnderlineVal,
        textAlign: textAlignVal || 'left',
        lineHeight: lineHeightVal || 1.16,
        charSpacing: charSpacingVal || 0,
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
      console.error('Error adding text object:', err);
      setStatus(`Error adding text: ${err.message}`);
    }
  };

  const updateInspectorFromSelection = (obj) => {
    if (!obj || (obj.type !== 'i-text' && obj.type !== 'text' && obj.type !== 'textbox')) return;
    try {
      if (obj.fontFamily) setFontFamilyVal(obj.fontFamily);
      if (obj.fontSize) setFontSizeVal(obj.fontSize);
      if (obj.lineHeight) setLineHeightVal(obj.lineHeight);
      if (obj.charSpacing !== undefined) setCharSpacingVal(obj.charSpacing);
      
      const safeFill = ensureValidHexColor(obj.fill, '#0f172a');
      setTextColorVal(safeFill);

      const safeBg = ensureValidHexColor(obj.textBackgroundColor, '#ffffff');
      setTextBgColorVal(safeBg);

      if (obj.opacity !== undefined) setTextOpacityVal(obj.opacity);
      setIsBoldVal(obj.fontWeight === 'bold');
      setIsItalicVal(obj.fontStyle === 'italic');
      setIsUnderlineVal(!!obj.underline);
      if (obj.textAlign) setTextAlignVal(obj.textAlign);
    } catch (err) {
      console.error('Inspector update error:', err);
    }
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
    } catch (err) {
      console.error('PDF Export Error:', err);
      setStatus(`Error exporting PDF: ${err.message}`);
    }
  };

  const saveState = (targetCanvas = fabricCanvas) => {
    if (!targetCanvas) return;
    const json = targetCanvas.toJSON(['isPendingRedaction', 'isRedacted', 'id', 'linkUrl']);
    setUndoStack((prev) => [...prev, JSON.stringify(json)]);
    setRedoStack([]);
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

  const switchCursorMode = (canvas, nextMode = 'select') => {
    canvas.discardActiveObject();
    activateToolMode(nextMode);
  };

  const handleMouseUpInitializer = (canvas, opt) => {
    const currentMode = activeToolRef.current;
    if (currentMode === 'hand' || isPanningRef.current) return;

    const pointer = canvas.getPointer(opt.e);
    const activeObj = canvas.getActiveObject() || opt.target;

    const bounds = {
      left: activeObj ? activeObj.left : pointer.x - 5,
      top: activeObj ? activeObj.top : pointer.y - 5,
      width: activeObj ? (activeObj.width * (activeObj.scaleX || 1)) + 10 : 140,
      height: activeObj ? (activeObj.height * (activeObj.scaleY || 1)) + 5 : 35,
      extractedText: (activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text')) ? activeObj.text : 'Extracted Text',
      fontSize: activeObj ? (activeObj.fontSize || fontSizeVal) : fontSizeVal,
      fontFamily: activeObj ? (activeObj.fontFamily || fontFamilyVal) : fontFamilyVal,
      fill: activeObj ? (activeObj.fill || textColorVal) : textColorVal,
    };

    if (currentMode === 'redact') {
      initializeRedactionAnnotation(canvas, activeObj, bounds);
    } else if (currentMode === 'flatten') {
      executeFlattenPDF(canvas);
    } else if (currentMode === 'pointReplace') {
      executePointAndReplaceHitTest(canvas, activeObj, bounds, pointer);
    }
  };

  const initializeRedactionAnnotation = (canvas, activeObj, bounds) => {
    const redactAnnotation = new fabric.Rect({
      left: bounds.left - 2,
      top: bounds.top - 2,
      width: bounds.width,
      height: bounds.height,
      fill: 'rgba(239, 68, 68, 0.25)',
      stroke: '#ef4444',
      strokeWidth: 2,
      strokeDashArray: [6, 4],
      isPendingRedaction: true,
    });

    canvas.add(redactAnnotation);
    setPendingRedactionsCount((prev) => prev + 1);

    switchCursorMode(canvas, 'select');
    canvas.renderAll();
    saveState(canvas);
    setStatus('🛡️ Redaction Annotation initialized!');
  };

  const applyAllRedactions = () => {
    if (!fabricCanvas) return;

    let appliedCount = 0;
    const objects = fabricCanvas.getObjects();
    const pendingRedactObjs = objects.filter((obj) => obj.isPendingRedaction);

    if (pendingRedactObjs.length === 0) return;

    pendingRedactObjs.forEach((redactBox) => {
      const rLeft = redactBox.left;
      const rTop = redactBox.top;
      const rWidth = redactBox.width;
      const rHeight = redactBox.height;

      objects.forEach((obj) => {
        if (!obj.isPendingRedaction && obj.left >= rLeft - 10 && obj.top >= rTop - 10 && obj.left <= rLeft + rWidth + 10) {
          fabricCanvas.remove(obj);
        }
      });

      const burnedOverlay = new fabric.Rect({
        left: rLeft,
        top: rTop,
        width: rWidth,
        height: rHeight,
        fill: '#000000',
        selectable: false,
        evented: false,
      });

      fabricCanvas.remove(redactBox);
      fabricCanvas.add(burnedOverlay);
      appliedCount++;
    });

    setPendingRedactionsCount(0);
    fabricCanvas.renderAll();
    saveState(fabricCanvas);
    setStatus(`✅ ${appliedCount} Redaction(s) burned into PDF!`);
  };

  const executeFlattenPDF = (canvas = fabricCanvas) => {
    if (!canvas) return;
    if (!confirm('Flatten PDF Engine:\n\nDecompress page structure and merge annotations directly into static base layer?')) {
      switchCursorMode(canvas, 'select');
      return;
    }

    const rasterizedDataUrl = canvas.toDataURL({ format: 'png', quality: 1.0 });

    fabric.FabricImage.fromURL(rasterizedDataUrl).then((flattenedPageImg) => {
      canvas.clear();
      canvas.setDimensions({ width: 820, height: 480 });
      flattenedPageImg.set({ left: 0, top: 0, selectable: false, evented: false });

      canvas.add(flattenedPageImg);
      canvas.sendObjectToBack(flattenedPageImg);

      switchCursorMode(canvas, 'select');
      canvas.renderAll();
      saveState(canvas);
      setStatus('🔒 PDF Flattened into permanent static page graphics!');
    });
  };

  const handleFindAndReplaceWithReflow = () => {
    if (!isEditMode) initializeEditProcess();
    if (!fabricCanvas) return;

    const findText = prompt('Enter search term to locate in PDF stream:', 'Entity');
    if (!findText) return;

    let targetObj = null;
    fabricCanvas.getObjects().forEach((obj) => {
      if ((obj.type === 'i-text' || obj.type === 'text') && obj.text.toLowerCase().includes(findText.toLowerCase())) {
        targetObj = obj;
      }
    });

    const currentSentence = targetObj ? targetObj.text : findText;
    const replaceText = prompt(`Match: "${currentSentence}"\n\nEnter Replacement Text:`, currentSentence.replace(new RegExp(findText, 'gi'), 'New Text'));
    if (replaceText === null) return;

    let replaceCount = 0;
    const objects = fabricCanvas.getObjects();

    objects.forEach((obj) => {
      if ((obj.type === 'i-text' || obj.type === 'text') && obj.text.toLowerCase().includes(findText.toLowerCase())) {
        const oldWidth = obj.width * (obj.scaleX || 1);
        const originalLeft = obj.left;
        const originalTop = obj.top;

        obj.set('text', replaceText);
        obj.initDimensions();
        const newWidth = obj.width * (obj.scaleX || 1);
        const deltaWidth = newWidth - oldWidth;

        if (deltaWidth !== 0) {
          objects.forEach((otherObj) => {
            if (otherObj !== obj && Math.abs(otherObj.top - originalTop) < 15 && otherObj.left > originalLeft) {
              otherObj.set('left', otherObj.left + deltaWidth);
            }
          });
        }

        obj.set({ fill: textColorVal, fontFamily: fontFamilyVal, fontSize: fontSizeVal });
        replaceCount++;
      }
    });

    if (replaceCount > 0) {
      fabricCanvas.renderAll();
      saveState();
      setStatus(`Replaced ${replaceCount} instance(s) with reflow!`);
    }
  };

  const executePointAndReplaceHitTest = (canvas, activeObj, bounds, pointer) => {
    let targetTextObj = activeObj;

    if (!targetTextObj || (targetTextObj.type !== 'i-text' && targetTextObj.type !== 'text')) {
      canvas.getObjects().forEach((obj) => {
        if ((obj.type === 'i-text' || obj.type === 'text') && Math.abs(obj.left - pointer.x) < 80 && Math.abs(obj.top - pointer.y) < 30) {
          targetTextObj = obj;
        }
      });
    }

    if (targetTextObj && (targetTextObj.type === 'i-text' || targetTextObj.type === 'text')) {
      canvas.setActiveObject(targetTextObj);
      setActiveEditingObject(targetTextObj);
      targetTextObj.enterEditing();
      targetTextObj.selectAll();

      targetTextObj.on('changed', () => {
        targetTextObj.initDimensions();
        canvas.renderAll();
      });

      setStatus('✏️ Word Processor Session active!');
    } else {
      const newTextBox = new fabric.IText('Type text here...', {
        left: pointer.x,
        top: pointer.y,
        fontSize: fontSizeVal,
        fontFamily: fontFamilyVal,
        fill: ensureValidHexColor(textColorVal, '#0f172a'),
      });

      canvas.add(newTextBox);
      canvas.setActiveObject(newTextBox);
      setActiveEditingObject(newTextBox);
      newTextBox.enterEditing();
      newTextBox.selectAll();
      saveState(canvas);
    }

    switchCursorMode(canvas, 'select');
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleTimelineScrub = (newTime) => {
    setTimelineSec(newTime);
    if (videoRef.current) videoRef.current.currentTime = newTime;
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) setTimelineSec(videoRef.current.currentTime);
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) setVideoDuration(videoRef.current.duration || 30);
  };

  const initializeEditProcess = () => {
    setIsEditMode(true);
    activateToolMode('select');
    setStatus('✏️ Edit Process Initialized!');
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
    } else if (mode === 'pointReplace' || mode === 'redact' || mode === 'flatten') {
      fabricCanvas.defaultCursor = 'crosshair';
      fabricCanvas.hoverCursor = 'crosshair';
      fabricCanvas.setCursor('crosshair');
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
      fabricCanvas.setCursor('default');
    }
  };

  const activateRedactMode = () => {
    if (!isEditMode) initializeEditProcess();
    activateToolMode('redact');
  };

  const activateFlattenMode = () => {
    if (!isEditMode) initializeEditProcess();
    executeFlattenPDF(fabricCanvas);
  };

  const activatePointToReplace = () => {
    if (!isEditMode) initializeEditProcess();
    activateToolMode('pointReplace');
  };

  const renderPdfPageOntoCanvas = async (pdf, pageNumber, mode = fitMode) => {
    if (!pdf || !fabricCanvas) return;

    const page = await pdf.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    const canvasWidth = 820;
    const canvasHeight = 480;
    const padding = 24;

    fabricCanvas.setDimensions({ width: canvasWidth, height: canvasHeight });

    let computedScale = 1.0;

    if (mode === 'width') {
      computedScale = (canvasWidth - padding) / unscaledViewport.width;
    } else {
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

    try {
      const textContent = await page.getTextContent();
      textContent.items.forEach((item) => {
        if (!item.str || !item.str.trim()) return;

        const tx = item.transform;
        const pdfX = tx[4] * computedScale + left;
        const pdfY = (unscaledViewport.height - tx[5]) * computedScale + top - (12 * computedScale);
        const fontSize = Math.max(12, (item.height || 14) * computedScale);

        const textObj = new fabric.IText(item.str, {
          left: pdfX,
          top: pdfY,
          fontSize: fontSize,
          fontFamily: 'Arial',
          fill: 'rgba(15, 23, 42, 0.01)',
          selectable: true,
        });

        fabricCanvas.add(textObj);
      });
    } catch (e) {
      console.warn('PDF text extraction skipped:', e);
    }

    activateToolMode('hand');
    fabricCanvas.renderAll();
    saveState(fabricCanvas);
  };

  const handleToggleFitMode = (newMode) => {
    setFitMode(newMode);
    if (pdfDoc) {
      renderPdfPageOntoCanvas(pdfDoc, pageNum, newMode);
      setStatus(`🔍 Fit Mode: ${newMode === 'width' ? 'Fit to Width (page-width)' : 'Fit to Page (page-fit)'}`);
    }
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

  const handlePrint = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ format: 'png' });
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;"><img src="${dataURL}" style="max-width:100%;" onload="window.print();window.close();"/></body></html>`);
    printWindow.document.close();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'OmniStudio Document',
          text: 'Check out my edited document on OmniStudio Canvas!',
          url: window.location.href,
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Document Link copied to clipboard!');
    }
  };

  const handleSearch = () => {
    const query = prompt('Search document text:', searchQuery);
    if (!query || !fabricCanvas) return;
    setSearchQuery(query);

    let found = false;
    fabricCanvas.getObjects().forEach((obj) => {
      if ((obj.type === 'i-text' || obj.type === 'text') && obj.text.toLowerCase().includes(query.toLowerCase())) {
        fabricCanvas.setActiveObject(obj);
        fabricCanvas.renderAll();
        found = true;
      }
    });

    if (!found) alert(`No text matching "${query}" found.`);
  };

  const handleDone = () => {
    setStatus('✅ Document Editing Complete!');
    alert('🎉 Document editing complete!');
  };

  const addCheckmark = () => {
    if (!isEditMode) initializeEditProcess();
    if (!fabricCanvas) return;
    activateToolMode('select');
    const check = new fabric.Text('✔️', { fontSize: 32, fill: '#10b981', left: 200, top: 200 });
    fabricCanvas.add(check);
    fabricCanvas.setActiveObject(check);
    saveState();
  };

  const addCrossmark = () => {
    if (!isEditMode) initializeEditProcess();
    if (!fabricCanvas) return;
    activateToolMode('select');
    const cross = new fabric.Text('❌', { fontSize: 32, fill: '#ef4444', left: 200, top: 200 });
    fabricCanvas.add(cross);
    fabricCanvas.setActiveObject(cross);
    saveState();
  };

  const addElectronicSignature = () => {
    if (!isEditMode) initializeEditProcess();
    const name = prompt('Enter name for Electronic Signature:', signatureName);
    if (!name || !fabricCanvas) return;
    setSignatureName(name);

    const sigText = new fabric.Text(name, {
      fontFamily: 'Georgia',
      fontStyle: 'italic',
      fontSize: 26,
      fill: '#1e3a8a',
      left: 15,
      top: 10,
    });

    const rect = new fabric.Rect({
      width: sigText.width + 30,
      height: 50,
      fill: '#ffffff',
      stroke: '#0284c7',
      strokeWidth: 1.5,
      rx: 4,
      ry: 4,
    });

    const group = new fabric.Group([rect, sigText], { left: 200, top: 200 });
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    saveState();
  };

  const attachLinkToSelection = () => {
    if (!isEditMode) initializeEditProcess();
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj) return;

    const url = prompt('Enter URL Hyperlink:', 'https://');
    if (!url) return;

    activeObj.set('linkUrl', url);
    alert(`Hyperlink attached: ${url}`);
    saveState();
  };

  const handleCropTool = () => {
    if (!isEditMode) initializeEditProcess();
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj) return;
    activeObj.set({ width: activeObj.width * 0.8, height: activeObj.height * 0.8 });
    fabricCanvas.renderAll();
    saveState();
  };

  const handlePageLayoutToggle = () => {
    if (!fabricCanvas) return;
    const isLandscape = fabricCanvas.width === 820;
    fabricCanvas.setDimensions({
      width: isLandscape ? 580 : 820,
      height: isLandscape ? 820 : 480,
    });
    fabricCanvas.renderAll();
    saveState();
  };

  const handleManagePages = () => {
    if (!pdfDoc) return;
    const action = prompt(`Manage Pages (Total: ${totalPages})\nType 'delete' or 'rotate':`);
    if (action === 'delete') {
      setTotalPages((prev) => Math.max(1, prev - 1));
    } else if (action === 'rotate') {
      const activeObj = fabricCanvas.getObjects()[0];
      if (activeObj) {
        activeObj.rotate((activeObj.angle || 0) + 90);
        fabricCanvas.renderAll();
        saveState();
      }
    }
  };

  const updateActiveTextProp = (prop, value) => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox')) {
      activeObject.set(prop, value);
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const changeTextCase = (caseType) => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text' || activeObj.type === 'textbox')) {
      if (caseType === 'upper') activeObj.set('text', activeObj.text.toUpperCase());
      if (caseType === 'lower') activeObj.set('text', activeObj.text.toLowerCase());
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const addWhiteoutEraser = () => {
    if (!isEditMode) initializeEditProcess();
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
    if (!isEditMode) initializeEditProcess();
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    activeObjects.forEach((obj) => fabricCanvas.remove(obj));
    fabricCanvas.discardActiveObject();
    saveState();
  };

  const addStamp = (type) => {
    if (!isEditMode) initializeEditProcess();
    if (!fabricCanvas) return;
    activateToolMode('select');

    let textStr = 'APPROVED';
    let color = '#10b981';

    if (type === 'CONFIDENTIAL') { textStr = 'CONFIDENTIAL'; color = '#ef4444'; }
    if (type === 'DRAFT') { textStr = 'DRAFT'; color = '#0284c7'; }
    if (type === 'SIGN') { textStr = 'SIGN HERE'; color = '#f59e0b'; }
    if (type === 'COMPLETED') { textStr = 'COMPLETED'; color = '#8b5cf6'; }

    const text = new fabric.Text(textStr, { fontSize: 20, fontWeight: 'bold', fill: color, left: 15, top: 10 });
    const rect = new fabric.Rect({ width: text.width + 30, height: text.height + 20, fill: 'rgba(255, 255, 255, 0.9)', stroke: color, strokeWidth: 3, rx: 6, ry: 6 });

    const group = new fabric.Group([rect, text], { left: 200, top: 200, angle: -12 });
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    saveState();
  };

  const addShape = (shapeType) => {
    if (!isEditMode) initializeEditProcess();
    if (!fabricCanvas) return;
    activateToolMode('select');

    let shapeObj;
    if (shapeType === 'rect') {
      shapeObj = new fabric.Rect({ left: 200, top: 200, width: 120, height: 80, fill: 'transparent', stroke: '#0284c7', strokeWidth: 3 });
    } else if (shapeType === 'ellipse') {
      shapeObj = new fabric.Ellipse({ left: 200, top: 200, rx: 60, ry: 40, fill: 'transparent', stroke: '#0284c7', strokeWidth: 3 });
    } else if (shapeType === 'line') {
      shapeObj = new fabric.Line([50, 50, 200, 50], { left: 200, top: 200, stroke: '#0284c7', strokeWidth: 3 });
    } else if (shapeType === 'arrow') {
      const line = new fabric.Line([50, 50, 200, 50], { stroke: '#0284c7', strokeWidth: 3 });
      const head = new fabric.Triangle({ width: 15, height: 15, fill: '#0284c7', left: 200, top: 43, angle: 90 });
      shapeObj = new fabric.Group([line, head], { left: 200, top: 200 });
    } else if (shapeType === 'polygon') {
      shapeObj = new fabric.Triangle({ left: 200, top: 200, width: 100, height: 90, fill: 'transparent', stroke: '#0284c7', strokeWidth: 3 });
    } else if (shapeType === 'polyline') {
      const pathPoints = 'M 0 0 L 50 40 L 100 10 L 150 50';
      shapeObj = new fabric.Path(pathPoints, { left: 200, top: 200, fill: 'transparent', stroke: '#0284c7', strokeWidth: 3 });
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

  const handleImageUpload = (e) => {
    if (!isEditMode) initializeEditProcess();
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
      setVideoPreviewUrl(videoUrl);
      setActivePortal('video');
      setStatus(`Animation exported! Playing in Video Portal...`);
    } catch (err) {
      setStatus(`Error rendering MP4: ${err.message}`);
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
      const text = res.data.transcript ? res.data.transcript.map(s => s.text).join(' ') : (res.data.transcription?.text || '');
      const segments = res.data.transcript || res.data.transcription?.segments || [
        { id: crypto.randomUUID(), text: text || 'Transcribed text output', start: 0, end: 10, words: [] }
      ];

      setTranscriptionText(text);
      setTranscriptSegments(segments);

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
      setVideoPreviewUrl(videoUrl);

      const text = res.data.transcriptionText || '';
      const segments = res.data.transcript || res.data.transcription?.segments || [
        { id: crypto.randomUUID(), text: text || 'Subtitled video text', start: 0, end: 10, words: [] }
      ];

      setTranscriptionText(text);
      setTranscriptSegments(segments);
      setActivePortal('video');
      setStatus(`Subtitled video ready! Playing in Video Portal...`);
    } catch (err) {
      setStatus(`Error generating subtitled video: ${err.message}`);
    }
  };

  const bgMain = darkMode ? '#0f172a' : '#f1f5f9';
  const bgBar = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderCol = darkMode ? '#334155' : '#cbd5e1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'sans-serif', backgroundColor: bgMain, color: textColor, boxSizing: 'border-box' }}>
      
      {/* Custom Scrollbars Injection */}
      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
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

      {/* 1. TOP PORTAL SWITCHER & GLOBAL ACTIONS */}
      <div style={{ height: '36px', minHeight: '36px', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '6px', zIndex: 40, boxSizing: 'border-box', overflowX: 'auto' }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff', marginRight: '8px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          <FileText size={16} /> OmniStudio
        </span>
        
        <button onClick={() => setActivePortal('pdf')} style={portalTabStyle(activePortal === 'pdf')}><FileText size={13} /> PDF Portal</button>
        <button onClick={() => setActivePortal('canvas')} style={portalTabStyle(activePortal === 'canvas')}><Type size={13} /> Canvas Studio</button>
        <button onClick={() => setActivePortal('image')} style={portalTabStyle(activePortal === 'image')}><Sliders size={13} /> Image Filters</button>
        <button onClick={() => setActivePortal('video')} style={portalTabStyle(activePortal === 'video')}><Video size={13} /> Video Portal</button>
        <button onClick={() => setActivePortal('transcribe')} style={portalTabStyle(activePortal === 'transcribe')}><Mic size={13} /> AI Subtitles</button>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />

        {!isEditMode ? (
          <button title="Click to Initialize Editing Process" onClick={initializeEditProcess} style={enableEditBtnStyle}>
            <Edit3 size={13} /> Enable Editing
          </button>
        ) : (
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <Edit3 size={12} /> Editing Active
          </span>
        )}

        <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />

        <button title="Search Text" onClick={handleSearch} style={globalHeaderBtnStyle}><Search size={13} /> Search</button>
        <button title="Print Document Page" onClick={handlePrint} style={globalHeaderBtnStyle}><Printer size={13} /> Print</button>
        <button title="Download Page" onClick={exportCanvasImage} style={globalHeaderBtnStyle}><Download size={13} /> Download</button>
        <button title="Share Document" onClick={handleShare} style={globalHeaderBtnStyle}><Share2 size={13} /> Share</button>

        {/* PAYSTACK UPGRADE PRO BUTTON (GREEN ACCENT) */}
        <button 
          onClick={handlePaystackUpgrade}
          title="Upgrade to Pro with Mobile Money or Card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          ⚡ Upgrade Pro ($9/mo - MoMo/Card)
        </button>

        <button title="Complete & Finalize" onClick={handleDone} style={doneHeaderBtnStyle}><CheckCircle2 size={13} /> Done</button>

        <div style={{ marginLeft: 'auto' }}>
          <button title="Toggle Theme" onClick={() => setDarkMode(!darkMode)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* 2. SECONDARY TOOL RIBBON (Scrollable) */}
      <div className="custom-scroll" style={{ height: '44px', minHeight: '44px', backgroundColor: bgBar, borderBottom: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', padding: '0 10px', zIndex: 30, boxSizing: 'border-box', overflowX: 'auto' }}>
        
        {activePortal === 'pdf' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', flexWrap: 'nowrap' }}>
            <label style={prominentBtnStyle('#0284c7')}>
              <Upload size={14} /> Open PDF
              <input type="file" accept=".pdf" onChange={handlePdfDocumentUpload} style={{ display: 'none' }} />
            </label>

            <div style={{ width: '1px', height: '18px', backgroundColor: borderCol, margin: '0 2px' }} />

            <button title="Undo Safety Net" onClick={handleUndo} disabled={undoStack.length <= 1} style={iconToolBtnStyle(false)}>
              <RotateCcw size={14} />
            </button>

            <button title="Redo Forward Restorer" onClick={handleRedo} disabled={redoStack.length === 0} style={iconToolBtnStyle(false)}>
              <RotateCw size={14} />
            </button>
            
            <div style={{ width: '1px', height: '18px', backgroundColor: borderCol, margin: '0 2px' }} />

            <button title="Select Tool" onClick={() => activateToolMode('select')} style={iconToolBtnStyle(activeTool === 'select')}><MousePointer size={14} /></button>
            <button title="Hand Tool" onClick={() => activateToolMode('hand')} style={iconToolBtnStyle(activeTool === 'hand')}><Hand size={14} /></button>

            <div style={{ width: '1px', height: '18px', backgroundColor: borderCol, margin: '0 2px' }} />

            <button title="Add / Edit Text" onClick={addText} style={prominentBtnStyle('#0284c7')}>
              <Type size={14} /> Text
            </button>

            {/* WATERMARK DOCUMENT BUTTON */}
            <button onClick={() => applyWatermarkToAllPages('CONFIDENTIAL')} style={prominentBtnStyle('#ef4444')}>
              💧 Watermark Document
            </button>

            {/* ASPECT RATIO PRESETS SELECTOR */}
            <div style={{ display: 'flex', gap: '3px', borderLeft: `1px solid ${borderCol}`, borderRight: `1px solid ${borderCol}`, padding: '0 6px' }}>
              <button title="YouTube Widescreen (16:9)" onClick={() => applyCanvasPresetRatio('16:9')} style={inspectorToggleBtnStyle(false)}>16:9</button>
              <button title="TikTok / Reels Vertical (9:16)" onClick={() => applyCanvasPresetRatio('9:16')} style={inspectorToggleBtnStyle(false)}>9:16</button>
              <button title="Instagram Square (1:1)" onClick={() => applyCanvasPresetRatio('1:1')} style={inspectorToggleBtnStyle(false)}>1:1</button>
              <button title="A4 Print Document" onClick={() => applyCanvasPresetRatio('A4')} style={inspectorToggleBtnStyle(false)}>A4</button>
            </div>

            <button title="Redact & Overlay" onClick={activateRedactMode} style={prominentBtnStyle(activeTool === 'redact' ? '#991b1b' : '#dc2626')}>
              <ShieldAlert size={14} /> Redact
            </button>

            {pendingRedactionsCount > 0 && (
              <button title="Apply Redactions" onClick={applyAllRedactions} style={prominentBtnStyle('#16a34a')}>
                <CheckSquare size={14} /> Apply Redactions ({pendingRedactionsCount})
              </button>
            )}

            <button title="Flatten PDF" onClick={activateFlattenMode} style={prominentBtnStyle(activeTool === 'flatten' ? '#6b21a8' : '#8b5cf6')}>
              <Lock size={14} /> Flatten PDF
            </button>

            <button title="Find & Replace" onClick={handleFindAndReplaceWithReflow} style={prominentBtnStyle('#0284c7')}>
              <RefreshCw size={14} /> Find & Replace
            </button>

            <button title="Point & Replace" onClick={activatePointToReplace} style={prominentBtnStyle(activeTool === 'pointReplace' ? '#d97706' : '#f59e0b')}>
              <Target size={14} /> Point & Replace
            </button>

            <button title="Text Highlight" onClick={() => activateToolMode('highlight')} style={prominentBtnStyle(activeTool === 'highlight' ? '#b45309' : '#d97706')}>
              <Highlighter size={14} /> Highlight
            </button>

            <button title="Ink Freehand Draw" onClick={() => activateToolMode('draw')} style={prominentBtnStyle(activeTool === 'draw' ? '#991b1b' : '#dc2626')}>
              <Pencil size={14} /> Draw
            </button>

            <button title="Add Checkmark" onClick={addCheckmark} style={prominentBtnStyle('#10b981')}>
              <Check size={14} /> Check
            </button>

            <button title="Add Crossmark" onClick={addCrossmark} style={prominentBtnStyle('#ef4444')}>
              <X size={14} /> Cross
            </button>

            <button title="Electronic Signature" onClick={addElectronicSignature} style={prominentBtnStyle('#8b5cf6')}>
              <PenTool size={14} /> Sign
            </button>

            <button title="Attach Link" onClick={attachLinkToSelection} style={prominentBtnStyle('#0284c7')}>
              <Link size={14} /> Links
            </button>

            <div style={{ position: 'relative' }}>
              <button onClick={() => setActiveDropdown(activeDropdown === 'eraser' ? null : 'eraser')} style={prominentBtnStyle('#ea580c')}>
                <Eraser size={14} /> Eraser <ChevronDown size={11} />
              </button>
              {activeDropdown === 'eraser' && (
                <div style={dropdownMenuStyle(bgBar, borderCol)}>
                  <button onClick={addWhiteoutEraser} style={dropdownItemStyle}><Square size={13} /> Whiteout Cover Box</button>
                  <button onClick={purgeVectorStrokes} style={{ ...dropdownItemStyle, color: '#ef4444' }}><Trash2 size={13} /> Vector Stroke Purge</button>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button onClick={() => setActiveDropdown(activeDropdown === 'image' ? null : 'image')} style={prominentBtnStyle('#059669')}>
                <ImageIcon size={14} /> Image & Stamps <ChevronDown size={11} />
              </button>
              {activeDropdown === 'image' && (
                <div style={dropdownMenuStyle(bgBar, borderCol)}>
                  <label style={dropdownItemStyle}>
                    <Upload size={13} /> Local Image Upload
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                  <hr style={{ borderColor: borderCol, margin: '3px 0' }} />
                  <button onClick={() => addStamp('APPROVED')} style={dropdownItemStyle}><Stamp size={13} color="#10b981" /> APPROVED Stamp</button>
                  <button onClick={() => addStamp('CONFIDENTIAL')} style={dropdownItemStyle}><Stamp size={13} color="#ef4444" /> CONFIDENTIAL Stamp</button>
                  <button onClick={() => addStamp('DRAFT')} style={dropdownItemStyle}><Stamp size={13} color="#0284c7" /> DRAFT Stamp</button>
                  <button onClick={() => addStamp('SIGN')} style={dropdownItemStyle}><Stamp size={13} color="#f59e0b" /> SIGN HERE Stamp</button>
                  <button onClick={() => addStamp('COMPLETED')} style={dropdownItemStyle}><Stamp size={13} color="#8b5cf6" /> COMPLETED Stamp</button>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button onClick={() => setActiveDropdown(activeDropdown === 'shapes' ? null : 'shapes')} style={prominentBtnStyle('#7c3aed')}>
                <Square size={14} /> Shapes <ChevronDown size={11} />
              </button>
              {activeDropdown === 'shapes' && (
                <div style={dropdownMenuStyle(bgBar, borderCol)}>
                  <button onClick={() => addShape('rect')} style={dropdownItemStyle}><Square size={13} /> Rectangle</button>
                  <button onClick={() => addShape('ellipse')} style={dropdownItemStyle}><Circle size={13} /> Ellipse / Oval</button>
                  <button onClick={() => addShape('line')} style={dropdownItemStyle}><Minus size={13} /> Line</button>
                  <button onClick={() => addShape('arrow')} style={dropdownItemStyle}><MoveRight size={13} /> Arrow Connector</button>
                  <button onClick={() => addShape('polygon')} style={dropdownItemStyle}><Triangle size={13} /> Polygon / Triangle</button>
                  <button onClick={() => addShape('polyline')} style={dropdownItemStyle}><Activity size={13} /> Polyline Path</button>
                  <button onClick={() => addShape('cloud')} style={dropdownItemStyle}><Cloud size={13} color="#ef4444" /> Revision Cloud Polygon</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activePortal === 'canvas' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={addText} style={prominentBtnStyle('#0284c7')}><Type size={13} /> Add Text</button>
            <label style={prominentBtnStyle('#059669')}>
              <ImageIcon size={13} /> Add Image
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </label>
            <button onClick={saveProjectJson} style={prominentBtnStyle('#0284c7')}><Save size={13} /> Save JSON</button>
            <label style={prominentBtnStyle('#0369a1')}>
              <Upload size={13} /> Load JSON
              <input type="file" accept=".json" onChange={loadProjectJson} style={{ display: 'none' }} />
            </label>
            <button onClick={exportCanvasToMp4} style={prominentBtnStyle('#8b5cf6')}><Play size={13} /> Render Canvas to MP4</button>
          </div>
        )}

        {activePortal === 'image' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px' }}>Brightness: {imgBrightness}</span>
            <input type="range" min="0.5" max="2" step="0.1" value={imgBrightness} onChange={(e) => setImgBrightness(e.target.value)} />
            <span style={{ fontSize: '11px' }}>Blur: {imgBlur}</span>
            <input type="range" min="0" max="10" step="0.5" value={imgBlur} onChange={(e) => setImgBlur(e.target.value)} />
            <label style={prominentBtnStyle('#0284c7')}>
              <Sliders size={13} /> Upload & Fine-Tune Image
              <input type="file" accept="image/*" onChange={handleImageFineTune} style={{ display: 'none' }} />
            </label>
          </div>
        )}

        {activePortal === 'video' && (
          <form onSubmit={handleVideoStitch} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Stitch Audio & Video Tracks:</span>
            <input type="file" name="video" accept="video/*" required style={{ fontSize: '10px' }} />
            <input type="file" name="audio" accept="audio/*" required style={{ fontSize: '10px' }} />
            <button type="submit" style={prominentBtnStyle('#8b5cf6')}><Music size={13} /> Stitch Tracks</button>
          </form>
        )}

        {activePortal === 'transcribe' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={prominentBtnStyle('#ec4899')}>
              <Mic size={13} /> Transcribe Media to Canvas
              <input type="file" accept="audio/*,video/*" onChange={handleTranscription} style={{ display: 'none' }} />
            </label>
            <label style={prominentBtnStyle('#d946ef')}>
              <Captions size={13} /> Auto-Subtitle Video (MP4)
              <input type="file" accept="video/*" onChange={handleAutoSubtitleVideo} style={{ display: 'none' }} />
            </label>
          </div>
        )}

      </div>

      {/* 3. TEXT FORMATTING INSPECTOR BAR */}
      <div style={{ height: '36px', minHeight: '36px', backgroundColor: bgBar, borderBottom: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', padding: '0 10px', gap: '8px', zIndex: 25, boxSizing: 'border-box', overflowX: 'auto' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7', whiteSpace: 'nowrap' }}>Text Inspector:</span>

        {activeEditingObject && (
          <button 
            onClick={exitTextEditing} 
            title="Exit Text Box Editing Focus" 
            style={prominentBtnStyle('#ef4444')}
          >
            <LogOut size={12} /> Exit Text Box / Done
          </button>
        )}

        {/* ALL AVAILABLE GOOGLE FONTS DROPDOWN */}
        <select 
          value={fontFamilyVal} 
          onChange={(e) => { setFontFamilyVal(e.target.value); updateActiveTextProp('fontFamily', e.target.value); }}
          style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '3px', backgroundColor: bgMain, color: textColor, border: `1px solid ${borderCol}` }}
        >
          <optgroup label="Modern Sans-Serif">
            <option value="Arial">Arial</option>
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Poppins">Poppins</option>
            <option value="Open Sans">Open Sans</option>
            <option value="Lato">Lato</option>
            <option value="Nunito">Nunito</option>
            <option value="Raleway">Raleway</option>
            <option value="Helvetica">Helvetica</option>
          </optgroup>
          
          <optgroup label="Classic Serif">
            <option value="Times New Roman">Times New Roman</option>
            <option value="Playfair Display">Playfair Display</option>
            <option value="Merriweather">Merriweather</option>
            <option value="Lora">Lora</option>
            <option value="Georgia">Georgia</option>
            <option value="Cinzel">Cinzel</option>
            <option value="Cormorant Garamond">Cormorant Garamond</option>
            <option value="Garamond">Garamond</option>
          </optgroup>

          <optgroup label="Handwriting & Cursive">
            <option value="Pacifico">Pacifico</option>
            <option value="Dancing Script">Dancing Script</option>
            <option value="Caveat">Caveat</option>
            <option value="Great Vibes">Great Vibes</option>
            <option value="Satisfy">Satisfy</option>
            <option value="Permanent Marker">Permanent Marker</option>
            <option value="Sacramento">Sacramento</option>
            <option value="Courgette">Courgette</option>
          </optgroup>

          <optgroup label="Display & Heavy Impact">
            <option value="Impact">Impact</option>
            <option value="Bebas Neue">Bebas Neue</option>
            <option value="Anton">Anton</option>
            <option value="Oswald">Oswald</option>
            <option value="Lobster">Lobster</option>
            <option value="Bungee">Bungee</option>
            <option value="Orbitron">Orbitron</option>
            <option value="Bangers">Bangers</option>
            <option value="Press Start 2P">Press Start 2P (Retro 8-Bit)</option>
          </optgroup>

          <optgroup label="Coding & Monospace">
            <option value="Courier New">Courier New</option>
            <option value="Fira Code">Fira Code</option>
            <option value="JetBrains Mono">JetBrains Mono</option>
            <option value="Source Code Pro">Source Code Pro</option>
            <option value="Consolas">Consolas</option>
          </optgroup>
        </select>

        <input 
          type="number" 
          min="8" 
          max="120" 
          value={fontSizeVal} 
          onChange={(e) => { setFontSizeVal(Number(e.target.value)); updateActiveTextProp('fontSize', Number(e.target.value)); }}
          style={{ width: '45px', padding: '2px 4px', fontSize: '11px', borderRadius: '3px', backgroundColor: bgMain, color: textColor, border: `1px solid ${borderCol}` }}
        />

        <div style={{ width: '1px', height: '16px', backgroundColor: borderCol }} />

        <button onClick={() => { const next = !isBoldVal; setIsBoldVal(next); updateActiveTextProp('fontWeight', next ? 'bold' : 'normal'); }} style={inspectorToggleBtnStyle(isBoldVal)}><b>B</b></button>
        <button onClick={() => { const next = !isItalicVal; setIsItalicVal(next); updateActiveTextProp('fontStyle', next ? 'italic' : 'normal'); }} style={inspectorToggleBtnStyle(isItalicVal)}><i>I</i></button>
        <button onClick={() => { const next = !isUnderlineVal; setIsUnderlineVal(next); updateActiveTextProp('underline', next); }} style={inspectorToggleBtnStyle(isUnderlineVal)}><u>U</u></button>

        <div style={{ width: '1px', height: '16px', backgroundColor: borderCol }} />

        {/* TEXT EFFECT BUTTONS: SHADOW & STROKE OUTLINE */}
        <button title="Apply Text Drop Shadow" onClick={() => applyTextShadow('#000000', 8)} style={inspectorToggleBtnStyle(false)}>Shadow</button>
        <button title="Apply Text Outline Stroke" onClick={() => applyTextStroke('#000000', 2)} style={inspectorToggleBtnStyle(false)}>Outline</button>

        <div style={{ width: '1px', height: '16px', backgroundColor: borderCol }} />

        <button title="Align Left" onClick={() => { setTextAlignVal('left'); updateActiveTextProp('textAlign', 'left'); }} style={inspectorToggleBtnStyle(textAlignVal === 'left')}><AlignLeft size={13} /></button>
        <button title="Align Center" onClick={() => { setTextAlignVal('center'); updateActiveTextProp('textAlign', 'center'); }} style={inspectorToggleBtnStyle(textAlignVal === 'center')}><AlignCenter size={13} /></button>
        <button title="Align Right" onClick={() => { setTextAlignVal('right'); updateActiveTextProp('textAlign', 'right'); }} style={inspectorToggleBtnStyle(textAlignVal === 'right')}><AlignRight size={13} /></button>

        <div style={{ width: '1px', height: '16px', backgroundColor: borderCol }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Font Color:
          <input 
            type="color" 
            value={ensureValidHexColor(textColorVal, '#0f172a')} 
            onChange={(e) => { setTextColorVal(e.target.value); updateActiveTextProp('fill', e.target.value); }} 
            style={{ width: '20px', height: '20px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} 
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          BG Color:
          <input 
            type="color" 
            value={ensureValidHexColor(textBgColorVal, '#ffffff')} 
            onChange={(e) => { setTextBgColorVal(e.target.value); updateActiveTextProp('textBackgroundColor', e.target.value); }} 
            style={{ width: '20px', height: '20px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} 
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Opacity:
          <input type="range" min="0.1" max="1" step="0.05" value={textOpacityVal} onChange={(e) => { setTextOpacityVal(Number(e.target.value)); updateActiveTextProp('opacity', Number(e.target.value)); }} style={{ width: '50px', cursor: 'pointer', accentColor: '#0284c7' }} />
        </label>
      </div>

      {/* 4. MAIN ISOLATED PORTAL WORKSPACE */}
      <div className="custom-scroll" style={{ display: 'flex', flex: 1, overflowY: 'auto', boxSizing: 'border-box' }}>

        {/* --- PORTAL TYPE A: PDF DOCUMENT PORTAL --- */}
        {(activePortal === 'pdf' || activePortal === 'canvas' || activePortal === 'image' || activePortal === 'transcribe') && (
          <div style={{ display: 'flex', width: '100%', minHeight: '100%' }}>
            {activePortal === 'pdf' && (
              <div style={{ width: '160px', minWidth: '160px', backgroundColor: bgBar, borderRight: `1px solid ${borderCol}`, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>Page Navigator</span>
                {thumbnails.length === 0 && <p style={{ fontSize: '10px', color: '#94a3b8' }}>Open a PDF to view page thumbnails.</p>}
                {thumbnails.map((thumbUrl, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => changePdfPage(idx + 1)}
                    style={{ 
                      border: pageNum === idx + 1 ? '2px solid #0284c7' : `1px solid ${borderCol}`, 
                      borderRadius: '4px', 
                      padding: '2px', 
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

            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: '16px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '820px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8' }}>Status: {status}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: bgBar, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${borderCol}` }}>
                    <button title="Zoom Out" onClick={() => handleZoom(zoomLevel - 0.1)} style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer' }}><ZoomOut size={13} /></button>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
                    <button title="Zoom In" onClick={() => handleZoom(zoomLevel + 0.1)} style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer' }}><ZoomIn size={13} /></button>
                    <button title="Fit Viewport" onClick={resetZoom} style={{ background: 'transparent', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', marginLeft: '4px' }}>Fit</button>
                  </div>
                </div>

                {/* CANVAS CONTAINER WITH FLOATING EXIT BUTTON FOR TEXT BOXES */}
                <div style={{ position: 'relative', border: `2px solid ${borderCol}`, boxShadow: '0 8px 12px -3px rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                  
                  {activeEditingObject && (
                    <button 
                      onClick={exitTextEditing}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                      }}
                      title="Exit Text Editing Session & Deselect"
                    >
                      <X size={12} /> Close Text Box
                    </button>
                  )}

                  <canvas ref={canvasRef} />
                </div>

                {transcriptionText && (
                  <div style={{ width: '820px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '12px', borderRadius: '6px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Transcription Output:</h3>
                    <p style={{ fontSize: '12px', margin: 0, lineHeight: '1.4' }}>{transcriptionText}</p>
                  </div>
                )}
              </div>

              {/* VISUAL LAYERS MANAGER PANEL SIDEBAR */}
              <div style={{ width: '200px', minWidth: '200px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={14} /> Layers Stack ({canvasLayers.length})
                </span>

                {canvasLayers.length === 0 && (
                  <p style={{ fontSize: '10px', color: '#94a3b8' }}>No layers on canvas yet. Add text, shapes, or images.</p>
                )}

                {canvasLayers.map((obj, idx) => (
                  <div
                    key={idx}
                    onClick={() => { fabricCanvas.setActiveObject(obj); fabricCanvas.renderAll(); }}
                    style={{
                      padding: '6px 8px',
                      backgroundColor: fabricCanvas?.getActiveObject() === obj ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
                      border: `1px solid ${fabricCanvas?.getActiveObject() === obj ? '#0284c7' : borderCol}`,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85px' }}>
                      {obj.text ? `"${obj.text.substring(0, 10)}..."` : (obj.type || 'Layer')}
                    </span>

                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button title="Bring to Front" onClick={(e) => { e.stopPropagation(); bringLayerToFront(obj); }} style={miniLayerBtnStyle}>↑</button>
                      <button title="Send to Back" onClick={(e) => { e.stopPropagation(); sendLayerToBack(obj); }} style={miniLayerBtnStyle}>↓</button>
                      <button title="Lock / Unlock" onClick={(e) => { e.stopPropagation(); toggleLayerLock(obj); }} style={miniLayerBtnStyle}>
                        {obj.selectable === false ? <Lock size={10} color="#f59e0b" /> : <Unlock size={10} />}
                      </button>
                      <button title="Show / Hide" onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(obj); }} style={miniLayerBtnStyle}>
                        {obj.visible === false ? <EyeOff size={10} color="#ef4444" /> : <Eye size={10} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* --- PORTAL TYPE B: DEDICATED ISOLATED VIDEO & AUDIO PORTAL --- */}
        {activePortal === 'video' && (
          <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ width: '860px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Film size={20} /> Dedicated Video Preview Portal & Timeline Studio
                </span>
                {videoPreviewUrl && (
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                    Media Loaded & Synced
                  </span>
                )}
              </div>

              <div style={{ width: '100%', height: '420px', backgroundColor: '#000000', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: `1px solid ${borderCol}` }}>
                {videoPreviewUrl ? (
                  <video
                    ref={videoRef}
                    src={videoPreviewUrl}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ color: '#64748b', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Film size={40} />
                    <span>No video active. Stitch media tracks, render canvas animations, or auto-subtitle a video to preview here.</span>
                  </div>
                )}
              </div>

              <TimelineEditor 
                tracks={[
                  { id: 't1', name: 'Video Track 1', type: 'video', isMuted: false, isLocked: false },
                  { id: 't2', name: 'Audio Track 1', type: 'audio', isMuted: false, isLocked: false },
                  { id: 't3', name: 'Graphics & Overlays', type: 'image', isMuted: false, isLocked: false },
                  { id: 't4', name: 'Whisper Subtitle Track', type: 'transcription', isMuted: false, isLocked: false },
                ]}
                clips={clips}
                currentTime={timelineSec}
                duration={videoDuration}
                isPlaying={isPlaying}
                onPlayPauseToggle={togglePlayPause}
                onScrub={handleTimelineScrub}
                darkMode={darkMode}
              />
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

// Button & Helper Styles
const miniLayerBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  padding: '2px 4px',
  fontSize: '10px',
  borderRadius: '2px',
};

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
  whiteSpace: 'nowrap',
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
  whiteSpace: 'nowrap',
};

const doneHeaderBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 10px',
  backgroundColor: '#10b981',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
};

const enableEditBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 10px',
  backgroundColor: '#f59e0b',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
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
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
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

const inspectorToggleBtnStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3px 7px',
  backgroundColor: active ? '#0284c7' : 'transparent',
  color: active ? '#ffffff' : 'inherit',
  border: '1px solid #334155',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
});

const dropdownMenuStyle = (bg, border) => ({
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '3px',
  backgroundColor: bg,
  border: `1px solid ${border}`,
  borderRadius: '6px',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
  padding: '4px',
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
  minWidth: '160px',
  zIndex: 50,
});

const dropdownItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 8px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  textAlign: 'left',
  width: '100%',
};