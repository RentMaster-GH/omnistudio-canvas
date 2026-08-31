import React, { useState } from 'react';
import { Search, X, Highlighter, RotateCcw } from 'lucide-react';

interface PdfSearchToolbarProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchAndHighlight: (keyword: string) => void;
  onClearHighlights: () => void;
  matchCount: number;
  borderCol?: string;
  bgBar?: string;
}

export const PdfSearchToolbar: React.FC<PdfSearchToolbarProps> = ({
  isOpen,
  onClose,
  onSearchAndHighlight,
  onClearHighlights,
  matchCount,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKeyword.trim()) return;
    onSearchAndHighlight(searchKeyword.trim());
  };

  return (
    <div 
      style={{ 
        position: 'absolute', 
        top: '16px', 
        right: '240px', 
        backgroundColor: bgBar, 
        border: `1px solid ${borderCol}`, 
        borderRadius: '6px', 
        padding: '6px 12px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        zIndex: 95
      }}
    >
      <Search size={14} color="#38bdf8" />
      
      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input 
          type="text" 
          value={searchKeyword} 
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="Search PDF keyword..."
          style={{ width: '150px', backgroundColor: '#0f172a', color: '#fff', border: `1px solid ${borderCol}`, borderRadius: '3px', padding: '3px 6px', fontSize: '11px' }}
        />
        <button type="submit" style={btnStyle('#0284c7')}>
          <Highlighter size={12} /> Highlight
        </button>
      </form>

      {matchCount > 0 && (
        <span style={{ fontSize: '11px', color: '#eab308', fontWeight: 'bold' }}>
          {matchCount} Matches
        </span>
      )}

      <button onClick={onClearHighlights} style={btnStyle('#64748b')} title="Clear Highlights">
        <RotateCcw size={12} />
      </button>

      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
        <X size={14} />
      </button>
    </div>
  );
};

const btnStyle = (color: string): React.CSSProperties => ({
  padding: '3px 7px',
  backgroundColor: color,
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});