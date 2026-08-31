"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts - OmniStudio Backend Persistence Server
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware to parse incoming JSON payloads
app.use(express_1.default.json({ limit: '50mb' }));
// Serve static files
app.use(express_1.default.static(__dirname));
// Enable CORS for development client
app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});
// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// POST Endpoint to save canvas graph back to disk
app.post('/api/save', (req, res) => {
    try {
        const updatedGraph = req.body;
        const filePath = path_1.default.join(__dirname, 'canvas_graph.json');
        // Write updated JSON back to file
        fs_1.default.writeFileSync(filePath, JSON.stringify(updatedGraph, null, 2));
        res.json({ success: true, message: 'Canvas graph saved successfully' });
    }
    catch (error) {
        console.error('Failed to save canvas graph:', error);
        res.status(500).json({ success: false, error: 'Failed to save canvas graph' });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`[OmniStudio Backend] Server running on http://localhost:${PORT}`);
});
