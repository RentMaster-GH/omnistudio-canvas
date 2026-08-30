import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';

import imageRoutes from './routes/image';
import videoRoutes from './routes/video';
import billingRoutes from './routes/billing';
import { initializeSocketIO } from './sockets';
import { authenticateToken } from './middleware/auth';
import { extractAudioForTranscription, cleanupFile } from './utils/audio';
import { processTranscription } from './services/transcribe';

dotenv.config();

const app = express();
const httpServer = createServer(app); // Attach Node.js HTTP server for Socket.io
const PORT = process.env.PORT || 5000;

// Initialize Real-Time Socket.io Collaboration Server
const io = initializeSocketIO(httpServer);

// Ensure uploads & outputs directories exist
const uploadDir = path.join(__dirname, '../uploads');
const outputDir = path.join(__dirname, '../outputs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const upload = multer({ dest: uploadDir });

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Attach Authentication Middleware
app.use(authenticateToken as any);

// Serve static rendered assets (videos, images)
app.use('/outputs', express.static(outputDir));

// Mount Sub-Routers
app.use('/api/image', imageRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/billing', billingRoutes);

/**
 * Direct Whisper AI Transcription Route
 * POST /api/transcribe
 */
app.post('/api/transcribe', upload.single('file'), async (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No media file provided.' });
  }

  const inputPath = req.file.path;
  let convertedAudioPath: string | null = null;

  try {
    console.log(`[Upload] Processing media for transcription: ${req.file.originalname}`);

    // Extract 16kHz WAV Audio
    convertedAudioPath = await extractAudioForTranscription(inputPath);

    // Process through Whisper AI
    const transcript = await processTranscription(convertedAudioPath);
    const fullText = transcript.map((s) => s.text).join(' ');

    return res.status(200).json({
      success: true,
      filename: req.file.originalname,
      transcription: { text: fullText },
      transcript,
    });
  } catch (error: any) {
    console.error('[Transcription Error]:', error);
    return res.status(500).json({
      error: 'Failed to transcribe media file.',
      details: error.message,
    });
  } finally {
    cleanupFile(inputPath);
    if (convertedAudioPath) cleanupFile(convertedAudioPath);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'OmniStudio Canvas API & Socket.io Server' });
});

// Start Combined HTTP + Socket.io Server
httpServer.listen(PORT, () => {
  console.log(`🚀 OmniStudio Canvas API & Socket.io Server running on http://localhost:${PORT}`);
});