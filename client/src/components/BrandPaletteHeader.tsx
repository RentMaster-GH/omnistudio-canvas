import React, { useState, useEffect } from 'react';
import { Palette, Check, Edit2 } from 'lucide-react';
import { canvas as FabricCanvas } from 'fabric';

interface Props {
  fabricCanvas: FabricCanvas.Canvas | null;
  onColorSelect?: (color: string) => void;
}

const DEFAULT_PALETTE = ['#1E293B', '#2563EB', '#10B981', '#F59E0B', '#EF4444'];
const STORAGE_KEY = 'omni_brand_palette';

export const BrandPaletteHeader: React.FC<Props> = ({ fabricCanvas, onColorSelect }) => {
  const [palette, setPalette] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_PALETTE;
  });
  const [activeColor, setActiveColor] = useState<string>(palette[0]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
  }, [palette]);

  // Apply selected brand color to active Fabric.js canvas object
  const applyColorToCanvas = (color: string) => {
    setActiveColor(color);
    if (onColorSelect) onColorSelect(color);

    if (!fabricCanvas) return;

    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    activeObjects.forEach((obj) => {
      // Handle text objects vs shapes/stamps
      if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
        obj.set('fill', color);
      } else {
        // If stroke exists and fill is transparent, change stroke, otherwise fill
        if (obj.fill && obj.fill !== 'transparent') {
          obj.set('fill', color);
        } else {
          obj.set('stroke', color);
        }
      }
    });

    fabricCanvas.renderAll();
  };

  const handleUpdateColor = (index: number, newHex: string) => {
    const updated = [...palette];
    updated[index] = newHex;
    setPalette(updated);
    if (activeColor === palette[index]) {
      setActiveColor(newHex);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-800 shadow-lg">
      <div className="flex items-center gap-1.5 border-r border-slate-700 pr-3">
        <Palette className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
          Brand Swatches
        </span>
      </div>

      <div className="flex items-center gap-2">
        {palette.map((color, idx) => (
          <div key={idx} className="relative group flex items-center justify-center">
            <button
              onClick={() => applyColorToCanvas(color)}
              className={`w-7 h-7 rounded-full border-2 transition-transform duration-150 relative ${
                activeColor === color
                  ? 'border-white scale-110 shadow-md ring-2 ring-indigo-500'
                  : 'border-slate-600 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={`Apply ${color}`}
            >
              {activeColor === color && (
                <Check className="w-3.5 h-3.5 text-white stroke-[3] absolute inset-0 m-auto drop-shadow" />
              )}
            </button>

            {/* Quick Hex Color Edit Input */}
            <input
              type="color"
              value={color}
              onChange={(e) => handleUpdateColor(idx, e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              title="Click to edit swatch color"
            />
          </div>
        ))}
      </div>

      <div className="border-l border-slate-700 pl-3 text-xs font-mono text-indigo-300">
        {activeColor}
      </div>
    </div>
  );
};