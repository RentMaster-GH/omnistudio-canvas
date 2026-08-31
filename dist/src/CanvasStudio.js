"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CanvasStudio;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const fabric = __importStar(require("fabric"));
const axios_1 = __importDefault(require("axios"));
const lucide_react_1 = require("lucide-react");
const API_BASE = 'http://localhost:5000/api';
function CanvasStudio() {
    const canvasRef = (0, react_1.useRef)(null);
    const [fabricCanvas, setFabricCanvas] = (0, react_1.useState)(null);
    const [activeTab, setActiveTab] = (0, react_1.useState)('canvas'); // 'canvas' | 'image' | 'video' | 'pdf' | 'transcribe'
    const [status, setStatus] = (0, react_1.useState)('Ready');
    const [transcriptionText, setTranscriptionText] = (0, react_1.useState)('');
    // Image Fine-tuning state
    const [imgBrightness, setImgBrightness] = (0, react_1.useState)(1);
    const [imgBlur, setImgBlur] = (0, react_1.useState)(0);
    // PDF state
    const [pdfText, setPdfText] = (0, react_1.useState)('');
    // Initialize Fabric.js Canvas
    (0, react_1.useEffect)(() => {
        const canvas = new fabric.Canvas(canvasRef.current, {
            width: 800,
            height: 450,
            backgroundColor: '#ffffff',
        });
        setFabricCanvas(canvas);
        return () => canvas.dispose();
    }, []);
    // --- CANVAS HANDLERS ---
    const addText = () => {
        if (!fabricCanvas)
            return;
        const text = new fabric.IText('Edit this text', {
            left: 100,
            top: 100,
            fontSize: 28,
            fill: '#000000',
        });
        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
    };
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !fabricCanvas)
            return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const imgObj = await fabric.FabricImage.fromURL(event.target.result);
            imgObj.scaleToWidth(300);
            fabricCanvas.add(imgObj);
            fabricCanvas.setActiveObject(imgObj);
        };
        reader.readAsDataURL(file);
    };
    const deleteSelected = () => {
        if (!fabricCanvas)
            return;
        const activeObjects = fabricCanvas.getActiveObjects();
        activeObjects.forEach((obj) => fabricCanvas.remove(obj));
        fabricCanvas.discardActiveObject();
    };
    const exportCanvasImage = () => {
        if (!fabricCanvas)
            return;
        const dataURL = fabricCanvas.toDataURL({ format: 'png' });
        const link = document.createElement('a');
        link.download = 'canvas-export.png';
        link.href = dataURL;
        link.click();
    };
    // --- BACKEND API HANDLERS ---
    // Goal 1: Image Fine-Tuning (via Sharp backend)
    const handleImageFineTune = async (e) => {
        const file = e.target.files[0];
        if (!file)
            return;
        setStatus('Fine-tuning image with Sharp backend...');
        const formData = new FormData();
        formData.append('image', file);
        formData.append('brightness', imgBrightness);
        formData.append('blur', imgBlur);
        formData.append('format', 'png');
        try {
            const res = await axios_1.default.post(`${API_BASE}/image/edit`, formData);
            const imageUrl = `http://localhost:5000/outputs/${res.data.file}`;
            // Load processed image onto canvas
            const imgObj = await fabric.FabricImage.fromURL(imageUrl);
            imgObj.scaleToWidth(350);
            fabricCanvas.add(imgObj);
            setStatus('Image fine-tuned and added to canvas!');
        }
        catch (err) {
            setStatus(`Error: ${err.message}`);
        }
    };
    // Goal 3: Audio + Video Stitching (via FFmpeg backend)
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
            const res = await axios_1.default.post(`${API_BASE}/video/stitch`, formData);
            const fileUrl = `http://localhost:5000/outputs/${res.data.file}`;
            setStatus(`Stitching Complete! Output: ${fileUrl}`);
            window.open(fileUrl, '_blank');
        }
        catch (err) {
            setStatus(`Error stitching: ${err.message}`);
        }
    };
    // Goal 1 & Document: Add Text to PDF
    const handlePdfEdit = async (e) => {
        e.preventDefault();
        const pdfFile = e.target.pdf.files[0];
        if (!pdfFile || !pdfText)
            return;
        setStatus('Adding text overlay to PDF document...');
        const formData = new FormData();
        formData.append('pdf', pdfFile);
        formData.append('text', pdfText);
        formData.append('x', 50);
        formData.append('y', 700);
        formData.append('fontSize', 20);
        try {
            const res = await axios_1.default.post(`${API_BASE}/image/pdf/add-text`, formData);
            const fileUrl = `http://localhost:5000/outputs/${res.data.file}`;
            setStatus('PDF successfully edited!');
            window.open(fileUrl, '_blank');
        }
        catch (err) {
            setStatus(`Error editing PDF: ${err.message}`);
        }
    };
    // Goal 5: AI Transcription (via Whisper backend)
    const handleTranscription = async (e) => {
        const file = e.target.files[0];
        if (!file)
            return;
        setStatus('Transcribing media with Whisper AI...');
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios_1.default.post(`${API_BASE}/transcribe`, formData);
            const text = res.data.transcription.text;
            setTranscriptionText(text);
            // Auto-add transcription onto canvas
            const textObj = new fabric.IText(text, {
                left: 50,
                top: 350,
                fontSize: 18,
                fill: '#1e293b',
                width: 700,
                splitByGrapheme: true,
            });
            fabricCanvas.add(textObj);
            setStatus('Transcription complete & placed on canvas!');
        }
        catch (err) {
            setStatus(`Error: ${err.response?.data?.error || err.message}`);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f1f5f9' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { width: '80px', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', gap: '20px' }, children: [(0, jsx_runtime_1.jsx)("button", { title: "Canvas Tools", onClick: () => setActiveTab('canvas'), style: navIconStyle(activeTab === 'canvas'), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Type, { size: 22 }) }), (0, jsx_runtime_1.jsx)("button", { title: "Image Filters", onClick: () => setActiveTab('image'), style: navIconStyle(activeTab === 'image'), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Sliders, { size: 22 }) }), (0, jsx_runtime_1.jsx)("button", { title: "Video & Audio", onClick: () => setActiveTab('video'), style: navIconStyle(activeTab === 'video'), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Video, { size: 22 }) }), (0, jsx_runtime_1.jsx)("button", { title: "PDF Document", onClick: () => setActiveTab('pdf'), style: navIconStyle(activeTab === 'pdf'), children: (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 22 }) }), (0, jsx_runtime_1.jsx)("button", { title: "AI Transcribe", onClick: () => setActiveTab('transcribe'), style: navIconStyle(activeTab === 'transcribe'), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Mic, { size: 22 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { width: '280px', backgroundColor: '#1e293b', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { fontSize: '18px', fontWeight: 'bold' }, children: "OmniStudio Tools" }), activeTab === 'canvas' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { onClick: addText, style: btnStyle, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Type, { size: 18 }), " Add Text Box"] }), (0, jsx_runtime_1.jsxs)("label", { style: btnStyle, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Image, { size: 18 }), " Add Image", (0, jsx_runtime_1.jsx)("input", { type: "file", accept: "image/*", onChange: handleImageUpload, style: { display: 'none' } })] }), (0, jsx_runtime_1.jsxs)("button", { onClick: deleteSelected, style: { ...btnStyle, backgroundColor: '#ef4444' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 18 }), " Delete Selected"] }), (0, jsx_runtime_1.jsx)("hr", { style: { borderColor: '#334155', margin: '10px 0' } }), (0, jsx_runtime_1.jsxs)("button", { onClick: exportCanvasImage, style: { ...btnStyle, backgroundColor: '#10b981' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 18 }), " Export Canvas (PNG)"] })] })), activeTab === 'image' && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [(0, jsx_runtime_1.jsx)("h3", { children: "Image Fine-Tuning" }), (0, jsx_runtime_1.jsxs)("label", { style: { fontSize: '12px' }, children: ["Brightness: ", imgBrightness] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "0.5", max: "2", step: "0.1", value: imgBrightness, onChange: (e) => setImgBrightness(e.target.value) }), (0, jsx_runtime_1.jsxs)("label", { style: { fontSize: '12px' }, children: ["Blur: ", imgBlur] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "0", max: "10", step: "0.5", value: imgBlur, onChange: (e) => setImgBlur(e.target.value) }), (0, jsx_runtime_1.jsxs)("label", { style: { ...btnStyle, marginTop: '10px' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Sliders, { size: 18 }), " Apply & Upload Image", (0, jsx_runtime_1.jsx)("input", { type: "file", accept: "image/*", onChange: handleImageFineTune, style: { display: 'none' } })] })] })), activeTab === 'video' && ((0, jsx_runtime_1.jsxs)("form", { onSubmit: handleVideoStitch, style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [(0, jsx_runtime_1.jsx)("h3", { children: "Stitch Audio + Video" }), (0, jsx_runtime_1.jsx)("label", { style: { fontSize: '12px' }, children: "Video File:" }), (0, jsx_runtime_1.jsx)("input", { type: "file", name: "video", accept: "video/*", required: true, style: { fontSize: '12px' } }), (0, jsx_runtime_1.jsx)("label", { style: { fontSize: '12px' }, children: "Audio File:" }), (0, jsx_runtime_1.jsx)("input", { type: "file", name: "audio", accept: "audio/*", required: true, style: { fontSize: '12px' } }), (0, jsx_runtime_1.jsxs)("button", { type: "submit", style: { ...btnStyle, marginTop: '10px', backgroundColor: '#8b5cf6' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Music, { size: 18 }), " Stitch & Render MP4"] })] })), activeTab === 'pdf' && ((0, jsx_runtime_1.jsxs)("form", { onSubmit: handlePdfEdit, style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [(0, jsx_runtime_1.jsx)("h3", { children: "Edit PDF Document" }), (0, jsx_runtime_1.jsx)("label", { style: { fontSize: '12px' }, children: "Text to Add:" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: pdfText, onChange: (e) => setPdfText(e.target.value), placeholder: "Type text here...", required: true, style: { padding: '8px', borderRadius: '4px', border: 'none' } }), (0, jsx_runtime_1.jsx)("label", { style: { fontSize: '12px' }, children: "Upload PDF:" }), (0, jsx_runtime_1.jsx)("input", { type: "file", name: "pdf", accept: ".pdf", required: true, style: { fontSize: '12px' } }), (0, jsx_runtime_1.jsxs)("button", { type: "submit", style: { ...btnStyle, marginTop: '10px', backgroundColor: '#0284c7' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 18 }), " Save & Open PDF"] })] })), activeTab === 'transcribe' && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [(0, jsx_runtime_1.jsx)("h3", { children: "Whisper AI Speech-to-Text" }), (0, jsx_runtime_1.jsx)("p", { style: { fontSize: '12px', color: '#94a3b8' }, children: "Upload any video or audio to automatically generate subtitles onto your canvas." }), (0, jsx_runtime_1.jsxs)("label", { style: { ...btnStyle, backgroundColor: '#ec4899' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Mic, { size: 18 }), " Upload Media & Transcribe", (0, jsx_runtime_1.jsx)("input", { type: "file", accept: "audio/*,video/*", onChange: handleTranscription, style: { display: 'none' } })] })] }))] }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '15px', color: '#334155', fontWeight: 'bold' }, children: ["Status: ", (0, jsx_runtime_1.jsx)("span", { style: { color: '#2563eb' }, children: status })] }), (0, jsx_runtime_1.jsx)("div", { style: { border: '2px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }, children: (0, jsx_runtime_1.jsx)("canvas", { ref: canvasRef }) }), transcriptionText && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '20px', width: '800px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }, children: "Transcription Text:" }), (0, jsx_runtime_1.jsx)("p", { style: { color: '#334155', fontSize: '14px' }, children: transcriptionText })] }))] })] }));
}
const navIconStyle = (active) => ({
    backgroundColor: active ? '#3b82f6' : 'transparent',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    cursor: 'pointer',
});
const btnStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 15px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
};
