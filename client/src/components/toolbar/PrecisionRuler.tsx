import React, { useState, useEffect, useRef } from 'react';
import { Ruler, Crosshair, Move } from 'lucide-react';

export type MeasurementUnit = 'px' | 'mm' | 'in';

interface Props {
  fabricCanvas: any;
  enabled: boolean;
  onToggle: (state: boolean) => void;
}

export const PrecisionRuler: React.FC<Props> = ({ fabricCanvas, enabled, onToggle }) => {
  const [unit, setUnit] = useState<MeasurementUnit>('mm');
  const [selectedDimensions, setSelectedDimensions] = useState<{ width: number; height: number } | null>(null);
  const [dragBox, setDragBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const formatMeasurement = (pixels: number): string => {
    if (unit === 'mm') return `${(pixels * 0.264583).toFixed(2)} mm`;
    if (unit === 'in') return `${(pixels / 96).toFixed(3)} in`;
    return `${Math.round(pixels)} px`;
  };

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
    setDragBox({ ...dragBox, x2: e.clientX - rect.left, y2: e.clientY - rect.top });
  };

  const handleMouseUp = () => setIsMeasuring(false);

  const dragWidth = dragBox ? Math.abs(dragBox.x2 - dragBox.x1) : 0;
  const dragHeight = dragBox ? Math.abs(dragBox.y2 - dragBox.y1) : 0;
  const left = dragBox ? Math.min(dragBox.x1, dragBox.x2) : 0;
  const top = dragBox ? Math.min(dragBox.y1, dragBox.y2) : 0;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
        <button
          onClick={() => onToggle(!enabled)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: enabled ? '#0284c7' : '#334155',
            color: '#ffffff',
            transition: 'all 0.15s ease'
          }}
        >
          <Ruler style={{ width: '14px', height: '14px' }} />
          Precision Ruler: {enabled ? 'ON' : 'OFF'}
        </button>

        <div style={{ display: 'flex', backgroundColor: '#0f172a', padding: '2px', borderRadius: '4px', border: '1px solid #334155' }}>
          {(['px', 'mm', 'in'] as MeasurementUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              style={{
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 'bold',
                borderRadius: '3px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: unit === u ? '#6366f1' : 'transparent',
                color: unit === u ? '#ffffff' : '#94a3b8',
                textTransform: 'uppercase'
              }}
            >
              {u}
            </button>
          ))}
        </div>

        {selectedDimensions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', fontSize: '11px', color: '#34d399', borderLeft: '1px solid #475569', paddingLeft: '10px' }}>
            <Crosshair style={{ width: '13px', height: '13px' }} />
            <span>W: <b>{formatMeasurement(selectedDimensions.width)}</b></span>
            <span>|</span>
            <span>H: <b>{formatMeasurement(selectedDimensions.height)}</b></span>
          </div>
        )}
      </div>

      {enabled && (
        <div
          ref={overlayRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            cursor: 'crosshair',
            userSelect: 'none',
            backgroundColor: 'rgba(15, 23, 42, 0.08)'
          }}
        >
          {dragBox && dragWidth > 2 && dragHeight > 2 && (
            <div
              style={{
                position: 'absolute',
                left,
                top,
                width: dragWidth,
                height: dragHeight,
                border: '2px dashed #6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-26px',
                  left: 0,
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Move style={{ width: '10px', height: '10px' }} />
                {formatMeasurement(dragWidth)} × {formatMeasurement(dragHeight)}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};