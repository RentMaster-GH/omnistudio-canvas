// server/src/services/transcribe.ts
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import ffmpeg from 'fluent-ffmpeg';

interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Splitting long audio file into 10-minute MP3 chunks for unlimited duration support
 */
async function splitAudioIntoChunks(inputAudioPath: string, chunkDurationSec = 600): Promise<string[]> {
  const outputDir = path.dirname(inputAudioPath);
  const baseName = path.basename(inputAudioPath, path.extname(inputAudioPath));

  return new Promise((resolve, reject) => {
    const chunkPaths: string[] = [];
    
    ffmpeg(inputAudioPath)
      .output(path.join(outputDir, `${baseName}_chunk_%03d.mp3`))
      .outputOptions([
        '-f segment',
        `-segment_time ${chunkDurationSec}`,
        '-c:a libmp3lame',
        '-b:a 128k'
      ])
      .on('end', () => {
        const files = fs.readdirSync(outputDir);
        const generatedChunks = files
          .filter(f => f.startsWith(`${baseName}_chunk_`) && f.endsWith('.mp3'))
          .map(f => path.join(outputDir, f));
        resolve(generatedChunks);
      })
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Transcribe single audio chunk using Whisper API
 */
async function transcribeSingleChunk(chunkPath: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    return ' [Transcription Notice: Set OPENAI_API_KEY in server/.env for AI Transcription]';
  }

  const formData = new FormData();
  formData.append('file', fs.createReadStream(chunkPath));
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'text');

  const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY.trim()}`,
      ...formData.getHeaders(),
    },
  });

  return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
}

/**
 * Process Unlimited Duration Media Transcription
 */
export async function processTranscription(inputAudioPath: string): Promise<TranscriptSegment[]> {
  try {
    const stats = fs.statSync(inputAudioPath);
    const fileSizeMB = stats.size / (1024 * 1024);

    let fullText = '';

    // If file is larger than 20MB, chunk it dynamically into 10-minute segments
    if (fileSizeMB > 20) {
      console.log(`📦 Large media file detected (${fileSizeMB.toFixed(1)} MB). Slicing for unlimited transcription...`);
      const chunkPaths = await splitAudioIntoChunks(inputAudioPath, 600);

      for (let i = 0; i < chunkPaths.length; i++) {
        console.log(`🗣️ Transcribing chunk ${i + 1} of ${chunkPaths.length}...`);
        const chunkText = await transcribeSingleChunk(chunkPaths[i]);
        fullText += ` ${chunkText}`;
        try { fs.unlinkSync(chunkPaths[i]); } catch (e) {} // Clean up chunk
      }
    } else {
      fullText = await transcribeSingleChunk(inputAudioPath);
    }

    return [
      {
        id: `seg_${Date.now()}`,
        start: 0,
        end: 0,
        text: fullText.trim() || 'No audio detected in recording.',
      },
    ];
  } catch (error: any) {
    console.error('Unlimited Transcription Error:', error.message);
    throw new Error('Failed to transcribe media: ' + error.message);
  }
}