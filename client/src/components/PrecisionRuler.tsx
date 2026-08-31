import React, { useState, useEffect, useRef } from 'react';
import { Ruler, Move, CornerDownRight, Crosshair } from 'lucide-react';
import { canvas as FabricCanvas } from 'fabric';

export type MeasurementUnit = 'px' | 'mm' | 'in';

interface Props {
  fabricCanvas: FabricCanvas.Canvas | null;
  enabled: boolean;
  onToggle: (state: boolean) => void;
}

export const PrecisionRuler: React.FC<Props> = ({ fabricCanvas, enabled, onToggle }) => {
  const [unit, setUnit] = useState<MeasurementUnit>('mm');
  const [selectedDimensions, setSelectedDimensions] = useState<{ width: number; height: number } | null>(null);
  const [dragBox, setDragBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Conversion rates (Standard 96 DPI CSS Screen Ratio)
  const formatMeasurement = (pixels: number): string => {
    switch (unit) {
      case 'mm':
        return `${(pixels * 0.264583).toFixed(2)} mm`;
      case 'in':
        return `${(pixels / 96).toFixed(3)} in`;
      case 'px':
      default:
        return `${Math.round(pixels)} px`;
    }
  };

  // Sync with active selection on Fabric Canvas
  useEffect(() => {
    if (!fabricCanvas) return;

    const updateFromSelection = () => {
      const activeObj = fabricCanvas.getActiveObject();
      if (activeObj) {
        const bound = activeObj.getBoundingRect();
        setSelectedDimensions({
          width: bound.width,
          height: bound.height,
        });
      } else {
        setSelectedDimensions(null);
      }
    };

    fabricCanvas.on('selection:created', updateFromSelection);
    fabricCanvas.on('selection:updated', updateFromSelection);
    fabricCanvas.on('selection:cleared', () => setSelectedDimensions(null));
    fabricCanvas.on('object:modified', updateFromSelection);
    fabricCanvas.on('object:scaling', updateFromSelection);

    return () => {
      fabricCanvas.off('selection:created', updateFromSelection);
      fabricCanvas.off('selection:updated', updateFromSelection);
      fabricCanvas.off('selection:cleared');
      fabricCanvas.off('object:modified', updateFromSelection);
      fabricCanvas.off('object:scaling', updateFromSelection);
    };
  }, [fabricCanvas]);

  // Handle Drag-to-Measure on Overlay
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enabled || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragBox({ x1: x, y1: y, x2: x, y2: y });
    setIsMeasuring(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMeasuring || !dragBox || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    setDragBox({
      ...dragBox,
      x2: e.clientX - rect.left,
      y2: e.clientY - rect.top,
    });
  };

  const handleMouseUp = () => {
    setIsMeasuring(false);
  };

  const dragWidth = dragBox ? Math.abs(dragBox.x2 - dragBox.x1) : 0;
  const dragHeight = dragBox ? Math.abs(dragBox.y2 - dragBox.y1) : 0;
  const left = dragBox ? Math.min(dragBox.x1, dragBox.x2) : 0;
  const top = dragBox ? Math.min(dragBox.y1, dragBox.y2) : 0;

  return (
    <>
      {/* Precision Ruler Control Tool Strip */}
      <div className="flex items-center gap-3 bg-slate-900 text-white px-3 py-1.5 rounded-lg border border-slate-800 shadow-md">
        <button
          onClick={() => onToggle(!enabled)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all ${
            enabled ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          Ruler Overlay {enabled ? 'ON' : 'OFF'}
        </button>

        {/* Units Selector */}
        <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700">
          {(['px', 'mm', 'in'] as MeasurementUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-2 py-0.5 text-[11px] font-bold rounded uppercase transition-all ${
                unit === u ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Live Selection Readout */}
        {selectedDimensions && (
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 border-l border-slate-700 pl-3">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              W: <b>{formatMeasurement(selectedDimensions.width)}</b>
            </span>
            <span>|</span>
            <span>
              H: <b>{formatMeasurement(selectedDimensions.height)}</b>
            </span>
          </div>
        )}
      </div>

      {/* Screen Interactive Ruler Canvas Overlay */}
      {enabled && (
        <div
          ref={overlayRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="absolute inset-0 z-20 cursor-crosshair select-none bg-indigo-950/5 pointer-events-auto"
        >
          {/* Active Manual Drag Box Measure */}
          {dragBox && dragWidth > 2 && dragHeight > 2 && (
            <div
              className="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/20 shadow-xl"
              style={{ left, top, width: dragWidth, height: dragHeight }}
            >
              <div className="absolute -top-7 left-0 bg-indigo-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                <Move className="w-3 h-3" />
                {formatMeasurement(dragWidth)} × {formatMeasurement(dragHeight)}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};