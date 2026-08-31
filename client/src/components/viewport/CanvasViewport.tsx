import React, { useState } from 'react';
import { PDFNode } from '../nodes/PDFNode';
import { VideoNode } from '../nodes/VideoNode';
import { DocumentNode } from '../nodes/DocumentNode';
import { TextFormattingToolbar } from '../toolbar/TextFormattingToolbar';
import { FileText, Film, Type, Layers, UploadCloud } from 'lucide-react';
import * as fabric from 'fabric';

interface CanvasViewportProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  activeEditingObject: any;
  exitTextEditing: () => void;
  borderCol: string;
  fabricCanvas?: any;
  saveState?: () => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  canvasRef,
  activeEditingObject,
  exitTextEditing,
  borderCol,
  fabricCanvas,
  saveState = () => {},
}) => {
  const [activeMediaOverlay, setActiveMediaOverlay] = useState<'none' | 'pdf' | 'video' | 'doc'>('none');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [droppedVideoUrl, setDroppedVideoUrl] = useState<string>('');
  const [droppedDocTitle, setDroppedDocTitle] = useState<string>('');
  const [droppedDocContent, setDroppedDocContent] = useState<string>('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileName = file.name;
    const fileType = file.type;

    if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
      setActiveMediaOverlay('pdf');
    } else if (fileType.includes('video') || fileType.includes('audio') || fileName.endsWith('.mp4') || fileName.endsWith('.mp3')) {
      const videoBlobUrl = URL.createObjectURL(file);
      setDroppedVideoUrl(videoBlobUrl);
      setActiveMediaOverlay('video');
    } else if (fileType.includes('text') || fileType.includes('document') || fileName.endsWith('.docx') || fileName.endsWith('.txt')) {
      const text = await file.text();
      setDroppedDocTitle(fileName);
      setDroppedDocContent(text.substring(0, 500) || 'Word Document Content');
      setActiveMediaOverlay('doc');
    } else if (fileType.includes('image')) {
      const imageUrl = URL.createObjectURL(file);
      if (fabricCanvas) {
        const ImageClass = (fabric as any).FabricImage || (fabric as any).Image || ((fabric as any).default && (fabric as any).default.Image);
        if (ImageClass) {
          const imgObj = await ImageClass.fromURL(imageUrl);
          imgObj.scaleToWidth(300);
          imgObj.set({ left: 100, top: 100 });
          fabricCanvas.add(imgObj);
          fabricCanvas.setActiveObject(imgObj);
          fabricCanvas.renderAll();
        }
      }
    }
  };

  const isTextSelected = activeEditingObject && (activeEditingObject.type === 'i-text' || activeEditingObject.type === 'textbox' || activeEditingObject.type === 'text');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', position: 'relative' }}>
      
      {/* Floating Text Formatting Toolbar */}
      {isTextSelected && (
        <TextFormattingToolbar 
          activeObject={activeEditingObject}
          fabricCanvas={fabricCanvas}
          saveState={saveState}
          borderCol={borderCol}
        />
      )}

      {/* Node Spawner Ribbon */}
      <div style={{ display: 'flex', gap: '8px', padding: '6px 12px', backgroundColor: '#1e293b', border: `1px solid ${borderCol}`, borderRadius: '6px', zIndex: 10 }}>
        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
          <Layers size={12} /> Media Node Cards:
        </span>

        <button 
          onClick={() => setActiveMediaOverlay(activeMediaOverlay === 'pdf' ? 'none' : 'pdf')} 
          style={nodeBtnStyle(activeMediaOverlay === 'pdf', '#0284c7')}
        >
          <FileText size={12} /> PDF Surface
        </button>

        <button 
          onClick={() => setActiveMediaOverlay(activeMediaOverlay === 'video' ? 'none' : 'video')} 
          style={nodeBtnStyle(activeMediaOverlay === 'video', '#8b5cf6')}
        >
          <Film size={12} /> Video Player
        </button>

        <button 
          onClick={() => setActiveMediaOverlay(activeMediaOverlay === 'doc' ? 'none' : 'doc')} 
          style={nodeBtnStyle(activeMediaOverlay === 'doc', '#059669')}
        >
          <Type size={12} /> Word Document Card
        </button>
      </div>

      {/* Main Canvas Viewport Container */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleCanvasDrop}
        style={{ 
          position: 'relative', 
          border: isDraggingOver ? '2px dashed #38bdf8' : `2px solid ${borderCol}`, 
          borderRadius: '4px', 
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          backgroundColor: isDraggingOver ? 'rgba(56, 189, 248, 0.05)' : 'transparent'
        }}
      >
        
        {isDraggingOver && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', zIndex: 200, pointerEvents: 'none' }}>
            <UploadCloud size={48} style={{ marginBottom: '12px', animation: 'bounce 1s infinite' }} />
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Drop File to Instant Spawn Node</span>
            <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Supports PDF, MP4, MP3, DOCX, and Images</span>
          </div>
        )}

        {activeEditingObject && (
          <button 
            onClick={exitTextEditing} 
            style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', zIndex: 100 }}
          >
            Close Text Focus
          </button>
        )}

        <canvas ref={canvasRef} />

        {activeMediaOverlay !== 'none' && (
          <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 50 }}>
            {activeMediaOverlay === 'pdf' && (
              <PDFNode id="node-pdf-1" title="Contract Document.pdf" totalPages={5} borderCol={borderCol} />
            )}
            {activeMediaOverlay === 'video' && (
              <VideoNode id="node-video-1" title="Dropped Media Track" videoUrl={droppedVideoUrl} borderCol={borderCol} />
            )}
            {activeMediaOverlay === 'doc' && (
              <DocumentNode id="node-doc-1" title={droppedDocTitle || "Project Notes.docx"} initialContent={droppedDocContent || "Word Document Content..."} borderCol={borderCol} />
            )}
          </div>
        )}

      </div>
    </div>
  );
};

const nodeBtnStyle = (active: boolean, activeColor: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  padding: '4px 8px',
  backgroundColor: active ? activeColor : 'rgba(255, 255, 255, 0.08)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  transition: 'all 0.2s ease',
});