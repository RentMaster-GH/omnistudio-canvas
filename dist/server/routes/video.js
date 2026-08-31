"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const openai_1 = __importDefault(require("openai"));
const transcribe_1 = require("../services/transcribe");
const audio_1 = require("../utils/audio");
const router = (0, express_1.Router)();
const uploadDir = path_1.default.join(__dirname, '../../uploads');
const outputDir = path_1.default.join(__dirname, '../../outputs');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
if (!fs_1.default.existsSync(outputDir))
    fs_1.default.mkdirSync(outputDir, { recursive: true });
const upload = (0, multer_1.default)({ dest: uploadDir });
const openai = process.env.OPENAI_API_KEY
    ? new openai_1.default({ apiKey: process.env.OPENAI_API_KEY })
    : null;
/**
 * 1. POST /api/video/render-canvas
 * Compiles array of Base64 PNG frames into MP4 video.
 */
router.post('/render-canvas', async (req, res) => {
    try {
        const { frames, fps = 30 } = req.body;
        if (!frames || !Array.isArray(frames) || frames.length === 0) {
            return res.status(400).json({ error: 'No image frames provided.' });
        }
        const sessionDir = path_1.default.join(uploadDir, `frames_${Date.now()}`);
        fs_1.default.mkdirSync(sessionDir, { recursive: true });
        // Write base64 PNGs to temp folder
        frames.forEach((frameDataUrl, idx) => {
            const base64Data = frameDataUrl.replace(/^data:image\/png;base64,/, '');
            const framePath = path_1.default.join(sessionDir, `frame_${String(idx).padStart(4, '0')}.png`);
            fs_1.default.writeFileSync(framePath, base64Data, 'base64');
        });
        const outputFileName = `canvas_render_${Date.now()}.mp4`;
        const outputPath = path_1.default.join(outputDir, outputFileName);
        (0, fluent_ffmpeg_1.default)()
            .input(path_1.default.join(sessionDir, 'frame_%04d.png'))
            .inputFPS(fps)
            .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
            .output(outputPath)
            .on('end', () => {
            fs_1.default.rmSync(sessionDir, { recursive: true, force: true });
            res.json({ success: true, file: outputFileName });
        })
            .on('error', (err) => {
            fs_1.default.rmSync(sessionDir, { recursive: true, force: true });
            res.status(500).json({ error: 'FFmpeg canvas rendering failed', details: err.message });
        })
            .run();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 2. POST /api/video/stitch
 * Stitches a video file and audio file together.
 */
router.post('/stitch', upload.fields([{ name: 'video' }, { name: 'audio' }]), async (req, res) => {
    const files = req.files;
    if (!files?.video?.[0] || !files?.audio?.[0]) {
        return res.status(400).json({ error: 'Both video and audio files are required.' });
    }
    const videoPath = files.video[0].path;
    const audioPath = files.audio[0].path;
    const outputFileName = `stitched_${Date.now()}.mp4`;
    const outputPath = path_1.default.join(outputDir, outputFileName);
    (0, fluent_ffmpeg_1.default)()
        .input(videoPath)
        .input(audioPath)
        .outputOptions(['-c:v copy', '-c:a aac', '-map 0:v:0', '-map 1:a:0', '-shortest'])
        .output(outputPath)
        .on('end', () => {
        (0, audio_1.cleanupFile)(videoPath);
        (0, audio_1.cleanupFile)(audioPath);
        res.json({ success: true, file: outputFileName });
    })
        .on('error', (err) => {
        (0, audio_1.cleanupFile)(videoPath);
        (0, audio_1.cleanupFile)(audioPath);
        res.status(500).json({ error: 'Video stitching failed', details: err.message });
    })
        .run();
});
/**
 * 3. POST /api/video/auto-subtitle
 * Transcribes video using Whisper AI, generates SRT, and burns subtitles into MP4.
 */
router.post('/auto-subtitle', upload.single('video'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No video provided.' });
    const videoPath = req.file.path;
    let audioPath = null;
    let srtPath = null;
    try {
        // Extract Audio
        audioPath = await (0, audio_1.extractAudioForTranscription)(videoPath);
        // Transcribe via Whisper
        const transcript = await (0, transcribe_1.processTranscription)(audioPath);
        const fullText = transcript.map(s => s.text).join(' ');
        // Generate SRT file
        srtPath = path_1.default.join(uploadDir, `subtitles_${Date.now()}.srt`);
        let srtContent = '';
        transcript.forEach((seg, idx) => {
            srtContent += `${idx + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n${seg.text}\n\n`;
        });
        fs_1.default.writeFileSync(srtPath, srtContent);
        // Burn subtitles onto MP4
        const outputFileName = `subtitled_${Date.now()}.mp4`;
        const outputPath = path_1.default.join(outputDir, outputFileName);
        (0, fluent_ffmpeg_1.default)(videoPath)
            .outputOptions([`-vf subtitles=${srtPath.replace(/\\/g, '/')}`])
            .output(outputPath)
            .on('end', () => {
            (0, audio_1.cleanupFile)(videoPath);
            if (audioPath)
                (0, audio_1.cleanupFile)(audioPath);
            if (srtPath)
                (0, audio_1.cleanupFile)(srtPath);
            res.json({ success: true, file: outputFileName, transcriptionText: fullText, transcript });
        })
            .on('error', (err) => {
            (0, audio_1.cleanupFile)(videoPath);
            if (audioPath)
                (0, audio_1.cleanupFile)(audioPath);
            if (srtPath)
                (0, audio_1.cleanupFile)(srtPath);
            res.status(500).json({ error: 'Subtitle burning failed', details: err.message });
        })
            .run();
    }
    catch (err) {
        (0, audio_1.cleanupFile)(videoPath);
        if (audioPath)
            (0, audio_1.cleanupFile)(audioPath);
        if (srtPath)
            (0, audio_1.cleanupFile)(srtPath);
        res.status(500).json({ error: err.message });
    }
});
/**
 * 4. POST /api/video/tts
 * Generates synthetic AI voiceovers from text scripts using OpenAI TTS.
 */
router.post('/tts', async (req, res) => {
    try {
        const { text, voice = 'alloy' } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text prompt is required for TTS generation.' });
        }
        const outputFileName = `tts_${Date.now()}.mp3`;
        const outputPath = path_1.default.join(outputDir, outputFileName);
        // Mock Fallback if OPENAI_API_KEY is not set
        if (!openai) {
            console.warn('[TTS Engine] OPENAI_API_KEY not set. Returning placeholder.');
            return res.json({
                success: true,
                file: outputFileName,
                text,
                voice,
                duration: 5,
                isMock: true,
            });
        }
        // Call OpenAI Text-to-Speech API
        const mp3Response = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice, // 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
            input: text,
        });
        const buffer = Buffer.from(await mp3Response.arrayBuffer());
        fs_1.default.writeFileSync(outputPath, buffer);
        res.json({
            success: true,
            file: outputFileName,
            text,
            voice,
            duration: Math.max(2, Math.ceil(text.length / 15)),
        });
    }
    catch (err) {
        console.error('[TTS Error]:', err);
        res.status(500).json({ error: 'TTS voiceover generation failed', details: err.message });
    }
});
/**
 * 5. POST /api/video/effects
 * Applies Green Screen Chroma Keying, Speed Ramping, and Cinematic Color Grading.
 */
