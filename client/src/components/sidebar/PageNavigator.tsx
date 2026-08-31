import React from 'react';
import { ChevronUp, ChevronDown, Copy, Trash2 } from 'lucide-react';

interface PageNavigatorProps {
  thumbnails: string[];
  pageNum: number;
  changePdfPage: (newPage: number) => void;
  onMovePageUp?: (index: number) => void;
  onMovePageDown?: (index: number) => void;
  onDuplicatePage?: (index: number) => void;
  onDeletePage?: (index: number) => void;
  bgBar: string;
  borderCol: string;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({
  thumbnails,
  pageNum,
  changePdfPage,
  onMovePageUp,
  onMovePageDown,
  onDuplicatePage,
  onDeletePage,
  bgBar,
  borderCol,
}) => {
  return (
    <div style={{ width: '170px', minWidth: '170px', backgroundColor: bgBar, borderRight: `1px solid ${borderCol}`, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>Page Organizer ({thumbnails.length})</span>
      {thumbnails.length === 0 && <p style={{ fontSize: '10px', color: '#94a3b8' }}>Open a PDF to manage pages.</p>}
      
      {thumbnails.map((thumbUrl, idx) => (
        <div 
          key={idx} 
          style={{ 
            border: pageNum === idx + 1 ? '2px solid #0284c7' : `1px solid ${borderCol}`, 
            borderRadius: '4px', 
            padding: '4px', 
            backgroundColor: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {/* Thumbnail Image */}
          <div onClick={() => changePdfPage(idx + 1)} style={{ cursor: 'pointer' }}>
            <img src={thumbUrl} alt={`Page ${idx + 1}`} style={{ width: '100%', borderRadius: '2px', display: 'block' }} />
            <span style={{ fontSize: '10px', display: 'block', textAlign: 'center', marginTop: '2px', color: '#e2e8f0' }}>Page {idx + 1}</span>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${borderCol}`, paddingTop: '3px' }}>
            <button 
              disabled={idx === 0} 
              onClick={() => onMovePageUp && onMovePageUp(idx)}
              style={actionBtnStyle}
              title="Move Page Up"
            >
              <ChevronUp size={11} />
            </button>

            <button 
              disabled={idx === thumbnails.length - 1} 
              onClick={() => onMovePageDown && onMovePageDown(idx)}
              style={actionBtnStyle}
              title="Move Page Down"
            >
              <ChevronDown size={11} />
            </button>

            <button 
              onClick={() => onDuplicatePage && onDuplicatePage(idx)}
              style={actionBtnStyle}
              title="Duplicate Page"
            >
              <Copy size={11} />
            </button>

            <button 
              onClick={() => onDeletePage && onDeletePage(idx)}
              style={{ ...actionBtnStyle, color: '#ef4444' }}
              title="Delete Page"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const actionBtnStyle: React.CSSProperties = {
  padding: '2px 4px',
  backgroundColor: 'rgba(255,255,255,0.08)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '2px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};