import React from 'react';
import { Layers, Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

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

  const toggleVisibility = (e: React.MouseEvent, layer: LayerItem) => {
    e.stopPropagation();
    if (!fabricCanvas || !layer.targetObj) return;
    const isVisible = layer.targetObj.visible !== false;
    layer.targetObj.set('visible', !isVisible);
    fabricCanvas.renderAll();
  };

  const toggleLock = (e: React.MouseEvent, layer: LayerItem) => {
    e.stopPropagation();
    if (!fabricCanvas || !layer.targetObj) return;
    const isSelectable = layer.targetObj.selectable !== false;
    layer.targetObj.set({
      selectable: !isSelectable,
      evented: !isSelectable,
    });
    fabricCanvas.renderAll();
  };

  const bringForward = (e: React.MouseEvent, layer: LayerItem) => {
    e.stopPropagation();
    if (!fabricCanvas || !layer.targetObj) return;
    fabricCanvas.bringObjectForward(layer.targetObj);
    fabricCanvas.renderAll();
  };

  const sendBackward = (e: React.MouseEvent, layer: LayerItem) => {
    e.stopPropagation();
    if (!fabricCanvas || !layer.targetObj) return;
    fabricCanvas.sendObjectBackwards(layer.targetObj);
    fabricCanvas.renderAll();
  };

  const deleteLayer = (e: React.MouseEvent, layer: LayerItem) => {
    e.stopPropagation();
    if (!fabricCanvas || !layer.targetObj) return;
    fabricCanvas.remove(layer.targetObj);
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
  };

  return (
    <div style={{ width: '220px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
      
      {/* Header */}
      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Layers size={14} /> Interactive Layer Stack ({canvasLayers.length})
      </span>

      {canvasLayers.length === 0 && (
        <p style={{ fontSize: '10px', color: '#94a3b8' }}>No objects on canvas.</p>
      )}

      {/* Layers List */}
      {canvasLayers.map((layer) => {
        const isVisible = layer.targetObj?.visible !== false;
        const isLocked = layer.targetObj?.selectable === false;

        return (
          <div 
            key={layer.index} 
            onClick={() => { fabricCanvas?.setActiveObject(layer.targetObj); fabricCanvas?.renderAll(); }} 
            style={{ 
              padding: '6px 8px', 
              border: `1px solid ${borderCol}`, 
              borderRadius: '4px', 
              fontSize: '11px', 
              cursor: 'pointer',
              backgroundColor: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: isVisible ? 1 : 0.5,
              transition: 'all 0.15s ease'
            }}
          >
            {/* Layer Title */}
            <span style={{ color: '#e2e8f0', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
              {layer.text ? `"${layer.text.substring(0, 10)}..."` : layer.type}
            </span>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Visibility Toggle */}
              <button onClick={(e) => toggleVisibility(e, layer)} style={iconBtnStyle} title={isVisible ? 'Hide Layer' : 'Show Layer'}>
                {isVisible ? <Eye size={12} color="#38bdf8" /> : <EyeOff size={12} color="#64748b" />}
              </button>

              {/* Lock Toggle */}
              <button onClick={(e) => toggleLock(e, layer)} style={iconBtnStyle} title={isLocked ? 'Unlock Layer' : 'Lock Layer'}>
                {isLocked ? <Lock size={12} color="#ef4444" /> : <Unlock size={12} color="#64748b" />}
              </button>

              {/* Bring Forward */}
              <button onClick={(e) => bringForward(e, layer)} style={iconBtnStyle} title="Bring Layer Forward">
                <ChevronUp size={12} color="#94a3b8" />
              </button>

              {/* Send Backward */}
              <button onClick={(e) => sendBackward(e, layer)} style={iconBtnStyle} title="Send Layer Backward">
                <ChevronDown size={12} color="#94a3b8" />
              </button>

              {/* Delete Layer */}
              <button onClick={(e) => deleteLayer(e, layer)} style={iconBtnStyle} title="Delete Layer">
                <Trash2 size={12} color="#ef4444" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};