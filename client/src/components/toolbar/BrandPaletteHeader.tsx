import React, { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';

interface Props {
  fabricCanvas: any;
  onColorSelect: (color: string) => void;
}

const DEFAULT_PALETTE = ['#0f172a', '#2563eb', '#10b981', '#f59e0b', '#ef4444'];
const STORAGE_KEY = 'omnistudio_brand_palette';

export const BrandPaletteHeader: React.FC<Props> = ({ fabricCanvas, onColorSelect }) => {
  const [palette, setPalette] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_PALETTE;
  });
  const [activeColor, setActiveColor] = useState<string>(palette[0]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
  }, [palette]);

  const handleSelectColor = (color: string) => {
    setActiveColor(color);
    onColorSelect(color);
  };

  const handleUpdateColor = (index: number, newHex: string) => {
    const updated = [...palette];
    updated[index] = newHex;
    setPalette(updated);
    if (activeColor === palette[index]) {
      setActiveColor(newHex);
      onColorSelect(newHex);
    }
  };

  return (
    <div style={{ display: 'flex', itemsCenter: 'center', gap: '10px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
      <div style={{ display: 'flex', itemsCenter: 'center', gap: '6px', borderRight: '1px solid #475569', paddingRight: '10px' }}>
        <Palette style={{ width: '16px', height: '16px', color: '#818cf8' }} />
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px' }}>
          BRAND SWATCHES
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {palette.map((color, idx) => (
          <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={() => handleSelectColor(color)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: color,
                border: activeColor === color ? '2px solid #ffffff' : '2px solid #475569',
                cursor: 'pointer',
                boxShadow: activeColor === color ? '0 0 0 2px #6366f1' : 'none',
                transform: activeColor === color ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
              title={`Apply ${color}`}
            >
              {activeColor === color && (
                <Check style={{ width: '14px', height: '14px', color: '#ffffff', position: 'absolute', top: '4px', left: '4px' }} />
              )}
            </button>
            <input
              type="color"
              value={color}
              onChange={(e) => handleUpdateColor(idx, e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              title="Click to edit hex color"
            />
          </div>
        ))}
      </div>

      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#a5b4fc', borderLeft: '1px solid #475569', paddingLeft: '10px' }}>
        {activeColor}
      </span>
    </div>
  );
};