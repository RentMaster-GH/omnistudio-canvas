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
 * POST /api/image/edit
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

    // Cleanup upload
    fs.unlinkSync(req.file.path);

    res.json({ success: true, file: outputFileName });
  } catch (err: any) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Image processing failed', details: err.message });
  }
});

export default router;