import React from 'react';
import { ScanText, X, Loader2, FileText } from 'lucide-react';

interface OcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: number;
  statusText: string;
  extractedText: string;
  onInsertAsDocNode: (text: string) => void;
  borderCol?: string;
  bgBar?: string;
}

export const OcrModal: React.FC<OcrModalProps> = ({
  isOpen,
  onClose,
  progress,
  statusText,
  extractedText,
  onInsertAsDocNode,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '460px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '12px 16px', backgroundColor: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ScanText size={16} /> Optical Character Recognition (OCR)
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Progress Indicator */}
          {progress < 100 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', padding: '20px 0' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>{statusText} ({progress}%)</span>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#0f172a', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.2s ease' }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Scanned Text Extracted Successfully:</span>
              <textarea 
                value={extractedText} 
                readOnly 
                style={{ width: '100%', height: '140px', backgroundColor: '#0f172a', color: '#e2e8f0', border: `1px solid ${borderCol}`, borderRadius: '4px', padding: '10px', fontSize: '12px', fontFamily: 'sans-serif', resize: 'none' }}
              />
              <button 
                onClick={() => { onInsertAsDocNode(extractedText); onClose(); }} 
                style={{ padding: '8px 12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <FileText size={14} /> Insert as Editable Word Card
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};