const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const imageService = require('../services/imageService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

// Route 1: Fine-tune, Resize, and Convert Image
router.post('/edit', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required.' });

    const format = req.body.format || 'png';
    const outputFileName = `edited-${Date.now()}.${format}`;
    const outputPath = path.join(__dirname, '../outputs', outputFileName);

    await imageService.editImage(req.file.path, outputPath, req.body);

    res.json({ success: true, message: 'Image processed successfully!', file: outputFileName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route 2: Overlay / Layer images (Combine layers)
router.post('/overlay', upload.fields([{ name: 'base' }, { name: 'overlay' }]), async (req, res) => {
  try {
    if (!req.files.base || !req.files.overlay) {
      return res.status(400).json({ error: 'Both base and overlay images are required.' });
    }

    const baseFilePath = req.files.base[0].path;
    const overlayFilePath = req.files.overlay[0].path;
    const outputFileName = `layered-${Date.now()}.png`;
    const outputPath = path.join(__dirname, '../outputs', outputFileName);

    const { x, y } = req.body;
    await imageService.overlayImages(baseFilePath, overlayFilePath, outputPath, x, y);

    res.json({ success: true, message: 'Image layers combined successfully!', file: outputFileName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route 3: Edit PDF Document (Add Text)
router.post('/pdf/add-text', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file is required.' });

    const { text, x, y, fontSize } = req.body;
    if (!text) return res.status(400).json({ error: 'Text content is required.' });

    const outputFileName = `edited-doc-${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, '../outputs', outputFileName);

    await imageService.addTextToPdf(req.file.path, outputPath, text, x, y, fontSize);

    res.json({ success: true, message: 'PDF document updated successfully!', file: outputFileName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;