// client/src/App.jsx
import React, { useState } from 'react';
import SafeCanvasStudio from './CanvasStudio';
import LandingPage from './LandingPage';

export default function App() {
  const [currentView, setCurrentView] = useState('studio'); // 'studio' or 'landing'

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      {currentView === 'landing' ? (
        <LandingPage onLaunchStudio={() => setCurrentView('studio')} />
      ) : (
        <SafeCanvasStudio onBackToHome={() => setCurrentView('landing')} />
      )}
    </div>
  );
}