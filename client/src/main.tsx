import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// --- GLOBAL BUTTON & RUNTIME ERROR DIAGNOSTIC AUDITOR ---
if (typeof window !== 'undefined') {
  window.addEventListener(
    'click',
    (e) => {
      const target = (e.target as HTMLElement).closest('button, [role="button"]');
      if (target) {
        console.log('👆 Button Clicked:', {
          text: target.textContent?.trim() || 'Icon Button',
          title: target.getAttribute('title') || 'No Title',
          element: target,
        });
      }
    },
    true
  );

  // Catch all unhandled JS errors triggered by button clicks or async operations
  window.addEventListener('error', (event) => {
    console.error('🚨 Runtime Error Caught:', event.error);
  });
}