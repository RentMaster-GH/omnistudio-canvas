import React, { useState } from 'react';
import { ShieldAlert, X, Check, Layers, FileText } from 'lucide-react';

interface RedactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRedaction: (label: string, applyToAllPages: boolean, maskColor: string) => void;
  totalPages: number;
  currentPage: number;
  borderCol?: string;
  bgBar?: string;
}

export const RedactionModal: React.FC<RedactionModalProps> = ({
  isOpen,
  onClose,
  onApplyRedaction,
  totalPages,
  currentPage,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [redactionLabel, setRedactionLabel] = useState('[ REDACTED ]');
  const [applyToAllPages, setApplyToAllPages] = useState(false);
  const [maskColor, setMaskColor] = useState('#000000');

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyRedaction(redactionLabel, applyToAllPages, maskColor);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '440px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '12px 16px', backgroundColor: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={16} /> Document Redaction & Blackout Tool
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Label Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={labelStyle}>Redaction Overlay Text Label:</label>
            <input 
              type="text" 
              value={redactionLabel} 
              onChange={(e) => setRedactionLabel(e.target.value)}
              placeholder="e.g. [ REDACTED ] or leave blank for plain black box"
              style={{ width: '100%', backgroundColor: '#0f172a', color: '#fff', border: `1px solid ${borderCol}`, borderRadius: '4px', padding: '8px', fontSize: '12px' }}
            />
          </div>

          {/* Scope Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#0f172a', borderRadius: '6px', border: `1px solid ${borderCol}` }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>Page Scope Option:</span>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: '#fff' }}>
              <input 
                type="radio" 
                name="scope" 
                checked={!applyToAllPages} 
                onChange={() => setApplyToAllPages(false)} 
                style={{ accentColor: '#38bdf8' }}
              />
              <FileText size={14} color="#0284c7" /> Apply to Current Page Only (Page {currentPage})
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: '#fff' }}>
              <input 
                type="radio" 
                name="scope" 
                checked={applyToAllPages} 
                onChange={() => setApplyToAllPages(true)} 
                style={{ accentColor: '#ef4444' }}
              />
              <Layers size={14} color="#ef4444" /> Batch Redact ALL Pages in Document ({totalPages || 1} Pages)
            </label>
          </div>

          {/* Color Picker */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Redaction Box Color:</span>
            <input 
              type="color" 
              value={maskColor} 
              onChange={(e) => setMaskColor(e.target.value)} 
              style={{ width: '50px', height: '28px', backgroundColor: '#0f172a', border: `1px solid ${borderCol}`, borderRadius: '4px', cursor: 'pointer', padding: '2px' }} 
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <button onClick={onClose} style={btnStyle('#64748b')}>
              Cancel
            </button>
            <button onClick={handleApply} style={btnStyle('#ef4444')}>
              <Check size={14} /> Apply Redaction Mask
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
};

const btnStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  backgroundColor: color,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '12px',
});