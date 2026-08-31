// src/index.ts
import * as fs from 'fs';
import * as path from 'path';
import { CanvasGraph, CanvasNode } from './types';
import { moveNode, addNode, updateText } from './modifiers';

// 1. Load the graph
const filePath = path.join(__dirname, '../canvas_graph.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const canvasGraph: CanvasGraph = JSON.parse(rawData);

console.log("--- BEFORE MODIFICATIONS ---");
console.log(JSON.stringify(canvasGraph, null, 2));

console.log("\n--- RUNNING MODIFIERS ---");

// Test 1: Move the existing node (node_1) by +50px X, +20px Y
moveNode(canvasGraph, 'node_1', 50, 20);

// Test 2: Update the text of node_1
updateText(canvasGraph, 'node_1', 'OmniStudio Core Engine Active');

// Test 3: Add a brand new vector rectangle node
const rectangleNode: CanvasNode = {
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

addNode(canvasGraph, rectangleNode);

console.log("\n--- AFTER MODIFICATIONS ---");
console.log(`Total Root Nodes: ${canvasGraph.rootNodeIds.length}`);
console.log(`Node List:`, Object.keys(canvasGraph.nodes));

// 2. Save modified graph back to canvas_graph.json
fs.writeFileSync(filePath, JSON.stringify(canvasGraph, null, 2), 'utf-8');
console.log("\n[Disk] Successfully saved updated canvas_graph.json!");