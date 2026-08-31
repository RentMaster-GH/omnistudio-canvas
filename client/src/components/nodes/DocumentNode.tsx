import React, { useState } from 'react';
import { Type, Edit3, Check } from 'lucide-react';

interface DocumentNodeProps {
  id: string;
  title: string;
  initialContent?: string;
  borderCol?: string;
  bgBar?: string;
}

export const DocumentNode: React.FC<DocumentNodeProps> = ({
  title,
  initialContent = 'Click edit to start writing Word/Office content...',
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);

  return (
    <div 
      style={{ 
        width: '300px', 
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
      <div style={{ padding: '8px 12px', backgroundColor: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Type size={14} /> {title}
        </span>
        <button onClick={() => setIsEditing(!isEditing)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
          {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
        </button>
      </div>

      {/* Editor Body */}
      <div style={{ padding: '12px', backgroundColor: '#0f172a', minHeight: '120px' }}>
        {isEditing ? (
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ width: '100%', height: '100px', backgroundColor: '#1e293b', color: '#fff', border: `1px solid ${borderCol}`, borderRadius: '4px', padding: '8px', fontSize: '12px', fontFamily: 'sans-serif', resize: 'vertical' }}
          />
        ) : (
          <p style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
            {content}
          </p>
        )}
      </div>
    </div>
  );
};