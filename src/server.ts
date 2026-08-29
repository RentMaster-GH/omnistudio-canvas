// src/server.ts
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const PORT = 3000;

// Enable JSON body parsing middleware
app.use(express.json());

// Serve static frontend files from project root
app.use(express.static(path.join(__dirname, '..')));

// POST API Endpoint: Save mutated graph to disk
app.post('/api/save', (req, res) => {
  try {
    const updatedGraph = req.body;
    const filePath = path.join(__dirname, '../canvas_graph.json');

    // Overwrite canvas_graph.json with new coordinates
    fs.writeFileSync(filePath, JSON.stringify(updatedGraph, null, 2), 'utf-8');

    console.log('[Server] Successfully auto-saved canvas_graph.json to disk!');
    res.json({ success: true, message: 'Saved successfully' });
  } catch (error) {
    console.error('[Server Error] Failed to write file:', error);
    res.status(500).json({ success: false, error: 'Failed to write file' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 OmniStudio Server running at http://localhost:${PORT}`);
});