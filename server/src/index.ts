// server/src/index.ts
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import axios from 'axios';
import http from 'http';
import { Server } from 'socket.io';

// Imports referenced from server/ directory
import imageRoutes from '../routes/image';
import videoRoutes from '../routes/video';
import { extractAudioForTranscription, cleanupFile } from '../utils/audio';
import { processTranscription } from '../services/transcribe';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Wrap Express with HTTP Server for WebRTC & Socket.io Signaling
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const uploadDir = path.join(__dirname, '../../uploads');
const outputDir = path.join(__dirname, '../../outputs');
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

// --- WEBRTC & PRIVATE CHAT SOCKET.IO SIGNALING ENGINE ---
const userSocketMap = new Map<string, string>(); // userId => socketId

io.on('connection', (socket) => {
  // 1. Register User Socket
  socket.on('register-social-user', ({ userId }) => {
    userSocketMap.set(userId, socket.id);
  });

  // 2. Private Text Messaging
  socket.on('send-private-message', ({ targetId, senderId, text, timestamp }) => {
    const targetSocketId = userSocketMap.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('receive-message', { senderId, text, timestamp });
    }
  });

  // 3. WebRTC Call Offer
  socket.on('call-user', ({ targetId, callerId, callerName, type, offer }) => {
    const targetSocketId = userSocketMap.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', { callerId, callerName, type, offer });
    }
  });

  // 4. WebRTC Call Answer
  socket.on('answer-call', ({ targetId, answer }) => {
    const targetSocketId = userSocketMap.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-answered', { answer });
    }
  });

  // 5. ICE Candidates Exchange
  socket.on('send-ice-candidate', ({ targetId, candidate }) => {
    const targetSocketId = userSocketMap.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', { candidate });
    }
  });

  // 6. End Call
  socket.on('end-call', ({ targetId }) => {
    const targetSocketId = userSocketMap.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended');
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  });
});

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
 * Live-Ready Paystack Initialization Handler
 * Supports sk_live_ keys with Automatic Merchant Currency Fallback & Dummy Emails
 */
const handlePaystackInit = async (req: any, res: any) => {
  try {
    const { userId, email, timeZone, currency: clientCurrency } = req.body;
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    const MERCHANT_PRIMARY_CURRENCY = (process.env.PAYSTACK_DEFAULT_CURRENCY || 'NGN').toUpperCase();

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(400).json({
        error: 'PAYSTACK_SECRET_KEY is missing in server/.env file.'
      });
    }

    // 1. DUMMY / ANONYMOUS EMAIL GENERATION
    const guestIdentifier = userId || `guest_${Math.random().toString(36).substring(2, 9)}`;
    const finalEmail = email && typeof email === 'string' && email.includes('@')
      ? email
      : `anonymous_${guestIdentifier}@omnistudio.internal`;

    // 2. DYNAMIC GEO LOCALIZATION
    const geoConfig = resolveGeoLocalization(req, timeZone);
    let targetCurrency = clientCurrency || geoConfig.currency;

    const getSubunits = (curr: string) => {
      switch (curr) {
        case 'NGN': return 500000; // 5,000 NGN
        case 'GHS': return 12000;  // 120 GHS
        case 'KES': return 120000; // 1,200 KES
        case 'ZAR': return 18000;  // 180 ZAR
        case 'USD': default: return 900; // $9 USD
      }
    };

    const callPaystackApi = async (curr: string) => {
      return await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: finalEmail,
          amount: getSubunits(curr),
          currency: curr,
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
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY.trim()}`,
            'Content-Type': 'application/json',
          },
        }
      );
    };

    let paystackRes;
    try {
      paystackRes = await callPaystackApi(targetCurrency);
    } catch (firstErr: any) {
      const errMsg = firstErr.response?.data?.message || '';
      
      if (errMsg.toLowerCase().includes('currency') || errMsg.toLowerCase().includes('merchant')) {
        console.warn(`[Paystack Live Mode] Currency ${targetCurrency} not supported. Retrying with merchant primary currency ${MERCHANT_PRIMARY_CURRENCY}...`);
        targetCurrency = MERCHANT_PRIMARY_CURRENCY;
        paystackRes = await callPaystackApi(targetCurrency);
      } else {
        throw firstErr;
      }
    }

    return res.json({
      success: true,
      authorizationUrl: paystackRes.data.data.authorization_url,
      accessCode: paystackRes.data.data.access_code,
      reference: paystackRes.data.data.reference,
      currency: targetCurrency,
      dummyEmailUsed: finalEmail,
    });
  } catch (err: any) {
    console.error('[Paystack Live Init Error]:', err.response?.data || err.message);

    const paystackErrorMsg = typeof err.response?.data?.message === 'string'
      ? err.response.data.message
      : err.message || 'Paystack Live Payment Initialization Failed.';

    return res.status(500).json({
      error: paystackErrorMsg,
      details: typeof err.response?.data === 'object' ? JSON.stringify(err.response.data) : String(err.response?.data || err.message)
    });
  }
};

/**
 * Paystack Verification Handler
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

// Create flexible Router for Billing endpoints (Catches any Vercel URL rewrite variation)
const billingRouter = express.Router();
billingRouter.post('/initialize-paystack', handlePaystackInit);
billingRouter.get('/verify-paystack/:reference', handlePaystackVerify);

// Mount router across all potential Vercel rewrite paths
app.use('/api/billing', billingRouter);
app.use('/billing', billingRouter);
app.use('/api', billingRouter);
app.use('/', billingRouter);

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
  server.listen(PORT, () => {
    console.log(`🚀 OmniStudio Canvas API & WebRTC Socket Server running on http://localhost:${PORT}`);
  });
}