router.post('/effects', upload.single('video'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No video file provided.' });
    const videoPath = req.file.path;
    const { chromaKey = 'false', keyColor = '0x00FF00', speed = '1.0', preset = 'none' // 'vintage' | 'bw' | 'cinematic' | 'cold' | 'vignette'
     } = req.body;
    const outputFileName = `effects_${Date.now()}.mp4`;
    const outputPath = path_1.default.join(outputDir, outputFileName);
    try {
        const filters = [];
        // 1. Chroma Key (Green Screen Removal)
        if (chromaKey === 'true') {
            filters.push(`chromakey=${keyColor}:0.1:0.2`);
        }
        // 2. Speed Adjustment
        const speedVal = parseFloat(speed) || 1.0;
        if (speedVal !== 1.0) {
            const ptsFactor = (1 / speedVal).toFixed(2);
            filters.push(`setpts=${ptsFactor}*PTS`);
        }
        // 3. Cinematic Color Filter Presets
        if (preset === 'bw') {
            filters.push('hue=s=0'); // Black & White
        }
        else if (preset === 'vintage') {
            filters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'); // Sepia
        }
        else if (preset === 'cinematic') {
            filters.push('eq=contrast=1.3:brightness=0.05:saturation=1.4'); // Film Contrast
        }
        else if (preset === 'cold') {
            filters.push('colorbalance=rs=-0.2:gs=0:bs=0.3'); // Cool Cyan Tint
        }
        else if (preset === 'vignette') {
            filters.push('vignette=PI/4'); // Dark Corner Vignette
        }
        let ffmpegCommand = (0, fluent_ffmpeg_1.default)(videoPath);
        if (filters.length > 0) {
            ffmpegCommand = ffmpegCommand.outputOptions([`-vf ${filters.join(',')}`]);
        }
        ffmpegCommand
            .output(outputPath)
            .on('end', () => {
            (0, audio_1.cleanupFile)(videoPath);
            res.json({
                success: true,
                file: outputFileName,
                appliedEffects: { chromaKey, speed, preset }
            });
        })
            .on('error', (err) => {
            (0, audio_1.cleanupFile)(videoPath);
            res.status(500).json({ error: 'Video effects processing failed', details: err.message });
        })
            .run();
    }
    catch (err) {
        (0, audio_1.cleanupFile)(videoPath);
        res.status(500).json({ error: err.message });
    }
});
function formatSrtTime(seconds) {
    const pad = (n, z = 2) => ('00' + n).slice(-z);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}
exports.default = router;
