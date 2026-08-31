import React from 'react';
import { FormInput, CheckSquare, Calendar, PenTool } from 'lucide-react';

interface PdfFormToolbarProps {
  onAddTextInputField: () => void;
  onAddCheckboxField: () => void;
  onAddDateField: () => void;
  borderCol?: string;
  bgBar?: string;
}

export const PdfFormToolbar: React.FC<PdfFormToolbarProps> = ({
  onAddTextInputField,
  onAddCheckboxField,
  onAddDateField,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '4px 8px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '4px' }}>
      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginRight: '4px' }}>Form Controls:</span>
      
      <button onClick={onAddTextInputField} style={formBtnStyle('#0284c7')} title="Add Fillable Text Field">
        <FormInput size={12} /> Text Input
      </button>

      <button onClick={onAddCheckboxField} style={formBtnStyle('#10b981')} title="Add Checkbox Field">
        <CheckSquare size={12} /> Checkbox
      </button>

      <button onClick={onAddDateField} style={formBtnStyle('#8b5cf6')} title="Add Date Field">
        <Calendar size={12} /> Date Picker
      </button>
    </div>
  );
};

const formBtnStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 7px',
  backgroundColor: 'rgba(255,255,255,0.08)',
  color: '#ffffff',
  border: `1px solid ${color}`,
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
});