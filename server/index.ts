// server/index.ts
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import axios from 'axios';
import crypto from 'crypto';

import imageRoutes from './routes/image';
import videoRoutes from './routes/video';
import { extractAudioForTranscription, cleanupFile } from './utils/audio';
import { processTranscription } from './services/transcribe';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'pk_live_1ce038da68ee109f5e603f5b816613d9cf261be5';

const uploadDir = path.join(__dirname, '../uploads');
const outputDir = path.join(__dirname, '../outputs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const upload = multer({ dest: uploadDir });

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Serve static assets
app.use('/outputs', express.static(outputDir));

// Mount Sub-Routers
app.use('/api/image', imageRoutes);
app.use('/api/video', videoRoutes);

/**
 * Direct Paystack Payment Initialization Endpoint
 * POST /api/billing/initialize-paystack
 */
app.post('/api/billing/initialize-paystack', async (req: any, res: any) => {
  try {
    const { userId, email, currency = 'USD' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'User email is required for Paystack checkout.' });
    }

    // $9.00 USD = 900 subunits / 120 GHS = 12000 pesewas
    const amountInSubunits = currency === 'GHS' ? 12000 : 900;

    const paystackRes = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amountInSubunits,
        currency,
        callback_url: `${req.headers.origin || 'https://omnistudio-canvas.vercel.app'}/?payment=success`,
        metadata: {
          userId: userId || 'guest_user',
          plan: 'pro_9_monthly',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.json({
      success: true,
      authorizationUrl: paystackRes.data.data.authorization_url,
      accessCode: paystackRes.data.data.access_code,
      reference: paystackRes.data.data.reference,
    });
  } catch (err: any) {
    console.error('[Paystack Init Error]:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Failed to initialize Paystack payment',
      details: err.response?.data?.message || err.message,
    });
  }
});

/**
 * Direct Paystack Verification Endpoint
 * GET /api/billing/verify-paystack/:reference
 */
app.get('/api/billing/verify-paystack/:reference', async (req: any, res: any) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return res.json({
      success: true,
      status: response.data.data.status,
      data: response.data.data,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Verification failed', details: err.message });
  }
});

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
    convertedAudioPath = await extractAudioForTranscription(inputPath);
    const transcript = await processTranscription(convertedAudioPath);
    const fullText = transcript.map((s) => s.text).join(' ');

    return res.status(200).json({
      success: true,
      filename: req.file.originalname,
      transcription: { text: fullText },
      transcript,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to transcribe media file.', details: error.message });
  } finally {
    cleanupFile(inputPath);
    if (convertedAudioPath) cleanupFile(convertedAudioPath);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'OmniStudio Canvas API' });
});

// Export Express app for Vercel Serverless
export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 OmniStudio Canvas API Server running on http://localhost:${PORT}`);
  });
}