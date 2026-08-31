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
exports.default = AudioWaveform;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
function AudioWaveform({ audioUrl = '', currentTime = 0, duration = 30, onSeek = () => { }, height = 48, darkMode = true, }) {
    const canvasRef = (0, react_1.useRef)(null);
    const [peaks, setPeaks] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    // Extract PCM Audio Peaks from Audio Buffer
    (0, react_1.useEffect)(() => {
        if (!audioUrl) {
            generateMockPeaks();
            return;
        }
        let isMounted = true;
        setLoading(true);
        const fetchAndDecodeAudio = async () => {
            try {
                const response = await fetch(audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                const channelData = audioBuffer.getChannelData(0); // Left channel
                const samples = 120; // Number of vertical bars
                const blockSize = Math.floor(channelData.length / samples);
                const extractedPeaks = [];
                for (let i = 0; i < samples; i++) {
                    const blockStart = blockSize * i;
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(channelData[blockStart + j] || 0);
                    }
                    extractedPeaks.push(sum / blockSize);
                }
                // Normalize peak values between 0.1 and 1.0
                const maxPeak = Math.max(...extractedPeaks, 0.001);
                const normalized = extractedPeaks.map((p) => Math.max(0.1, p / maxPeak));
                if (isMounted) {
                    setPeaks(normalized);
                    setLoading(false);
                }
            }
            catch (err) {
                console.warn('Could not decode audio data, rendering peak fallback:', err);
                if (isMounted) {
                    generateMockPeaks();
                    setLoading(false);
                }
            }
        };
        fetchAndDecodeAudio();
        return () => { isMounted = false; };
    }, [audioUrl]);
    const generateMockPeaks = () => {
        const mock = [];
        for (let i = 0; i < 120; i++) {
            mock.push(Math.sin(i * 0.15) * 0.4 + Math.random() * 0.4 + 0.2);
        }
        setPeaks(mock);
    };
    // Draw Waveform Bars onto Canvas
    (0, react_1.useEffect)(() => {
        const canvas = canvasRef.current;
        if (!canvas || peaks.length === 0)
            return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const canvasHeight = canvas.height;
        ctx.clearRect(0, 0, width, canvasHeight);
        const barWidth = width / peaks.length;
        const progressPercent = duration > 0 ? Math.min(1, currentTime / duration) : 0;
        const activeBarIndex = Math.floor(progressPercent * peaks.length);
        peaks.forEach((peak, i) => {
            const barHeight = peak * (canvasHeight - 6);
            const x = i * barWidth;
            const y = (canvasHeight - barHeight) / 2;
            // Color active played bars differently than unplayed bars
            if (i <= activeBarIndex) {
                ctx.fillStyle = '#0284c7'; // Active played color (Sky Blue)
            }
            else {
                ctx.fillStyle = darkMode ? '#334155' : '#cbd5e1'; // Inactive unplayed color
            }
            ctx.fillRect(x, y, barWidth - 1, barHeight);
        });
    }, [peaks, currentTime, duration, darkMode]);
    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        if (!canvas || duration <= 0)
            return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickedRatio = Math.max(0, Math.min(1, clickX / rect.width));
        onSeek(clickedRatio * duration);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', fontWeight: 'bold' }, children: [(0, jsx_runtime_1.jsx)("span", { children: "AUDIO WAVEFORM TRACK" }), (0, jsx_runtime_1.jsx)("span", { children: loading ? 'Decoding Audio PCM...' : 'Interactive Scrub' })] }), (0, jsx_runtime_1.jsx)("canvas", { ref: canvasRef, width: 800, height: height, onClick: handleCanvasClick, style: {
                    width: '100%',
                    height: `${height}px`,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
                    border: `1px solid ${darkMode ? '#1e293b' : '#e2e8f0'}`,
                } })] }));
}
