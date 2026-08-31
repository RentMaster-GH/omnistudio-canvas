"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const express_1 = __importDefault(require("express"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const app = (0, express_1.default)();
const PORT = 3000;
// Enable JSON body parsing middleware
app.use(express_1.default.json());
// Serve static frontend files from project root
app.use(express_1.default.static(path.join(__dirname, '..')));
// POST API Endpoint: Save mutated graph to disk
app.post('/api/save', (req, res) => {
    try {
        const updatedGraph = req.body;
        const filePath = path.join(__dirname, '../canvas_graph.json');
        // Overwrite canvas_graph.json with new coordinates
        fs.writeFileSync(filePath, JSON.stringify(updatedGraph, null, 2), 'utf-8');
        console.log('[Server] Successfully auto-saved canvas_graph.json to disk!');
        res.json({ success: true, message: 'Saved successfully' });
    }
    catch (error) {
        console.error('[Server Error] Failed to write file:', error);
        res.status(500).json({ success: false, error: 'Failed to write file' });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 OmniStudio Server running at http://localhost:${PORT}`);
});
