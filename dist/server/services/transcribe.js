"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTranscription = void 0;
const openai_1 = __importDefault(require("openai"));
const fs_1 = __importDefault(require("fs"));
const openai = process.env.OPENAI_API_KEY
    ? new openai_1.default({ apiKey: process.env.OPENAI_API_KEY })
    : null;
/**
 * Transcribes an audio file via Whisper AI (or returns mock data if no key is provided).
 */
const processTranscription = async (audioFilePath) => {
    // --- MOCK FALLBACK (If OPENAI_API_KEY is not configured in .env) ---
    if (!openai) {
        console.warn('[Whisper Service] OPENAI_API_KEY not found in .env. Returning structured mock transcript.');
        return generateMockTranscript();
    }
    // --- REAL WHISPER AI INTEGRATION ---
    try {
        const response = await openai.audio.transcriptions.create({
            file: fs_1.default.createReadStream(audioFilePath),
            model: 'whisper-1',
            response_format: 'verbose_json',
            timestamp_granularities: ['word', 'segment'],
        });
        const segments = (response.segments || []).map((seg) => {
            const segmentWords = (response.words || [])
                .filter((w) => w.start >= seg.start && w.end <= seg.end)
                .map((w) => ({
                id: crypto.randomUUID(),
                word: w.word,
                start: parseFloat(w.start.toFixed(2)),
                end: parseFloat(w.end.toFixed(2)),
                confidence: 0.95,
            }));
            return {
                id: crypto.randomUUID(),
                speaker: 'Speaker 1',
                text: seg.text.trim(),
                start: parseFloat(seg.start.toFixed(2)),
                end: parseFloat(seg.end.toFixed(2)),
                words: segmentWords,
            };
        });
        return segments;
    }
    catch (error) {
        console.error('[Whisper Error]:', error);
        throw error;
    }
};
exports.processTranscription = processTranscription;
function generateMockTranscript() {
    return [
        {
            id: crypto.randomUUID(),
            speaker: 'Speaker 1',
            text: 'Welcome to OmniStudio Canvas.',
            start: 0.0,
            end: 2.5,
            words: [
                { id: crypto.randomUUID(), word: 'Welcome', start: 0.0, end: 0.5, confidence: 0.99 },
                { id: crypto.randomUUID(), word: 'to', start: 0.6, end: 0.8, confidence: 0.98 },
                { id: crypto.randomUUID(), word: 'OmniStudio', start: 0.9, end: 1.8, confidence: 0.95 },
                { id: crypto.randomUUID(), word: 'Canvas.', start: 1.9, end: 2.5, confidence: 0.99 },
            ],
        },
        {
            id: crypto.randomUUID(),
            speaker: 'Speaker 1',
            text: 'Your all-in-one editor for video, audio, text, and AI transcription.',
            start: 2.8,
            end: 6.0,
            words: [
                { id: crypto.randomUUID(), word: 'Your', start: 2.8, end: 3.1, confidence: 0.97 },
                { id: crypto.randomUUID(), word: 'all-in-one', start: 3.2, end: 3.9, confidence: 0.96 },
                { id: crypto.randomUUID(), word: 'editor', start: 4.0, end: 4.5, confidence: 0.99 },
                { id: crypto.randomUUID(), word: 'for', start: 4.6, end: 4.8, confidence: 0.98 },
                { id: crypto.randomUUID(), word: 'video,', start: 4.9, end: 5.2, confidence: 0.99 },
                { id: crypto.randomUUID(), word: 'audio,', start: 5.3, end: 5.6, confidence: 0.99 },
                { id: crypto.randomUUID(), word: 'text,', start: 5.7, end: 5.8, confidence: 0.98 },
                { id: crypto.randomUUID(), word: 'and', start: 5.8, end: 5.9, confidence: 0.98 },
                { id: crypto.randomUUID(), word: 'AI', start: 5.9, end: 6.0, confidence: 0.99 },
            ],
        },
    ];
}
