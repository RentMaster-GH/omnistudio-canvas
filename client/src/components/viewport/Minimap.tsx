import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface MinimapProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  borderCol?: string;
  bgBar?: string;
}

export const Minimap: React.FC<MinimapProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  return (
    <div 
      style={{ 
        position: 'absolute', 
        bottom: '16px', 
        right: '16px', 
        backgroundColor: bgBar, 
        border: `1px solid ${borderCol}`, 
        borderRadius: '6px', 
        padding: '6px 10px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        zIndex: 90
      }}
    >
      <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>
        {Math.round(zoomLevel * 100)}%
      </span>

      <div style={{ width: '1px', height: '14px', backgroundColor: borderCol }} />

      <button onClick={onZoomOut} style={btnStyle} title="Zoom Out (-)">
        <ZoomOut size={13} />
      </button>

      <button onClick={onZoomIn} style={btnStyle} title="Zoom In (+)">
        <ZoomIn size={13} />
      </button>

      <button onClick={onResetZoom} style={btnStyle} title="Reset 100%">
        <RotateCcw size={13} />
      </button>

      <button onClick={onFitToScreen} style={btnStyle} title="Fit Screen">
        <Maximize2 size={13} />
      </button>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  padding: '4px 6px',
  backgroundColor: 'rgba(255,255,255,0.08)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};