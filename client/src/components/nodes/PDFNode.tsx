import React, { useState } from 'react';
import { FileText, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface PDFNodeProps {
  id: string;
  title: string;
  pdfUrl?: string;
  totalPages?: number;
  borderCol?: string;
  bgBar?: string;
}

export const PDFNode: React.FC<PDFNodeProps> = ({
  title,
  pdfUrl,
  totalPages = 1,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div 
      style={{ 
        width: '320px', 
        backgroundColor: bgBar, 
        border: `1px solid ${borderCol}`, 
        borderRadius: '8px', 
        overflow: 'hidden', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Node Header */}
      <div style={{ padding: '8px 12px', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={14} /> {title}
        </span>
        <span style={{ fontSize: '10px', opacity: 0.8 }}>PDF Surface</span>
      </div>

      {/* PDF Viewport Area */}
      <div style={{ height: '200px', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px', padding: '12px' }}>
        {pdfUrl ? (
          <iframe src={`${pdfUrl}#page=${currentPage}`} title={title} width="100%" height="100%" style={{ border: 'none' }} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <FileText size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p>PDF Document Loaded</p>
            <span style={{ fontSize: '10px' }}>Page {currentPage} of {totalPages}</span>
          </div>
        )}
      </div>

      {/* Node Footer Controls */}
      <div style={{ padding: '6px 12px', borderTop: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            disabled={currentPage <= 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            style={controlBtnStyle}
          >
            <ChevronLeft size={12} />
          </button>
          <span style={{ fontSize: '11px', alignSelf: 'center' }}>{currentPage} / {totalPages}</span>
          <button 
            disabled={currentPage >= totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            style={controlBtnStyle}
          >
            <ChevronRight size={12} />
          </button>
        </div>

        <button style={controlBtnStyle} title="Download PDF Asset">
          <Download size={12} />
        </button>
      </div>
    </div>
  );
};

const controlBtnStyle: React.CSSProperties = {
  padding: '3px 6px',
  backgroundColor: 'rgba(255,255,255,0.1)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
};