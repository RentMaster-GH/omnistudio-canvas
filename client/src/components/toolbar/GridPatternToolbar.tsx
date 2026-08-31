import React from 'react';
import { Grid, LayoutGrid } from 'lucide-react';

interface GridPatternToolbarProps {
  onSetCanvasPattern: (patternType: 'white' | 'dot' | 'blueprint' | 'isometric' | 'dark') => void;
  borderCol?: string;
  bgBar?: string;
}

export const GridPatternToolbar: React.FC<GridPatternToolbarProps> = ({
  onSetCanvasPattern,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 8px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '4px' }}>
      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
        <Grid size={12} /> Paper Grid:
      </span>

      <button onClick={() => onSetCanvasPattern('white')} style={patternBtnStyle('#ffffff', '#0f172a')} title="White Paper">
        📄 White
      </button>

      <button onClick={() => onSetCanvasPattern('dot')} style={patternBtnStyle('#0f172a', '#38bdf8')} title="Dot Grid Paper">
        🟣 Dot Grid
      </button>

      <button onClick={() => onSetCanvasPattern('blueprint')} style={patternBtnStyle('#0f2b48', '#38bdf8')} title="Engineering Blueprint">
        📐 Blueprint
      </button>

      <button onClick={() => onSetCanvasPattern('isometric')} style={patternBtnStyle('#1e293b', '#8b5cf6')} title="3D Isometric Grid">
        🕋 Isometric
      </button>

      <button onClick={() => onSetCanvasPattern('dark')} style={patternBtnStyle('#0f172a', '#ffffff')} title="Dark Slate Board">
        🖤 Dark Slate
      </button>
    </div>
  );
};

const patternBtnStyle = (bgColor: string, textColor: string): React.CSSProperties => ({
  padding: '3px 7px',
  backgroundColor: bgColor,
  color: textColor,
  border: '1px solid #334155',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '10px',
  fontWeight: 'bold',
});