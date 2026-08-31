import React from 'react';

interface LayerItem {
  index: number;
  type: string;
  text?: string;
  visible: boolean;
  selectable: boolean;
  targetObj: any;
}

interface LayersStackProps {
  canvasLayers: LayerItem[];
  fabricCanvas: any;
  bgBar: string;
  borderCol: string;
}

export const LayersStack: React.FC<LayersStackProps> = ({
  canvasLayers,
  fabricCanvas,
  bgBar,
  borderCol,
}) => {
  return (
    <div style={{ width: '200px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>Layers Stack ({canvasLayers.length})</span>
      {canvasLayers.length === 0 && (
        <p style={{ fontSize: '10px', color: '#94a3b8' }}>No objects on canvas.</p>
      )}
      {canvasLayers.map((layer) => (
        <div 
          key={layer.index} 
          onClick={() => { fabricCanvas?.setActiveObject(layer.targetObj); fabricCanvas?.renderAll(); }} 
          style={{ padding: '6px', border: `1px solid ${borderCol}`, borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
        >
          {layer.text ? `"${layer.text.substring(0, 10)}..."` : layer.type}
        </div>
      ))}
    </div>
  );
};