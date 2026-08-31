import React, { useState } from 'react';
import { FilePlus, X, Upload, Trash2, Check, FileText } from 'lucide-react';

interface PdfMergerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMergePdfs: (files: File[]) => void;
  borderCol?: string;
  bgBar?: string;
}

export const PdfMergerModal: React.FC<PdfMergerModalProps> = ({
  isOpen,
  onClose,
  onMergePdfs,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMerge = () => {
    if (selectedFiles.length < 2) {
      alert('Please upload at least 2 PDF files to merge!');
      return;
    }
    onMergePdfs(selectedFiles);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '460px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '12px 16px', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FilePlus size={16} /> Multi-Document PDF Merger
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* File Upload Box */}
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', border: `2px dashed ${borderCol}`, borderRadius: '6px', cursor: 'pointer', backgroundColor: '#0f172a', color: '#38bdf8' }}>
            <Upload size={24} style={{ marginBottom: '6px' }} />
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Click to Add PDF Documents to Merge</span>
            <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Upload 2 or more .pdf files</span>
            <input type="file" multiple accept=".pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
          </label>

          {/* Selected File List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
            {selectedFiles.length === 0 && (
              <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>No PDF files added yet.</span>
            )}
            {selectedFiles.map((file, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#0f172a', border: `1px solid ${borderCol}`, borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={14} color="#0284c7" />
                  <span style={{ fontSize: '12px', color: '#fff', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {idx + 1}. {file.name}
                  </span>
                </div>
                <button onClick={() => removeFile(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Merge Button */}
          {selectedFiles.length >= 2 && (
            <button onClick={handleMerge} style={{ padding: '10px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Check size={16} /> Stitch & Merge {selectedFiles.length} PDFs into Canvas
            </button>
          )}

        </div>

      </div>
    </div>
  );
};