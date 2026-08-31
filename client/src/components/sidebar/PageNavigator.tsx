import React from 'react';

interface PageNavigatorProps {
  thumbnails: string[];
  pageNum: number;
  changePdfPage: (newPage: number) => void;
  bgBar: string;
  borderCol: string;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({
  thumbnails,
  pageNum,
  changePdfPage,
  bgBar,
  borderCol,
}) => {
  return (
    <div style={{ width: '160px', minWidth: '160px', backgroundColor: bgBar, borderRight: `1px solid ${borderCol}`, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>Page Navigator</span>
      {thumbnails.length === 0 && <p style={{ fontSize: '10px', color: '#94a3b8' }}>Open a PDF to view pages.</p>}
      {thumbnails.map((thumbUrl, idx) => (
        <div 
          key={idx} 
          onClick={() => changePdfPage(idx + 1)}
          style={{ border: pageNum === idx + 1 ? '2px solid #0284c7' : `1px solid ${borderCol}`, borderRadius: '4px', padding: '2px', cursor: 'pointer' }}
        >
          <img src={thumbUrl} alt={`Page ${idx + 1}`} style={{ width: '100%', borderRadius: '2px', display: 'block' }} />
          <span style={{ fontSize: '10px', display: 'block', textAlign: 'center', marginTop: '2px' }}>Page {idx + 1}</span>
        </div>
      ))}
    </div>
  );
};