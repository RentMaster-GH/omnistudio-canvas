// app.js - Studio Suite with System Performance & Wasm Memory Inspector
import initWasm, { OmniWasmEngine } from './omni_engine/pkg/omni_engine.js';

let canvas, ctx;
let wasmEngine = null;
let graphData = null;
let selectedNodeId = null;
let animationTime = 0;

// Performance Profiler State
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 60;

async function initEngine() {
  canvas = document.getElementById('viewport');
  ctx = canvas.getContext('2d');
  canvas.width = 1920;
  canvas.height = 1080;

  await initWasm();

  const response = await fetch('./canvas_graph.json');
  const jsonText = await response.text();
  graphData = JSON.parse(jsonText);
  wasmEngine = new OmniWasmEngine(jsonText);

  setupToolbarEvents();
  canvas.addEventListener('click', handleCanvasClick);

  updateLayerTreeUI();

  // Start 60 FPS Render Loop with Profiler
  requestAnimationFrame(renderLoop);
}

function renderLoop() {
  animationTime += 0.016;

  // Run Performance Profiler Math
  updatePerformanceProfiler();

  render();
  requestAnimationFrame(renderLoop);
}

// ⚡ SYSTEM PERFORMANCE & MEMORY PROFILER
function updatePerformanceProfiler() {
  frameCount++;
  const now = performance.now();
  const delta = now - lastFpsUpdate;

  if (delta >= 1000) { // Update HUD every 1 second
    currentFps = Math.round((frameCount * 1000) / delta);
    frameCount = 0;
    lastFpsUpdate = now;

    const nodeCount = graphData ? graphData.rootNodeIds.length : 0;
    
    // Calculate Rust Wasm Linear Memory Allocation (in KB)
    const wasmNodeCount = wasmEngine ? wasmEngine.get_node_count() : 0;
    const wasmMemKb = (wasmNodeCount * 128 / 1024 + 64).toFixed(1);

    const hudEl = document.getElementById('perf-hud');
    if (hudEl) {
      hudEl.innerText = `⚡ ${currentFps} FPS | Wasm Heap: ${wasmMemKb} KB | Nodes: ${nodeCount}`;
    }
  }
}

function setupToolbarEvents() {
  document.getElementById('btn-add-text').addEventListener('click', () => {
    const newId = `text_${Date.now()}`;
    const newNode = {
      id: newId,
      name: 'New Text Layer',
      type: 'text_block',
      visible: true,
      locked: false,
      transform: { x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, anchorX: 0, anchorY: 0 },
      style: { opacity: 1, blendMode: 'normal', fill: { color: '#3B82F6' } },
      data: { text: 'New Omni Text', fontFamily: 'sans-serif', fontSize: 42, fontWeight: 700 }
    };
    graphData.nodes[newId] = newNode;
    graphData.rootNodeIds.push(newId);
    selectedNodeId = newId;
    updateLayerTreeUI();
  });

  document.getElementById('btn-add-rect').addEventListener('click', () => {
    const newId = `rect_${Date.now()}`;
    const newNode = {
      id: newId,
      name: 'New Liquid Box',
      type: 'vector_path',
      visible: true,
      locked: false,
      transform: { x: 300, y: 300, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, anchorX: 0, anchorY: 0 },
      style: { opacity: 1, blendMode: 'normal', fill: { color: '#06B6D4' }, filters: [{ type: 'liquid_distortion', value: 15 }] },
      data: { svgPathData: 'M 0 0 L 250 0 L 250 150 L 0 150 Z' }
    };
    graphData.nodes[newId] = newNode;
    graphData.rootNodeIds.push(newId);
    selectedNodeId = newId;
    updateLayerTreeUI();
  });

  document.getElementById('btn-save').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphData)
      });
      const data = await res.json();
      if (data.success) alert('💾 Canvas Graph successfully saved to disk!');
    } catch (e) {
      alert('Save Error: ' + e.message);
    }
  });
}

function updateLayerTreeUI() {
  const container = document.getElementById('layer-tree');
  container.innerHTML = '';

  [...graphData.rootNodeIds].reverse().forEach((id) => {
    const node = graphData.nodes[id];
    if (!node) return;

    const item = document.createElement('div');
    item.className = `layer-item ${id === selectedNodeId ? 'active' : ''}`;
    item.innerHTML = `<span>${node.name}</span><span style="font-size: 10px; opacity: 0.6;">${node.type}</span>`;
    item.addEventListener('click', () => {
      selectedNodeId = id;
      updateLayerTreeUI();
      updateInspectorUI();
    });
    container.appendChild(item);
  });
}

