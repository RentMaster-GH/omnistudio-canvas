import React from 'react';
import { 
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical, 
  Layers, Unlink 
} from 'lucide-react';

interface AlignmentToolbarProps {
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignMiddle: () => void;
  onAlignBottom: () => void;
  onGroupObjects: () => void;
  onUngroupObjects: () => void;
  borderCol?: string;
  bgBar?: string;
}

export const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onGroupObjects,
  onUngroupObjects,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 8px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '4px' }}>
      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginRight: '4px' }}>Layout:</span>
      
      <button onClick={onAlignLeft} style={alignBtnStyle} title="Align Left">
        <AlignLeft size={12} />
      </button>

      <button onClick={onAlignCenter} style={alignBtnStyle} title="Align Horizontally Center">
        <AlignCenter size={12} />
      </button>

      <button onClick={onAlignRight} style={alignBtnStyle} title="Align Right">
        <AlignRight size={12} />
      </button>

      <div style={{ width: '1px', height: '14px', backgroundColor: borderCol, margin: '0 2px' }} />

      <button onClick={onAlignTop} style={alignBtnStyle} title="Align Top">
        <AlignStartVertical size={12} />
      </button>

      <button onClick={onAlignMiddle} style={alignBtnStyle} title="Align Vertically Center">
        <AlignCenterVertical size={12} />
      </button>

      <button onClick={onAlignBottom} style={alignBtnStyle} title="Align Bottom">
        <AlignEndVertical size={12} />
      </button>

      <div style={{ width: '1px', height: '14px', backgroundColor: borderCol, margin: '0 2px' }} />

      <button onClick={onGroupObjects} style={groupBtnStyle('#0284c7')} title="Group Selected Objects">
        <Layers size={12} /> Group
      </button>

      <button onClick={onUngroupObjects} style={groupBtnStyle('#f59e0b')} title="Ungroup Selected Group">
        <Unlink size={12} /> Ungroup
      </button>
    </div>
  );
};

const alignBtnStyle: React.CSSProperties = {
  padding: '3px 6px',
  backgroundColor: 'rgba(255,255,255,0.08)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const groupBtnStyle = (color: string): React.CSSProperties => ({
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