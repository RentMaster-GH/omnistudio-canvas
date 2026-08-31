import React from 'react';
import { Upload, RotateCcw, RotateCw, Type } from 'lucide-react';

interface SecondaryRibbonProps {
  handlePdfDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  undoStackLength: number;
  redoStackLength: number;
  addText: () => void;
  applyWatermarkToAllPages: (text?: string) => void;
  applyCanvasPresetRatio: (preset: string) => void;
  bgBar: string;
  borderCol: string;
}

export const SecondaryRibbon: React.FC<SecondaryRibbonProps> = ({
  handlePdfDocumentUpload,
  handleUndo,
  handleRedo,
  undoStackLength,
  redoStackLength,
  addText,
  applyWatermarkToAllPages,
  applyCanvasPresetRatio,
  bgBar,
  borderCol,
}) => {
  return (
    <div style={{ height: '44px', minHeight: '44px', backgroundColor: bgBar, borderBottom: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', padding: '0 10px', gap: '8px', zIndex: 30, boxSizing: 'border-box', overflowX: 'auto' }}>
      <label style={prominentBtnStyle('#0284c7')}>
        <Upload size={14} /> Open PDF
        <input type="file" accept=".pdf" onChange={handlePdfDocumentUpload} style={{ display: 'none' }} />
      </label>

      <div style={{ width: '1px', height: '18px', backgroundColor: borderCol, margin: '0 2px' }} />

      <button title="Undo" onClick={handleUndo} disabled={undoStackLength <= 1} style={iconToolBtnStyle(false)}>
        <RotateCcw size={14} />
      </button>

      <button title="Redo" onClick={handleRedo} disabled={redoStackLength === 0} style={iconToolBtnStyle(false)}>
        <RotateCw size={14} />
      </button>

      <div style={{ width: '1px', height: '18px', backgroundColor: borderCol, margin: '0 2px' }} />

      <button title="Add Editable Text Box" onClick={addText} style={prominentBtnStyle('#0284c7')}>
        <Type size={14} /> Add Text
      </button>

      <button onClick={() => applyWatermarkToAllPages('CONFIDENTIAL')} style={prominentBtnStyle('#ef4444')}>
        💧 Watermark Document
      </button>

      <div style={{ display: 'flex', gap: '3px', borderLeft: `1px solid ${borderCol}`, borderRight: `1px solid ${borderCol}`, padding: '0 6px' }}>
        <button title="YouTube Widescreen (16:9)" onClick={() => applyCanvasPresetRatio('16:9')} style={inspectorToggleBtnStyle(false)}>16:9</button>
        <button title="TikTok / Reels Vertical (9:16)" onClick={() => applyCanvasPresetRatio('9:16')} style={inspectorToggleBtnStyle(false)}>9:16</button>
        <button title="Instagram Square (1:1)" onClick={() => applyCanvasPresetRatio('1:1')} style={inspectorToggleBtnStyle(false)}>1:1</button>
        <button title="A4 Print Document" onClick={() => applyCanvasPresetRatio('A4')} style={inspectorToggleBtnStyle(false)}>A4</button>
      </div>
    </div>
  );
};

const prominentBtnStyle = (bgColor: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  padding: '4px 9px',
  backgroundColor: bgColor,
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
});

const iconToolBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 8px',
  backgroundColor: active ? '#0284c7' : 'transparent',
  color: active ? '#ffffff' : 'inherit',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
});

const inspectorToggleBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3px 7px',
  backgroundColor: active ? '#0284c7' : 'transparent',
  color: active ? '#ffffff' : 'inherit',
  border: '1px solid #334155',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
});