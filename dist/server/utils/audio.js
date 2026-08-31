"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupFile = exports.extractAudioForTranscription = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const extractAudioForTranscription = (inputPath) => {
    return new Promise((resolve, reject) => {
        const outputPath = path_1.default.join(path_1.default.dirname(inputPath), `converted_${Date.now()}.wav`);
        (0, fluent_ffmpeg_1.default)(inputPath)
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
exports.extractAudioForTranscription = extractAudioForTranscription;
const cleanupFile = (filePath) => {
    if (filePath && fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
};
exports.cleanupFile = cleanupFile;
