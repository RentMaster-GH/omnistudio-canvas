// src/engine.test.ts - TypeScript Engine Unit Tests
import { describe, it, expect } from 'vitest';
import { moveNode, updateText } from './modifiers';
import { CanvasGraph } from './types';

describe('OmniStudio Spatial Modifiers', () => {
  const mockGraph: CanvasGraph = {
    version: '1.0.0',
    dimensions: { width: 1920, height: 1080, unit: 'px', dpi: 72 },
    colorSpace: 'sRGB',
    rootNodeIds: ['node_1'],
    nodes: {
      node_1: {
        id: 'node_1',
        name: 'Header',
        type: 'text_block',
        visible: true,
        locked: false,
        transform: { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, anchorX: 0, anchorY: 0 },
        style: { opacity: 1, blendMode: 'normal' },
        data: { text: 'Initial Text', fontFamily: 'sans-serif', fontSize: 24, fontWeight: 400, lineHeight: 1.2, letterSpacing: 0, align: 'left' }
      }
    }
  };

  it('should translate node transform relative to current position', () => {
    const moved = moveNode(mockGraph, 'node_1', 50, -20);
    expect(moved).toBe(true);
    expect(mockGraph.nodes['node_1'].transform.x).toBe(150);
    expect(mockGraph.nodes['node_1'].transform.y).toBe(80);
  });

  it('should update text content of a text_block node', () => {
    const updated = updateText(mockGraph, 'node_1', 'Updated Headline');
    expect(updated).toBe(true);
    expect((mockGraph.nodes['node_1'].data as any).text).toBe('Updated Headline');
  });
});