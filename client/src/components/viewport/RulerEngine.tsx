import React, { useState } from 'react';
import { Ruler } from 'lucide-react';

interface RulerEngineProps {
  activeObject: any;
  borderCol?: string;
  bgBar?: string;
}

export const RulerEngine: React.FC<RulerEngineProps> = ({
  activeObject,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [unit, setUnit] = useState<'px' | 'mm' | 'in'>('px');
  const [showRuler, setShowRuler] = useState(false);

  // Conversion factors: 1 px = 0.264583 mm, 1 px = 0.0104167 in
  const convertUnit = (pxVal: number) => {
    if (unit === 'mm') return `${(pxVal * 0.264583).toFixed(1)} mm`;
    if (unit === 'in') return `${(pxVal * 0.0104167).toFixed(2)} in`;
    return `${Math.round(pxVal)} px`;
  };

  return (
    <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 90, display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, padding: '4px 8px', borderRadius: '4px' }}>
      <button 
        onClick={() => setShowRuler(!showRuler)} 
        style={{ padding: '3px 6px', backgroundColor: showRuler ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <Ruler size={12} /> Ruler Guides
      </button>

      {showRuler && (
        <>
          <select 
            value={unit} 
            onChange={(e) => setUnit(e.target.value as any)}
            style={{ backgroundColor: '#0f172a', color: '#fff', border: `1px solid ${borderCol}`, borderRadius: '3px', padding: '2px 4px', fontSize: '10px' }}
          >
            <option value="px">Pixels (px)</option>
            <option value="mm">Millimeters (mm)</option>
            <option value="in">Inches (in)</option>
          </select>

          {activeObject && (
            <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 'bold', marginLeft: '4px' }}>
              📐 Dimensions: {convertUnit((activeObject.width || 100) * (activeObject.scaleX || 1))} x {convertUnit((activeObject.height || 100) * (activeObject.scaleY || 1))}
            </span>
          )}
        </>
      )}
    </div>
  );
};