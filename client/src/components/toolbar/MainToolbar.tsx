import React from 'react';
import { FileText, Type, Video, FolderOpen, Download, FileDown, Sun, Moon, Sparkles, Film } from 'lucide-react';

interface MainToolbarProps {
  activePortal: 'pdf' | 'canvas' | 'video';
  setActivePortal: (portal: 'pdf' | 'canvas' | 'video') => void;
  loadSampleDemo: () => void;
  setShowProjectsModal: (show: boolean) => void;
  exportCanvasImage: () => void;
  exportCompletePdf: () => void;
  exportMp4Video?: () => void;
  generateShareableProjectUrl: () => void;
  handlePaystackUpgrade: () => void;
  onOpenAiSummaryModal?: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const MainToolbar: React.FC<MainToolbarProps> = ({
  activePortal,
  setActivePortal,
  loadSampleDemo,
  setShowProjectsModal,
  exportCanvasImage,
  exportCompletePdf,
  exportMp4Video,
  generateShareableProjectUrl,
  handlePaystackUpgrade,
  onOpenAiSummaryModal,
  darkMode,
  setDarkMode,
}) => {
  return (
    <div style={{ height: '36px', minHeight: '36px', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '6px', zIndex: 40, boxSizing: 'border-box', overflowX: 'auto' }}>
      <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff', marginRight: '8px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
        <FileText size={16} /> OmniStudio
      </span>
      
      <button onClick={() => setActivePortal('pdf')} style={portalTabStyle(activePortal === 'pdf')}><FileText size={13} /> PDF Portal</button>
      <button onClick={() => setActivePortal('canvas')} style={portalTabStyle(activePortal === 'canvas')}><Type size={13} /> Canvas Studio</button>
      <button onClick={() => setActivePortal('video')} style={portalTabStyle(activePortal === 'video')}><Video size={13} /> Video Portal</button>

      <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />

      {/* AI SUMMARIZE BUTTON */}
      {onOpenAiSummaryModal && (
        <button onClick={onOpenAiSummaryModal} style={aiBtnStyle}>
          <Sparkles size={13} /> AI Summarize
        </button>
      )}

      <button onClick={loadSampleDemo} style={sampleBtnStyle}>
        ✨ Load Sample Demo
      </button>

      <button onClick={() => setShowProjectsModal(true)} style={globalHeaderBtnStyle}>
        <FolderOpen size={13} /> Recent Projects
      </button>

      <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />

      <button onClick={exportCanvasImage} style={globalHeaderBtnStyle}><Download size={13} /> PNG</button>
      <button onClick={exportCompletePdf} style={exportPdfHeaderBtnStyle}><FileDown size={13} /> Export PDF</button>

      {/* EXPORT MP4 VIDEO BUTTON */}
      {exportMp4Video && (
        <button onClick={exportMp4Video} style={exportVideoHeaderBtnStyle}>
          <Film size={13} /> Export MP4
        </button>
      )}

      <button onClick={generateShareableProjectUrl} style={globalHeaderBtnStyle}>🔗 Copy Share Link</button>

      <button onClick={handlePaystackUpgrade} style={upgradeBtnStyle}>
        ⚡ Upgrade Pro ($9/mo)
      </button>

      <div style={{ marginLeft: 'auto' }}>
        <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
};

const portalTabStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  padding: '4px 10px',
  backgroundColor: active ? '#0f172a' : 'transparent',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
});

const aiBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 10px',
  backgroundColor: '#8b5cf6',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
};

const sampleBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 10px',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
};

const globalHeaderBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 8px',
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
};

const exportPdfHeaderBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 10px',
  backgroundColor: '#10b981',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
};

const exportVideoHeaderBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 10px',
  backgroundColor: '#ef4444',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
};

const upgradeBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 10px',
  backgroundColor: '#059669',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
};