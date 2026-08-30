import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

export const extractAudioForTranscription = (inputPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(
      path.dirname(inputPath),
      `converted_${Date.now()}.wav`
    );

    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(16000)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
};

export const cleanupFile = (filePath: string) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};