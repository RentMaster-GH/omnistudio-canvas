import React, { useState } from 'react';
import { Palette } from 'lucide-react';

interface BrandPaletteBarProps {
  onSelectColor: (hexColor: string) => void;
  borderCol?: string;
  bgBar?: string;
}

export const BrandPaletteBar: React.FC<BrandPaletteBarProps> = ({
  onSelectColor,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [swatches, setSwatches] = useState<string[]>(() => {
    const saved = localStorage.getItem('omnistudio_brand_swatches');
    return saved ? JSON.parse(saved) : ['#0284c7', '#38bdf8', '#8b5cf6', '#10b981', '#ef4444'];
  });

  const handleSwatchColorChange = (index: number, newColor: string) => {
    const updated = [...swatches];
    updated[index] = newColor;
    setSwatches(updated);
    localStorage.setItem('omnistudio_brand_swatches', JSON.stringify(updated));
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '4px' }}>
      <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
        <Palette size={11} color="#38bdf8" /> Brand Swatches:
      </span>

      {swatches.map((color, idx) => (
        <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => onSelectColor(color)}
            style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: color, border: '1px solid #ffffff', cursor: 'pointer' }}
            title={`Apply Brand Color ${color}`}
          />
          <input 
            type="color" 
            value={color} 
            onChange={(e) => handleSwatchColorChange(idx, e.target.value)}
            style={{ position: 'absolute', opacity: 0, width: '16px', height: '16px', cursor: 'pointer' }}
            title="Double-click to customize swatch"
          />
        </div>
      ))}
    </div>
  );
};