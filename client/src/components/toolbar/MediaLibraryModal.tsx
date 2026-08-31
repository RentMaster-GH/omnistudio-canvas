import React, { useState } from 'react';
import { FolderOpen, X, Image as ImageIcon, FileText, Sparkles, Plus } from 'lucide-react';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertAsset: (type: 'image' | 'template', contentUrlOrText: string, title: string) => void;
  borderCol?: string;
  bgBar?: string;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onInsertAsset,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [activeTab, setActiveTab] = useState<'brand' | 'stickers' | 'templates'>('brand');

  if (!isOpen) return null;

  // Stock Media Assets
  const brandAssets = [
    { title: 'Company Logo Blue', url: 'https://cdn-icons-png.flaticon.com/512/5968/5968260.png' },
    { title: 'Verified Badge', url: 'https://cdn-icons-png.flaticon.com/512/7595/7595571.png' },
    { title: 'Official Signature Seal', url: 'https://cdn-icons-png.flaticon.com/512/1040/1040230.png' },
  ];

  const stockStickers = [
    { title: 'Approved Badge', url: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' },
    { title: 'Confidential Stamp', url: 'https://cdn-icons-png.flaticon.com/512/3064/3064197.png' },
    { title: 'Urgent Star', url: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png' },
  ];

  const documentTemplates = [
    { title: 'Professional Invoice', content: 'INVOICE #1002\nBill To: Client Name\nAmount Due: $1,250.00' },
    { title: 'Certificate of Completion', content: 'CERTIFICATE OF ACHIEVEMENT\nAwarded to: Employee Name\nFor Excellence in Studio Engineering' },
    { title: 'Non-Disclosure Agreement', content: 'CONFIDENTIAL NDA AGREEMENT\nBetween Party A and Party B' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '500px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '12px 16px', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderOpen size={16} /> Cloud Asset Library & Templates
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${borderCol}` }}>
          <button onClick={() => setActiveTab('brand')} style={tabBtnStyle(activeTab === 'brand')}>
            <ImageIcon size={12} /> Brand Assets
          </button>
          <button onClick={() => setActiveTab('stickers')} style={tabBtnStyle(activeTab === 'stickers')}>
            <Sparkles size={12} /> Stock Stickers
          </button>
          <button onClick={() => setActiveTab('templates')} style={tabBtnStyle(activeTab === 'templates')}>
            <FileText size={12} /> Templates
          </button>
        </div>

        {/* Body Grid */}
        <div style={{ padding: '16px', maxHeight: '320px', overflowY: 'auto' }}>
          {activeTab === 'brand' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {brandAssets.map((item, idx) => (
                <div key={idx} onClick={() => { onInsertAsset('image', item.url, item.title); onClose(); }} style={assetCardStyle}>
                  <img src={item.url} alt={item.title} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '10px', color: '#e2e8f0', textAlign: 'center', marginTop: '4px' }}>{item.title}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'stickers' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {stockStickers.map((item, idx) => (
                <div key={idx} onClick={() => { onInsertAsset('image', item.url, item.title); onClose(); }} style={assetCardStyle}>
                  <img src={item.url} alt={item.title} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '10px', color: '#e2e8f0', textAlign: 'center', marginTop: '4px' }}>{item.title}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'templates' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documentTemplates.map((item, idx) => (
                <div key={idx} onClick={() => { onInsertAsset('template', item.content, item.title); onClose(); }} style={templateCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="#38bdf8" />
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{item.title}</span>
                  </div>
                  <Plus size={14} color="#38bdf8" />
                </div>
              ))}
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
  fontSize: '11px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
});

const assetCardStyle: React.CSSProperties = {
  padding: '10px',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
};

const templateCardStyle: React.CSSProperties = {
  padding: '10px 12px',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};