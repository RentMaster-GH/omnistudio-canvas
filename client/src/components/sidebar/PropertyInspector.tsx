import React, { useEffect, useState } from 'react';
import { Sliders, ArrowUp, ArrowDown, Trash2, RotateCw, Layers } from 'lucide-react';

interface PropertyInspectorProps {
  activeObject: any;
  fabricCanvas: any;
  saveState: () => void;
  borderCol?: string;
  bgBar?: string;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  activeObject,
  fabricCanvas,
  saveState,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [angle, setAngle] = useState(0);
  const [fillColor, setFillColor] = useState('#0284c7');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [opacity, setOpacity] = useState(1);

  // Sync state from active fabric object
  useEffect(() => {
    if (!activeObject) return;

    setLeft(Math.round(activeObject.left || 0));
    setTop(Math.round(activeObject.top || 0));
    setWidth(Math.round((activeObject.width || 100) * (activeObject.scaleX || 1)));
    setHeight(Math.round((activeObject.height || 100) * (activeObject.scaleY || 1)));
    setAngle(Math.round(activeObject.angle || 0));
    setOpacity(activeObject.opacity !== undefined ? activeObject.opacity : 1);

    if (typeof activeObject.fill === 'string') {
      setFillColor(activeObject.fill.startsWith('#') ? activeObject.fill : '#0284c7');
    }
    if (typeof activeObject.stroke === 'string') {
      setStrokeColor(activeObject.stroke.startsWith('#') ? activeObject.stroke : '#000000');
    }
    if (activeObject.strokeWidth) {
      setStrokeWidth(activeObject.strokeWidth);
    }
  }, [activeObject]);

  if (!activeObject) return null;

  // Change Event Handlers
  const handleLeftChange = (val: number) => {
    setLeft(val);
    activeObject.set({ left: val });
    fabricCanvas?.renderAll();
    saveState();
  };

  const handleTopChange = (val: number) => {
    setTop(val);
    activeObject.set({ top: val });
    fabricCanvas?.renderAll();
    saveState();
  };

  const handleAngleChange = (val: number) => {
    setAngle(val);
    activeObject.set({ angle: val });
    fabricCanvas?.renderAll();
    saveState();
  };

  const handleFillChange = (color: string) => {
    setFillColor(color);
    activeObject.set({ fill: color });
    fabricCanvas?.renderAll();
    saveState();
  };

  const handleStrokeChange = (color: string) => {
    setStrokeColor(color);
    activeObject.set({ stroke: color });
    fabricCanvas?.renderAll();
    saveState();
  };

  const handleStrokeWidthChange = (val: number) => {
    setStrokeWidth(val);
    activeObject.set({ strokeWidth: val });
    fabricCanvas?.renderAll();
    saveState();
  };

  const handleOpacityChange = (val: number) => {
    setOpacity(val);
    activeObject.set({ opacity: val });
    fabricCanvas?.renderAll();
    saveState();
  };

  const handleBringForward = () => {
    fabricCanvas?.bringObjectForward(activeObject);
    fabricCanvas?.renderAll();
    saveState();
  };

  const handleSendBackward = () => {
    fabricCanvas?.sendObjectBackwards(activeObject);
    fabricCanvas?.renderAll();
    saveState();
  };

  const handleDelete = () => {
    fabricCanvas?.remove(activeObject);
    fabricCanvas?.discardActiveObject();
    fabricCanvas?.renderAll();
    saveState();
  };

  return (
    <div style={{ width: '220px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
      
      {/* Header */}
      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Sliders size={14} /> Precision Inspector
      </span>

      {/* Transform Coordinates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <div>
          <label style={labelStyle}>X (px)</label>
          <input type="number" value={left} onChange={(e) => handleLeftChange(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Y (px)</label>
          <input type="number" value={top} onChange={(e) => handleTopChange(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Width</label>
          <input type="number" value={width} disabled style={{ ...inputStyle, opacity: 0.6 }} />
        </div>
        <div>
          <label style={labelStyle}>Height</label>
          <input type="number" value={height} disabled style={{ ...inputStyle, opacity: 0.6 }} />
        </div>
      </div>

      {/* Rotation */}
      <div>
        <label style={labelStyle}>Rotation Angle (°)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RotateCw size={12} color="#94a3b8" />
          <input type="range" min={0} max={360} value={angle} onChange={(e) => handleAngleChange(Number(e.target.value))} style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer' }} />
          <span style={{ fontSize: '11px', color: '#fff', width: '30px' }}>{angle}°</span>
        </div>
      </div>

      {/* Fill & Stroke Colors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <div>
          <label style={labelStyle}>Fill Color</label>
          <input type="color" value={fillColor} onChange={(e) => handleFillChange(e.target.value)} style={colorInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Stroke Color</label>
          <input type="color" value={strokeColor} onChange={(e) => handleStrokeChange(e.target.value)} style={colorInputStyle} />
        </div>
      </div>

      {/* Stroke Width */}
      <div>
        <label style={labelStyle}>Stroke Width ({strokeWidth}px)</label>
        <input type="range" min={0} max={20} value={strokeWidth} onChange={(e) => handleStrokeWidthChange(Number(e.target.value))} style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }} />
      </div>

      {/* Opacity */}
      <div>
        <label style={labelStyle}>Opacity ({Math.round(opacity * 100)}%)</label>
        <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => handleOpacityChange(Number(e.target.value))} style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }} />
      </div>

      {/* Layer Depth & Delete */}
      <div style={{ display: 'flex', gap: '4px', borderTop: `1px solid ${borderCol}`, paddingTop: '8px' }}>
        <button onClick={handleBringForward} style={btnStyle} title="Bring Forward">
          <ArrowUp size={12} /> Up
        </button>
        <button onClick={handleSendBackward} style={btnStyle} title="Send Backward">
          <ArrowDown size={12} /> Down
        </button>
        <button onClick={handleDelete} style={{ ...btnStyle, backgroundColor: '#ef4444', color: '#fff' }} title="Delete Element">
          <Trash2 size={12} /> Delete
        </button>
      </div>

    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#94a3b8',
  display: 'block',
  marginBottom: '2px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#0f172a',
  color: '#ffffff',
  border: '1px solid #334155',
  borderRadius: '3px',
  padding: '4px 6px',
  fontSize: '11px',
  boxSizing: 'border-box',
};

const colorInputStyle: React.CSSProperties = {
  width: '100%',
  height: '28px',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '3px',
  cursor: 'pointer',
  padding: '2px',
};

const btnStyle: React.CSSProperties = {
  flex: 1,
  padding: '5px',
  backgroundColor: 'rgba(255,255,255,0.08)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
};