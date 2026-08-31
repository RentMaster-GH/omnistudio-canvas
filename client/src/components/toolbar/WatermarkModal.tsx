import React, { useState } from 'react';
import { Droplet, X, Check, Layers } from 'lucide-react';

interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyWatermark: (text: string, angle: number, opacity: number, color: string, pageRange: string) => void;
  totalPages: number;
  currentPage: number;
  borderCol?: string;
  bgBar?: string;
}

export const WatermarkModal: React.FC<WatermarkModalProps> = ({
  isOpen,
  onClose,
  onApplyWatermark,
  totalPages,
  currentPage,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [angle, setAngle] = useState(-35);
  const [opacity, setOpacity] = useState(0.25);
  const [color, setColor] = useState('#ef4444');
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'current' | 'custom'>('all');
  const [customRange, setCustomRange] = useState('1-3');

  if (!isOpen) return null;

  const handleApply = () => {
    const finalRange = pageRangeMode === 'all' ? 'all' : pageRangeMode === 'current' ? `${currentPage}` : customRange;
    onApplyWatermark(watermarkText, angle, opacity, color, finalRange);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '440px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '12px 16px', backgroundColor: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Droplet size={16} /> Advanced Multi-Page Watermarking Engine
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Watermark Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={labelStyle}>Watermark Stamp Text:</label>
            <input 
              type="text" 
              value={watermarkText} 
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="e.g. CONFIDENTIAL, DO NOT COPY, SAMPLE"
              style={inputStyle}
            />
          </div>

          {/* Angle & Opacity Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Rotation Angle: {angle}°</label>
              <input type="range" min={-90} max={90} value={angle} onChange={(e) => setAngle(Number(e.target.value))} style={sliderStyle} />
            </div>

            <div>
              <label style={labelStyle}>Transparency: {Math.round(opacity * 100)}%</label>
              <input type="range" min={0.1} max={1.0} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} style={sliderStyle} />
            </div>
          </div>

          {/* Color Picker & Page Scope */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Watermark Color:</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: '40px', height: '26px', border: 'none', borderRadius: '3px', cursor: 'pointer' }} />
          </div>

          {/* Page Scope Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', backgroundColor: '#0f172a', borderRadius: '6px', border: `1px solid ${borderCol}` }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>Page Range Target:</span>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ fontSize: '11px', color: '#fff', cursor: 'pointer' }}>
                <input type="radio" name="pRange" checked={pageRangeMode === 'all'} onChange={() => setPageRangeMode('all')} style={{ accentColor: '#ef4444' }} /> All Pages ({totalPages || 1})
              </label>
              <label style={{ fontSize: '11px', color: '#fff', cursor: 'pointer' }}>
                <input type="radio" name="pRange" checked={pageRangeMode === 'current'} onChange={() => setPageRangeMode('current')} style={{ accentColor: '#38bdf8' }} /> Current (Page {currentPage})
              </label>
              <label style={{ fontSize: '11px', color: '#fff', cursor: 'pointer' }}>
                <input type="radio" name="pRange" checked={pageRangeMode === 'custom'} onChange={() => setPageRangeMode('custom')} style={{ accentColor: '#8b5cf6' }} /> Custom Range
              </label>
            </div>

            {pageRangeMode === 'custom' && (
              <input 
                type="text" 
                value={customRange} 
                onChange={(e) => setCustomRange(e.target.value)}
                placeholder="e.g. 1-3 or 2,4,6"
                style={{ ...inputStyle, marginTop: '4px' }}
              />
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <button onClick={onClose} style={actionBtnStyle('#64748b')}>Cancel</button>
            <button onClick={handleApply} style={actionBtnStyle('#ef4444')}>
              <Check size={14} /> Stamp Watermark
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#0f172a',
  color: '#fff',
  border: '1px solid #334155',
  borderRadius: '4px',
  padding: '6px 8px',
  fontSize: '12px',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#ef4444',
  cursor: 'pointer',
};

const actionBtnStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '8px 14px',
  backgroundColor: color,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
});