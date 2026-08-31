import React, { useRef, useState } from 'react';
import { PenTool, Stamp, Check, X, RotateCcw } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (dataUrl: string) => void;
  onAddStamp: (text: string, color: string) => void;
  borderCol?: string;
  bgBar?: string;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSaveSignature,
  onAddStamp,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTab, setActiveTab] = useState<'sign' | 'stamp'>('sign');

  if (!isOpen) return null;

  // Signature Pad Drawing Logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveSignature(dataUrl);
    clearCanvas();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '420px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '12px 16px', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PenTool size={16} /> Digital Signature & Stamp Engine
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${borderCol}` }}>
          <button 
            onClick={() => setActiveTab('sign')} 
            style={tabBtnStyle(activeTab === 'sign')}
          >
            <PenTool size={12} /> Draw Signature
          </button>
          <button 
            onClick={() => setActiveTab('stamp')} 
            style={tabBtnStyle(activeTab === 'stamp')}
          >
            <Stamp size={12} /> Vector Stamps
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px' }}>
          {activeTab === 'sign' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Draw your signature below using mouse or touch:</span>
              <canvas 
                ref={canvasRef} 
                width={380} 
                height={140} 
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ backgroundColor: '#ffffff', borderRadius: '4px', cursor: 'crosshair', border: `1px solid ${borderCol}` }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={clearCanvas} style={actionBtnStyle('#64748b')}>
                  <RotateCcw size={12} /> Clear Pad
                </button>
                <button onClick={saveSignature} style={actionBtnStyle('#0284c7')}>
                  <Check size={12} /> Place Signature
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Select a pre-made vector document stamp:</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={() => { onAddStamp('APPROVED', '#10b981'); onClose(); }} style={stampBtnStyle('#10b981')}>
                  ✅ APPROVED
                </button>
                <button onClick={() => { onAddStamp('CONFIDENTIAL', '#ef4444'); onClose(); }} style={stampBtnStyle('#ef4444')}>
                  🔒 CONFIDENTIAL
                </button>
                <button onClick={() => { onAddStamp('DRAFT', '#f59e0b'); onClose(); }} style={stampBtnStyle('#f59e0b')}>
                  📝 DRAFT
                </button>
                <button onClick={() => { onAddStamp('PAID', '#8b5cf6'); onClose(); }} style={stampBtnStyle('#8b5cf6')}>
                  💳 PAID
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '8px',
  backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
  color: active ? '#38bdf8' : '#94a3b8',
  border: 'none',
  borderBottom: active ? '2px solid #38bdf8' : 'none',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
});

const actionBtnStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 12px',
  backgroundColor: color,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
});

const stampBtnStyle = (color: string): React.CSSProperties => ({
  padding: '12px',
  backgroundColor: 'rgba(255,255,255,0.05)',
  color: color,
  border: `2px solid ${color}`,
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 'bold',
  textAlign: 'center',
});