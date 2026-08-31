import React, { useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, Plus, Minus 
} from 'lucide-react';

interface TextFormattingToolbarProps {
  activeObject: any;
  fabricCanvas: any;
  saveState: () => void;
  borderCol?: string;
  bgBar?: string;
}

export const TextFormattingToolbar: React.FC<TextFormattingToolbarProps> = ({
  activeObject,
  fabricCanvas,
  saveState,
  borderCol = '#334155',
  bgBar = '#1e293b',
}) => {
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(24);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isLinethrough, setIsLinethrough] = useState(false);
  const [align, setAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [lineHeight, setLineHeight] = useState(1.16);
  const [charSpacing, setCharSpacing] = useState(0);

  const googleFonts = [
    'Arial', 'Roboto', 'Inter', 'Montserrat', 'Oswald', 'Playfair Display', 
    'Pacifico', 'JetBrains Mono', 'Dancing Script', 'Anton', 'Bebas Neue', 'Caveat'
  ];

  useEffect(() => {
    if (!activeObject || (activeObject.type !== 'i-text' && activeObject.type !== 'textbox' && activeObject.type !== 'text')) return;

    setFontFamily(activeObject.fontFamily || 'Arial');
    setFontSize(activeObject.fontSize || 24);
    setIsBold(activeObject.fontWeight === 'bold');
    setIsItalic(activeObject.fontStyle === 'italic');
    setIsUnderline(!!activeObject.underline);
    setIsLinethrough(!!activeObject.linethrough);
    setAlign(activeObject.textAlign || 'left');
    setLineHeight(activeObject.lineHeight || 1.16);
    setCharSpacing(activeObject.charSpacing || 0);
  }, [activeObject]);

  if (!activeObject || (activeObject.type !== 'i-text' && activeObject.type !== 'textbox' && activeObject.type !== 'text')) {
    return null;
  }

  const updateProp = (key: string, value: any) => {
    activeObject.set(key, value);
    fabricCanvas?.renderAll();
    saveState();
  };

  const toggleBold = () => {
    const next = !isBold;
    setIsBold(next);
    updateProp('fontWeight', next ? 'bold' : 'normal');
  };

  const toggleItalic = () => {
    const next = !isItalic;
    setIsItalic(next);
    updateProp('fontStyle', next ? 'italic' : 'normal');
  };

  const toggleUnderline = () => {
    const next = !isUnderline;
    setIsUnderline(next);
    updateProp('underline', next);
  };

  const toggleLinethrough = () => {
    const next = !isLinethrough;
    setIsLinethrough(next);
    updateProp('linethrough', next);
  };

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(8, fontSize + delta);
    setFontSize(newSize);
    updateProp('fontSize', newSize);
  };

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '6px 12px', backgroundColor: bgBar, border: `1px solid ${borderCol}`, borderRadius: '6px', overflowX: 'auto' }}>
      
      {/* Font Family Picker */}
      <select 
        value={fontFamily} 
        onChange={(e) => { setFontFamily(e.target.value); updateProp('fontFamily', e.target.value); }}
        style={selectStyle}
      >
        {googleFonts.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
        ))}
      </select>

      <div style={{ width: '1px', height: '16px', backgroundColor: borderCol }} />

      {/* Font Size (+ / -) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <button onClick={() => changeFontSize(-2)} style={btnStyle(false)} title="Decrease Font Size"><Minus size={12} /></button>
        <input 
          type="number" 
          value={fontSize} 
          onChange={(e) => { const val = Number(e.target.value); setFontSize(val); updateProp('fontSize', val); }}
          style={{ width: '40px', backgroundColor: '#0f172a', color: '#fff', border: `1px solid ${borderCol}`, borderRadius: '3px', padding: '2px 4px', fontSize: '11px', textAlign: 'center' }}
        />
        <button onClick={() => changeFontSize(2)} style={btnStyle(false)} title="Increase Font Size"><Plus size={12} /></button>
      </div>

      <div style={{ width: '1px', height: '16px', backgroundColor: borderCol }} />

      {/* Style Toggles */}
      <button onClick={toggleBold} style={btnStyle(isBold)} title="Bold"><Bold size={12} /></button>
      <button onClick={toggleItalic} style={btnStyle(isItalic)} title="Italic"><Italic size={12} /></button>
      <button onClick={toggleUnderline} style={btnStyle(isUnderline)} title="Underline"><Underline size={12} /></button>
      <button onClick={toggleLinethrough} style={btnStyle(isLinethrough)} title="Strikethrough"><Strikethrough size={12} /></button>

      <div style={{ width: '1px', height: '16px', backgroundColor: borderCol }} />

      {/* Alignment */}
      <button onClick={() => { setAlign('left'); updateProp('textAlign', 'left'); }} style={btnStyle(align === 'left')} title="Align Left"><AlignLeft size={12} /></button>
      <button onClick={() => { setAlign('center'); updateProp('textAlign', 'center'); }} style={btnStyle(align === 'center')} title="Align Center"><AlignCenter size={12} /></button>
      <button onClick={() => { setAlign('right'); updateProp('textAlign', 'right'); }} style={btnStyle(align === 'right')} title="Align Right"><AlignRight size={12} /></button>
      <button onClick={() => { setAlign('justify'); updateProp('textAlign', 'justify'); }} style={btnStyle(align === 'justify')} title="Justify"><AlignJustify size={12} /></button>

      <div style={{ width: '1px', height: '16px', backgroundColor: borderCol }} />

      {/* Line Height Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Spacing:</span>
        <input 
          type="range" 
          min={0} 
          max={500} 
          value={charSpacing} 
          onChange={(e) => { const val = Number(e.target.value); setCharSpacing(val); updateProp('charSpacing', val); }}
          style={{ width: '50px', accentColor: '#38bdf8', cursor: 'pointer' }}
          title="Letter Spacing"
        />
      </div>

    </div>
  );
};

const selectStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  border: '1px solid #334155',
  borderRadius: '3px',
  padding: '3px 6px',
  fontSize: '11px',
  cursor: 'pointer',
};

const btnStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 6px',
  backgroundColor: active ? '#0284c7' : 'rgba(255,255,255,0.08)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});