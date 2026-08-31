// server/index.ts
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import axios from 'axios';

import imageRoutes from './routes/image';
import videoRoutes from './routes/video';
import { extractAudioForTranscription, cleanupFile } from './utils/audio';
import { processTranscription } from './services/transcribe';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

// Sub-Routers (Listen on both /api and root paths for Vercel)
app.use(['/api/image', '/image'], imageRoutes);
app.use(['/api/video', '/video'], videoRoutes);

/**
 * Helper: Resolve Geo-IP / Timezone to Local Currency and Paystack Channels
 */
function resolveGeoLocalization(req: any, timeZone?: string) {
  const ipCountry = (req.headers['cf-ipcountry'] || req.headers['x-country-code'] || '').toString().toUpperCase();
  const tz = (timeZone || '').toLowerCase();

  // 1. GHANA (GHS) -> Mobile Money (MoMo) + Card
  if (ipCountry === 'GH' || tz.includes('accra') || tz.includes('ghana')) {
    return {
      currency: 'GHS',
      amountInSubunits: 12000, // 120 GHS = 12,000 Pesewas
      channels: ['mobile_money', 'card'],
    };
  }

  // 2. NIGERIA (NGN) -> USSD, Bank Transfer, MoMo, Card
  if (ipCountry === 'NG' || tz.includes('lagos') || tz.includes('nigeria')) {
    return {
      currency: 'NGN',
      amountInSubunits: 500000, // 5,000 NGN = 500,000 Kobo
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    };
  }

  // 3. KENYA (KES) -> M-Pesa / Mobile Money
  if (ipCountry === 'KE' || tz.includes('nairobi') || tz.includes('kenya')) {
    return {
      currency: 'KES',
      amountInSubunits: 120000, // 1,200 KES = 120,000 Cents
      channels: ['mobile_money', 'card'],
    };
  }

  // 4. SOUTH AFRICA (ZAR) -> EFT & Card
  if (ipCountry === 'ZA' || tz.includes('johannesburg') || tz.includes('south_africa')) {
    return {
      currency: 'ZAR',
      amountInSubunits: 18000, // 180 ZAR = 18,000 Cents
      channels: ['card', 'eft'],
    };
  }

  // 5. DEFAULT GLOBAL (USD)
  return {
    currency: 'USD',
    amountInSubunits: 900, // $9.00 USD = 900 Cents
    channels: ['card'],
  };
}

/**
 * Upgraded Paystack Initialization Handler (Supports Email-less Checkout & Geo-IP Routing)
 */
const handlePaystackInit = async (req: any, res: any) => {
  try {
    const { userId, email, timeZone, currency: clientCurrency } = req.body;
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder';

    // FEATURE 1: DUMMY / ANONYMOUS EMAIL GENERATION (Bypasses email requirement)
    const guestIdentifier = userId || `guest_${Math.random().toString(36).substring(2, 9)}`;
    const finalEmail = email && typeof email === 'string' && email.includes('@')
      ? email
      : `anonymous_${guestIdentifier}@omnistudio.internal`;

    // FEATURE 2: DYNAMIC GEO-IP & TIMEZONE LOCALIZATION
    const geoConfig = resolveGeoLocalization(req, timeZone);
    const selectedCurrency = clientCurrency && clientCurrency !== 'USD' ? clientCurrency : geoConfig.currency;
    const amountInSubunits = selectedCurrency === 'GHS' ? 12000 : geoConfig.amountInSubunits;

    const paystackRes = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: finalEmail,
        amount: amountInSubunits,
        currency: selectedCurrency,
        channels: geoConfig.channels,
        callback_url: `${req.headers.origin || 'https://omnistudio-canvas.vercel.app'}/?payment=success`,
        metadata: {
          userId: guestIdentifier,
          plan: 'pro_9_monthly',
          isAnonymousCheckout: !email,
          clientTimeZone: timeZone || 'unknown',
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
      currency: selectedCurrency,
      dummyEmailUsed: finalEmail,
    });
  } catch (err: any) {
    console.error('[Paystack Init Error]:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Failed to initialize Paystack payment',
      details: err.response?.data?.message || err.message,
    });
  }
};

/**
 * Paystack Verification Handler (Dual Route Matcher)
 */
const handlePaystackVerify = async (req: any, res: any) => {
  try {
    const { reference } = req.params;
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder';

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
};

// Register Paystack endpoints on both Vercel path variations
app.post(['/api/billing/initialize-paystack', '/billing/initialize-paystack'], handlePaystackInit);
app.get(['/api/billing/verify-paystack/:reference', '/billing/verify-paystack/:reference'], handlePaystackVerify);

/**
 * Whisper AI Transcription Route (Dual Route Matcher)
 */
const handleTranscribe = async (req: any, res: any) => {
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
};

app.post(['/api/transcribe', '/transcribe'], upload.single('file'), handleTranscribe);

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', server: 'OmniStudio Canvas API' });
});

// Export Express app for Vercel Serverless
export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 OmniStudio Canvas API Server running on http://localhost:${PORT}`);
  });
}