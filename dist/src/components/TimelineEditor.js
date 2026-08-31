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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TimelineEditor;
const jsx_runtime_1 = require("react/jsx-runtime");
// src/components/TimelineEditor.jsx
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
function TimelineEditor({ tracks = [], clips = [], currentTime = 0, duration = 30, isPlaying = false, onPlayPauseToggle = () => { }, onScrub = () => { }, darkMode = true, }) {
    const timelineRef = (0, react_1.useRef)(null);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = (0, react_1.useState)(false);
    // Time formatting helper
    const formatTime = (secs) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = Math.floor(secs % 60);
        const ms = Math.floor((secs % 1) * 10);
        return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}.${ms}`;
    };
    // Handle timeline click / drag scrubbing
    const handleTimelineClick = (e) => {
        if (!timelineRef.current)
            return;
        const rect = timelineRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        onScrub(percentage * duration);
    };
    const handleMouseDown = (e) => {
        setIsDraggingPlayhead(true);
        handleTimelineClick(e);
    };
    const handleMouseMove = (e) => {
        if (isDraggingPlayhead) {
            handleTimelineClick(e);
        }
    };
    const handleMouseUp = () => {
        setIsDraggingPlayhead(false);
    };
    const bgTrackHeader = darkMode ? '#1e293b' : '#f1f5f9';
    const bgTrackLane = darkMode ? '#0f172a' : '#ffffff';
    const borderCol = darkMode ? '#334155' : '#cbd5e1';
    const textColor = darkMode ? '#f8fafc' : '#0f172a';
    // Default track structure if empty
    const defaultTracks = tracks.length > 0 ? tracks : [
        { id: 't1', name: 'Video Track 1', type: 'video', isMuted: false, isLocked: false },
        { id: 't2', name: 'Audio Track 1', type: 'audio', isMuted: false, isLocked: false },
        { id: 't3', name: 'Graphics & Overlay', type: 'image', isMuted: false, isLocked: false },
        { id: 't4', name: 'Subtitle Track', type: 'transcription', isMuted: false, isLocked: false },
    ];
    const getTrackIcon = (type) => {
        switch (type) {
            case 'video': return (0, jsx_runtime_1.jsx)(lucide_react_1.Film, { size: 14, color: "#8b5cf6" });
            case 'audio': return (0, jsx_runtime_1.jsx)(lucide_react_1.Music, { size: 14, color: "#38bdf8" });
            case 'image': return (0, jsx_runtime_1.jsx)(lucide_react_1.Image, { size: 14, color: "#10b981" });
            case 'transcription': return (0, jsx_runtime_1.jsx)(lucide_react_1.Captions, { size: 14, color: "#ec4899" });
            default: return (0, jsx_runtime_1.jsx)(lucide_react_1.Type, { size: 14, color: "#f59e0b" });
        }
    };
    const getClipColor = (type) => {
        switch (type) {
            case 'video': return '#7c3aed';
            case 'audio': return '#0284c7';
            case 'image': return '#059669';
            case 'transcription': return '#db2777';
            default: return '#d97706';
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { onMouseMove: handleMouseMove, onMouseUp: handleMouseUp, style: {
            width: '100%',
            backgroundColor: bgTrackLane,
            border: `1px solid ${borderCol}`,
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none',
            boxSizing: 'border-box'
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    height: '40px',
                    backgroundColor: bgTrackHeader,
                    borderBottom: `1px solid ${borderCol}`,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    justify: 'space-between'
                }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: onPlayPauseToggle, style: {
                                    backgroundColor: '#0284c7',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }, children: isPlaying ? (0, jsx_runtime_1.jsx)(lucide_react_1.Pause, { size: 14 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Play, { size: 14 }) }), (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', color: textColor }, children: [formatTime(currentTime), " / ", formatTime(duration)] })] }), (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: '12px', fontWeight: 'bold', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Layers, { size: 14 }), " Multi-Track NLE Timeline Editor"] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', width: '100%', position: 'relative' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { width: '180px', minWidth: '180px', backgroundColor: bgTrackHeader, borderRight: `1px solid ${borderCol}` }, children: [(0, jsx_runtime_1.jsx)("div", { style: { height: '24px', borderBottom: `1px solid ${borderCol}`, padding: '4px 8px', fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }, children: "Tracks" }), defaultTracks.map((track) => ((0, jsx_runtime_1.jsxs)("div", { style: {
                                    height: '42px',
                                    borderBottom: `1px solid ${borderCol}`,
                                    padding: '0 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifySpace: 'between',
                                    gap: '6px',
                                    boxSizing: 'border-box'
                                }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold', color: textColor, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: [getTrackIcon(track.type), " ", track.name] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '4px' }, children: [(0, jsx_runtime_1.jsx)("button", { style: miniIconBtnStyle, children: track.isMuted ? (0, jsx_runtime_1.jsx)(lucide_react_1.VolumeX, { size: 12, color: "#ef4444" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Volume2, { size: 12 }) }), (0, jsx_runtime_1.jsx)("button", { style: miniIconBtnStyle, children: track.isLocked ? (0, jsx_runtime_1.jsx)(lucide_react_1.Lock, { size: 12, color: "#f59e0b" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Unlock, { size: 12 }) })] })] }, track.id)))] }), (0, jsx_runtime_1.jsxs)("div", { ref: timelineRef, onMouseDown: handleMouseDown, style: { flex: 1, position: 'relative', overflowX: 'hidden', cursor: 'crosshair' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { height: '24px', backgroundColor: bgTrackHeader, borderBottom: `1px solid ${borderCol}`, position: 'relative', display: 'flex', alignItems: 'center' }, children: [0, 0.25, 0.5, 0.75, 1].map((ratio) => ((0, jsx_runtime_1.jsx)("div", { style: {
                                        position: 'absolute',
                                        left: `${ratio * 100}%`,
                                        fontSize: '9px',
                                        color: '#94a3b8',
                                        fontFamily: 'monospace',
                                        transform: ratio === 1 ? 'translateX(-100%)' : 'none',
                                        paddingLeft: '2px'
                                    }, children: formatTime(ratio * duration) }, ratio))) }), defaultTracks.map((track) => ((0, jsx_runtime_1.jsx)("div", { style: {
                                    height: '42px',
                                    borderBottom: `1px solid ${borderCol}`,
                                    position: 'relative',
                                    backgroundColor: 'rgba(0,0,0,0.02)'
                                }, children: clips.filter(c => c.trackId === track.id || c.type === track.type).map((clip) => {
                                    const leftPct = (clip.timelineStart / duration) * 100;
                                    const widthPct = (clip.duration / duration) * 100;
                                    return ((0, jsx_runtime_1.jsxs)("div", { style: {
                                            position: 'absolute',
                                            left: `${leftPct}%`,
                                            width: `${widthPct}%`,
                                            top: '6px',
                                            height: '30px',
                                            backgroundColor: getClipColor(clip.type),
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            color: '#ffffff',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            cursor: 'pointer'
                                        }, title: `${clip.name} (${clip.duration}s)`, children: [getTrackIcon(clip.type), (0, jsx_runtime_1.jsx)("span", { children: clip.name })] }, clip.id));
                                }) }, track.id))), (0, jsx_runtime_1.jsx)("div", { style: {
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: `${(currentTime / duration) * 100}%`,
                                    width: '2px',
                                    backgroundColor: '#ef4444',
                                    zIndex: 30,
                                    pointerEvents: 'none'
                                }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                                        width: '10px',
                                        height: '10px',
                                        backgroundColor: '#ef4444',
                                        borderRadius: '50%',
                                        transform: 'translate(-4px, -2px)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
                                    } }) })] })] })] }));
}
const miniIconBtnStyle = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};
