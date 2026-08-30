import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const router = Router();
const uploadDir = path.join(__dirname, '../../uploads');
const outputDir = path.join(__dirname, '../../outputs');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const upload = multer({ dest: uploadDir });

/**
 * 1. POST /api/image/edit
 * Fine-tunes image brightness, blur, and format using Sharp.
 */
router.post('/edit', upload.single('image'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided.' });

  const brightness = parseFloat(req.body.brightness) || 1.0;
  const blur = parseFloat(req.body.blur) || 0;

  const outputFileName = `image_edited_${Date.now()}.png`;
  const outputPath = path.join(outputDir, outputFileName);

  try {
    let pipeline = sharp(req.file.path);

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
    fs.unlinkSync(req.file.path);

    res.json({ success: true, file: outputFileName });
  } catch (err: any) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Image processing failed', details: err.message });
  }
});

/**
 * 2. POST /api/image/remove-bg
 * Processes uploaded image to isolate foreground and generate a transparent PNG overlay.
 */
router.post('/remove-bg', upload.single('image'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided.' });

  const outputFileName = `nobg_${Date.now()}.png`;
  const outputPath = path.join(outputDir, outputFileName);

  try {
    const image = sharp(req.file.path);

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

        return sharp(data, {
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
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({ success: true, file: outputFileName });
  } catch (err: any) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Background removal failed', details: err.message });
  }
});

export default router;