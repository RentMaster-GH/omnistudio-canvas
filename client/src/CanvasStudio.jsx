import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Type, Image as ImageIcon, Video, Mic, Download, Trash2, Sliders, FileText, 
  Music, Play, Pause, Captions, Save, Upload, Layers, Sun, Moon, Eraser, ChevronLeft, 
  ChevronRight, Eye, PanelLeftClose, PanelLeftOpen, ZoomIn, ZoomOut, RotateCcw, RotateCw, Hand, MousePointer, 
  Highlighter, Pencil, Stamp, Square, Circle, Minus, Cloud, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  MoveRight, Triangle, Activity, Search, Printer, Share2, CheckCircle2, Check, X,
  PenTool, Link, Crop, Layout, FileCog, RefreshCw, Target, Edit3, ShieldAlert, Lock, Film
} from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://omnistudio-canvas-api.onrender.com/api';

export default function CanvasStudio() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null); // Dedicated Video Player Ref

  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [activePortal, setActivePortal] = useState('pdf');
  const [darkMode, setDarkMode] = useState(true);
  const [status, setStatus] = useState('Ready - View Mode');

  const [isEditMode, setIsEditMode] = useState(false);

  // Tool Modes: 'hand' | 'select' | 'draw' | 'highlight' | 'pointReplace' | 'redact' | 'flatten'
  const [activeTool, setActiveTool] = useState('hand');
  const activeToolRef = useRef('hand');
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [signatureName, setSignatureName] = useState('John Doe');

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Text Inspector State
  const [fontFamilyVal, setFontFamilyVal] = useState('Arial');
  const [fontSizeVal, setFontSizeVal] = useState(24);
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

  // Dedicated Video Portal & Timeline State
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineSec, setTimelineSec] = useState(0);
  const [videoDuration, setVideoDuration] = useState(30);
  const [transcriptionText, setTranscriptionText] = useState('');

  const [imgBrightness, setImgBrightness] = useState(1);
  const [imgBlur, setImgBlur] = useState(0);

  // Drag-to-Pan Hand Cursor State
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

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

    // DRAG-TO-PAN HAND CURSOR ENGINE
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

    canvas.on('selection:created', (e) => updateInspectorFromSelection(e.selected[0]));
    canvas.on('selection:updated', (e) => updateInspectorFromSelection(e.selected[0]));

    setFabricCanvas(canvas);
    saveState(canvas);

    return () => canvas.dispose();
  }, []);

  // --- UNDO & REDO HANDLERS ---
  const handleUndo = () => {
    if (undoStack.length <= 1 || !fabricCanvas) return;
    const current = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, undoStack.length - 1);
    const previous = newUndo[newUndo.length - 1];

    setRedoStack((prev) => [current, ...prev]);
    setUndoStack(newUndo);

    fabricCanvas.loadFromJSON(previous, () => {
      fabricCanvas.renderAll();
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !fabricCanvas) return;
    const next = redoStack[0];
    const newRedo = redoStack.slice(1);

    setUndoStack((prev) => [...prev, next]);
    setRedoStack(newRedo);

    fabricCanvas.loadFromJSON(next, () => {
      fabricCanvas.renderAll();
    });
  };

  // --- DEDICATED VIDEO PORTAL & TIMELINE CONTROLS ---
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimelineScrub = (e) => {
    const newTime = parseFloat(e.target.value);
    setTimelineSec(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setTimelineSec(videoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration || 30);
    }
  };

  // --- MOUSEUP INITIALIZER ENGINE ---
  const handleMouseUpInitializer = (canvas, opt) => {
    const currentMode = activeToolRef.current;
    if (currentMode === 'hand' || isPanningRef.current) return;

    const pointer = canvas.getPointer(opt.e);
    const activeObj = canvas.getActiveObject() || opt.target;

    let bounds = {
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
      executeRedactionOnMouseUp(canvas, activeObj, bounds);
    } else if (currentMode === 'flatten') {
      executeFlattenOnMouseUp(canvas);
    } else if (currentMode === 'pointReplace') {
      executePointReplaceOnMouseUp(canvas, activeObj, bounds);
    }
  };

  const executeRedactionOnMouseUp = (canvas, activeObj, bounds) => {
    const redactStyle = prompt('MouseUp Captured Quads!\nSelect Redaction Type:\nType "blackout" for Security Black Box, or "whiteout" for Clean Erasure:', 'blackout');
    if (!redactStyle) {
      activateToolMode('select');
      return;
    }

    const replacementText = prompt('Enter Overlay Replacement Text (leave empty for Security Redaction only):');

    const redactionBox = new fabric.Rect({
      left: bounds.left - 2,
      top: bounds.top - 2,
      width: bounds.width,
      height: bounds.height,
      fill: redactStyle.toLowerCase() === 'blackout' ? '#000000' : '#ffffff',
      stroke: '#ef4444',
      strokeWidth: 1.5,
    });

    if (activeObj) canvas.remove(activeObj);
    canvas.add(redactionBox);

    if (replacementText) {
      const overlayText = new fabric.IText(replacementText, {
        left: bounds.left + 2,
        top: bounds.top + 2,
        fontSize: fontSizeVal,
        fontFamily: fontFamilyVal,
        fill: redactStyle.toLowerCase() === 'blackout' ? '#ffffff' : textColorVal,
      });
      canvas.add(overlayText);
      canvas.setActiveObject(overlayText);
    }

    activateToolMode('select');
    canvas.renderAll();
    saveState(canvas);
    setStatus('🛡️ Redaction & Overlay Initialized!');
  };

  const executeFlattenOnMouseUp = (canvas) => {
    if (!confirm('Execute Flatten operation to permanently merge all annotations into static page layer?')) {
      activateToolMode('select');
      return;
    }

    setStatus('🔒 Executing Flatten Operation...');
    const flattenedDataUrl = canvas.toDataURL({ format: 'png', quality: 1.0 });

    fabric.FabricImage.fromURL(flattenedDataUrl).then((flattenedImg) => {
      canvas.clear();
      canvas.setDimensions({ width: 820, height: 480 });
      flattenedImg.set({ left: 0, top: 0, selectable: false });
      canvas.add(flattenedImg);
      canvas.sendObjectToBack(flattenedImg);
      
      activateToolMode('select');
      canvas.renderAll();
      saveState(canvas);
      setStatus('🔒 PDF Annotation Layer permanently flattened!');
    });
  };

  const executePointReplaceOnMouseUp = (canvas, activeObj, bounds) => {
    const replaceText = prompt(`Auto-Extracted PDF Text:\n\nEnter Replacement Text:`, bounds.extractedText);
    if (replaceText === null) {
      activateToolMode('select');
      return;
    }

    const matchStyle = confirm('Match extracted document font style?\n\nOK = Match Style\nCancel = Custom Style');

    const whiteout = new fabric.Rect({
      left: bounds.left - 2,
      top: bounds.top - 2,
      width: Math.max(bounds.width, replaceText.length * (bounds.fontSize * 0.5) + 15),
      height: bounds.height,
      fill: '#ffffff',
      stroke: '#cbd5e1',
      strokeWidth: 1,
    });

    const newTextObj = new fabric.IText(replaceText, {
      left: bounds.left,
      top: bounds.top,
      fontSize: matchStyle ? bounds.fontSize : fontSizeVal,
      fontFamily: matchStyle ? bounds.fontFamily : fontFamilyVal,
      fill: matchStyle ? bounds.fill : textColorVal,
    });

    if (activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text')) {
      canvas.remove(activeObj);
    }

    canvas.add(whiteout);
    canvas.add(newTextObj);
    canvas.setActiveObject(newTextObj);

    activateToolMode('select');
    canvas.renderAll();
    saveState(canvas);
    setStatus(`Substituted text with "${replaceText}"!`);
  };

  const updateInspectorFromSelection = (obj) => {
    if (!obj || (obj.type !== 'i-text' && obj.type !== 'text')) return;
    setFontFamilyVal(obj.fontFamily || 'Arial');
    setFontSizeVal(obj.fontSize || 24);
    setTextColorVal(obj.fill === 'rgba(15, 23, 42, 0.01)' ? '#0f172a' : (obj.fill || '#0f172a'));
    setTextBgColorVal(obj.textBackgroundColor || '#ffffff');
    setTextOpacityVal(obj.opacity !== undefined ? obj.opacity : 1.0);
    setIsBoldVal(obj.fontWeight === 'bold');
    setIsItalicVal(obj.fontStyle === 'italic');
    setIsUnderlineVal(!!obj.underline);
    setTextAlignVal(obj.textAlign || 'left');
  };

  const saveState = (targetCanvas = fabricCanvas) => {
    if (!targetCanvas) return;
    const json = JSON.stringify(targetCanvas.toJSON());
    setUndoStack((prev) => [...prev, json]);
    setRedoStack([]);
  };

  const initializeEditProcess = () => {
    setIsEditMode(true);
    activateToolMode('select');
    setStatus('✏️ Edit Process Initialized! All tools unlocked.');
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
    setStatus('🛡️ Redact Mode Active! Drag area on document to Redact & Overlay.');
    activateToolMode('redact');
  };

  const activateFlattenMode = () => {
    if (!isEditMode) initializeEditProcess();
    setStatus('🔒 Flatten Mode Active! Click document to Flatten annotations.');
    activateToolMode('flatten');
  };

  const activatePointToReplace = () => {
    if (!isEditMode) initializeEditProcess();
    setStatus('🎯 Point & Replace Active! Click directly on text to Extract & Replace.');
    activateToolMode('pointReplace');
  };

  const handleFindAndReplace = () => {
    if (!isEditMode) initializeEditProcess();
    if (!fabricCanvas) return;

    const findText = prompt('Enter text to Find in PDF stream:', 'Entity');
    if (!findText) return;

    let targetObj = null;
    fabricCanvas.getObjects().forEach((obj) => {
      if ((obj.type === 'i-text' || obj.type === 'text') && obj.text.toLowerCase().includes(findText.toLowerCase())) {
        targetObj = obj;
      }
    });

    const extractedSentence = targetObj ? targetObj.text : findText;
    const replaceText = prompt(`Extracted Text: "${extractedSentence}"\n\nEnter Replacement Text:`, extractedSentence.replace(new RegExp(findText, 'gi'), 'New Text'));
    if (replaceText === null) return;

    let count = 0;
    fabricCanvas.getObjects().forEach((obj) => {
      if ((obj.type === 'i-text' || obj.type === 'text') && obj.text.toLowerCase().includes(findText.toLowerCase())) {
        const left = obj.left;
        const top = obj.top;

        const whiteout = new fabric.Rect({
          left: left - 2,
          top: top - 2,
          width: Math.max(100, (obj.width * (obj.scaleX || 1)) + 10),
          height: (obj.height * (obj.scaleY || 1)) + 6,
          fill: '#ffffff',
          stroke: '#cbd5e1',
          strokeWidth: 1,
        });

        const newText = new fabric.IText(replaceText, {
          left: left,
          top: top,
          fontSize: obj.fontSize || fontSizeVal,
          fontFamily: obj.fontFamily || fontFamilyVal,
          fill: textColorVal,
        });

        fabricCanvas.remove(obj);
        fabricCanvas.add(whiteout);
        fabricCanvas.add(newText);
        fabricCanvas.setActiveObject(newText);
        count++;
      }
    });

    if (count > 0) {
      fabricCanvas.renderAll();
      saveState();
      setStatus(`Replaced ${count} instance(s) in PDF stream!`);
    } else {
      alert(`Text "${findText}" not found. Click "Point & Replace" to click directly on target!`);
    }
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

    const canvasWidth = 820;
    const canvasHeight = 480;

    fabricCanvas.setDimensions({ width: canvasWidth, height: canvasHeight });

    const scale = Math.min((canvasWidth - 40) / imgObj.width, (canvasHeight - 40) / imgObj.height);
    imgObj.scale(scale);

    const left = (canvasWidth - imgObj.width * scale) / 2;
    const top = (canvasHeight - imgObj.height * scale) / 2;

    imgObj.set({ left, top, selectable: false });

    fabricCanvas.clear();
    fabricCanvas.add(imgObj);
    fabricCanvas.sendObjectToBack(imgObj);

    try {
      const textContent = await page.getTextContent();
      textContent.items.forEach((item) => {
        if (!item.str || !item.str.trim()) return;

        const tx = item.transform;
        const pdfX = tx[4] * (scale / 1.5) + left;
        const pdfY = (viewport.height - tx[5]) * (scale / 1.5) + top - 12;
        const fontSize = Math.max(12, (item.height || 14) * (scale / 1.5));

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
      await renderPdfPageOntoCanvas(loadedPdf, 1);
      setStatus(`PDF Loaded! Page 1 of ${loadedPdf.numPages} (View Mode - Hand Tool Active)`);
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
    await renderPdfPageOntoCanvas(pdfDoc, newPage);
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
        setStatus('Document shared successfully!');
      } catch (err) {
        setStatus('Share canceled');
      }
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
        setStatus(`Text match found: "${query}"`);
      }
    });

    if (!found) alert(`No text matching "${query}" found on current page.`);
  };

  const handleDone = () => {
    setStatus('✅ Document Editing Complete! All changes saved.');
    alert('🎉 Document editing is complete! You can download or export your page.');
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
    if (!activeObj) {
      alert('Please select an object or text on canvas first!');
      return;
    }

    const url = prompt('Enter URL Hyperlink for selected object:', 'https://');
    if (!url) return;

    activeObj.set('linkUrl', url);
    alert(`Hyperlink attached: ${url}`);
    saveState();
  };

  const handleCropTool = () => {
    if (!isEditMode) initializeEditProcess();
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj) {
      alert('Select an image or object to crop!');
      return;
    }
    activeObj.set({ width: activeObj.width * 0.8, height: activeObj.height * 0.8 });
    fabricCanvas.renderAll();
    saveState();
    setStatus('Image cropped!');
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
    setStatus(`Page layout toggled to ${isLandscape ? 'Portrait' : 'Landscape'}`);
  };

  const handleManagePages = () => {
    if (!pdfDoc) {
      alert('Please upload a PDF document first to manage pages!');
      return;
    }
    const action = prompt(`Manage Pages (Total: ${totalPages})\nType 'delete' to remove current page, or 'rotate' to rotate 90°:`);
    if (action === 'delete') {
      alert(`Page ${pageNum} removed from workspace.`);
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
    if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text')) {
      activeObject.set(prop, value);
      fabricCanvas.renderAll();
      saveState();
    }
  };

  const alignTextVertical = (pos) => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (!activeObject) return;

    const canvasHeight = fabricCanvas.height;
    const objHeight = activeObject.height * (activeObject.scaleY || 1);

    if (pos === 'top') {
      activeObject.set('top', 15);
    } else if (pos === 'middle') {
      activeObject.set('top', (canvasHeight - objHeight) / 2);
    } else if (pos === 'bottom') {
      activeObject.set('top', canvasHeight - objHeight - 15);
    }

    fabricCanvas.renderAll();
    saveState();
  };

  const addText = () => {
    if (!isEditMode) initializeEditProcess();
    if (!fabricCanvas) return;
    activateToolMode('select');
    const text = new fabric.IText('Edit text here', { 
      left: 150, 
      top: 150, 
      fontSize: fontSizeVal, 
      fontFamily: fontFamilyVal,
      fill: textColorVal,
      textBackgroundColor: textBgColorVal === '#ffffff' ? 'transparent' : textBgColorVal,
      opacity: textOpacityVal,
      fontWeight: isBoldVal ? 'bold' : 'normal',
      fontStyle: isItalicVal ? 'italic' : 'normal',
      underline: isUnderlineVal,
      textAlign: textAlignVal,
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    saveState();
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
      setStatus(`Animation exported! Loaded into Video Portal.`);
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
      setVideoPreviewUrl(fileUrl);
      setStatus(`Stitching Complete! Output loaded into Video Portal.`);
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
      setVideoPreviewUrl(videoUrl);
      setTranscriptionText(res.data.transcriptionText);
      setStatus(`Subtitled video ready! Loaded into Video Portal.`);
    } catch (err) {
      setStatus(`Error generating subtitled video: ${err.message}`);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
        <button onClick={() => setActivePortal('video')} style={portalTabStyle(activePortal === 'video')}><Video size={13} /> Video & Audio</button>
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

            <button title="Undo" onClick={handleUndo} disabled={undoStack.length <= 1} style={iconToolBtnStyle(false)}><RotateCcw size={14} /></button>
            <button title="Redo" onClick={handleRedo} disabled={redoStack.length === 0} style={iconToolBtnStyle(false)}><RotateCw size={14} /></button>
            
            <div style={{ width: '1px', height: '18px', backgroundColor: borderCol, margin: '0 2px' }} />

            <button title="Select Tool" onClick={() => activateToolMode('select')} style={iconToolBtnStyle(activeTool === 'select')}><MousePointer size={14} /></button>
            <button title="Hand / Drag-to-Pan Viewport Tool" onClick={() => activateToolMode('hand')} style={iconToolBtnStyle(activeTool === 'hand')}><Hand size={14} /></button>

            <div style={{ width: '1px', height: '18px', backgroundColor: borderCol, margin: '0 2px' }} />

            <button title="Add / Edit Text" onClick={addText} style={prominentBtnStyle('#0284c7')}>
              <Type size={14} /> Text
            </button>

            <button title="Redact & Overlay" onClick={activateRedactMode} style={prominentBtnStyle(activeTool === 'redact' ? '#991b1b' : '#dc2626')}>
              <ShieldAlert size={14} /> Redact & Overlay
            </button>

            <button title="Flatten PDF" onClick={activateFlattenMode} style={prominentBtnStyle(activeTool === 'flatten' ? '#6b21a8' : '#8b5cf6')}>
              <Lock size={14} /> Flatten PDF
            </button>

            <button title="Find & Replace" onClick={handleFindAndReplace} style={prominentBtnStyle('#0284c7')}>
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

            <button title="Add Green Checkmark" onClick={addCheckmark} style={prominentBtnStyle('#10b981')}>
              <Check size={14} /> Check
            </button>

            <button title="Add Red Crossmark" onClick={addCrossmark} style={prominentBtnStyle('#ef4444')}>
              <X size={14} /> Cross
            </button>

            <button title="Electronic Signature" onClick={addElectronicSignature} style={prominentBtnStyle('#8b5cf6')}>
              <PenTool size={14} /> Sign
            </button>

            <button title="Attach URL Link" onClick={attachLinkToSelection} style={prominentBtnStyle('#0284c7')}>
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

            <div style={{ position: 'relative' }}>
              <button onClick={() => setActiveDropdown(activeDropdown === 'moreTools' ? null : 'moreTools')} style={prominentBtnStyle('#475569')}>
                More Tools <ChevronRight size={11} />
              </button>
              {activeDropdown === 'moreTools' && (
                <div style={dropdownMenuStyle(bgBar, borderCol)}>
                  <button onClick={handleCropTool} style={dropdownItemStyle}><Crop size={13} /> Crop Image / Page</button>
                  <button onClick={() => handleZoom(zoomLevel + 0.1)} style={dropdownItemStyle}><ZoomIn size={13} /> Zoom In (+)</button>
                  <button onClick={() => handleZoom(zoomLevel - 0.1)} style={dropdownItemStyle}><ZoomOut size={13} /> Zoom Out (-)</button>
                  <hr style={{ borderColor: borderCol, margin: '3px 0' }} />
                  <button onClick={handlePageLayoutToggle} style={dropdownItemStyle}><Layout size={13} /> Page Layout (Portrait/Landscape)</button>
                  <button onClick={handleManagePages} style={dropdownItemStyle}><FileCog size={13} /> Manage Pages (Delete/Rotate)</button>
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
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Stitch Tracks:</span>
            <input type="file" name="video" accept="video/*" required style={{ fontSize: '10px' }} />
            <input type="file" name="audio" accept="audio/*" required style={{ fontSize: '10px' }} />
            <button type="submit" style={prominentBtnStyle('#8b5cf6')}><Music size={13} /> Stitch Audio+Video</button>
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

        <select 
          value={fontFamilyVal} 
          onChange={(e) => { setFontFamilyVal(e.target.value); updateActiveTextProp('fontFamily', e.target.value); }}
          style={{ padding: '2px 4px', fontSize: '11px', borderRadius: '3px', backgroundColor: bgMain, color: textColor, border: `1px solid ${borderCol}` }}
        >
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Impact">Impact</option>
          <option value="Trebuchet MS">Trebuchet MS</option>
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

        <button title="Align Left" onClick={() => { setTextAlignVal('left'); updateActiveTextProp('textAlign', 'left'); }} style={inspectorToggleBtnStyle(textAlignVal === 'left')}><AlignLeft size={13} /></button>
        <button title="Align Center" onClick={() => { setTextAlignVal('center'); updateActiveTextProp('textAlign', 'center'); }} style={inspectorToggleBtnStyle(textAlignVal === 'center')}><AlignCenter size={13} /></button>
        <button title="Align Right" onClick={() => { setTextAlignVal('right'); updateActiveTextProp('textAlign', 'right'); }} style={inspectorToggleBtnStyle(textAlignVal === 'right')}><AlignRight size={13} /></button>

        <div style={{ width: '1px', height: '16px', backgroundColor: borderCol }} />

        <button title="Align Text Top" onClick={() => alignTextVertical('top')} style={iconToolBtnStyle(false)}><AlignStartVertical size={13} /></button>
        <button title="Align Text Middle" onClick={() => alignTextVertical('middle')} style={iconToolBtnStyle(false)}><AlignCenterVertical size={13} /></button>
        <button title="Align Text Bottom" onClick={() => alignTextVertical('bottom')} style={iconToolBtnStyle(false)}><AlignEndVertical size={13} /></button>

        <div style={{ width: '1px', height: '16px', backgroundColor: borderCol }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Font Color:
          <input type="color" value={textColorVal} onChange={(e) => { setTextColorVal(e.target.value); updateActiveTextProp('fill', e.target.value); }} style={{ width: '20px', height: '20px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          BG Color:
          <input type="color" value={textBgColorVal} onChange={(e) => { setTextBgColorVal(e.target.value); updateActiveTextProp('textBackgroundColor', e.target.value); }} style={{ width: '20px', height: '20px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Opacity:
          <input type="range" min="0.1" max="1" step="0.05" value={textOpacityVal} onChange={(e) => { setTextOpacityVal(Number(e.target.value)); updateActiveTextProp('opacity', Number(e.target.value)); }} style={{ width: '50px', cursor: 'pointer', accentColor: '#0284c7' }} />
        </label>
      </div>

      {/* 4. MAIN WORKSPACE (Scrollable to View ALL Features) */}
      <div className="custom-scroll" style={{ display: 'flex', flex: 1, overflowY: 'auto', boxSizing: 'border-box' }}>

        {/* PAGE NAVIGATOR SIDEBAR */}
        {activePortal === 'pdf' && (
          <div style={{ width: '160px', minWidth: '160px', backgroundColor: bgBar, borderRight: `1px solid ${borderCol}`, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>Page Navigator</span>
            {thumbnails.length === 0 && <p style={{ fontSize: '10px', color: '#94a3b8' }}>Open a PDF to view thumbnails.</p>}
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

        {/* CENTER CONTENT DISPLAY */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxSizing: 'border-box' }}>
          
          {/* Status Header & Zoom Controls */}
          <div style={{ width: '820px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8' }}>Status: {status}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: bgBar, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${borderCol}` }}>
              <button title="Zoom Out" onClick={() => handleZoom(zoomLevel - 0.1)} style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer' }}><ZoomOut size={13} /></button>
              <span style={{ fontSize: '11px', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
              <button title="Zoom In" onClick={() => handleZoom(zoomLevel + 0.1)} style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer' }}><ZoomIn size={13} /></button>
              <button title="Fit Viewport" onClick={resetZoom} style={{ background: 'transparent', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', marginLeft: '4px' }}>Fit</button>
            </div>
          </div>

          {/* Document Canvas Display */}
          <div style={{ border: `2px solid ${borderCol}`, boxShadow: '0 8px 12px -3px rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
            <canvas ref={canvasRef} />
          </div>

          {/* DEDICATED VIDEO STUDIO & TIMELINE PORTAL */}
          <div style={{ width: '820px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Film size={16} /> Dedicated Video Preview Portal & Timeline Track
              </span>
              {videoPreviewUrl && (
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                  Media Loaded & Synced
                </span>
              )}
            </div>

            {/* Video Player Display */}
            <div style={{ width: '100%', height: '320px', backgroundColor: '#000000', borderRadius: '6px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: `1px solid ${borderCol}` }}>
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
                <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <Film size={32} />
                  <span>No video loaded. Stitch media, render canvas animation, or auto-subtitle a video to preview here.</span>
                </div>
              )}
            </div>

            {/* Video Playhead & Scrubber */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={togglePlayPause} 
                disabled={!videoPreviewUrl}
                style={{
                  backgroundColor: videoPreviewUrl ? '#0284c7' : '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: videoPreviewUrl ? 'pointer' : 'not-allowed'
                }}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                  <span><Layers size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Timeline Track</span>
                  <span style={{ fontWeight: 'bold', color: textColor }}>
                    {formatTime(timelineSec)} / {formatTime(videoDuration)}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={videoDuration} 
                  step="0.1"
                  value={timelineSec} 
                  onChange={handleTimelineScrub}
                  disabled={!videoPreviewUrl}
                  style={{ width: '100%', cursor: videoPreviewUrl ? 'pointer' : 'not-allowed', accentColor: '#8b5cf6' }}
                />
              </div>
            </div>
          </div>

          {/* Transcription Output Display */}
          {transcriptionText && (
            <div style={{ width: '820px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Transcription Output:</h3>
              <p style={{ fontSize: '12px', margin: 0, lineHeight: '1.4' }}>{transcriptionText}</p>
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