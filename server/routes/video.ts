import { Router } from 'express';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import { processTranscription } from '../services/transcribe';
import { extractAudioForTranscription, cleanupFile } from '../utils/audio';

const router = Router();

const uploadDir = path.join(__dirname, '../../uploads');
const outputDir = path.join(__dirname, '../../outputs');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const upload = multer({ dest: uploadDir });

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * 1. POST /api/video/render-canvas
 * Compiles array of Base64 PNG frames into MP4 video.
 */
router.post('/render-canvas', async (req: any, res: any) => {
  try {
    const { frames, fps = 30 } = req.body;
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({ error: 'No image frames provided.' });
    }

    const sessionDir = path.join(uploadDir, `frames_${Date.now()}`);
    fs.mkdirSync(sessionDir, { recursive: true });

    // Write base64 PNGs to temp folder
    frames.forEach((frameDataUrl: string, idx: number) => {
      const base64Data = frameDataUrl.replace(/^data:image\/png;base64,/, '');
      const framePath = path.join(sessionDir, `frame_${String(idx).padStart(4, '0')}.png`);
      fs.writeFileSync(framePath, base64Data, 'base64');
    });

    const outputFileName = `canvas_render_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFileName);

    ffmpeg()
      .input(path.join(sessionDir, 'frame_%04d.png'))
      .inputFPS(fps)
      .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
      .output(outputPath)
      .on('end', () => {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        res.json({ success: true, file: outputFileName });
      })
      .on('error', (err) => {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        res.status(500).json({ error: 'FFmpeg canvas rendering failed', details: err.message });
      })
      .run();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. POST /api/video/stitch
 * Stitches a video file and audio file together.
 */
router.post('/stitch', upload.fields([{ name: 'video' }, { name: 'audio' }]), async (req: any, res: any) => {
  const files = req.files;
  if (!files?.video?.[0] || !files?.audio?.[0]) {
    return res.status(400).json({ error: 'Both video and audio files are required.' });
  }

  const videoPath = files.video[0].path;
  const audioPath = files.audio[0].path;
  const outputFileName = `stitched_${Date.now()}.mp4`;
  const outputPath = path.join(outputDir, outputFileName);

  ffmpeg()
    .input(videoPath)
    .input(audioPath)
    .outputOptions(['-c:v copy', '-c:a aac', '-map 0:v:0', '-map 1:a:0', '-shortest'])
    .output(outputPath)
    .on('end', () => {
      cleanupFile(videoPath);
      cleanupFile(audioPath);
      res.json({ success: true, file: outputFileName });
    })
    .on('error', (err) => {
      cleanupFile(videoPath);
      cleanupFile(audioPath);
      res.status(500).json({ error: 'Video stitching failed', details: err.message });
    })
    .run();
});

/**
 * 3. POST /api/video/auto-subtitle
 * Transcribes video using Whisper AI, generates SRT, and burns subtitles into MP4.
 */
router.post('/auto-subtitle', upload.single('video'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'No video provided.' });

  const videoPath = req.file.path;
  let audioPath: string | null = null;
  let srtPath: string | null = null;

  try {
    // Extract Audio
    audioPath = await extractAudioForTranscription(videoPath);
    
    // Transcribe via Whisper
    const transcript = await processTranscription(audioPath);
    const fullText = transcript.map(s => s.text).join(' ');

    // Generate SRT file
    srtPath = path.join(uploadDir, `subtitles_${Date.now()}.srt`);
    let srtContent = '';
    transcript.forEach((seg, idx) => {
      srtContent += `${idx + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n${seg.text}\n\n`;
    });
    fs.writeFileSync(srtPath, srtContent);

    // Burn subtitles onto MP4
    const outputFileName = `subtitled_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFileName);

    ffmpeg(videoPath)
      .outputOptions([`-vf subtitles=${srtPath.replace(/\\/g, '/')}`])
      .output(outputPath)
      .on('end', () => {
        cleanupFile(videoPath);
        if (audioPath) cleanupFile(audioPath);
        if (srtPath) cleanupFile(srtPath);
        res.json({ success: true, file: outputFileName, transcriptionText: fullText, transcript });
      })
      .on('error', (err) => {
        cleanupFile(videoPath);
        if (audioPath) cleanupFile(audioPath);
        if (srtPath) cleanupFile(srtPath);
        res.status(500).json({ error: 'Subtitle burning failed', details: err.message });
      })
      .run();
  } catch (err: any) {
    cleanupFile(videoPath);
    if (audioPath) cleanupFile(audioPath);
    if (srtPath) cleanupFile(srtPath);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. POST /api/video/tts
 * Generates synthetic AI voiceovers from text scripts using OpenAI TTS.
 */
router.post('/tts', async (req: any, res: any) => {
  try {
    const { text, voice = 'alloy' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text prompt is required for TTS generation.' });
    }

    const outputFileName = `tts_${Date.now()}.mp3`;
    const outputPath = path.join(outputDir, outputFileName);

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
    fs.writeFileSync(outputPath, buffer);

    res.json({
      success: true,
      file: outputFileName,
      text,
      voice,
      duration: Math.max(2, Math.ceil(text.length / 15)),
    });
  } catch (err: any) {
    console.error('[TTS Error]:', err);
    res.status(500).json({ error: 'TTS voiceover generation failed', details: err.message });
  }
});

function formatSrtTime(seconds: number): string {
  const pad = (n: number, z = 2) => ('00' + n).slice(-z);
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

export default router;