const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');

const videoRoutes = require('./routes/videoRoutes');
const imageRoutes = require('./routes/imageRoutes');
const transcriptionRoutes = require('./routes/transcriptionRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Increase JSON payload limit to 50MB for canvas base64 frame sequences
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static output files
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// Mount API Routes
app.use('/api/video', videoRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/transcribe', transcriptionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'Online', service: 'omnistudio-canvas API' });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to omnistudio-canvas API!',
    endpoints: {
      health: '/api/health',
      video: '/api/video',
      image: '/api/image',
      transcribe: '/api/transcribe',
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 omnistudio-canvas backend running on http://localhost:${PORT}`);
});