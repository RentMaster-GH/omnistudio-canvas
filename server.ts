// server.ts - OmniStudio Backend Persistence Server
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json({ limit: '50mb' }));

// Serve static files (index.html, uploads, outputs)
app.use(express.static(__dirname));
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// Enable CORS for development client
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST Endpoint to save canvas graph back to disk
app.post('/api/save', (req: Request, res: Response) => {
  try {
    const updatedGraph = req.body;
    const filePath = path.join(__dirname, 'canvas_graph.json');

    // Write updated JSON back to file
    fs.writeFileSync(filePath, JSON.stringify(updatedGraph, null, 2));
    res.json({ success: true, message: 'Canvas graph saved successfully' });
  } catch (error) {
    console.error('Failed to save canvas graph:', error);
    res.status(500).json({ success: false, error: 'Failed to save canvas graph' });
  }
});

// POST Endpoint to Trigger Server-Side Video Render
app.post('/api/export/mp4', (req: Request, res: Response) => {
  try {
    const { canvasState, timelineData } = req.body;
    console.log('[OmniEngine] Rendering multi-track canvas composition to MP4...');

    // Simulate server-side rendering pipeline
    const outputFileName = `omnistudio-video-${Date.now()}.mp4`;
    const outputsDir = path.join(__dirname, 'outputs');
    const outputPath = path.join(outputsDir, outputFileName);

    // Create outputs folder if it doesn't exist
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, 'MOCK_MP4_HEADER_DATA');

    res.json({
      success: true,
      message: 'Video rendered successfully by OmniEngine',
      downloadUrl: `/outputs/${outputFileName}`,
    });
  } catch (error) {
    console.error('Failed to render MP4 video:', error);
    res.status(500).json({ success: false, error: 'Video rendering failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[OmniStudio Backend] Server running on http://localhost:${PORT}`);
});