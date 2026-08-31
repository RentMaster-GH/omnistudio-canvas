"use strict";
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const ffmpegService = require('./ffmpegService');
/**
 * Transcribe Audio or Video file to Text with Timestamps using OpenAI Whisper API
 */
const transcribeMedia = async (filePath) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OpenAI API Key is missing. Please set OPENAI_API_KEY in your server environment variables.');
    }
    // Initialize OpenAI client securely from environment variable
    const openai = new OpenAI({ apiKey });
    let audioPath = filePath;
    let isTempAudio = false;
    const ext = path.extname(filePath).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
    try {
        // If input is a video, extract audio to MP3 first
        if (isVideo) {
            const outputDir = path.join(__dirname, '../outputs');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const extractedAudioPath = path.join(outputDir, `temp-audio-${Date.now()}.mp3`);
            await ffmpegService.extractAudio(filePath, extractedAudioPath);
            audioPath = extractedAudioPath;
            isTempAudio = true;
        }
        // Call OpenAI Whisper API
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: 'whisper-1',
            response_format: 'verbose_json',
            timestamp_granularities: ['segment'],
        });
        return {
            text: transcription.text,
            duration: transcription.duration,
            segments: transcription.segments,
        };
    }
    catch (error) {
        console.error('[Transcription Service Error]:', error);
        throw error;
    }
    finally {
        // Clean up temporary extracted audio file if it was generated
        if (isTempAudio && fs.existsSync(audioPath)) {
            try {
                fs.unlinkSync(audioPath);
            }
            catch (e) {
                console.warn('Failed to delete temp audio:', e);
            }
        }
    }
};
module.exports = {
    transcribeMedia,
};
