import React from 'react';
import { Upload, RotateCcw, RotateCw, Type, PenTool, ScanText, Mic, FilePlus, Pipette, Crop, ShieldAlert } from 'lucide-react';
import { VectorShapesToolbar } from './VectorShapesToolbar';
import { AlignmentToolbar } from './AlignmentToolbar';
import { GridPatternToolbar } from './GridPatternToolbar';

interface SecondaryRibbonProps {
  handlePdfDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  undoStackLength: number;
  redoStackLength: number;
  addText: () => void;
  applyWatermarkToAllPages: (text?: string) => void;
  applyCanvasPresetRatio: (preset: string) => void;
  onOpenSignatureModal?: () => void;
  onRunOcr?: () => void;
  onOpenVoiceRecorder?: () => void;
  onOpenPdfMergerModal?: () => void;
  onOpenCropModal?: () => void;
  onOpenRedactionModal?: () => void;
  onOpenEyeDropper?: () => void;
  onSetCanvasPattern?: (patternType: 'white' | 'dot' | 'blueprint' | 'isometric' | 'dark') => void;
  onAddRectangle?: () => void;
  onAddCircle?: () => void;
  onAddTriangle?: () => void;
  onAddArrow?: () => void;
  onActivatePencil?: () => void;
  onActivateHighlighter?: () => void;
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onAlignTop?: () => void;
  onAlignMiddle?: () => void;
  onAlignBottom?: () => void;
  onGroupObjects?: () => void;
  onUngroupObjects?: () => void;
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
  onOpenSignatureModal,
  onRunOcr,
  onOpenVoiceRecorder,
  onOpenPdfMergerModal,
  onOpenCropModal,
  onOpenRedactionModal,
  onOpenEyeDropper,
  onSetCanvasPattern,
  onAddRectangle,
  onAddCircle,
  onAddTriangle,
  onAddArrow,
  onActivatePencil,
  onActivateHighlighter,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onGroupObjects,
  onUngroupObjects,
  bgBar,
  borderCol,
}) => {
  return (
    <div style={{ height: '44px', minHeight: '44px', backgroundColor: bgBar, borderBottom: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', padding: '0 10px', gap: '8px', zIndex: 30, boxSizing: 'border-box', overflowX: 'auto' }}>
      <label style={prominentBtnStyle('#0284c7')}>
        <Upload size={14} /> Open PDF
        <input type="file" accept=".pdf" onChange={handlePdfDocumentUpload} style={{ display: 'none' }} />
      </label>

      {/* MERGE PDFS BUTTON */}
      {onOpenPdfMergerModal && (
        <button onClick={onOpenPdfMergerModal} style={prominentBtnStyle('#0284c7')}>
          <FilePlus size={14} /> Merge PDFs
        </button>
      )}

      {/* BLACKOUT REDACTION BUTTON */}
      {onOpenRedactionModal && (
        <button onClick={onOpenRedactionModal} style={prominentBtnStyle('#ef4444')}>
          <ShieldAlert size={14} /> Blackout / Redact
        </button>
      )}

      {/* CROP MASK BUTTON */}
      {onOpenCropModal && (
        <button onClick={onOpenCropModal} style={prominentBtnStyle('#0284c7')}>
          <Crop size={14} /> Crop / Mask
        </button>
      )}

      <div style={{ width: '1px', height: '18px', backgroundColor: borderCol, margin: '0 2px' }} />

      {/* PAPER GRID PATTERN SELECTOR */}
      {onSetCanvasPattern && (
        <GridPatternToolbar 
          onSetCanvasPattern={onSetCanvasPattern}
          borderCol={borderCol}
          bgBar={bgBar}
        />
      )}

      <button title="Undo" onClick={handleUndo} disabled={undoStackLength <= 1} style={iconToolBtnStyle(false)}>
        <RotateCcw size={14} />
      </button>

      <button title="Redo" onClick={handleRedo} disabled={redoStackLength === 0} style={iconToolBtnStyle(false)}>
        <RotateCw size={14} />
      </button>

      <div style={{ width: '1px', height: '18px', backgroundColor: borderCol, margin: '0 2px' }} />

      {/* EYEDROPPER COLOR PICKER TOOL */}
      {onOpenEyeDropper && (
        <button onClick={onOpenEyeDropper} style={prominentBtnStyle('#0284c7')} title="Pick Color Off Screen (Eyedropper)">
          <Pipette size={14} /> Eyedropper
        </button>
      )}

      <button title="Add Editable Text Box" onClick={addText} style={prominentBtnStyle('#0284c7')}>
        <Type size={14} /> Add Text
      </button>

      {/* ALIGNMENT & GROUPING TOOLBAR */}
      {onAlignLeft && (
        <AlignmentToolbar 
          onAlignLeft={onAlignLeft}
          onAlignCenter={onAlignCenter!}
          onAlignRight={onAlignRight!}
          onAlignTop={onAlignTop!}
          onAlignMiddle={onAlignMiddle!}
          onAlignBottom={onAlignBottom!}
          onGroupObjects={onGroupObjects!}
          onUngroupObjects={onUngroupObjects!}
          borderCol={borderCol}
          bgBar={bgBar}
        />
      )}

      {/* VECTOR SHAPES TOOLBAR */}
      {onAddRectangle && onAddCircle && (
        <VectorShapesToolbar 
          onAddRectangle={onAddRectangle!}
          onAddCircle={onAddCircle!}
          onAddTriangle={onAddTriangle!}
          onAddArrow={onAddArrow!}
          onActivatePencil={onActivatePencil!}
          onActivateHighlighter={onActivateHighlighter!}
          borderCol={borderCol}
          bgBar={bgBar}
        />
      )}

      {/* VOICE RECORDER BUTTON */}
      {onOpenVoiceRecorder && (
        <button onClick={onOpenVoiceRecorder} style={prominentBtnStyle('#ef4444')}>
          <Mic size={14} /> Voice Note
        </button>
      )}

      {/* SIGN & STAMP BUTTON */}
      {onOpenSignatureModal && (
        <button onClick={onOpenSignatureModal} style={prominentBtnStyle('#8b5cf6')}>
          <PenTool size={14} /> Sign / Stamp
        </button>
      )}

      {/* OCR SCANNER BUTTON */}
      {onRunOcr && (
        <button onClick={onRunOcr} style={prominentBtnStyle('#059669')}>
          <ScanText size={14} /> Scan Text (OCR)
        </button>
      )}

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