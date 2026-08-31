"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
const axios_1 = __importDefault(require("axios"));
const image_1 = __importDefault(require("./routes/image"));
const video_1 = __importDefault(require("./routes/video"));
const audio_1 = require("./utils/audio");
const transcribe_1 = require("./services/transcribe");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const uploadDir = path_1.default.join(__dirname, '../uploads');
const outputDir = path_1.default.join(__dirname, '../outputs');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
if (!fs_1.default.existsSync(outputDir))
    fs_1.default.mkdirSync(outputDir, { recursive: true });
const upload = (0, multer_1.default)({ dest: uploadDir });
// Global Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '100mb' }));
app.use(express_1.default.urlencoded({ limit: '100mb', extended: true }));
// Serve static assets
app.use('/outputs', express_1.default.static(outputDir));
// Sub-Routers (Listen on both /api and root paths for Vercel)
app.use(['/api/image', '/image'], image_1.default);
app.use(['/api/video', '/video'], video_1.default);
/**
 * Paystack Initialization Handler (Dual Route Matcher)
 */
const handlePaystackInit = async (req, res) => {
    try {
        const { userId, email, currency = 'USD' } = req.body;
        const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder';
        if (!email) {
            return res.status(400).json({ error: 'User email is required for Paystack checkout.' });
        }
        // $9.00 USD = 900 subunits / 120 GHS = 12000 pesewas
        const amountInSubunits = currency === 'GHS' ? 12000 : 900;
        const paystackRes = await axios_1.default.post('https://api.paystack.co/transaction/initialize', {
            email,
            amount: amountInSubunits,
            currency,
            callback_url: `${req.headers.origin || 'https://omnistudio-canvas.vercel.app'}/?payment=success`,
            metadata: {
                userId: userId || 'guest_user',
                plan: 'pro_9_monthly',
            },
        }, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        return res.json({
            success: true,
            authorizationUrl: paystackRes.data.data.authorization_url,
            accessCode: paystackRes.data.data.access_code,
            reference: paystackRes.data.data.reference,
        });
    }
    catch (err) {
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
const handlePaystackVerify = async (req, res) => {
    try {
        const { reference } = req.params;
        const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder';
        const response = await axios_1.default.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        });
        return res.json({
            success: true,
            status: response.data.data.status,
            data: response.data.data,
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Verification failed', details: err.message });
    }
};
// Register Paystack endpoints on both Vercel path variations
app.post(['/api/billing/initialize-paystack', '/billing/initialize-paystack'], handlePaystackInit);
app.get(['/api/billing/verify-paystack/:reference', '/billing/verify-paystack/:reference'], handlePaystackVerify);
/**
 * Whisper AI Transcription Route (Dual Route Matcher)
 */
const handleTranscribe = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No media file provided.' });
    }
    const inputPath = req.file.path;
    let convertedAudioPath = null;
    try {
        convertedAudioPath = await (0, audio_1.extractAudioForTranscription)(inputPath);
        const transcript = await (0, transcribe_1.processTranscription)(convertedAudioPath);
        const fullText = transcript.map((s) => s.text).join(' ');
        return res.status(200).json({
            success: true,
            filename: req.file.originalname,
            transcription: { text: fullText },
            transcript,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to transcribe media file.', details: error.message });
    }
    finally {
        (0, audio_1.cleanupFile)(inputPath);
        if (convertedAudioPath)
            (0, audio_1.cleanupFile)(convertedAudioPath);
    }
};
app.post(['/api/transcribe', '/transcribe'], upload.single('file'), handleTranscribe);
// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
    res.json({ status: 'ok', server: 'OmniStudio Canvas API' });
});
// Export Express app for Vercel Serverless
exports.default = app;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 OmniStudio Canvas API Server running on http://localhost:${PORT}`);
    });
}
