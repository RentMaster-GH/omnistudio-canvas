"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const uploadDir = path_1.default.join(__dirname, '../../uploads');
const outputDir = path_1.default.join(__dirname, '../../outputs');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
if (!fs_1.default.existsSync(outputDir))
    fs_1.default.mkdirSync(outputDir, { recursive: true });
const upload = (0, multer_1.default)({ dest: uploadDir });
/**
 * 1. POST /api/image/edit
 * Fine-tunes image brightness, blur, and format using Sharp.
 */
router.post('/edit', upload.single('image'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No image provided.' });
    const brightness = parseFloat(req.body.brightness) || 1.0;
    const blur = parseFloat(req.body.blur) || 0;
    const outputFileName = `image_edited_${Date.now()}.png`;
    const outputPath = path_1.default.join(outputDir, outputFileName);
    try {
        let pipeline = (0, sharp_1.default)(req.file.path);
        // Apply brightness (modulate)
        if (brightness !== 1.0) {
            pipeline = pipeline.modulate({ brightness });
        }
        // Apply blur
        if (blur > 0) {
            pipeline = pipeline.blur(blur);
        }
        await pipeline.png().toFile(outputPath);
        // Cleanup uploaded input file
        fs_1.default.unlinkSync(req.file.path);
        res.json({ success: true, file: outputFileName });
    }
    catch (err) {
        if (fs_1.default.existsSync(req.file.path))
            fs_1.default.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Image processing failed', details: err.message });
    }
});
/**
 * 2. POST /api/image/remove-bg
 * Processes uploaded image to isolate foreground and generate a transparent PNG overlay.
 */
router.post('/remove-bg', upload.single('image'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No image provided.' });
    const outputFileName = `nobg_${Date.now()}.png`;
    const outputPath = path_1.default.join(outputDir, outputFileName);
    try {
        const image = (0, sharp_1.default)(req.file.path);
        // Perform high-contrast alpha channel keying for background transparency
        await image
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true })
            .then(({ data, info }) => {
            // Simple color distance threshold for white/light background removal
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // Detect near-white background pixels and set alpha channel to transparent (0)
                if (r > 230 && g > 230 && b > 230) {
                    data[i + 3] = 0;
                }
            }
            return (0, sharp_1.default)(data, {
                raw: {
                    width: info.width,
                    height: info.height,
                    channels: 4,
                },
            })
                .png()
                .toFile(outputPath);
        });
        // Cleanup uploaded input file
        if (fs_1.default.existsSync(req.file.path))
            fs_1.default.unlinkSync(req.file.path);
        res.json({ success: true, file: outputFileName });
    }
    catch (err) {
        if (fs_1.default.existsSync(req.file.path))
            fs_1.default.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Background removal failed', details: err.message });
    }
});
exports.default = router;