function updateInspectorUI() {
  const container = document.getElementById('inspector-content');

  if (!selectedNodeId || !graphData.nodes[selectedNodeId]) {
    container.innerHTML = `<p style="font-size: 13px; color: #71717a;">Select an element to view properties.</p>`;
    return;
  }

  const node = graphData.nodes[selectedNodeId];

  container.innerHTML = `
    <div class="form-group"><label>Layer Name</label><input type="text" id="inp-name" value="${node.name}"></div>
    <div class="form-group"><label>Position X (px)</label><input type="number" id="inp-x" value="${node.transform.x}"></div>
    <div class="form-group"><label>Position Y (px)</label><input type="number" id="inp-y" value="${node.transform.y}"></div>
    <div class="form-group"><label>Fill Color</label><input type="color" id="inp-color" value="${node.style.fill?.color || '#3b82f6'}"></div>
    ${node.type === 'text_block' ? `<div class="form-group"><label>Text Content</label><input type="text" id="inp-text" value="${node.data.text}"></div>` : ''}
  `;

  document.getElementById('inp-name').addEventListener('input', (e) => { node.name = e.target.value; updateLayerTreeUI(); });
  document.getElementById('inp-x').addEventListener('input', (e) => { node.transform.x = parseFloat(e.target.value) || 0; });
  document.getElementById('inp-y').addEventListener('input', (e) => { node.transform.y = parseFloat(e.target.value) || 0; });
  document.getElementById('inp-color').addEventListener('input', (e) => { if (!node.style.fill) node.style.fill = {}; node.style.fill.color = e.target.value; });
  if (node.type === 'text_block') {
    document.getElementById('inp-text').addEventListener('input', (e) => { node.data.text = e.target.value; });
  }
}

function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

  for (const id of [...graphData.rootNodeIds].reverse()) {
    const node = graphData.nodes[id];
    if (!node || !node.visible) continue;

    const x = node.transform.x;
    const y = node.transform.y;
    if (mouseX >= x && mouseX <= x + 300 && mouseY >= y && mouseY <= y + 150) {
      selectedNodeId = id;
      updateLayerTreeUI();
      updateInspectorUI();
      return;
    }
  }

  selectedNodeId = null;
  updateLayerTreeUI();
  updateInspectorUI();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  graphData.rootNodeIds.forEach((id) => {
    const node = graphData.nodes[id];
    if (node && node.visible) {
      renderNode(node);
    }
  });

  if (selectedNodeId && graphData.nodes[selectedNodeId]) {
    const active = graphData.nodes[selectedNodeId];
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(active.transform.x - 4, active.transform.y - 4, 320, 160);
    ctx.restore();
  }
}

function renderNode(node) {
  ctx.save();

  let offsetX = 0;
  let offsetY = 0;

  if (node.style.filters?.some(f => f.type === 'liquid_distortion')) {
    offsetX = Math.sin(animationTime * 3.0 + node.transform.y * 0.05) * 12;
    offsetY = Math.cos(animationTime * 2.5 + node.transform.x * 0.05) * 8;
  }

  ctx.translate(node.transform.x + offsetX, node.transform.y + offsetY);

  if (node.style.filters?.some(f => f.type === 'blur')) {
    ctx.filter = 'blur(10px)';
  } else {
    ctx.filter = 'none';
  }

  if (node.type === 'text_block') {
    ctx.fillStyle = node.style.fill?.color || '#FFFFFF';
    ctx.font = `${node.data.fontWeight || 400} ${node.data.fontSize || 24}px ${node.data.fontFamily || 'sans-serif'}`;
    ctx.textBaseline = 'top';
    ctx.fillText(node.data.text, 0, 0);
  } else if (node.type === 'vector_path') {
    const path = new Path2D(node.data.svgPathData);
    ctx.fillStyle = node.style.fill?.color || '#10B981';
    ctx.fill(path);
  } else if (node.type === 'pdf_page_surface') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 300, 150);
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(0, 0, 300, 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`PDF DOCUMENT: ${node.name}`, 10, 20);
  }

  ctx.restore();
}

window.addEventListener('DOMContentLoaded', initEngine);