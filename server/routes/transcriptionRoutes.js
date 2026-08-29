const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const transcriptionService = require('../services/transcriptionService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

// Route: Transcribe uploaded video/audio file
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio or Video file is required.' });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return res.status(500).json({ error: 'OpenAI API key missing in server/.env' });
    }

    const result = await transcriptionService.transcribeMedia(req.file.path);

    res.json({
      success: true,
      message: 'Media transcribed successfully!',
      transcription: result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;