import React from 'react';
import { Square, Circle, Triangle, MoveRight, Pencil, Highlighter } from 'lucide-react';

interface VectorShapesToolbarProps {
  onAddRectangle: () => void;
  onAddCircle: () => void;
  onAddTriangle: () => void;
  onAddArrow: () => void;
  onActivatePencil: () => void;
  onActivateHighlighter: () => void;
  borderCol?: string;
  bgBar?: string;
}

export const VectorShapesToolbar: React.FC<VectorShapesToolbarProps> = ({
  onAddRectangle,
  onAddCircle,
  onAddTriangle,
  onAddArrow,
  onActivatePencil,
  onActivateHighlighter,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '4px 8px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '4px' }}>
      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginRight: '4px' }}>Shapes & Drawing:</span>
      
      <button onClick={onAddRectangle} style={shapeBtnStyle('#0284c7')} title="Add Rectangle Shape">
        <Square size={12} /> Rectangle
      </button>

      <button onClick={onAddCircle} style={shapeBtnStyle('#8b5cf6')} title="Add Circle Shape">
        <Circle size={12} /> Circle
      </button>

      <button onClick={onAddTriangle} style={shapeBtnStyle('#f59e0b')} title="Add Triangle Shape">
        <Triangle size={12} /> Triangle
      </button>

      <button onClick={onAddArrow} style={shapeBtnStyle('#10b981')} title="Add Directional Arrow">
        <MoveRight size={12} /> Arrow
      </button>

      <div style={{ width: '1px', height: '14px', backgroundColor: borderCol, margin: '0 2px' }} />

      <button onClick={onActivatePencil} style={shapeBtnStyle('#ef4444')} title="Freehand Pen Brush">
        <Pencil size={12} /> Pen
      </button>

      <button onClick={onActivateHighlighter} style={shapeBtnStyle('#eab308')} title="Highlighter Pen">
        <Highlighter size={12} /> Highlighter
      </button>
    </div>
  );
};

const shapeBtnStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 7px',
  backgroundColor: 'rgba(255,255,255,0.08)',
  color: '#ffffff',
  border: `1px solid ${color}`,
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
});