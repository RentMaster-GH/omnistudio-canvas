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
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const modifiers_1 = require("./modifiers");
// 1. Load the graph
const filePath = path.join(__dirname, '../canvas_graph.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const canvasGraph = JSON.parse(rawData);
console.log("--- BEFORE MODIFICATIONS ---");
console.log(JSON.stringify(canvasGraph, null, 2));
console.log("\n--- RUNNING MODIFIERS ---");
// Test 1: Move the existing node (node_1) by +50px X, +20px Y
(0, modifiers_1.moveNode)(canvasGraph, 'node_1', 50, 20);
// Test 2: Update the text of node_1
(0, modifiers_1.updateText)(canvasGraph, 'node_1', 'OmniStudio Core Engine Active');
// Test 3: Add a brand new vector rectangle node
const rectangleNode = {
    id: 'node_2',
    name: 'Background Card',
    type: 'vector_path',
    visible: true,
    locked: false,
    transform: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        anchorX: 0,
        anchorY: 0
    },
    style: {
        opacity: 1,
        blendMode: 'normal',
        fill: { type: 'solid', color: '#FF5733' }
    },
    data: {
        svgPathData: 'M 0 0 L 400 0 L 400 300 L 0 300 Z', // Standard SVG Box path
        fillRule: 'nonzero'
    }
};
(0, modifiers_1.addNode)(canvasGraph, rectangleNode);
console.log("\n--- AFTER MODIFICATIONS ---");
console.log(`Total Root Nodes: ${canvasGraph.rootNodeIds.length}`);
console.log(`Node List:`, Object.keys(canvasGraph.nodes));
// 2. Save modified graph back to canvas_graph.json
fs.writeFileSync(filePath, JSON.stringify(canvasGraph, null, 2), 'utf-8');
console.log("\n[Disk] Successfully saved updated canvas_graph.json!");
