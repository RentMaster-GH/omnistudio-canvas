// client/src/App.jsx
import React from 'react';
import SafeCanvasStudio from './CanvasStudio';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#0f172a' }}>
      <SafeCanvasStudio />
    </div>
  );
}