"use strict";
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
/**
 * Stitch Audio and Video together
 */
const stitchAudioVideo = (videoPath, audioPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions(['-c:v copy', '-c:a aac', '-shortest'])
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
    });
};
/**
 * Convert Media format
 */
const convertMedia = (inputPath, outputPath, options = {}) => {
    return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath);
        if (options.fps)
            command = command.fps(options.fps);
        if (options.size)
            command = command.size(options.size);
        command
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
    });
};
/**
 * Render image frame sequence to MP4
 */
const renderFramesToVideo = (frameDirPattern, fps, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(frameDirPattern)
            .inputFPS(fps)
            .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
    });
};
/**
 * Extract Audio from Video
 */
const extractAudio = (videoPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .noVideo()
            .audioCodec('libmp3lame')
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
    });
};
/**
 * Convert Whisper AI Segments into SRT Subtitle File
 */
const generateSrtFile = (segments, srtPath) => {
    let srtContent = '';
    segments.forEach((seg, index) => {
        const start = formatSrtTime(seg.start);
        const end = formatSrtTime(seg.end);
        srtContent += `${index + 1}\n${start} --> ${end}\n${seg.text.trim()}\n\n`;
    });
    fs.writeFileSync(srtPath, srtContent);
};
const formatSrtTime = (seconds) => {
    const date = new Date(0);
    date.setSeconds(seconds);
    const ms = Math.floor((seconds % 1) * 1000);
    return date.toISOString().substring(11, 19) + ',' + String(ms).padStart(3, '0');
};
/**
 * Burn SRT Subtitles onto Video using FFmpeg (Windows Safe Relative Pathing)
 */
const burnSubtitles = (videoPath, srtPath, outputPath) => {
    return new Promise((resolve, reject) => {
        // Relative path prevents Windows 'C:' colon from breaking FFmpeg filter parser
        const relativeSrtPath = path.relative(process.cwd(), srtPath).replace(/\\/g, '/');
        ffmpeg(videoPath)
            .outputOptions([
            `-vf subtitles=${relativeSrtPath}`,
        ])
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
    });
};
module.exports = {
    stitchAudioVideo,
    convertMedia,
    renderFramesToVideo,
    extractAudio,
    generateSrtFile,
    burnSubtitles,
};
