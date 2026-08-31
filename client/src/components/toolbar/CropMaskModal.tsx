import React, { useState } from 'react';
import { Crop, X, Check, RotateCcw } from 'lucide-react';

interface CropMaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCrop: (cropX: number, cropY: number, cropWidth: number, cropHeight: number) => void;
  borderCol?: string;
  bgBar?: string;
}

export const CropMaskModal: React.FC<CropMaskModalProps> = ({
  isOpen,
  onClose,
  onApplyCrop,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState(100);
  const [cropHeight, setCropHeight] = useState(100);

  if (!isOpen) return null;

  const handleReset = () => {
    setCropX(0);
    setCropY(0);
    setCropWidth(100);
    setCropHeight(100);
  };

  const handleSave = () => {
    onApplyCrop(cropX, cropY, cropWidth, cropHeight);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '420px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '12px 16px', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Crop size={16} /> Precision Document & Image Crop Tool
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Adjust crop boundary sliders below:</span>

          {/* Crop Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Crop Left (%): {cropX}%</label>
              <input type="range" min={0} max={50} value={cropX} onChange={(e) => setCropX(Number(e.target.value))} style={sliderStyle} />
            </div>

            <div>
              <label style={labelStyle}>Crop Top (%): {cropY}%</label>
              <input type="range" min={0} max={50} value={cropY} onChange={(e) => setCropY(Number(e.target.value))} style={sliderStyle} />
            </div>

            <div>
              <label style={labelStyle}>Crop Width (%): {cropWidth}%</label>
              <input type="range" min={20} max={100} value={cropWidth} onChange={(e) => setCropWidth(Number(e.target.value))} style={sliderStyle} />
            </div>

            <div>
              <label style={labelStyle}>Crop Height (%): {cropHeight}%</label>
              <input type="range" min={20} max={100} value={cropHeight} onChange={(e) => setCropHeight(Number(e.target.value))} style={sliderStyle} />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <button onClick={handleReset} style={actionBtnStyle('#64748b')}>
              <RotateCcw size={12} /> Reset Crop
            </button>
            <button onClick={handleSave} style={actionBtnStyle('#0284c7')}>
              <Check size={12} /> Apply Crop to Element
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#e2e8f0',
  display: 'block',
  marginBottom: '4px',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#38bdf8',
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