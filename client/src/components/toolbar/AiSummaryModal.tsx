import React, { useState } from 'react';
import { Sparkles, X, Check, FileText } from 'lucide-react';

interface AiSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSummaryCard: (summaryText: string) => void;
  borderCol?: string;
  bgBar?: string;
}

export const AiSummaryModal: React.FC<AiSummaryModalProps> = ({
  isOpen,
  onClose,
  onInsertSummaryCard,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [promptInput, setPromptInput] = useState('Summarize the document into 3 key bullet points.');
  const [summaryOutput, setSummaryOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerateSummary = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setSummaryOutput(
        `✨ AI Key Highlights:\n` +
        `• Primary Objective: Streamline cross-media document workflows.\n` +
        `• Key Finding: Integrated vector PDF surfaces increase editing speed by 40%.\n` +
        `• Action Item: Finalize multi-track video timeline exports.`
      );
      setIsGenerating(false);
    }, 1200);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '440px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '12px 16px', backgroundColor: '#8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} /> AI Magic Document Summarizer
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>AI Instruction Prompt:</span>
          <input 
            type="text" 
            value={promptInput} 
            onChange={(e) => setPromptInput(e.target.value)}
            style={{ width: '100%', backgroundColor: '#0f172a', color: '#fff', border: `1px solid ${borderCol}`, borderRadius: '4px', padding: '8px', fontSize: '12px' }}
          />

          <button onClick={handleGenerateSummary} disabled={isGenerating} style={{ padding: '8px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Sparkles size={14} /> {isGenerating ? 'Generating Summary...' : 'Run AI Summarizer'}
          </button>

          {summaryOutput && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>AI Generated Result:</span>
              <textarea 
                value={summaryOutput} 
                onChange={(e) => setSummaryOutput(e.target.value)}
                style={{ width: '100%', height: '110px', backgroundColor: '#0f172a', color: '#e2e8f0', border: `1px solid ${borderCol}`, borderRadius: '4px', padding: '8px', fontSize: '12px', resize: 'none' }}
              />
              <button onClick={() => { onInsertSummaryCard(summaryOutput); onClose(); }} style={{ padding: '8px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Check size={14} /> Drop AI Summary Card onto Canvas
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};