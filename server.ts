// server.ts - OmniStudio Backend Persistence Server
import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files (index.html, app.js, canvas_graph.json)
app.use(express.static(__dirname));

// POST Endpoint to save canvas graph back to disk
app.post('/api/save', (req, res) => {
  try {
    const updatedGraph = req.body;
    const filePath = path.join(__dirname, 'canvas_graph.json');

    // Write updated JSON back to file
    fs.writeFileSync(filePath, JSON.stringify(updatedGraph,