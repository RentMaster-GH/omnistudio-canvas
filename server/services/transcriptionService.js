const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const ffmpegService = require('./ffmpegService');

/**
 * Transcribe Audio or Video file to Text with Timestamps
 */
const transcribeMedia = async (filePath) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === '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') {
    throw new Error('OpenAI API Key is missing. Please set OPENAI_API_KEY in server/.env file.');
  }

  // Initialize client lazily
  const openai = new OpenAI({ apiKey });

  let audioPath = filePath;
  const ext = path.extname(filePath).toLowerCase();
  const isVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);

  // If input is a video, extract audio to MP3 first
  if (isVideo) {
    const extractedAudioPath = path.join(__dirname, '../outputs', `temp-audio-${Date.now()}.mp3`);
    await ffmpegService.extractAudio(filePath, extractedAudioPath);
    audioPath = extractedAudioPath;
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
};

module.exports = {
  transcribeMedia,
};