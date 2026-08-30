import React, { useState } from 'react';
import LandingPage from './LandingPage';
import CanvasStudio from './CanvasStudio';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'studio'

  return (
    <div>
      {currentView === 'landing' ? (
        <LandingPage onLaunchStudio={() => setCurrentView('studio')} />
      ) : (
        <CanvasStudio onBackToHome={() => setCurrentView('landing')} />
      )}
    </div>
  );
}